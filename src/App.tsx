import { useReducer, useEffect } from 'react';
import { AppState, AppAction, MetaNote, FilterOptions } from './types';
import { githubService } from './services/github';
import { storageService } from './services/storage';
import { generateGraphData } from './utils/wikiLinks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import './App.css';

// Initial state
const initialState: AppState = {
  isAuthenticated: false,
  accessToken: null,
  repos: [],
  metaNotes: {},
  selectedRepo: null,
  filterOptions: {
    showPrivate: true,
    showPublic: true,
    showOrphans: true,
    topicFilter: null,
  },
  isLoading: false,
  error: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        accessToken: action.payload.accessToken,
      };
    case 'SET_REPOS':
      return {
        ...state,
        repos: action.payload,
      };
    case 'SET_META_NOTE':
      return {
        ...state,
        metaNotes: {
          ...state.metaNotes,
          [action.payload.repoName]: action.payload,
        },
      };
    case 'SET_SELECTED_REPO':
      return {
        ...state,
        selectedRepo: action.payload,
      };
    case 'SET_FILTER_OPTIONS':
      return {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.payload,
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app from localStorage or environment token
  useEffect(() => {
    const savedToken = storageService.getAccessToken();
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    const savedMetaNotes = storageService.getMetaNotes();
    const savedFilterOptions = storageService.getFilterOptions();
    const savedSelectedRepo = storageService.getSelectedRepo();

    // Use saved token if available, otherwise use env token if no saved token exists
    const tokenToUse = savedToken || (envToken && !savedToken ? envToken : null);

    if (tokenToUse) {
      githubService.setAccessToken(tokenToUse);
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { isAuthenticated: true, accessToken: tokenToUse },
      });
    }

    // Load saved meta notes
    Object.values(savedMetaNotes).forEach(note => {
      dispatch({ type: 'SET_META_NOTE', payload: note });
    });

    dispatch({ type: 'SET_FILTER_OPTIONS', payload: savedFilterOptions });
    dispatch({ type: 'SET_SELECTED_REPO', payload: savedSelectedRepo });
  }, []);

  // Fetch repos when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.repos.length === 0) {
      fetchRepos();
    }
  }, [state.isAuthenticated]);

  // Fetch repositories
  const fetchRepos = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const repos = await githubService.fetchRepos();
      dispatch({ type: 'SET_REPOS', payload: repos });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to fetch repositories',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Handle login with token
  const handleLogin = async (token: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      githubService.setAccessToken(token);
      const isValid = await githubService.validateToken();

      if (isValid) {
        storageService.setAccessToken(token);
        dispatch({
          type: 'SET_AUTHENTICATED',
          payload: { isAuthenticated: true, accessToken: token },
        });
      } else {
        throw new Error('Invalid access token');
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Handle logout
  const handleLogout = () => {
    storageService.removeAccessToken();
    dispatch({
      type: 'SET_AUTHENTICATED',
      payload: { isAuthenticated: false, accessToken: null },
    });
    dispatch({ type: 'SET_REPOS', payload: [] });
  };

  // Save meta note
  const handleSaveMetaNote = (note: MetaNote) => {
    storageService.setMetaNote(note);
    dispatch({ type: 'SET_META_NOTE', payload: note });
  };

  // Select repository
  const handleSelectRepo = (repoName: string | null) => {
    storageService.setSelectedRepo(repoName);
    dispatch({ type: 'SET_SELECTED_REPO', payload: repoName });
  };

  // Update filter options
  const handleUpdateFilters = (options: Partial<FilterOptions>) => {
    const newOptions = { ...state.filterOptions, ...options };
    storageService.setFilterOptions(newOptions);
    dispatch({ type: 'SET_FILTER_OPTIONS', payload: options });
  };

  // Generate graph data
  const graphData = generateGraphData(state.repos, state.metaNotes);

  // Get selected repo data
  const selectedRepoData = state.repos.find(r => r.name === state.selectedRepo);
  const selectedMetaNote = state.selectedRepo ? state.metaNotes[state.selectedRepo] : null;

  if (!state.isAuthenticated) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={state.isLoading}
        error={state.error}
      />
    );
  }

  return (
    <MainLayout
      repos={state.repos}
      metaNotes={state.metaNotes}
      selectedRepo={selectedRepoData || null}
      selectedMetaNote={selectedMetaNote}
      graphData={graphData}
      filterOptions={state.filterOptions}
      isLoading={state.isLoading}
      error={state.error}
      onSelectRepo={handleSelectRepo}
      onSaveMetaNote={handleSaveMetaNote}
      onUpdateFilters={handleUpdateFilters}
      onRefresh={fetchRepos}
      onLogout={handleLogout}
    />
  );
}

export default App;
