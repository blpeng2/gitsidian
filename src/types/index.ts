// Repository types from GitHub API
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  topics: string[];
  updated_at: string;
  created_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

// GitHub user info
export interface GitHubUser {
  login: string;
  avatar_url: string;
}

// Wiki-link extracted from READMEs
export interface WikiLink {
  source: string; // Source repo name
  target: string; // Target repo name
  alias?: string; // Display alias if [[repo|alias]] syntax used
}

// Graph node for visualization
export interface GraphNode {
  data: {
    id: string;
    label: string;
    description: string | null;
    isPrivate: boolean;
    topics: string[];
    updatedAt: string;
    hasReadme: boolean;
    isOrphan: boolean;
    language: string | null;
    htmlUrl: string;
  };
}

// Graph edge for visualization
export interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: 'wikilink' | 'topic';
  };
}

// Cytoscape graph data
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Filter options for graph
export interface FilterOptions {
  showPrivate: boolean;
  showPublic: boolean;
  showOrphans: boolean;
  topicFilter: string | null;
}

export type NoteCategory = 'inbox' | 'active' | 'reference' | 'archive';

export type SaveStatus = 'saved' | 'modified' | 'saving' | 'error';

export interface CategoryRecommendation {
  repoName: string;
  currentCategory: NoteCategory;
  suggestedCategory: NoteCategory;
  reason: string;
}

// Diary entry metadata
export interface DiaryEntry {
  date: string;        // "YYYY-MM-DD"
  sha: string | null;  // null = file doesn't exist on GitHub yet
}

// App state
export interface AppState {
  isAuthenticated: boolean;
  accessToken: string | null;
  repos: GitHubRepo[];
  readmeContents: Record<string, string>;
  selectedRepo: string | null;
  openTabs: string[];
  filterOptions: FilterOptions;
  showCreateModal: boolean;
  showSearchModal: boolean;
  isEditingReadme: boolean;
  isLoading: boolean;
  isLoadingReadmes: boolean;
  error: string | null;
  viewMode: 'notes' | 'graph' | 'diary';
  categoryFilter: NoteCategory | 'all';
  currentUser: GitHubUser | null;
  diaryRepo: GitHubRepo | null;
  diaryEntries: Record<string, DiaryEntry>;
  diaryContents: Record<string, string>;
  selectedDiaryDate: string | null;
  isLoadingDiary: boolean;
}

// Action types
export type AppAction =
  | { type: 'SET_AUTHENTICATED'; payload: { isAuthenticated: boolean; accessToken: string | null } }
  | { type: 'SET_REPOS'; payload: GitHubRepo[] }
  | { type: 'ADD_REPO'; payload: GitHubRepo }
  | { type: 'SET_README_CONTENT'; payload: { repoName: string; content: string } }
  | { type: 'SET_ALL_README_CONTENTS'; payload: Record<string, string> }
  | { type: 'UPDATE_REPO_TOPICS'; payload: { repoName: string; topics: string[] } }
  | { type: 'SET_SELECTED_REPO'; payload: string | null }
  | { type: 'OPEN_TAB'; payload: string }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'SET_FILTER_OPTIONS'; payload: Partial<FilterOptions> }
  | { type: 'SET_SHOW_CREATE_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_SEARCH_MODAL'; payload: boolean }
  | { type: 'SET_EDITING_README'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_READMES'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VIEW_MODE'; payload: 'notes' | 'graph' | 'diary' }
  | { type: 'SET_CATEGORY_FILTER'; payload: NoteCategory | 'all' }
  | { type: 'SET_CURRENT_USER'; payload: GitHubUser | null }
  | { type: 'SET_DIARY_REPO'; payload: GitHubRepo | null }
  | { type: 'SET_DIARY_ENTRIES'; payload: Record<string, DiaryEntry> }
  | { type: 'SET_DIARY_CONTENT'; payload: { date: string; content: string; sha: string | null } }
  | { type: 'SET_SELECTED_DIARY_DATE'; payload: string | null }
  | { type: 'SET_LOADING_DIARY'; payload: boolean }
  | { type: 'SET_REPO_CATEGORY'; payload: { repoName: string; category: NoteCategory } };
