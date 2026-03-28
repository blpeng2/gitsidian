import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { AppAction, AppState, DiaryEntry, NoteCategory } from './types';
import { githubService } from './services/github';
import { ghCliService } from './services/ghCli';
import { storageService } from './services/storage';
import { generateGraphData } from './utils/wikiLinks';
import { setCategoryTopics } from './utils/categoryRules';
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
  showSearchModal: false,
  isEditingReadme: false,
  isLoading: false,
  isAuthChecking: true,
  isLoadingReadmes: false,
  error: null,
  viewMode: 'graph' as const,
  categoryFilter: 'all' as NoteCategory | 'all',
  currentUser: null,
  diaryRepo: null,
  diaryEntries: {},
  diaryContents: {},
  selectedDiaryDate: null,
  isLoadingDiary: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        accessToken: action.payload.accessToken,
      };
    case 'SET_AUTH_CHECKING':
      return { ...state, isAuthChecking: action.payload };
    case 'SET_REPOS': {
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
    }
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
    case 'SET_ALL_README_CONTENTS':
      return { ...state, readmeContents: action.payload };
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
        viewMode: 'notes',
        isEditingReadme: false,
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
        viewMode: tabs.length === 0 ? 'graph' : state.viewMode,
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
    case 'SET_SHOW_SEARCH_MODAL':
      return { ...state, showSearchModal: action.payload };
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
    case 'UPDATE_REPO_VISIBILITY': {
      const { repoName, isPrivate } = action.payload;
      return {
        ...state,
        repos: state.repos.map((repo) =>
          repo.name === repoName ? { ...repo, private: isPrivate } : repo
        ),
      };
    }
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_DIARY_REPO':
      return { ...state, diaryRepo: action.payload };
    case 'SET_DIARY_ENTRIES':
      return { ...state, diaryEntries: action.payload };
    case 'SET_DIARY_CONTENT':
      return {
        ...state,
        diaryContents: { ...state.diaryContents, [action.payload.date]: action.payload.content },
        diaryEntries: {
          ...state.diaryEntries,
          [action.payload.date]: { date: action.payload.date, sha: action.payload.sha },
        },
      };
    case 'SET_SELECTED_DIARY_DATE':
      return { ...state, selectedDiaryDate: action.payload };
    case 'SET_LOADING_DIARY':
      return { ...state, isLoadingDiary: action.payload };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const fetchRepos = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_LOADING_READMES', payload: false });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_REPOS', payload: [] });

    try {
      const repos = await githubService.fetchRepos();
      dispatch({ type: 'SET_REPOS', payload: repos });

      dispatch({ type: 'SET_LOADING_READMES', payload: true });
      const readmeContents = await githubService.fetchAllReadmes(repos);
      dispatch({ type: 'SET_ALL_README_CONTENTS', payload: readmeContents });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to fetch repositories',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_LOADING_READMES', payload: false });
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      dispatch({ type: 'SET_ERROR', payload: `GitHub OAuth failed: ${oauthError}` });
      dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
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
      void githubService.getCurrentUser()
        .then((user) => {
          dispatch({ type: 'SET_CURRENT_USER', payload: user });
        })
        .catch((e) => {
          console.warn('Failed to fetch user info:', e instanceof Error ? e.message : e);
        })
        .finally(() => {
          dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
        });
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (ghCliService.isDesktop()) {
      ghCliService.checkAuth()
        .then(async (authenticated) => {
          try {
            if (authenticated) {
              const token = await ghCliService.getToken();
              githubService.setAccessToken(token);
              const valid = await githubService.validateToken();

              if (valid) {
                dispatch({ type: 'SET_AUTHENTICATED', payload: { isAuthenticated: true, accessToken: token } });
                try {
                  const user = await githubService.getCurrentUser();
                  dispatch({ type: 'SET_CURRENT_USER', payload: user });
                } catch (e) {
                  console.warn('Failed to fetch user info:', e instanceof Error ? e.message : e);
                }
              } else {
                dispatch({ type: 'SET_ERROR', payload: 'GitHub 인증이 만료되었습니다. 다시 로그인해주세요.' });
              }
            }
          } catch (error) {
            dispatch({
              type: 'SET_ERROR',
              payload: error instanceof Error ? error.message : '토큰을 가져올 수 없습니다',
            });
          } finally {
            dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
          }
        })
        .catch((e) => {
          console.warn('gh CLI auth check failed:', e instanceof Error ? e.message : e);
          dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
        });
      return;
    }

    const savedToken = storageService.getAccessToken();
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    const tokenToUse = savedToken ?? envToken ?? null;

    if (tokenToUse) {
      githubService.setAccessToken(tokenToUse);
      githubService.validateToken()
        .then(async (valid) => {
          if (valid) {
            dispatch({
              type: 'SET_AUTHENTICATED',
              payload: { isAuthenticated: true, accessToken: tokenToUse },
            });
            try {
              const user = await githubService.getCurrentUser();
              dispatch({ type: 'SET_CURRENT_USER', payload: user });
            } catch (e) {
              console.warn('Failed to fetch user info:', e instanceof Error ? e.message : e);
            }
          } else {
            storageService.removeAccessToken();
            dispatch({ type: 'SET_ERROR', payload: 'Saved token is expired or invalid. Please log in again.' });
          }
        })
        .catch(() => {
          storageService.removeAccessToken();
        })
        .finally(() => {
          dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
        });
    } else {
      dispatch({ type: 'SET_AUTH_CHECKING', payload: false });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'SET_SHOW_SEARCH_MODAL', payload: true });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && state.repos.length === 0) {
      void fetchRepos();
    }
  }, [state.isAuthenticated, state.repos.length, fetchRepos]);

  const handleSelectRepo = (repoName: string | null) => {
    dispatch({ type: 'SET_SELECTED_REPO', payload: repoName });
  };

  const handleDismissError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
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

  const handleUpdateTopics = useCallback(async (repoName: string, topics: string[]) => {
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
  }, [state.repos]);

  const handleUpdateVisibility = useCallback(async (repoName: string, isPrivate: boolean) => {
    try {
      const repo = state.repos.find((r) => r.name === repoName);
      if (!repo) return;

      await githubService.updateVisibility(repo.owner.login, repo.name, isPrivate);
      dispatch({ type: 'UPDATE_REPO_VISIBILITY', payload: { repoName, isPrivate } });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update visibility',
      });
    }
  }, [state.repos]);

  const handleMoveCategory = useCallback(async (repoName: string, category: NoteCategory) => {
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
  }, [state.repos]);

  const prefetchDiaryContents = useCallback(async (owner: string, entries: Record<string, DiaryEntry>) => {
    const missingDates = Object.keys(entries).filter((date) => state.diaryContents[date] === undefined);
    if (missingDates.length === 0) {
      return;
    }

    const batchSize = 5;
    for (let i = 0; i < missingDates.length; i += batchSize) {
      const batch = missingDates.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (date) => ({
        date,
        entry: await githubService.getDiaryEntry(owner, date),
      })));

      results.forEach(({ date, entry }) => {
        dispatch({
          type: 'SET_DIARY_CONTENT',
          payload: {
            date,
            content: entry?.content ?? '',
            sha: entry?.sha ?? entries[date]?.sha ?? null,
          },
        });
      });
    }
  }, [state.diaryContents]);

  const handleLoadDiaryEntries = useCallback(async (owner: string) => {
    dispatch({ type: 'SET_LOADING_DIARY', payload: true });
    try {
      const entries = await githubService.listDiaryEntries(owner);
      const entriesMap: Record<string, DiaryEntry> = {};
      entries.forEach((e) => { entriesMap[e.date] = e; });
      dispatch({ type: 'SET_DIARY_ENTRIES', payload: entriesMap });
      void prefetchDiaryContents(owner, entriesMap);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load diary' });
    } finally {
      dispatch({ type: 'SET_LOADING_DIARY', payload: false });
    }
  }, [prefetchDiaryContents]);

  useEffect(() => {
    if (state.viewMode !== 'diary' || state.diaryRepo !== null || !state.currentUser) {
      return;
    }

    const existingDiaryRepo = state.repos.find((repo) => repo.name === 'gitsidian-diary') ?? null;
    if (!existingDiaryRepo) {
      return;
    }

    dispatch({ type: 'SET_DIARY_REPO', payload: existingDiaryRepo });
    void handleLoadDiaryEntries(existingDiaryRepo.owner.login);
  }, [state.viewMode, state.diaryRepo, state.currentUser, state.repos, handleLoadDiaryEntries]);

  useEffect(() => {
    if (!state.currentUser) {
      return;
    }

    const existingDiaryRepo = state.repos.find((repo) => repo.name === 'gitsidian-diary') ?? null;
    if (!existingDiaryRepo) {
      return;
    }

    if (!state.diaryRepo) {
      dispatch({ type: 'SET_DIARY_REPO', payload: existingDiaryRepo });
    }

    if (Object.keys(state.diaryEntries).length === 0) {
      void handleLoadDiaryEntries(existingDiaryRepo.owner.login);
    }
  }, [state.currentUser, state.repos, state.diaryRepo, state.diaryEntries, handleLoadDiaryEntries]);

  const handleOpenDiary = useCallback(async () => {
    dispatch({ type: 'SET_VIEW_MODE', payload: 'diary' });
    if (!state.currentUser) return;
    const existing = state.diaryRepo ?? state.repos.find((r) => r.name === 'gitsidian-diary') ?? null;
    if (existing) {
      if (!state.diaryRepo) dispatch({ type: 'SET_DIARY_REPO', payload: existing });
      await handleLoadDiaryEntries(existing.owner.login);
    }
  }, [state.repos, state.diaryRepo, state.currentUser, handleLoadDiaryEntries]);

  const handleOpenTimeline = useCallback(async () => {
    dispatch({ type: 'SET_VIEW_MODE', payload: 'timeline' });
    if (!state.currentUser) return;
    const existing = state.diaryRepo ?? state.repos.find((r) => r.name === 'gitsidian-diary') ?? null;
    if (existing) {
      if (!state.diaryRepo) {
        dispatch({ type: 'SET_DIARY_REPO', payload: existing });
      }
      await handleLoadDiaryEntries(existing.owner.login);
    }
  }, [state.repos, state.diaryRepo, state.currentUser, handleLoadDiaryEntries]);

  const handleEnsureDiaryRepo = useCallback(async () => {
    if (!state.currentUser) return;
    dispatch({ type: 'SET_LOADING_DIARY', payload: true });
    try {
      const repo = await githubService.ensureDiaryRepo(state.currentUser.login);
      dispatch({ type: 'SET_DIARY_REPO', payload: repo });
      if (!state.repos.some((r) => r.name === repo.name)) {
        dispatch({ type: 'ADD_REPO', payload: repo });
      }
      await handleLoadDiaryEntries(state.currentUser.login);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create diary' });
    } finally {
      dispatch({ type: 'SET_LOADING_DIARY', payload: false });
    }
  }, [state.currentUser, state.repos, handleLoadDiaryEntries]);

  const handleSelectDiaryDate = useCallback((date: string) => {
    dispatch({ type: 'SET_SELECTED_DIARY_DATE', payload: date });
  }, []);

  const handleLoadDiaryEntry = useCallback(async (date: string) => {
    if (!state.currentUser || state.diaryContents[date] !== undefined) return;
    const draft = storageService.getDiaryDraft(date);
    if (draft !== null) {
      dispatch({ type: 'SET_DIARY_CONTENT', payload: { date, content: draft, sha: state.diaryEntries[date]?.sha ?? null } });
      return;
    }
    try {
      const result = await githubService.getDiaryEntry(state.currentUser.login, date);
      dispatch({ type: 'SET_DIARY_CONTENT', payload: { date, content: result?.content ?? '', sha: result?.sha ?? null } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load entry' });
    }
  }, [state.currentUser, state.diaryContents, state.diaryEntries]);

  const handleDiarySaved = useCallback((date: string, content: string, newSha: string) => {
    dispatch({ type: 'SET_DIARY_CONTENT', payload: { date, content, sha: newSha } });
  }, []);

  const handleShowSearchModal = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_SEARCH_MODAL', payload: show });
  }, []);

  const handleCloseTab = useCallback((repoName: string) => {
    dispatch({ type: 'CLOSE_TAB', payload: repoName });
  }, []);

  const handleCategoryFilterChange = useCallback((category: NoteCategory | 'all') => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: category });
  }, []);

  const handleShowCreateModal = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_CREATE_MODAL', payload: show });
  }, []);

  const handleEditReadme = useCallback((editing: boolean) => {
    dispatch({ type: 'SET_EDITING_README', payload: editing });
  }, []);

  const handleSetViewMode = useCallback((mode: 'notes' | 'graph' | 'diary' | 'timeline') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const graphData = useMemo(
    () => generateGraphData(state.repos.filter((r) => r.name !== 'gitsidian-diary'), state.readmeContents),
    [state.repos, state.readmeContents]
  );

  const selectedRepoData = useMemo(
    () => state.repos.find((repo) => repo.name === state.selectedRepo) ?? null,
    [state.repos, state.selectedRepo]
  );

  if (state.isAuthChecking) {
    return null;
  }

  if (!state.isAuthenticated) {
    return (
      <LoginScreen
        isLoading={state.isLoading}
        error={state.error}
        onGhLogin={async () => {
          dispatch({ type: 'SET_LOADING', payload: true });
          try {
            await ghCliService.login();
            const token = await ghCliService.getToken();
            githubService.setAccessToken(token);
            dispatch({ type: 'SET_AUTHENTICATED', payload: { isAuthenticated: true, accessToken: token } });
            try {
              const user = await githubService.getCurrentUser();
              dispatch({ type: 'SET_CURRENT_USER', payload: user });
            } catch (e) {
              console.warn('Failed to fetch user info:', e instanceof Error ? e.message : e);
            }
          } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '로그인에 실패했습니다.' });
          } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }}
      />
    );
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
      showSearchModal={state.showSearchModal}
      onShowSearchModal={handleShowSearchModal}
      isEditingReadme={state.isEditingReadme}
      openTabs={state.openTabs}
      categoryFilter={state.categoryFilter}
      onSelectRepo={handleSelectRepo}
      onCloseTab={handleCloseTab}
      onCategoryFilterChange={handleCategoryFilterChange}
      onDismissError={handleDismissError}
      onCreateRepo={handleCreateRepo}
      onReadmeSaved={handleReadmeSaved}
      onUpdateTopics={handleUpdateTopics}
      onUpdateVisibility={handleUpdateVisibility}
      onShowCreateModal={handleShowCreateModal}
      onEditReadme={handleEditReadme}
      onCloseEditor={handleCloseEditor}
      viewMode={state.viewMode}
      onSetViewMode={handleSetViewMode}
      onMoveCategory={handleMoveCategory}
      currentUser={state.currentUser}
      diaryRepo={state.diaryRepo}
      diaryEntries={state.diaryEntries}
      diaryContents={state.diaryContents}
      selectedDiaryDate={state.selectedDiaryDate}
      isLoadingDiary={state.isLoadingDiary}
      onOpenDiary={handleOpenDiary}
      onOpenTimeline={handleOpenTimeline}
      onEnsureDiaryRepo={handleEnsureDiaryRepo}
      onSelectDiaryDate={handleSelectDiaryDate}
      onLoadDiaryEntry={handleLoadDiaryEntry}
      onDiarySaved={handleDiarySaved}
    />
  );
}

export default App;
