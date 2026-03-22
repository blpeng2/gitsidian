import SwiftUI
import WebKit

class AIPanelWebViewStore: ObservableObject {
    var webView: WKWebView?

    func injectPrompt(_ prompt: String, provider: AIProvider) {
        guard let webView else {
            return
        }

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
        case .perplexity:
            js = """
            (function() {
                const el = document.querySelector('textarea')
                    || document.querySelector('[contenteditable="true"]');
                if (el) {
                    if (el.tagName === 'TEXTAREA') {
                        el.value = '\(escapedPrompt)';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        el.focus();
                        el.textContent = '\(escapedPrompt)';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            })();
            """
        }

        webView.evaluateJavaScript(js) { _, error in
            if let error {
                print("JS injection error: \(error)")
            }
        }
    }

    func navigateToURL(_ url: URL) {
        webView?.load(URLRequest(url: url))
    }
}

struct AIPanelView: NSViewRepresentable {
    let provider: AIProvider
    @ObservedObject var store: AIPanelWebViewStore
    
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Use persistent storage so user stays logged in
        config.websiteDataStore = .default()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

        DispatchQueue.main.async {
            store.webView = webView
        }
        
        webView.load(URLRequest(url: provider.url))
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        if store.webView !== nsView {
            DispatchQueue.main.async {
                store.webView = nsView
            }
        }

        // Only reload if provider changed
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
        
        init(provider: AIProvider) {
            self.currentProvider = provider
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Allow all navigation within AI provider sites
            decisionHandler(.allow)
        }
    }
}
