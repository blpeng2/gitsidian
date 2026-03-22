import { useEffect, useReducer } from 'react';
import { AppAction, AppState, FilterOptions } from './types';
import { githubService } from './services/github';
import { storageService } from './services/storage';
import { generateGraphData } from './utils/wikiLinks';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import './App.css';

const initialState: AppState = {
  isAuthenticated: false,
  accessToken: null,
  repos: [],
  readmeContents: {},
  selectedRepo: null,
  filterOptions: {
    showPrivate: true,
    showPublic: true,
    showOrphans: true,
    topicFilter: null,
  },
  isLoading: false,
  isLoadingReadmes: false,
  error: null,
};

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
        readmeContents: {},
        selectedRepo: action.payload.some((repo) => repo.name === state.selectedRepo)
          ? state.selectedRepo
          : null,
      };
    case 'SET_README_CONTENT':
      return {
        ...state,
        readmeContents: {
          ...state.readmeContents,
          [action.payload.repoName]: action.payload.content,
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
    case 'SET_LOADING_READMES':
      return {
        ...state,
        isLoadingReadmes: action.payload,
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

  const handleOAuthCallback = async (code: string, returnedState: string | null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const expectedState = sessionStorage.getItem('oauth_state');
      sessionStorage.removeItem('oauth_state');

      if (expectedState && returnedState !== expectedState) {
        throw new Error('OAuth state mismatch. Please try logging in again.');
      }

      const token = await githubService.handleOAuthCallback(code);
      storageService.setAccessToken(token);
      githubService.setAccessToken(token);
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { isAuthenticated: true, accessToken: token },
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'OAuth failed',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const code = urlParams.get('code');
    const oauthState = urlParams.get('state');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      dispatch({ type: 'SET_ERROR', payload: `GitHub OAuth failed: ${oauthError}` });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (accessToken) {
      storageService.setAccessToken(accessToken);
      githubService.setAccessToken(accessToken);
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { isAuthenticated: true, accessToken },
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      void handleOAuthCallback(code, oauthState);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const savedToken = storageService.getAccessToken();
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    const tokenToUse = savedToken || (envToken && !savedToken ? envToken : null);

    if (tokenToUse) {
      githubService.setAccessToken(tokenToUse);
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { isAuthenticated: true, accessToken: tokenToUse },
      });
    }
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && state.repos.length === 0) {
      void fetchRepos();
    }
  }, [state.isAuthenticated, state.repos.length]);

  const fetchRepos = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_LOADING_READMES', payload: false });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_REPOS', payload: [] });

    try {
      const repos = await githubService.fetchRepos();
      dispatch({ type: 'SET_REPOS', payload: repos });

      dispatch({ type: 'SET_LOADING_READMES', payload: true });
      const readmeContents = await githubService.fetchAllReadmes(repos);
      Object.entries(readmeContents).forEach(([repoName, content]) => {
        dispatch({
          type: 'SET_README_CONTENT',
          payload: { repoName, content },
        });
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to fetch repositories',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_LOADING_READMES', payload: false });
    }
  };

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

  const handleLogout = () => {
    storageService.removeAccessToken();
    dispatch({
      type: 'SET_AUTHENTICATED',
      payload: { isAuthenticated: false, accessToken: null },
    });
    dispatch({ type: 'SET_REPOS', payload: [] });
    dispatch({ type: 'SET_SELECTED_REPO', payload: null });
  };

  const handleSelectRepo = (repoName: string | null) => {
    dispatch({ type: 'SET_SELECTED_REPO', payload: repoName });
  };

  const handleUpdateFilters = (options: Partial<FilterOptions>) => {
    dispatch({ type: 'SET_FILTER_OPTIONS', payload: options });
  };

  const graphData = generateGraphData(state.repos, state.readmeContents);
  const selectedRepoData = state.repos.find((repo) => repo.name === state.selectedRepo) || null;

  if (!state.isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} isLoading={state.isLoading} error={state.error} />;
  }

  return (
    <MainLayout
      repos={state.repos}
      readmeContents={state.readmeContents}
      selectedRepo={selectedRepoData}
      graphData={graphData}
      filterOptions={state.filterOptions}
      isLoading={state.isLoading}
      isLoadingReadmes={state.isLoadingReadmes}
      error={state.error}
      onSelectRepo={handleSelectRepo}
      onUpdateFilters={handleUpdateFilters}
      onRefresh={fetchRepos}
      onLogout={handleLogout}
    />
  );
}

export default App;
