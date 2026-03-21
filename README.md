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
