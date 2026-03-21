# Gitsidian

A visual knowledge base for your GitHub repositories. Gitsidian helps you understand, organize, and document your repos with an interactive graph view and wiki-style linking.

## Quick Start

**Use now**: Visit https://blpeng2.github.io/gitsidian/ and enter your GitHub Personal Access Token on first visit.

**Fork for personal use**: See [Use as Your Own](#use-as-your-own-personal-instance) below for a private instance with auto-login.

## What It Does

Gitsidian connects to your GitHub account and creates a visual map of all your repositories. You can:

- Browse repos in an interactive graph visualization
- Write meta notes for each repository explaining purpose, key ideas, and future experiments
- Link repos together using `[[wiki-link]]` syntax
- Filter by privacy status, topics, and orphan status
- Track which repos are ready to be made public

## Features

- **Graph Visualization** - See all your repos as interconnected nodes. Connections form through wiki-links in meta notes and shared topics.
- **Meta Notes** - Add structured documentation to any repo: purpose, key concepts, related repos, and next experiments.
- **Privacy Tracking** - Each repo has a public readiness checklist (README, license, sensitive data check, documentation).
- **Smart Filtering** - Hide private repos, show only orphans (unlinked repos), or filter by GitHub topics.
- **Orphan Detection** - Quickly spot repos that have no connections to other repos in your collection.

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

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

Deploy your own private instance with auto-login. Your token is baked into the build, so you never have to enter it again.

1. **Fork this repo**
   - Click Fork on GitHub
   - Set the repository to **Private** (important for keeping your token secure)
   - Name it exactly `gitsidian`

2. **Add your GitHub token as a repository secret**
   - Go to Settings → Secrets and variables → Actions
   - Click **New repository secret**
   - Name: `VITE_GITHUB_TOKEN`
   - Value: Your GitHub Personal Access Token (needs `repo` and `read:user` scopes)
   - Click **Add secret**

3. **Enable GitHub Actions for Pages**
   - Go to Settings → Pages
   - Under "Build and deployment", select **GitHub Actions** as the source

4. **Trigger deployment**
   ```bash
   git commit --allow-empty -m "trigger deployment"
   git push origin main
   ```
   Or push any change to `main`.

5. **Visit your instance**
   ```
   https://<your-username>.github.io/gitsidian/
   ```
   You are auto-logged in. No password prompt.

**Security note**: Your token is embedded in the built JavaScript. Keep your repository **private** to prevent others from accessing your token.

## GitHub Pages Deployment

### Important: Repository Name

This app expects to be hosted at `/gitsidian/` path. Your GitHub repository **must** be named exactly `gitsidian` for the deployed version to work correctly. The base path is configured in `vite.config.ts`:

```typescript
base: '/gitsidian/',
```

### Deploy Steps

1. **Fork or rename your repo to `gitsidian`**

2. **Enable GitHub Actions for Pages**
   - Go to Settings > Pages in your repo
   - Under "Build and deployment", select **GitHub Actions** as the source

3. **Push to trigger deployment**
   ```bash
   git push origin main
   ```

4. **Visit your deployed app**
   ```
   https://yourusername.github.io/gitsidian
   ```

### Build Configuration

The included GitHub Actions workflow (`deploy.yml`) handles:
- Installing dependencies
- Building with correct base path
- Deploying to GitHub Pages

## GitHub Personal Access Token Setup

Gitsidian uses a Personal Access Token (PAT) to read your repositories. No OAuth, no backend, no server required.

### Creating a Token

1. Go to GitHub.com and sign in
2. Click your profile picture → Settings
3. Scroll down to **Developer settings** (bottom of left sidebar)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token (classic)**
6. Give it a name like "Gitsidian"
7. Set expiration as desired
8. Select these scopes:
   - `repo` - Full control of private repositories
   - `read:user` - Read user profile data
9. Click **Generate token**
10. Copy the token immediately (you cannot see it again)

### Using Your Token

When you first open Gitsidian, paste your token into the login screen. The app will validate it and fetch your repositories.

## Security Notes

- **Token Storage**: Your PAT is stored in browser localStorage. It never leaves your browser or gets sent to any server other than GitHub's API.
- **Token Scope**: The app only requests read access. It cannot modify, delete, or create repositories.
- **No Backend**: Gitsidian is a purely client-side application. There is no server storing your data.
- **Clear on Logout**: Clicking "Logout" removes the token from localStorage immediately.

## Tech Stack

- **Vite** - Build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Octokit** - GitHub API client
- **Cytoscape.js** - Graph visualization

## License

MIT
# Deployment trigger
