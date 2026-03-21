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

// Meta note for each repository
export interface MetaNote {
  repoId: number;
  repoName: string;
  purpose: string;          // Why this repo exists
  keyIdeas: string;         // Core concepts
  relatedRepos: string[];   // [[repo-name]] links
  nextExperiments: string;  // What to try next
  publicReady: boolean;     // Can be made public?
  publicChecklist: {
    readme: boolean;
    license: boolean;
    sensitiveData: boolean;
    documentation: boolean;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Wiki-link extracted from meta notes
export interface WikiLink {
  source: string;  // Source repo name
  target: string;  // Target repo name
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
    hasMetaNote: boolean;
    isOrphan: boolean;
    publicReady: boolean;
  };
}

// Graph edge for visualization
export interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: 'wikilink' | 'topic' | 'manual';
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

// App state
export interface AppState {
  isAuthenticated: boolean;
  accessToken: string | null;
  repos: GitHubRepo[];
  metaNotes: Record<string, MetaNote>;
  selectedRepo: string | null;
  filterOptions: FilterOptions;
  isLoading: boolean;
  error: string | null;
}

// Action types
export type AppAction =
  | { type: 'SET_AUTHENTICATED'; payload: { isAuthenticated: boolean; accessToken: string | null } }
  | { type: 'SET_REPOS'; payload: GitHubRepo[] }
  | { type: 'SET_META_NOTE'; payload: MetaNote }
  | { type: 'SET_SELECTED_REPO'; payload: string | null }
  | { type: 'SET_FILTER_OPTIONS'; payload: Partial<FilterOptions> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
