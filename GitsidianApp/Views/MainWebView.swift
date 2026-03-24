import SwiftUI
import WebKit

struct MainWebView: NSViewRepresentable {

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(WeakScriptMessageHandler(delegate: context.coordinator), name: "toggleAIPanel")
        config.userContentController.add(
            WeakScriptMessageHandler(delegate: context.coordinator),
            name: "ghCli"
        )

        // macOS 26에서 제거된 private WKPreferences KVC 키들을 대체:
        //   developerExtrasEnabled → webView.isInspectable = true
        //   allowFileAccessFromFileURLs / allowUniversalAccessFromFileURLs → gitsidian:// 커스텀 스킴 핸들러
        if let resourceURL = findWebResourceURL() {
            config.setURLSchemeHandler(AppSchemeHandler(resourceURL: resourceURL), forURLScheme: "gitsidian")
            context.coordinator.hasWebResources = true
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isInspectable = true  // 'developerExtrasEnabled' KVC 대체 (macOS 13.3+)

        loadContent(webView, devMode: false, hasResources: context.coordinator.hasWebResources)
        setupNotificationObservers(webView, context: context)
        context.coordinator.webView = webView

        Task {
            await GhService.shared.setup()
            let isAvailable = await GhService.shared.isAvailable
            await MainActor.run {
                webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('ghReady', { detail: { available: \(isAvailable) } }))")
            }
        }

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
    }

    // MARK: - Content Loading

    private func loadContent(_ webView: WKWebView, devMode: Bool, hasResources: Bool = true) {
        if devMode {
            if let url = URL(string: "http://localhost:5173") {
                webView.load(URLRequest(url: url))
            }
            return
        }
        guard hasResources, let url = URL(string: "gitsidian://localhost/") else { return }
        webView.load(URLRequest(url: url))
    }

    private func findWebResourceURL() -> URL? {
        let fm = FileManager.default

        // .app 번들 (bundle.sh 결과물)
        if let url = Bundle.main.resourceURL?.appendingPathComponent("web"),
           fm.fileExists(atPath: url.appendingPathComponent("index.html").path) {
            return url
        }

        // swift build 결과물 (두 단계 위 → Resources/web)
        if let execURL = Bundle.main.executableURL {
            let url = execURL
                .deletingLastPathComponent()
                .deletingLastPathComponent()
                .appendingPathComponent("Resources")
                .appendingPathComponent("web")
            if fm.fileExists(atPath: url.appendingPathComponent("index.html").path) {
                return url
            }
        }

        // SwiftPM .bundle (swift run)
        if let execDir = Bundle.main.executableURL?.deletingLastPathComponent() {
            let url = execDir
                .appendingPathComponent("GitsidianApp_GitsidianApp.bundle")
                .appendingPathComponent("Resources")
                .appendingPathComponent("web")
            if fm.fileExists(atPath: url.appendingPathComponent("index.html").path) {
                return url
            }
        }

        return nil
    }

    // MARK: - Notification Observers

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
            NotificationCenter.default.addObserver(forName: .toggleDevMode, object: nil, queue: .main) { _ in
                coordinator.devMode.toggle()
                self.loadContent(webView, devMode: coordinator.devMode, hasResources: coordinator.hasWebResources)
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
                        }
                    }
                }
            }
        )
    }

    // MARK: - Coordinator

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var devMode = false
        var hasWebResources = false
        var observers: [Any] = []
        weak var webView: WKWebView?

        deinit {
            observers.forEach { NotificationCenter.default.removeObserver($0) }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // GitHub OAuth → 시스템 브라우저에서 열기
            if url.host == "github.com" && url.path.contains("/login/oauth/authorize") {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            // 외부 링크 → 시스템 브라우저 (gitsidian:// / localhost 제외)
            if navigationAction.navigationType == .linkActivated,
               url.host != nil,
               !url.isFileURL,
               url.scheme != "gitsidian",
               url.host != "localhost",
               url.host != "127.0.0.1" {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "toggleAIPanel" {
                NotificationCenter.default.post(name: .toggleAIPanel, object: nil)
            }

            if message.name == "ghCli" {
                guard let body = message.body as? [String: Any],
                      let callId = body["id"] as? String,
                      let action = body["action"] as? String else { return }

                let weakWebView = self.webView

                Task {
                    func sendResult(_ id: String, _ success: Bool, _ data: String) {
                        let js = "window.__ghCallback('\\(id)', \\(success), \\(data))"
                        Task { @MainActor in
                            _ = try? await weakWebView?.evaluateJavaScript(js)
                        }
                    }

                    do {
                        switch action {
                        case "checkAuth":
                            let ok = await GhService.shared.isAuthenticated()
                            sendResult(callId, ok, ok ? "true" : "null")

                        case "login":
                            let weakWebView2 = self.webView
                            try await GhService.shared.login { userCode, verificationUri in
                                let escaped = userCode.replacingOccurrences(of: "'", with: "\\'")
                                let uriEscaped = verificationUri.replacingOccurrences(of: "'", with: "\\'")
                                let codeJs = "window.dispatchEvent(new CustomEvent('ghDeviceCode',{detail:{code:'\(escaped)',url:'\(uriEscaped)'}}))"
                                Task { @MainActor in
                                    _ = try? await weakWebView2?.evaluateJavaScript(codeJs)
                                }
                                if let url = URL(string: verificationUri) {
                                    DispatchQueue.main.async {
                                        NSWorkspace.shared.open(url)
                                    }
                                }
                            }
                            sendResult(callId, true, "true")

                        case "getToken":
                            let token = try await GhService.shared.getToken()
                            let escaped = token.replacingOccurrences(of: "\"", with: "\\\"")
                            sendResult(callId, true, "\"\(escaped)\"")

                        case "isAvailable":
                            let available = await GhService.shared.isAvailable
                            sendResult(callId, true, available ? "true" : "false")

                        default:
                            sendResult(callId, false, "\"Unknown action: \(action)\"")
                        }
                    } catch GhError.notFound {
                        sendResult(callId, false, "\"gh not found\"")
                    } catch GhError.commandFailed(let code, let stderr) {
                        let escaped = stderr.replacingOccurrences(of: "\"", with: "\\\"")
                            .replacingOccurrences(of: "\n", with: "\\n")
                        sendResult(callId, false, "\"exit \(code): \(escaped)\"")
                    } catch {
                        let escaped = error.localizedDescription.replacingOccurrences(of: "\"", with: "\\\"")
                        sendResult(callId, false, "\"\(escaped)\"")
                    }
                }
            }
        }
    }
}

/// WKUserContentController가 message handler를 강하게 참조하므로
/// 순환 참조를 방지하기 위한 weak proxy.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
