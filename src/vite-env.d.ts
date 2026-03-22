/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_TOKEN?: string;
  readonly VITE_OAUTH_CLIENT_ID?: string;
  readonly VITE_OAUTH_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
