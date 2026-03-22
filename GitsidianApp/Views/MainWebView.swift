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
            // Dev mode: load from Vite dev server
            if let url = URL(string: "http://localhost:5173") {
                webView.load(URLRequest(url: url))
            }
        } else if let webURL = findWebResourceURL() {
            webView.loadFileURL(
                webURL.appendingPathComponent("index.html"),
                allowingReadAccessTo: webURL
            )
        }
    }

    private func findWebResourceURL() -> URL? {
        let fm = FileManager.default

        if let url = Bundle.main.resourceURL?.appendingPathComponent("web"),
           fm.fileExists(atPath: url.appendingPathComponent("index.html").path) {
            return url
        }

        if let execDir = Bundle.main.executableURL?.deletingLastPathComponent() {
            let spmURL = execDir
                .appendingPathComponent("GitsidianApp_GitsidianApp.bundle")
                .appendingPathComponent("Resources")
                .appendingPathComponent("web")
            if fm.fileExists(atPath: spmURL.appendingPathComponent("index.html").path) {
                return spmURL
            }
        }

        return nil
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
