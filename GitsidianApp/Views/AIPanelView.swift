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
                    || document.querySelector('textarea[placeholder*="Message"]')
                    || document.querySelector('textarea')
                    || document.querySelector('[contenteditable="true"]');
                if (el) {
                    if (el.tagName === 'TEXTAREA') {
                        el.value = '\(escapedPrompt)';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
                        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
                    } else {
                        el.focus();
                        el.innerHTML = '<p>' + '\(escapedPrompt)'.replace(/\\n/g, '</p><p>') + '</p>';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    
                    function tryClickSend(attempt = 0) {
                        const sendBtn = document.querySelector('button[data-testid="send-button"]')
                            || document.querySelector('button[aria-label="Send prompt"]')
                            || document.querySelector('button[aria-label="Send message"]')
                            || document.querySelector('[data-testid="send-button"]')
                            || document.querySelector('button[aria-label*="send" i]')
                            || document.querySelector('form button[type="submit"]')
                            || document.querySelector('button:has(svg)')
                        console.log('Attempt', attempt, 'Found button:', sendBtn, 'Disabled:', sendBtn?.disabled);
                        if (sendBtn) {
                            const rect = sendBtn.getBoundingClientRect();
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                clientX: rect.left + rect.width/2,
                                clientY: rect.top + rect.height/2
                            });
                            sendBtn.dispatchEvent(clickEvent);
                            console.log('Click event dispatched');
                        } else if (attempt < 10) {
                            setTimeout(() => tryClickSend(attempt + 1), 200);
                        }
                    }
                    setTimeout(() => tryClickSend(), 300);
                }
            })();
            """
        case .claude:
            js = """
            (function() {
                const el = document.querySelector('[contenteditable="true"]')
                    || document.querySelector('.ProseMirror')
                    || document.querySelector('div[contenteditable]');
                if (el) {
                    el.focus();
                    el.innerHTML = '<p>' + '\(escapedPrompt)'.replace(/\\n/g, '</p><p>') + '</p>';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Trigger keydown/keyup to activate submit button
                    const keyEvent = new KeyboardEvent('keydown', {
                        key: 'a',
                        bubbles: true,
                        keyCode: 65
                    });
                    el.dispatchEvent(keyEvent);
                    el.dispatchEvent(new KeyboardEvent('keyup', {
                        key: 'a',
                        bubbles: true,
                        keyCode: 65
                    }));
                    
                    function tryClickSend(attempt = 0) {
                        const formSubmitBtn = el.closest('form')?.querySelector('button[type="submit"]');
                        const sendBtn = document.querySelector('button[aria-label="Send message"]')
                            || document.querySelector('button[type="submit"]')
                            || formSubmitBtn
                            || document.querySelector('button:has(svg)')
                        console.log('Claude attempt', attempt, 'Found button:', sendBtn, 'Disabled:', sendBtn?.disabled);
                        if (sendBtn) {
                            const rect = sendBtn.getBoundingClientRect();
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                clientX: rect.left + rect.width/2,
                                clientY: rect.top + rect.height/2
                            });
                            sendBtn.dispatchEvent(clickEvent);
                            console.log('Claude click event dispatched');
                        } else if (attempt < 10) {
                            setTimeout(() => tryClickSend(attempt + 1), 200);
                        }
                    }
                    setTimeout(() => tryClickSend(), 300);
                }
            })();
            """
        }

        webView.evaluateJavaScript(js) { result, error in
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

        let consoleScript = WKUserScript(source: """
            window.console.log = function(...args) {
                window.webkit.messageHandlers.consoleLog.postMessage(args.join(' '));
            };
            window.console.error = function(...args) {
                window.webkit.messageHandlers.consoleLog.postMessage('ERROR: ' + args.join(' '));
            };
        """, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        config.userContentController.addUserScript(consoleScript)
        config.userContentController.add(context.coordinator, name: "consoleLog")

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

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var currentProvider: AIProvider
        private var urlObservation: NSKeyValueObservation?

        init(provider: AIProvider) {
            self.currentProvider = provider
        }

        deinit {
            urlObservation?.invalidate()
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "consoleLog" {
                print("[WebView] \(message.body)")
            }
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
