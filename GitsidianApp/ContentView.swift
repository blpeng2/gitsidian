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

    private var currentProvider: AIProvider {
        AIProvider(rawValue: selectedProvider) ?? .chatgpt
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
        .onReceive(NotificationCenter.default.publisher(for: .diaryAIPrompt)) { notification in
            let diaryContent = notification.userInfo?["content"] as? String ?? ""
            let prompt = """
            다음은 내가 오늘 쓴 일기야:

            ---
            \(diaryContent)
            ---

            이 일기를 읽고, 내 이야기가 너무 재미있어서 더 듣고 싶어하는 친한 친구의 입장에서 질문해줘.

            규칙:
            - 각 문단을 읽고, 그 상황에서 자연스럽게 궁금해질 만한 것만 골라서 물어봐.
            - 이미 일기에 충분히 설명된 내용(언제, 어디서 등)은 다시 묻지 마.
            - "그래서 어떤 기분이었어?", "그 사람이 뭐라고 했어?", "왜 그렇게 한 거야?" 같은, 이야기를 더 끌어내는 질문을 해줘.
            - 문단당 질문은 1~2개만. 전부 다 물으려 하지 마.
            - 형식적이지 않게, 진짜 궁금한 톤으로 해줘.
            - 한국어로 해줘.
            """
            if !showAIPanel {
                if !aiPanelEverOpened { aiPanelEverOpened = true }
                showAIPanel = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [self] in
                self.currentStore.injectPrompt(prompt, provider: self.currentProvider)
            }
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
