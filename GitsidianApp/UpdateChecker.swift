import Foundation
import AppKit

struct UpdateInfo {
    let version: String
    let downloadUrl: String
    let releaseUrl: String
}

actor UpdateChecker {
    static let shared = UpdateChecker()

    private let repoOwner = "blpeng2"
    private let repoName  = "gitsidian"

    private var currentVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
    }

    func check() async -> UpdateInfo? {
        let apiURL = URL(string: "https://api.github.com/repos/\(repoOwner)/\(repoName)/releases/latest")!
        var req = URLRequest(url: apiURL)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 10

        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let tagName   = json["tag_name"]  as? String,
              let htmlUrl   = json["html_url"]  as? String,
              let assets    = json["assets"]    as? [[String: Any]] else { return nil }

        let latestVersion = tagName.hasPrefix("v") ? String(tagName.dropFirst()) : tagName

        guard isNewer(latestVersion, than: currentVersion) else { return nil }

        let arch = isSiliconMac() ? "arm64" : "x86_64"
        let dmgUrl = assets
            .compactMap { $0["browser_download_url"] as? String }
            .first { $0.contains(arch) && $0.hasSuffix(".dmg") }
            ?? htmlUrl

        return UpdateInfo(version: latestVersion, downloadUrl: dmgUrl, releaseUrl: htmlUrl)
    }

    /// 자동 업데이트 실행: 다운로드 → 압축 해제 → 교체 스크립트 → 재시작
    func performUpdate(downloadUrl: String, onProgress: @escaping (String) -> Void) async {
        guard let url = URL(string: downloadUrl) else { return }

        // 1. 다운로드
        onProgress("downloading")
        guard let (tmpUrl, _) = try? await URLSession.shared.download(from: url) else {
            onProgress("error")
            return
        }

        // 2. 압축 해제
        onProgress("installing")
        let extractDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("gitsidian_update_\(UUID().uuidString)")
        do {
            try FileManager.default.createDirectory(at: extractDir, withIntermediateDirectories: true)
            let unzip = Process()
            unzip.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
            unzip.arguments = ["-o", tmpUrl.path, "-d", extractDir.path]
            unzip.standardOutput = FileHandle.nullDevice
            unzip.standardError = FileHandle.nullDevice
            try unzip.run()
            unzip.waitUntilExit()
            guard unzip.terminationStatus == 0 else { onProgress("error"); return }
        } catch {
            onProgress("error")
            return
        }

        // 3. 새 .app 경로 찾기
        guard let appEntry = (try? FileManager.default.contentsOfDirectory(atPath: extractDir.path))?
            .first(where: { $0.hasSuffix(".app") }) else {
            onProgress("error")
            return
        }
        let newAppPath = extractDir.appendingPathComponent(appEntry).path
        let currentAppPath = Bundle.main.bundlePath

        // 4. 교체 스크립트 작성
        let scriptContent = """
        #!/bin/bash
        sleep 2
        rm -rf "\(currentAppPath)"
        mv "\(newAppPath)" "\(currentAppPath)"
        xattr -cr "\(currentAppPath)" 2>/dev/null
        open "\(currentAppPath)"
        """
        let scriptPath = FileManager.default.temporaryDirectory
            .appendingPathComponent("gitsidian_updater_\(UUID().uuidString).sh")
        guard (try? scriptContent.write(to: scriptPath, atomically: true, encoding: .utf8)) != nil,
              (try? FileManager.default.setAttributes([.posixPermissions: 0o755],
                                                       ofItemAtPath: scriptPath.path)) != nil
        else { onProgress("error"); return }

        // 5. 스크립트를 분리 프로세스로 실행
        let launcher = Process()
        launcher.executableURL = URL(fileURLWithPath: "/bin/bash")
        launcher.arguments = [scriptPath.path]
        launcher.standardInput = FileHandle.nullDevice
        launcher.standardOutput = FileHandle.nullDevice
        launcher.standardError = FileHandle.nullDevice
        guard (try? launcher.run()) != nil else { onProgress("error"); return }

        // 6. 재시작 진행 상태 알린 후 앱 종료
        onProgress("restarting")
        try? await Task.sleep(nanoseconds: 800_000_000)
        await MainActor.run { NSApp.terminate(nil) }
    }

    private func isNewer(_ a: String, than b: String) -> Bool {
        let pa = a.split(separator: ".").compactMap { Int($0) }
        let pb = b.split(separator: ".").compactMap { Int($0) }
        for i in 0..<max(pa.count, pb.count) {
            let va = i < pa.count ? pa[i] : 0
            let vb = i < pb.count ? pb[i] : 0
            if va > vb { return true }
            if va < vb { return false }
        }
        return false
    }

    private func isSiliconMac() -> Bool {
        #if arch(arm64)
        return true
        #else
        return false
        #endif
    }
}
