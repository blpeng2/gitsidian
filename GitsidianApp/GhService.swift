import AppKit
import Foundation

private let GH_CLIENT_ID = "Ov23lifY5yEny3ChA0pm"

enum GhError: Error {
    case notFound
    case installFailed(String)
    case commandFailed(Int32, String)
}

actor GhService {
    static let shared = GhService()
    private(set) var ghPath: String?
    private(set) var lastToken: String?

    func setup() async {
        if let path = findGhBinary() {
            ghPath = path
            return
        }
        do {
            ghPath = try await downloadGh()
        } catch {
            print("[GhService] gh 설치 실패: \(error)")
        }
    }

    private func findGhBinary() -> String? {
        let candidates = [
            "/opt/homebrew/bin/gh",
            "/usr/local/bin/gh",
            "/opt/local/bin/gh",
            "\(NSHomeDirectory())/.local/bin/gh"
        ]
        return candidates.first {
            FileManager.default.isExecutableFile(atPath: $0)
        }
    }

    private func downloadGh() async throws -> String {
        let tagsURL = URL(string: "https://api.github.com/repos/cli/cli/releases/latest")!
        let (tagsData, _) = try await URLSession.shared.data(from: tagsURL)
        guard let json = try? JSONSerialization.jsonObject(with: tagsData) as? [String: Any],
              let tagName = json["tag_name"] as? String else {
            throw GhError.installFailed("버전 정보를 가져올 수 없음")
        }
        let version = tagName.hasPrefix("v") ? String(tagName.dropFirst()) : tagName

        let arch: String
        #if arch(arm64)
        arch = "arm64"
        #else
        arch = "amd64"
        #endif

        let zipURL = URL(string: "https://github.com/cli/cli/releases/download/\(tagName)/gh_\(version)_macOS_\(arch).zip")!
        let (zipData, _) = try await URLSession.shared.data(from: zipURL)

        let tmpDir = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("gh_install_\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tmpDir, withIntermediateDirectories: true)
        let zipPath = tmpDir.appendingPathComponent("gh.zip")
        try zipData.write(to: zipPath)

        let unzip = Process()
        unzip.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
        unzip.arguments = ["-o", zipPath.path, "-d", tmpDir.path]
        try unzip.run()
        unzip.waitUntilExit()

        let extractedBin = tmpDir.appendingPathComponent("gh_\(version)_macOS_\(arch)/bin/gh")

        let installDir = URL(fileURLWithPath: "\(NSHomeDirectory())/.local/bin")
        try FileManager.default.createDirectory(at: installDir, withIntermediateDirectories: true)
        let installPath = installDir.appendingPathComponent("gh")
        if FileManager.default.fileExists(atPath: installPath.path) {
            try FileManager.default.removeItem(at: installPath)
        }
        try FileManager.default.copyItem(at: extractedBin, to: installPath)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: installPath.path)

        try? FileManager.default.removeItem(at: tmpDir)

        return installPath.path
    }

    func run(_ args: [String], stdinData: Data? = nil) async throws -> (exitCode: Int32, stdout: String, stderr: String) {
        guard let path = ghPath else { throw GhError.notFound }

        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let process = Process()
                    process.executableURL = URL(fileURLWithPath: path)
                    process.arguments = args

                    var env = ProcessInfo.processInfo.environment
                    env["HOME"] = NSHomeDirectory()
                    process.environment = env

                    let stdoutPipe = Pipe()
                    let stderrPipe = Pipe()
                    process.standardOutput = stdoutPipe
                    process.standardError = stderrPipe

                    if let input = stdinData {
                        let stdinPipe = Pipe()
                        process.standardInput = stdinPipe
                        stdinPipe.fileHandleForWriting.write(input)
                        stdinPipe.fileHandleForWriting.closeFile()
                    }

                    try process.run()
                    process.waitUntilExit()

                    let stdout = String(data: stdoutPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                    let stderr = String(data: stderrPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                    continuation.resume(returning: (process.terminationStatus, stdout, stderr))
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    func isAuthenticated() async -> Bool {
        let result = try? await run(["auth", "status"])
        return result?.exitCode == 0
    }

    func getToken() async throws -> String {
        if let token = lastToken {
            return token
        }
        let (code, stdout, stderr) = try await run(["auth", "token"])
        guard code == 0 else { throw GhError.commandFailed(code, stderr) }
        return stdout.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func login(onDeviceCode: @escaping (_ userCode: String, _ verificationUri: String) -> Void) async throws {
        let info = try await requestDeviceCode()

        onDeviceCode(info.userCode, info.verificationUri)

        let token = try await pollForToken(
            deviceCode: info.deviceCode,
            interval: TimeInterval(info.interval)
        )

        if ghPath != nil {
            _ = try? await run(["auth", "login", "--with-token"],
                               stdinData: "\(token)\n".data(using: .utf8))
        }

        lastToken = token
    }

    private func parseParam(_ body: String, _ key: String) -> String? {
        if let comps = URLComponents(string: "?" + body),
           let value = comps.queryItems?.first(where: { $0.name == key })?.value {
            return value
        }
        if let data = body.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let value = json[key] as? String {
            return value
        }
        return nil
    }

    private func requestDeviceCode() async throws -> (deviceCode: String, userCode: String, verificationUri: String, interval: Int) {
        var req = URLRequest(url: URL(string: "https://github.com/login/device/code")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = "client_id=\(GH_CLIENT_ID)&scope=repo%20read:user".data(using: .utf8)

        let (data, _) = try await URLSession.shared.data(for: req)
        guard let body = String(data: data, encoding: .utf8),
              let deviceCode = parseParam(body, "device_code"),
              let userCode = parseParam(body, "user_code"),
              let verificationUri = parseParam(body, "verification_uri") else {
            throw GhError.installFailed("Device code 요청 실패")
        }
        let interval = Int(parseParam(body, "interval") ?? "5") ?? 5
        return (deviceCode, userCode, verificationUri, interval)
    }

    private func pollForToken(deviceCode: String, interval: TimeInterval) async throws -> String {
        var pollInterval = interval
        var attempts = 0

        while attempts < 180 {
            try await Task.sleep(nanoseconds: UInt64(pollInterval * 1_000_000_000))

            var req = URLRequest(url: URL(string: "https://github.com/login/oauth/access_token")!)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            let grantType = "urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code"
            req.httpBody = "client_id=\(GH_CLIENT_ID)&device_code=\(deviceCode)&grant_type=\(grantType)".data(using: .utf8)

            let (data, _) = try await URLSession.shared.data(for: req)
            guard let body = String(data: data, encoding: .utf8) else {
                attempts += 1
                continue
            }

            if let token = parseParam(body, "access_token"), !token.isEmpty {
                return token
            }

            switch parseParam(body, "error") {
            case "authorization_pending":
                attempts += 1
            case "slow_down":
                pollInterval += 5
                attempts += 1
            case "expired_token":
                throw GhError.commandFailed(-1, "인증 코드가 만료되었습니다.")
            case "access_denied":
                throw GhError.commandFailed(-1, "인증이 거부되었습니다.")
            default:
                attempts += 1
            }
        }
        throw GhError.commandFailed(-1, "인증 시간이 초과되었습니다.")
    }

    var isAvailable: Bool { ghPath != nil }
}
