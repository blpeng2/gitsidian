import Foundation

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
