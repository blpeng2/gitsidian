import SwiftUI
import WebKit

struct AIPanelView: NSViewRepresentable {
    let provider: AIProvider
    
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Use persistent storage so user stays logged in
        config.websiteDataStore = .default()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
        
        webView.load(URLRequest(url: provider.url))
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
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
