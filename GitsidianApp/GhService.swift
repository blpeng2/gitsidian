import AppKit
import Foundation

enum GhError: Error {
    case notFound
    case installFailed(String)
    case commandFailed(Int32, String)
}

actor GhService {
    static let shared = GhService()
    private(set) var ghPath: String?

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
        let (code, stdout, stderr) = try await run(["auth", "token"])
        guard code == 0 else { throw GhError.commandFailed(code, stderr) }
        return stdout.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func login() async throws {
        guard let path = ghPath else { throw GhError.notFound }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let process = Process()
                    process.executableURL = URL(fileURLWithPath: path)
                    process.arguments = ["auth", "login", "--web", "--hostname", "github.com"]

                    var env = ProcessInfo.processInfo.environment
                    env["HOME"] = NSHomeDirectory()
                    env["BROWSER"] = "/bin/echo"
                    process.environment = env

                    let stdoutPipe = Pipe()
                    let stderrPipe = Pipe()
                    let stdinPipe = Pipe()
                    process.standardOutput = stdoutPipe
                    process.standardError = stderrPipe
                    process.standardInput = stdinPipe

                    try process.run()

                    var allOutput = ""
                    var actionTaken = false
                    let lock = NSLock()

                    func handleOutput(_ text: String) {
                        lock.lock()
                        allOutput += text
                        let shouldAct = !actionTaken && (
                            allOutput.contains("Press Enter") ||
                            allOutput.contains("press enter") ||
                            allOutput.contains("open github.com")
                        )
                        if shouldAct { actionTaken = true }
                        lock.unlock()

                        guard shouldAct else { return }

                        if let url = URL(string: "https://github.com/login/device") {
                            DispatchQueue.main.async {
                                NSWorkspace.shared.open(url)
                            }
                        }
                        stdinPipe.fileHandleForWriting.write(Data("\n".utf8))
                    }

                    stdoutPipe.fileHandleForReading.readabilityHandler = { handle in
                        let data = handle.availableData
                        guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
                        handleOutput(text)
                    }
                    stderrPipe.fileHandleForReading.readabilityHandler = { handle in
                        let data = handle.availableData
                        guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
                        handleOutput(text)
                    }

                    process.waitUntilExit()

                    stdoutPipe.fileHandleForReading.readabilityHandler = nil
                    stderrPipe.fileHandleForReading.readabilityHandler = nil
                    stdinPipe.fileHandleForWriting.closeFile()

                    if process.terminationStatus == 0 {
                        continuation.resume()
                    } else {
                        continuation.resume(throwing: GhError.commandFailed(
                            process.terminationStatus, allOutput
                        ))
                    }
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    var isAvailable: Bool { ghPath != nil }
}
