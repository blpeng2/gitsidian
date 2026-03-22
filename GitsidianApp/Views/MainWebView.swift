import SwiftUI
import WebKit

struct MainWebView: NSViewRepresentable {
    let devMode: Bool
    
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
            config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
            config.preferences.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        if #available(macOS 13.3, *) {
            webView.isInspectable = true
        }

        // Capture JS errors
        let errorScript = WKUserScript(
            source: """
                window.onerror = function(msg, url, line, col, error) {
                    window.webkit.messageHandlers.jsError.postMessage(
                        'JS Error: ' + msg + ' at ' + url + ':' + line + ':' + col
                    );
                };
                window.addEventListener('unhandledrejection', function(e) {
                    window.webkit.messageHandlers.jsError.postMessage(
                        'Unhandled rejection: ' + e.reason
                    );
                });
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(errorScript)
        config.userContentController.add(context.coordinator, name: "jsError")
        
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

        coordinator.observers.append(
            NotificationCenter.default.addObserver(forName: .oauthCallback, object: nil, queue: .main) { notification in
                if let token = notification.userInfo?["access_token"] as? String {
                    let escapedToken = token.replacingOccurrences(of: "'", with: "\\'")
                    let js = """
                        (function() {
                            localStorage.setItem('gitsidian_access_token', '\(escapedToken)');
                            window.location.search = '?access_token=\(escapedToken)';
                        })()
                    """
                    webView.evaluateJavaScript(js) { _, error in
                        if let error = error {
                            print("[Gitsidian] Token injection error:", error)
                        } else {
                            print("[Gitsidian] Token injected successfully")
                        }
                    }
                }
            }
        )
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var lastDevMode = false
        var observers: [Any] = []
        
        deinit {
            observers.forEach { NotificationCenter.default.removeObserver($0) }
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            
            // GitHub OAuth — open in system browser
            if url.host == "github.com" && url.path.contains("/login/oauth/authorize") {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            
            // External links — open in default browser (original b5036aa logic)
            if navigationAction.navigationType == .linkActivated,
               url.host != nil,
               !url.isFileURL,
               url.host != "localhost",
               url.host != "127.0.0.1" {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("[Gitsidian] didFinish:", webView.url?.absoluteString ?? "nil")

            // Diagnose page state
            webView.evaluateJavaScript("""
                (function() {
                    var result = {
                        title: document.title,
                        bodyLength: document.body ? document.body.innerHTML.length : 0,
                        rootContent: document.getElementById('root') ? document.getElementById('root').innerHTML.substring(0, 500) : 'NO #root',
                        scripts: Array.from(document.querySelectorAll('script')).map(function(s) { return { src: s.src, type: s.type }; }),
                        links: Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(function(l) { return { href: l.href, loaded: l.sheet !== null }; }),
                        errors: []
                    };
                    return JSON.stringify(result, null, 2);
                })()
            """) { result, error in
                if let json = result as? String {
                    print("[Gitsidian] Page diagnostics:", json)
                }
                if let error = error {
                    print("[Gitsidian] JS eval error:", error)
                }
            }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            print("[Gitsidian] \(message.name):", message.body)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("[Gitsidian] didFailProvisional:", error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("[Gitsidian] didFail:", error)
        }
    }
}
