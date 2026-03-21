import { MetaNote, FilterOptions } from '../types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gitsidian_access_token',
  META_NOTES: 'gitsidian_meta_notes',
  FILTER_OPTIONS: 'gitsidian_filter_options',
  SELECTED_REPO: 'gitsidian_selected_repo',
};

// LocalStorage service for persisting app state
class StorageService {
  // Access Token
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  removeAccessToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  // Meta Notes
  getMetaNotes(): Record<string, MetaNote> {
    const data = localStorage.getItem(STORAGE_KEYS.META_NOTES);
    return data ? JSON.parse(data) : {};
  }

  getMetaNote(repoName: string): MetaNote | null {
    const notes = this.getMetaNotes();
    return notes[repoName] || null;
  }

  setMetaNote(note: MetaNote): void {
    const notes = this.getMetaNotes();
    notes[note.repoName] = {
      ...note,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.META_NOTES, JSON.stringify(notes));
  }

  deleteMetaNote(repoName: string): void {
    const notes = this.getMetaNotes();
    delete notes[repoName];
    localStorage.setItem(STORAGE_KEYS.META_NOTES, JSON.stringify(notes));
  }

  // Filter Options
  getFilterOptions(): FilterOptions {
    const data = localStorage.getItem(STORAGE_KEYS.FILTER_OPTIONS);
    return data ? JSON.parse(data) : {
      showPrivate: true,
      showPublic: true,
      showOrphans: true,
      topicFilter: null,
    };
  }

  setFilterOptions(options: FilterOptions): void {
    localStorage.setItem(STORAGE_KEYS.FILTER_OPTIONS, JSON.stringify(options));
  }

  // Selected Repo
  getSelectedRepo(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_REPO);
  }

  setSelectedRepo(repoName: string | null): void {
    if (repoName) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_REPO, repoName);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_REPO);
    }
  }

  // Clear all data
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Export data for backup
  exportData(): string {
    return JSON.stringify({
      metaNotes: this.getMetaNotes(),
      filterOptions: this.getFilterOptions(),
      selectedRepo: this.getSelectedRepo(),
    });
  }

  // Import data from backup
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.metaNotes) {
        localStorage.setItem(STORAGE_KEYS.META_NOTES, JSON.stringify(data.metaNotes));
      }
      if (data.filterOptions) {
        localStorage.setItem(STORAGE_KEYS.FILTER_OPTIONS, JSON.stringify(data.filterOptions));
      }
      if (data.selectedRepo) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_REPO, data.selectedRepo);
      }
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

export const storageService = new StorageService();
