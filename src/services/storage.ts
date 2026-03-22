const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gitsidian_access_token',
  DRAFT_PREFIX: 'gitsidian_draft_',
};

class StorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  removeAccessToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  getDraft(repoName: string): string | null {
    return localStorage.getItem(STORAGE_KEYS.DRAFT_PREFIX + repoName);
  }

  setDraft(repoName: string, content: string): void {
    localStorage.setItem(STORAGE_KEYS.DRAFT_PREFIX + repoName, content);
  }

  removeDraft(repoName: string): void {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_PREFIX + repoName);
  }
}

export const storageService = new StorageService();
