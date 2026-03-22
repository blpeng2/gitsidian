import SwiftUI

struct PromptBar: View {
    @Binding var selectedProvider: String
    @ObservedObject var aiStore: AIPanelWebViewStore

    var currentProvider: AIProvider {
        AIProvider(rawValue: selectedProvider) ?? .chatgpt
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Provider selector
            HStack(spacing: 4) {
                ForEach(AIProvider.allCases) { provider in
                    Button {
                        selectedProvider = provider.rawValue
                    } label: {
                        Text("\(provider.icon) \(provider.displayName)")
                            .font(.system(size: 12, weight: selectedProvider == provider.rawValue ? .semibold : .regular))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(selectedProvider == provider.rawValue ? Color.accentColor.opacity(0.2) : Color.clear)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            
            Divider()
            
            // Preset prompts
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(PromptTemplate.presets) { template in
                        Button {
                            sendPrompt(template)
                        } label: {
                            Text("\(template.icon) \(template.title)")
                                .font(.system(size: 11))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.secondary.opacity(0.1))
                                .cornerRadius(4)
                        }
                        .buttonStyle(.plain)
                        .help(template.title)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
            }
            
            Divider()
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private func sendPrompt(_ template: PromptTemplate) {
        let provider = currentProvider

        if provider == .perplexity, let url = provider.urlWithPrompt(template.prompt) {
            aiStore.navigateToURL(url)
        } else {
            aiStore.injectPrompt(template.prompt, provider: provider)
        }

        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(template.prompt, forType: .string)
    }
}
