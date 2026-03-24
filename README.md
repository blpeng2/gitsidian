# Gitsidian

A visual knowledge base for your GitHub repositories. Gitsidian turns repository READMEs into connected notes and maps the links between them.

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
