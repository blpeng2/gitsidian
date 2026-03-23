import WebKit

/// app://localhost/ 커스텀 스킴으로 React 빌드 파일을 서빙하는 핸들러.
/// WKPreferences의 private KVC 키(allowUniversalAccessFromFileURLs 등)를 사용하지 않고
/// file:// 제약을 우회하기 위해 도입.
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    private let resourceURL: URL

    init(resourceURL: URL) {
        self.resourceURL = resourceURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        let rawPath = requestURL.path
        let relativePath = (rawPath.isEmpty || rawPath == "/") ? "index.html" : String(rawPath.dropFirst())
        let fileURL = resourceURL.appendingPathComponent(relativePath)

        do {
            let data = try Data(contentsOf: fileURL)
            let response = HTTPURLResponse(
                url: requestURL,
                statusCode: 200,
                httpVersion: "HTTP/1.1",
                headerFields: [
                    "Content-Type": Self.mimeType(for: fileURL.pathExtension),
                    "Content-Length": "\(data.count)"
                ]
            )!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            let response = HTTPURLResponse(
                url: requestURL,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: nil
            )!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didFinish()
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "css":  return "text/css"
        case "js", "mjs": return "application/javascript"
        case "json": return "application/json"
        case "svg":  return "image/svg+xml"
        case "png":  return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "ico":  return "image/x-icon"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf":  return "font/ttf"
        case "otf":  return "font/otf"
        default:     return "application/octet-stream"
        }
    }
}
