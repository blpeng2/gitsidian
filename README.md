# Gitsidian

A visual knowledge base for your GitHub repositories. Gitsidian turns repository READMEs into connected notes and maps the links between them.

## Quick Start

**Use now**: Visit https://blpeng2.github.io/gitsidian/ and enter your GitHub Personal Access Token.

**Personal instance**: See [Use as Your Own (Personal Instance)](#use-as-your-own-personal-instance) to deploy your own copy.

## How It Works

In Gitsidian, each repository is a note and its `README.md` is the note content.

Gitsidian parses wiki-links from your READMEs to build graph connections:

- `[[repo-name]]` creates a link to another repository
- `[[repo-name|alias]]` creates a link with custom display text
- Matching is case-insensitive

These links power the graph, backlinks, and local neighborhood views.

## Features

- README-based notes — each repository is a note
- Wiki-link parsing from `README.md`
- `[[repo-name]]` and `[[repo-name|alias]]` support
- Case-insensitive repository matching
- Backlinks panel to show repos that link to the selected repo
- Outlinks panel to show repos the selected repo links to
- Local graph mode with a 2-hop neighborhood view
- Graph search to find and highlight nodes
- Right-click context menu on nodes
- Open selected repo in GitHub
- Focus a node in the graph
- Show local graph for a node
- Node drag and re-layout
- Interactive graph visualization

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- A GitHub Personal Access Token with repository read access

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/gitsidian.git
cd gitsidian

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Use as Your Own (Personal Instance)

Deploy your own instance for private use:

1. Fork this repository.
2. Add `VITE_GITHUB_TOKEN` as a GitHub Actions secret.
3. Set the secret value to your GitHub Personal Access Token.
4. Enable GitHub Pages deployment from GitHub Actions.
5. Build and deploy the app to your fork.

If you are using a GitHub Actions workflow, make sure the token is available as `VITE_GITHUB_TOKEN` at build time.

## GitHub Personal Access Token Setup

Gitsidian uses a GitHub Personal Access Token (PAT) to read repository data.

### Creating a Token

1. Go to GitHub.com → Settings → Developer settings.
2. Open **Personal access tokens** → **Tokens (classic)** → **Generate new token**.
3. Select the `repo` scope to read your repositories.
4. Optionally add `read:user` to read your profile information.
5. Copy the token and store it securely.

### Using the Token

- Paste it into the deployed app when prompted, or
- Provide it as `VITE_GITHUB_TOKEN` for a personal GitHub Pages deployment

## Security Notes

- The app is client-side only; there is no backend server.
- Only the access token is stored for authentication.
- Use a token with read-only permissions.
- Keep personal deployments private if you embed the token at build time.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Vite | Build tool and dev server |
| React 18 | UI framework |
| TypeScript | Type safety |
| Octokit | GitHub API client |
| Cytoscape.js | Graph visualization |

## License

MIT

## PARA 노트 분류 시스템

Gitsidian은 PARA 방법론 기반의 자동 노트 분류를 지원합니다:

| 카테고리 | 설명 |
|----------|------|
| 📥 Inbox | 새 노트 기본값. 외부 스크랩, 메모, 아이디어 |
| 📌 Active | 현재 진행 중인 주제 |
| 📚 Reference | 장기 참조 자료, 허브 노트 |
| 🗃️ Archive | 완료/비활성 노트 |

규칙 엔진이 자동으로 카테고리 이동을 추천합니다. 자세한 내용은 [docs/PARA-SYSTEM.md](docs/PARA-SYSTEM.md)를 참조하세요.

## macOS 앱

네이티브 macOS 앱이 `GitsidianApp/` 디렉토리에 포함되어 있습니다.

### 추가 기능
- 🤖 AI 사이드 패널 (ChatGPT, Claude, Perplexity 임베드)
- 📝 AI 프롬프트 자동 주입
- ⌘ 네이티브 메뉴바 + 단축키

### 실행 방법
```bash
cd GitsidianApp
./build.sh    # React 빌드 + Swift 빌드
swift run     # 앱 실행
```
