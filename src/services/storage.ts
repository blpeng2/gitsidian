const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gitsidian_access_token',
  DRAFT_PREFIX: 'gitsidian_draft_',
};

class StorageService {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  }

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch {}
  }

  removeAccessToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {}
  }

  getDraft(repoName: string): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.DRAFT_PREFIX + repoName);
    } catch {
      return null;
    }
  }

  setDraft(repoName: string, content: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFT_PREFIX + repoName, content);
    } catch {}
  }

  removeDraft(repoName: string): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_PREFIX + repoName);
    } catch {}
  }
}

export const storageService = new StorageService();
