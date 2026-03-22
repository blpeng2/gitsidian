import { useEffect, useReducer } from 'react';
import { AppAction, AppState, FilterOptions, NoteCategory } from './types';
import { githubService } from './services/github';
import { storageService } from './services/storage';
import { getBacklinks, generateGraphData } from './utils/wikiLinks';
import { getCategoryIcon, getCategoryLabel, getRecommendations, setCategoryTopics } from './utils/categoryRules';
import LoginScreen from './components/LoginScreen';
import MainLayout from './components/MainLayout';
import './App.css';

const initialState: AppState = {
  isAuthenticated: false,
  accessToken: null,
  repos: [],
  readmeContents: {},
  selectedRepo: null,
  openTabs: [],
  filterOptions: {
    showPrivate: true,
    showPublic: true,
    showOrphans: true,
    topicFilter: null,
  },
  showCreateModal: false,
  isEditingReadme: false,
  isLoading: false,
  isLoadingReadmes: false,
  error: null,
  viewMode: 'notes' as const,
  categoryFilter: 'all' as NoteCategory | 'all',
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
      const availableRepoNames = new Set(action.payload.map((repo) => repo.name));
      const openTabs = state.openTabs.filter((repoName) => availableRepoNames.has(repoName));
      return {
        ...state,
        repos: action.payload,
        readmeContents: {},
        selectedRepo: action.payload.some((repo) => repo.name === state.selectedRepo)
          ? state.selectedRepo
          : null,
        openTabs,
      };
    case 'ADD_REPO':
      return {
        ...state,
        repos: [...state.repos, action.payload],
      };
    case 'SET_README_CONTENT':
      return {
        ...state,
        readmeContents: {
          ...state.readmeContents,
          [action.payload.repoName]: action.payload.content,
        },
      };
    case 'UPDATE_REPO_TOPICS':
      return {
        ...state,
        repos: state.repos.map((repo) =>
          repo.name === action.payload.repoName ? { ...repo, topics: action.payload.topics } : repo
        ),
      };
    case 'SET_SELECTED_REPO':
      if (action.payload === null) {
        return { ...state, selectedRepo: null };
      }
      return {
        ...state,
        selectedRepo: action.payload,
        openTabs: state.openTabs.includes(action.payload)
          ? state.openTabs
          : [...state.openTabs, action.payload],
      };
    case 'OPEN_TAB': {
      const tabs = state.openTabs.includes(action.payload)
        ? state.openTabs
        : [...state.openTabs, action.payload];
      return {
        ...state,
        openTabs: tabs,
        selectedRepo: action.payload,
      };
    }
    case 'CLOSE_TAB': {
      const tabs = state.openTabs.filter((tab) => tab !== action.payload);
      const newSelected = action.payload === state.selectedRepo
        ? tabs[tabs.length - 1] || null
        : state.selectedRepo;
      return {
        ...state,
        openTabs: tabs,
        selectedRepo: newSelected,
      };
    }
    case 'SET_FILTER_OPTIONS':
      return {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.payload,
        },
      };
    case 'SET_SHOW_CREATE_MODAL':
      return {
        ...state,
        showCreateModal: action.payload,
      };
    case 'SET_EDITING_README':
      return {
        ...state,
        isEditingReadme: action.payload,
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
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };
    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        categoryFilter: action.payload,
      };
    case 'SET_REPO_CATEGORY': {
      const { repoName, category } = action.payload;
      return {
        ...state,
        repos: state.repos.map((repo) =>
          repo.name === repoName
            ? { ...repo, topics: setCategoryTopics(repo.topics, category) }
            : repo
        ),
      };
    }
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
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

  const handleCreateRepo = async (name: string, description: string, isPrivate: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const newRepo = await githubService.createRepo(name, description, isPrivate);
      dispatch({ type: 'ADD_REPO', payload: newRepo });
      const displayName = newRepo.name.replace(/^gitsidian-/, '');
      dispatch({
        type: 'SET_README_CONTENT',
        payload: { repoName: newRepo.name, content: `# ${displayName}\n\n${description || ''}\n` },
      });
      dispatch({ type: 'SET_SHOW_CREATE_MODAL', payload: false });
      dispatch({ type: 'SET_SELECTED_REPO', payload: newRepo.name });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create repository',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleReadmeSaved = (repoName: string, content: string) => {
    dispatch({ type: 'SET_README_CONTENT', payload: { repoName, content } });
  };

  const handleCloseEditor = () => {
    dispatch({ type: 'SET_EDITING_README', payload: false });
  };

  const handleUpdateTopics = async (repoName: string, topics: string[]) => {
    try {
      const repo = state.repos.find((r) => r.name === repoName);
      if (!repo) return;

      await githubService.updateTopics(repo.owner.login, repo.name, topics);
      dispatch({ type: 'UPDATE_REPO_TOPICS', payload: { repoName, topics } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update topics',
      });
    }
  };

  const handleMoveCategory = async (repoName: string, category: NoteCategory) => {
    try {
      const repo = state.repos.find((r) => r.name === repoName);
      if (!repo) {
        return;
      }

      const newTopics = setCategoryTopics(repo.topics, category);
      await githubService.updateTopics(repo.owner.login, repo.name, newTopics);
      dispatch({ type: 'SET_REPO_CATEGORY', payload: { repoName, category } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to move category',
      });
    }
  };

  const graphData = generateGraphData(state.repos, state.readmeContents);
  const selectedRepoData = state.repos.find((repo) => repo.name === state.selectedRepo) || null;

  const backlinkCounts: Record<string, number> = {};
  state.repos.forEach((repo) => {
    const backlinks = getBacklinks(repo.name, state.readmeContents);
    backlinkCounts[repo.name] = backlinks.length;
  });

  const recommendations = getRecommendations(state.repos, state.readmeContents, backlinkCounts);
  const recommendationMap: Record<string, string> = {};
  recommendations.forEach((recommendation) => {
    recommendationMap[recommendation.repoName] = `${getCategoryIcon(recommendation.suggestedCategory)} → ${getCategoryLabel(recommendation.suggestedCategory)}: ${recommendation.reason}`;
  });

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
      showCreateModal={state.showCreateModal}
      isEditingReadme={state.isEditingReadme}
      openTabs={state.openTabs}
      categoryFilter={state.categoryFilter}
      recommendations={recommendationMap}
      onSelectRepo={handleSelectRepo}
      onCloseTab={(repoName: string) => dispatch({ type: 'CLOSE_TAB', payload: repoName })}
      onCategoryFilterChange={(category: NoteCategory | 'all') => dispatch({ type: 'SET_CATEGORY_FILTER', payload: category })}
      onUpdateFilters={handleUpdateFilters}
      onRefresh={fetchRepos}
      onLogout={handleLogout}
      onCreateRepo={handleCreateRepo}
      onReadmeSaved={handleReadmeSaved}
      onUpdateTopics={handleUpdateTopics}
      onShowCreateModal={(show: boolean) => dispatch({ type: 'SET_SHOW_CREATE_MODAL', payload: show })}
      onEditReadme={(editing: boolean) => dispatch({ type: 'SET_EDITING_README', payload: editing })}
      onCloseEditor={handleCloseEditor}
      viewMode={state.viewMode}
      onSetViewMode={(mode: 'notes' | 'graph') => dispatch({ type: 'SET_VIEW_MODE', payload: mode })}
      onMoveCategory={handleMoveCategory}
    />
  );
}

export default App;
