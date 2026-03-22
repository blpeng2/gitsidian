import SwiftUI
import WebKit

struct MainWebView: NSViewRepresentable {
    let devMode: Bool
    
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        
        loadContent(webView)
        setupNotificationObservers(webView, context: context)
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        // Only reload if dev mode changed
        if context.coordinator.lastDevMode != devMode {
            context.coordinator.lastDevMode = devMode
            loadContent(nsView)
        }
    }
    
    private func loadContent(_ webView: WKWebView) {
        if devMode {
            if let url = URL(string: "http://localhost:5173") {
                webView.load(URLRequest(url: url))
            }
            return
        }
        
        let attempts = collectWebResourceAttempts()
        
        for attempt in attempts {
            print("[Gitsidian] Trying: \(attempt.label) → \(attempt.url.path)")
            let indexPath = attempt.url.appendingPathComponent("index.html").path
            if FileManager.default.fileExists(atPath: indexPath) {
                print("[Gitsidian] ✅ Found web resources at: \(attempt.url.path)")
                webView.loadFileURL(
                    attempt.url.appendingPathComponent("index.html"),
                    allowingReadAccessTo: attempt.url
                )
                return
            } else {
                print("[Gitsidian] ❌ index.html not found at: \(indexPath)")
            }
        }
        
        let debugHTML = """
        <html><body style="font-family:-apple-system;padding:40px;background:#1e1e2e;color:#cdd6f4">
        <h1>⚠️ Web resources not found</h1>
        <p>The app could not find the bundled web app. Paths tried:</p>
        <ul>\(attempts.map { "<li><b>\($0.label)</b><br><code>\($0.url.path)</code></li>" }.joined())</ul>
        <hr>
        <p><b>Bundle.main.bundlePath:</b> <code>\(Bundle.main.bundlePath)</code></p>
        <p><b>Bundle.main.resourceURL:</b> <code>\(Bundle.main.resourceURL?.path ?? "nil")</code></p>
        <p><b>Bundle.main.executableURL:</b> <code>\(Bundle.main.executableURL?.path ?? "nil")</code></p>
        </body></html>
        """
        print("[Gitsidian] ❌ All attempts failed. Showing debug info.")
        webView.loadHTMLString(debugHTML, baseURL: nil)
    }
    
    private struct WebResourceAttempt {
        let label: String
        let url: URL
    }

    private func collectWebResourceAttempts() -> [WebResourceAttempt] {
        var attempts: [WebResourceAttempt] = []
        
        if let url = Bundle.main.resourceURL?.appendingPathComponent("web") {
            attempts.append(WebResourceAttempt(label: "Bundle.main.resourceURL/web", url: url))
        }
        
        if let execURL = Bundle.main.executableURL {
            let url = execURL
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .appendingPathComponent("Resources")
                .appendingPathComponent("web")
            attempts.append(WebResourceAttempt(label: "Executable/../Resources/web", url: url))
        }
        
        if let execDir = Bundle.main.executableURL?.deletingLastPathComponent() {
            let url = execDir
                .appendingPathComponent("GitsidianApp_GitsidianApp.bundle")
                .appendingPathComponent("Resources")
                .appendingPathComponent("web")
            attempts.append(WebResourceAttempt(label: "SPM bundle/Resources/web", url: url))
        }
        
        let url4 = Bundle.main.bundleURL
            .appendingPathComponent("Contents")
            .appendingPathComponent("Resources")
            .appendingPathComponent("web")
        attempts.append(WebResourceAttempt(label: "bundleURL/Contents/Resources/web", url: url4))
        
        let url5 = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            .appendingPathComponent("Resources")
            .appendingPathComponent("web")
        attempts.append(WebResourceAttempt(label: "CWD/Resources/web", url: url5))
        
        return attempts
    }
    
    private func setupNotificationObservers(_ webView: WKWebView, context: Context) {
        let coordinator = context.coordinator
        
        coordinator.observers.append(
            NotificationCenter.default.addObserver(forName: Notification.Name("reloadWebApp"), object: nil, queue: .main) { _ in
                webView.reload()
            }
        )
        
        coordinator.observers.append(
            NotificationCenter.default.addObserver(forName: Notification.Name("createNewNote"), object: nil, queue: .main) { _ in
                webView.evaluateJavaScript("document.querySelector('.create-btn')?.click()")
            }
        )
        
        coordinator.observers.append(
            NotificationCenter.default.addObserver(forName: Notification.Name("switchToNotes"), object: nil, queue: .main) { _ in
                webView.evaluateJavaScript("document.querySelector('.view-toggle-btn:first-child')?.click()")
            }
        )
        
        coordinator.observers.append(
            NotificationCenter.default.addObserver(forName: Notification.Name("switchToGraph"), object: nil, queue: .main) { _ in
                webView.evaluateJavaScript("document.querySelector('.view-toggle-btn:nth-child(2)')?.click()")
            }
        )
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        var lastDevMode = false
        var observers: [Any] = []
        
        deinit {
            observers.forEach { NotificationCenter.default.removeObserver($0) }
        }
        
        // Open external links in default browser
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               navigationAction.navigationType == .linkActivated,
               url.host != nil,
               !url.isFileURL {
                // External link — open in browser
                if url.host != "localhost" && url.host != "127.0.0.1" {
                    NSWorkspace.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }
            }
            decisionHandler(.allow)
        }
    }
}
