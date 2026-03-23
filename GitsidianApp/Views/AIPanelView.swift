import SwiftUI
import WebKit

final class AIPanelWebViewStore: ObservableObject {
    var webView: WKWebView?

    func injectPrompt(_ prompt: String, provider: AIProvider) {
        guard let webView else { return }

        let escapedPrompt = prompt
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "")

        let js: String
        switch provider {
        case .chatgpt:
            js = """
            (function() {
                const el = document.querySelector('#prompt-textarea')
                    || document.querySelector('textarea')
                    || document.querySelector('[contenteditable="true"]');
                if (el) {
                    if (el.tagName === 'TEXTAREA') {
                        el.value = '\(escapedPrompt)';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        el.focus();
                        el.innerHTML = '<p>' + '\(escapedPrompt)'.replace(/\\n/g, '</p><p>') + '</p>';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            })();
            """
        case .claude:
            js = """
            (function() {
                const el = document.querySelector('[contenteditable="true"]')
                    || document.querySelector('.ProseMirror');
                if (el) {
                    el.focus();
                    el.innerHTML = '<p>' + '\(escapedPrompt)'.replace(/\\n/g, '</p><p>') + '</p>';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            })();
            """
        }

        webView.evaluateJavaScript(js) { _, error in
            if let error { print("JS injection error: \(error)") }
        }
    }

    func navigateToURL(_ url: URL) {
        webView?.load(URLRequest(url: url))
    }
}

struct AIPanelView: NSViewRepresentable {
    let provider: AIProvider
    let store: AIPanelWebViewStore

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isInspectable = true
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

        store.webView = webView

        let savedURLString = UserDefaults.standard.string(forKey: "ai_last_url_\(provider.rawValue)")
        let loadURL = savedURLString.flatMap(URL.init) ?? provider.url
        webView.load(URLRequest(url: loadURL))

        context.coordinator.startObservingURL(webView)
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        if store.webView !== nsView {
            store.webView = nsView
        }
        if context.coordinator.currentProvider != provider {
            context.coordinator.currentProvider = provider
            nsView.load(URLRequest(url: provider.url))
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(provider: provider)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        var currentProvider: AIProvider
        private var urlObservation: NSKeyValueObservation?

        init(provider: AIProvider) {
            self.currentProvider = provider
        }

        deinit {
            urlObservation?.invalidate()
        }

        func startObservingURL(_ webView: WKWebView) {
            urlObservation = webView.observe(\.url, options: [.new]) { [weak self] webView, _ in
                guard let self,
                      let url = webView.url,
                      let host = url.host,
                      host.hasSuffix(self.currentProvider.savedURLDomain) else { return }
                UserDefaults.standard.set(url.absoluteString, forKey: "ai_last_url_\(self.currentProvider.rawValue)")
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            UserDefaults.standard.removeObject(forKey: "ai_last_url_\(currentProvider.rawValue)")
            webView.load(URLRequest(url: currentProvider.url))
        }
    }
}
