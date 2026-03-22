import SwiftUI

struct ContentView: View {
    @State private var showAIPanel = false
    @State private var selectedProvider = "chatgpt"
    @State private var devMode = false
    @StateObject private var aiStore = AIPanelWebViewStore()
    
    var body: some View {
        HSplitView {
            MainWebView(devMode: devMode)
                .frame(minWidth: 500)
            
            if showAIPanel {
                VStack(spacing: 0) {
                    PromptBar(selectedProvider: $selectedProvider, aiStore: aiStore)
                    AIPanelView(
                        provider: AIProvider(rawValue: selectedProvider) ?? .chatgpt,
                        store: aiStore
                    )
                }
                .frame(minWidth: 350, idealWidth: 450, maxWidth: 600)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onReceive(NotificationCenter.default.publisher(for: .toggleAIPanel)) { _ in
            showAIPanel.toggle()
        }
        .onReceive(NotificationCenter.default.publisher(for: .toggleDevMode)) { _ in
            devMode.toggle()
        }
    }
}
