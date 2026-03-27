const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gitsidian_access_token',
  DRAFT_PREFIX: 'gitsidian_draft_',
  DIARY_DRAFT_PREFIX: 'gitsidian_diary_draft_',
};

class StorageService {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (e) {
      console.warn('localStorage read failed:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (e) {
      console.warn('localStorage write failed:', e instanceof Error ? e.message : e);
    }
  }

  removeAccessToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (e) {
      console.warn('localStorage write failed:', e instanceof Error ? e.message : e);
    }
  }

  getDraft(repoName: string): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.DRAFT_PREFIX + repoName);
    } catch (e) {
      console.warn('localStorage read failed:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  setDraft(repoName: string, content: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFT_PREFIX + repoName, content);
    } catch (e) {
      console.warn('localStorage write failed:', e instanceof Error ? e.message : e);
    }
  }

  removeDraft(repoName: string): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_PREFIX + repoName);
    } catch (e) {
      console.warn('localStorage write failed:', e instanceof Error ? e.message : e);
    }
  }

  getDiaryDraft(date: string): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.DIARY_DRAFT_PREFIX + date);
    } catch (e) {
      console.warn('localStorage read failed:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  setDiaryDraft(date: string, content: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DIARY_DRAFT_PREFIX + date, content);
    } catch (e) {
      console.warn('localStorage write failed:', e instanceof Error ? e.message : e);
    }
  }

  removeDiaryDraft(date: string): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DIARY_DRAFT_PREFIX + date);
    } catch (e) {
      console.warn('localStorage write failed:', e instanceof Error ? e.message : e);
    }
  }
}

export const storageService = new StorageService();
