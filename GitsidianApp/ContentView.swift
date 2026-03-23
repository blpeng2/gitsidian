import SwiftUI

struct ContentView: View {
    @State private var showAIPanel = false
    @State private var aiPanelEverOpened = false  // 첫 열림 전까지 웹뷰 생성 안 함
    @State private var selectedProvider = "chatgpt"
    @State private var sidebarWidth: CGFloat = 450

    // provider별 독립 store — 세션 유지를 위해 분리
    @StateObject private var chatgptStore = AIPanelWebViewStore()
    @StateObject private var claudeStore = AIPanelWebViewStore()

    private var currentStore: AIPanelWebViewStore {
        selectedProvider == AIProvider.chatgpt.rawValue ? chatgptStore : claudeStore
    }

    var body: some View {
        HStack(spacing: 0) {
            MainWebView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)

            if showAIPanel {
                SidebarResizeHandle(width: $sidebarWidth)
            }

            // 사이드바가 닫힐 때는 width=0+clipped으로 숨김
            // aiPanelEverOpened 전까지는 내부를 렌더링하지 않아 앱 시작 속도 향상
            VStack(spacing: 0) {
                if aiPanelEverOpened {
                    PromptBar(selectedProvider: $selectedProvider, aiStore: currentStore)

                    // 각 provider webview를 항상 hierarchy에 유지 → 세션 보존
                    ZStack {
                        ForEach(AIProvider.allCases) { provider in
                            AIPanelView(
                                provider: provider,
                                store: provider == .chatgpt ? chatgptStore : claudeStore
                            )
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .opacity(selectedProvider == provider.rawValue ? 1 : 0)
                            .allowsHitTesting(selectedProvider == provider.rawValue)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .frame(width: showAIPanel ? sidebarWidth : 0)
            .clipped()
            .allowsHitTesting(showAIPanel)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
        .onReceive(NotificationCenter.default.publisher(for: .toggleAIPanel)) { _ in
            if !aiPanelEverOpened { aiPanelEverOpened = true }
            showAIPanel.toggle()
        }
    }
}

struct SidebarResizeHandle: View {
    @Binding var width: CGFloat
    @State private var isHovering = false
    @State private var isDragging = false
    @State private var startWidth: CGFloat = 0

    var body: some View {
        ZStack {
            Color.clear
                .frame(width: 8)
            Rectangle()
                .fill(isDragging ? Color.accentColor.opacity(0.8) :
                      isHovering ? Color.secondary.opacity(0.5) : Color.secondary.opacity(0.2))
                .frame(width: 1)
        }
        .contentShape(Rectangle())
        .onHover { hovering in
            isHovering = hovering
            if hovering {
                NSCursor.resizeLeftRight.push()
            } else {
                NSCursor.pop()
            }
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    if !isDragging {
                        isDragging = true
                        startWidth = width
                    }
                    let newWidth = startWidth - value.translation.width
                    width = max(250, min(800, newWidth))
                }
                .onEnded { _ in
                    isDragging = false
                }
        )
    }
}
