# AGENTS.md

Guide for AI coding agents working in this repository.

## Project Overview

Gitsidian is a client-side React app that turns GitHub repositories into an Obsidian-like knowledge graph. Each repo is a "note" with its README as content. Wiki-links (`[[repo-name]]`) in READMEs create graph connections between repos.

**Tech stack:** Vite 5 · React 18 · TypeScript 5 · Cytoscape.js (graph) · Octokit (GitHub API)

## Build & Run Commands

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Type-check (tsc) + production build (vite build)
npm run lint       # ESLint with zero warnings tolerance
npm run preview    # Preview production build locally
```

There is **no test suite**. Do not add test commands or test files unless explicitly asked.

### Worker (Cloudflare)

The `worker/` directory contains a separate Cloudflare Worker for OAuth token exchange.

```bash
cd worker
wrangler dev       # Local worker dev server
wrangler deploy    # Deploy to Cloudflare
```

Worker secrets (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are set via `wrangler secret put`, NOT in `wrangler.toml`.

## TypeScript Configuration

Strict mode is enabled with these enforced rules:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

**Do not** use `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix the type properly.

## Code Style

### File Structure

```
src/
  components/     # React components (PascalCase.tsx)
  services/       # API clients and business logic (camelCase.ts)
  types/          # TypeScript interfaces and type definitions
  utils/          # Pure utility functions (camelCase.ts)
  hooks/          # Custom React hooks (reserved, currently empty)
  styles/         # CSS files (reserved, currently empty)
worker/
  src/index.ts    # Cloudflare Worker entry point
```

### Imports

Order: external packages → relative imports. No blank lines between groups.

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { Core, EdgeSingular, NodeSingular } from 'cytoscape';
import { GraphData, FilterOptions } from '../types';
```

- Use named imports. Default imports only when the library requires it.
- Import types from `../types` (barrel export via `index.ts`).
- Use `type` keyword in imports only when needed for type-only imports.

### Naming Conventions

| Element          | Convention     | Example                          |
| ---------------- | -------------- | -------------------------------- |
| Components       | PascalCase     | `GraphView`, `LoginScreen`       |
| Component files  | PascalCase.tsx | `GraphView.tsx`                  |
| Functions        | camelCase      | `parseWikiLinks`, `fetchRepos`   |
| Variables        | camelCase      | `selectedRepo`, `edgeSet`        |
| Constants        | UPPER_SNAKE    | `WIKILINK_PATTERN`, `STORAGE_KEYS` |
| Interfaces       | PascalCase     | `GitHubRepo`, `GraphNode`       |
| Type unions      | PascalCase     | `AppAction`                      |
| Service files    | camelCase.ts   | `github.ts`, `storage.ts`       |
| CSS classes      | kebab-case     | `login-screen`, `graph-container`|

### TypeScript Types

- Use `interface` for object shapes and component props.
- Use `type` for unions and computed types.
- Export all shared types from `src/types/index.ts`.
- Inline prop interfaces in the component file, named `{ComponentName}Props`.

```typescript
// In component file
interface GraphViewProps {
  data: GraphData;
  filterOptions: FilterOptions;
  selectedRepo: string | null;
  onSelectNode: (repoName: string | null) => void;
}
```

### React Patterns

- **Functional components only** — no class components.
- **Function declarations** for components: `function GraphView() {}`, not arrow functions.
- **Props**: Destructure in the function signature.
- **State management**: `useReducer` in `App.tsx` with discriminated union actions (no Redux/Zustand).
- **Callbacks**: Prefix with `handle` for event handlers, `on` for props passed down.

```typescript
// App.tsx — reducer pattern
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_REPOS':
      return { ...state, repos: action.payload };
    // ...
  }
}

// Component — function declaration with destructured props
function MainLayout({ repos, onSelectRepo, onLogout }: MainLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  // ...
}
```

### Services

- Services are **singleton class instances** exported as `const`.
- One service per file in `src/services/`.

```typescript
class StorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
}
export const storageService = new StorageService();
```

### Error Handling

- Use `try/catch` in async functions.
- Dispatch errors to state via `SET_ERROR` action with a string message.
- Type-check errors: `error instanceof Error ? error.message : 'fallback'`.
- **Never** use empty catch blocks.

### CSS

- Plain CSS files — no CSS modules, no Tailwind, no CSS-in-JS.
- Global styles in `src/App.css` and `src/index.css`.
- Class names use **kebab-case**: `.login-screen`, `.graph-container`.

## Environment Variables

Vite `import.meta.env` variables (must start with `VITE_`):

| Variable               | Purpose                         | Where Set              |
| ---------------------- | ------------------------------- | ---------------------- |
| `VITE_OAUTH_CLIENT_ID` | GitHub OAuth App client ID      | GitHub Actions secret  |
| `VITE_GITHUB_TOKEN`    | Optional: auto-login PAT        | GitHub Actions secret  |

These are **build-time only** — baked into the JS bundle by Vite.

## Deployment

- **Frontend**: GitHub Pages via `.github/workflows/deploy.yml` (triggers on push to `main`).
- **Worker**: Manual deploy via `wrangler deploy` from `worker/` directory.
- **Base path**: Vite `base: '/gitsidian/'` — all assets served under `/gitsidian/`.

## OAuth Flow (Worker /callback)

1. Frontend redirects to GitHub OAuth (`getOAuthUrl()`)
2. GitHub redirects to Worker `/callback` with authorization code
3. Worker exchanges code for access token server-side
4. Worker redirects to frontend with `?access_token=TOKEN`
5. Frontend reads `access_token` from URL params → authenticated

The frontend **never** calls the worker API directly. No CORS concerns.

## Key Domain Concepts

- **Wiki-links**: `[[repo-name]]` or `[[repo-name|alias]]` syntax parsed from READMEs
- **Graph nodes**: Each GitHub repository is a node
- **Graph edges**: Created from wiki-links (type: `wikilink`) or shared topics (type: `topic`)
- **Orphan nodes**: Repos with no connections (no wiki-links, no shared topics)
- **Backlinks**: Repos that link TO a given repo
- **Outlinks**: Repos that a given repo links TO
