import SwiftUI

struct ContentView: View {
    @Binding var showAIPanel: Bool
    @Binding var selectedProvider: String
    @Binding var devMode: Bool
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
    }
}
