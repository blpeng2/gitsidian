import Foundation

enum AIProvider: String, CaseIterable, Identifiable {
    case chatgpt = "chatgpt"
    case claude = "claude"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .chatgpt: return "ChatGPT"
        case .claude: return "Claude"
        }
    }

    var icon: String {
        switch self {
        case .chatgpt: return "🤖"
        case .claude: return "🧠"
        }
    }

    var savedURLDomain: String {
        switch self {
        case .chatgpt: return "openai.com"
        case .claude: return "claude.ai"
        }
    }

    var url: URL {
        switch self {
        case .chatgpt: return URL(string: "https://chat.openai.com")!
        case .claude: return URL(string: "https://claude.ai")!
        }
    }
}

struct PromptTemplate: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let prompt: String

    static let presets: [PromptTemplate] = [
        PromptTemplate(icon: "📝", title: "요약", prompt: "다음 노트 내용을 한국어로 간결하게 요약해줘:\n\n"),
        PromptTemplate(icon: "🔗", title: "위키링크 추천", prompt: "다음 노트와 관련된 주제나 연결할 수 있는 개념을 추천해줘. [[개념이름]] 형식으로 위키링크를 만들어줘:\n\n"),
        PromptTemplate(icon: "🔍", title: "관련 주제", prompt: "다음 노트에서 더 깊이 알아볼 만한 주제들을 찾아줘:\n\n"),
        PromptTemplate(icon: "✍️", title: "내용 보완", prompt: "다음 노트의 내용을 보완하고 확장해줘. 마크다운 형식을 유지해줘:\n\n"),
        PromptTemplate(icon: "🏷️", title: "토픽 추천", prompt: "다음 노트에 적합한 GitHub 토픽(태그)을 5개 추천해줘 (영문, 소문자, 하이픈만):\n\n"),
    ]
}
