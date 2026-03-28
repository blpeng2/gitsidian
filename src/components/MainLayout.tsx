import { type MouseEvent, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { FilterOptions, GitHubRepo, GitHubUser, GraphData, NoteCategory } from '../types';
import { DiaryEntry } from '../types';
import GraphView from './GraphView';
import RepoList from './RepoList';
import { getBacklinks, getOutlinks } from '../utils/wikiLinks';
import { renderMarkdown } from '../utils/markdown';
import { stripPrefix } from '../utils/strings';
import ReadmeEditor from './ReadmeEditor';
import CreateRepoModal from './CreateRepoModal';
import TabBar from './TabBar';
import DiaryView from './DiaryView';
import DiaryCalendar from './DiaryCalendar';
import TitleBar from './TitleBar';
import SearchModal from './SearchModal';
import TimelineView from './TimelineView';
import { IconLoading, IconPlus, IconEdit } from './Icons';
import { getDiaryBacklinks } from '../utils/wikiLinks';
interface MainLayoutProps {
  repos: GitHubRepo[];
  readmeContents: Record<string, string>;
  selectedRepo: GitHubRepo | null;
  graphData: GraphData;
  filterOptions: FilterOptions;
  isLoading: boolean;
  isLoadingReadmes: boolean;
  error: string | null;
  showCreateModal: boolean;
  showSearchModal: boolean;
  onShowSearchModal: (show: boolean) => void;
  isEditingReadme: boolean;
  viewMode: 'notes' | 'graph' | 'diary' | 'timeline';
  openTabs: string[];
  categoryFilter: NoteCategory | 'all';
  onSelectRepo: (repoName: string | null) => void;
  onCloseTab: (repoName: string) => void;
  onCategoryFilterChange: (cat: NoteCategory | 'all') => void;
  onDismissError: () => void;
  onCreateRepo: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  onReadmeSaved: (repoName: string, content: string) => void;
  onUpdateTopics: (repoName: string, topics: string[]) => Promise<void>;
  onUpdateVisibility: (repoName: string, isPrivate: boolean) => Promise<void>;
  onShowCreateModal: (show: boolean) => void;
  onEditReadme: (editing: boolean) => void;
  onCloseEditor: () => void;
  onSetViewMode: (mode: 'notes' | 'graph' | 'diary' | 'timeline') => void;
  onMoveCategory: (repoName: string, category: NoteCategory) => void;
  currentUser: GitHubUser | null;
  diaryRepo: GitHubRepo | null;
  diaryEntries: Record<string, DiaryEntry>;
  diaryContents: Record<string, string>;
  selectedDiaryDate: string | null;
  isLoadingDiary: boolean;
  onOpenDiary: () => void;
  onOpenTimeline: () => void;
  onEnsureDiaryRepo: () => Promise<void>;
  onSelectDiaryDate: (date: string) => void;
  onLoadDiaryEntry: (date: string) => void;
  onDiarySaved: (date: string, content: string, newSha: string) => void;
}

function MainLayout({
  repos,
  readmeContents,
  selectedRepo,
  graphData,
  filterOptions,
  isLoading,
  isLoadingReadmes,
  error,
  showCreateModal,
  showSearchModal,
  onShowSearchModal,
  isEditingReadme,
  viewMode,
  openTabs,
  categoryFilter,
  onSelectRepo,
  onCloseTab,
  onCategoryFilterChange,
  onDismissError,
  onCreateRepo,
  onReadmeSaved,
  onUpdateTopics,
  onUpdateVisibility,
  onShowCreateModal,
  onEditReadme,
  onCloseEditor,
  onSetViewMode,
  onMoveCategory,
  currentUser,
  diaryRepo,
  diaryEntries,
  diaryContents,
  selectedDiaryDate,
  isLoadingDiary,
  onOpenDiary,
  onOpenTimeline,
  onEnsureDiaryRepo,
  onSelectDiaryDate,
  onLoadDiaryEntry,
  onDiarySaved,
}: MainLayoutProps) {

  const [showExplorer, setShowExplorer] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(260);
  const [searchQuery, setSearchQuery] = useState('');

  const explorerWidthRef = useRef(explorerWidth);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  explorerWidthRef.current = explorerWidth;

  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  const handleExplorerResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = explorerWidthRef.current;

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      const newWidth = Math.max(160, Math.min(500, startWidth + ev.clientX - startX));
      setExplorerWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizeCleanupRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    resizeCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const selectedReadme = selectedRepo ? readmeContents[selectedRepo.name] || '' : '';
  const backlinks = useMemo(
    () => (selectedRepo ? getBacklinks(selectedRepo.name, readmeContents) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRepo?.name, readmeContents]
  );
  const outlinks = useMemo(
    () => (selectedRepo
      ? getOutlinks(selectedRepo.name, readmeContents, new Set(repos.map((repo) => repo.name)))
      : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRepo?.name, readmeContents, repos]
  );
  const renderedReadme = useMemo(
    () => selectedReadme ? renderMarkdown(selectedReadme) : '',
    [selectedReadme]
  );

  const visibleRepos = useMemo(
    () => repos.filter((r) => r.name !== 'gitsidian-diary'),
    [repos]
  );

  const diaryBacklinks = useMemo(
    () => (selectedRepo ? getDiaryBacklinks(selectedRepo.name, diaryContents, new Set(repos.map((repo) => repo.name))) : []),
    [selectedRepo, diaryContents, repos]
  );
  const repoDateByName = useMemo(
    () => new Map(repos.map((repo) => [repo.name, repo.updated_at])),
    [repos]
  );

  const diaryMarkedDates = useMemo(
    () => new Set(Object.keys(diaryEntries)),
    [diaryEntries]
  );

  const formatLinkDate = useCallback((isoDate?: string) => {
    if (!isoDate) return null;
    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) return null;

    return parsedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const handleDiarySelectDate = useCallback((date: string) => {
    onSelectDiaryDate(date);
    onLoadDiaryEntry(date);
  }, [onSelectDiaryDate, onLoadDiaryEntry]);

  const handleReadmeClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('wikilink')) return;
    const repoName = target.getAttribute('data-repo')?.trim();
    if (!repoName) return;
    const normalized = repoName.toLowerCase();
    const prefixed = `gitsidian-${repoName}`.toLowerCase();
    const resolvedRepo = repos.find((repo) => {
      const lowerName = repo.name.toLowerCase();
      return lowerName === normalized || lowerName === prefixed;
    });
    if (!resolvedRepo) return;
    onSelectRepo(resolvedRepo.name);
  };

  const handleOpenRepoFromDiary = useCallback((repoName: string) => {
    onSetViewMode('notes');
    onSelectRepo(repoName);
  }, [onSelectRepo, onSetViewMode]);

  const handleOpenDiaryDate = useCallback((date: string) => {
    onSetViewMode('diary');
    onSelectDiaryDate(date);
    onLoadDiaryEntry(date);
  }, [onLoadDiaryEntry, onSelectDiaryDate, onSetViewMode]);

  return (
    <div className="main-layout">
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showExplorer={showExplorer}
        onToggleExplorer={() => setShowExplorer((v) => !v)}
      />

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="error-dismiss" onClick={onDismissError} title="Dismiss">✕</button>
        </div>
      )}
      {isLoadingReadmes && <div className="loading-readmes"><IconLoading style={{marginRight: '8px'}} /> Loading README files…</div>}

      <div className="main-content">
        {/* LEFT: File Explorer */}
        <aside
          className="explorer-sidebar"
          style={{
            width: showExplorer ? explorerWidth : 0,
            minWidth: showExplorer ? explorerWidth : 0,
            overflow: 'hidden',
          }}
        >
          {viewMode === 'diary' || viewMode === 'timeline' ? (
            <>
              <div className="explorer-header">
                <h3>{viewMode === 'timeline' ? '🕒 Timeline' : '📔 Diary'}</h3>
              </div>
              <DiaryCalendar
                selectedDate={selectedDiaryDate}
                markedDates={diaryMarkedDates}
                onSelectDate={handleDiarySelectDate}
              />
            </>
          ) : (
            <>
              <div className="explorer-header">
                <h3>Notes</h3>
                <span className="explorer-count">{visibleRepos.length}</span>
              </div>
              <RepoList
                repos={visibleRepos}
                selectedRepo={selectedRepo?.name || null}
                onSelectRepo={onSelectRepo}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={onCategoryFilterChange}
                onMoveCategory={onMoveCategory}
                searchQuery={searchQuery}
              />
              <button className="explorer-new-btn" onClick={() => onShowCreateModal(true)} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                <IconPlus /> New Note
              </button>
            </>
          )}
        </aside>

        {showExplorer && (
          <div
            className="explorer-resize-handle"
            onMouseDown={handleExplorerResizeStart}
          />
        )}

        {/* CENTER: Tabs + Content */}
        <main className="note-main">
          <TabBar
            tabs={openTabs}
            activeTab={selectedRepo?.name || null}
            viewMode={viewMode}
            onSelectTab={(repoName) => onSelectRepo(repoName)}
            onCloseTab={onCloseTab}
            onSelectGraph={() => onSetViewMode('graph')}
            onSelectDiary={onOpenDiary}
            onSelectTimeline={onOpenTimeline}
          />

          {viewMode === 'diary' ? (
            <DiaryView
              owner={currentUser?.login ?? ''}
              repos={visibleRepos}
              diaryRepo={diaryRepo}
              diaryEntries={diaryEntries}
              diaryContents={diaryContents}
              selectedDate={selectedDiaryDate}
              isLoadingDiary={isLoadingDiary}
              onEnsureDiaryRepo={onEnsureDiaryRepo}
              onSelectDate={onSelectDiaryDate}
              onSave={onDiarySaved}
              onNavigateRepo={handleOpenRepoFromDiary}
              onNavigateDate={handleOpenDiaryDate}
            />
          ) : viewMode === 'timeline' ? (
            <TimelineView
              repos={visibleRepos}
              diaryEntries={diaryEntries}
              diaryContents={diaryContents}
              onSelectRepo={handleOpenRepoFromDiary}
              onSelectDiaryDate={handleOpenDiaryDate}
            />
          ) : viewMode === 'graph' ? (
            <div className="graph-container">
              <GraphView
                data={graphData}
                filterOptions={filterOptions}
                selectedRepo={selectedRepo?.name || null}
                onSelectNode={onSelectRepo}
              />
            </div>
          ) : selectedRepo ? (
            isEditingReadme ? (
              <ReadmeEditor
                repoName={selectedRepo.name}
                repoOwner={selectedRepo.owner.login}
                repoNames={repos.map((repo) => repo.name)}
                initialContent={selectedReadme}
                currentTopics={selectedRepo.topics}
                isPrivate={selectedRepo.private}
                onUpdateTopics={(topics: string[]) => void onUpdateTopics(selectedRepo.name, topics)}
                onSave={(content: string) => onReadmeSaved(selectedRepo.name, content)}
                onClose={onCloseEditor}
                onToggleVisibility={() => void onUpdateVisibility(selectedRepo.name, !selectedRepo.private)}
              />
            ) : (
              <div className="note-viewer">
                <div className="note-viewer-header">
                  <h2>{stripPrefix(selectedRepo.name)}</h2>
                  <div className="note-viewer-actions">
                    <a
                      className="github-link"
                      href={selectedRepo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub
                    </a>
                    <button onClick={() => onEditReadme(true)} className="edit-readme-btn" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <IconEdit /> Edit
                    </button>
                  </div>
                </div>
                {selectedRepo.language || selectedRepo.topics.length > 0 ? (
                  <div className="note-meta">
                    {selectedRepo.language && (
                      <span className="language-badge">{selectedRepo.language}</span>
                    )}
                    {selectedRepo.topics.map((topic) => (
                      <span key={topic} className="topic-tag deletable">
                        {topic}
                        <button
                          className="topic-delete"
                          onClick={() => void onUpdateTopics(selectedRepo.name, selectedRepo.topics.filter((t) => t !== topic))}
                          title="Remove topic"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                {selectedReadme ? (
                  <div
                    className="note-content"
                    onClick={handleReadmeClick}
                    dangerouslySetInnerHTML={{ __html: renderedReadme }}
                  />
                ) : (
                  <div className="note-empty">
                    <p>No README yet</p>
                    <button onClick={() => onEditReadme(true)} className="create-readme-btn">
                      Create README
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="note-placeholder">
              <div className="placeholder-content">
                <h2>Gitsidian</h2>
                <p>Select a note from the sidebar, or create a new one.</p>
                <p className="placeholder-hint">{repos.length} notes available</p>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: Backlinks & Outlinks */}
        {viewMode === 'notes' && selectedRepo && !isEditingReadme && (
          <aside className="links-sidebar">
            <div className="links-panel">
              <h4>Linked from</h4>
              {backlinks.length > 0 ? (
                <div className="links-list">
                  {backlinks.map((backlink) => {
                    const linkDate = formatLinkDate(repoDateByName.get(backlink.source));

                    return (
                      <div
                        key={`${backlink.source}-${backlink.alias || ''}-${backlink.excerpt || ''}`}
                        className="link-item"
                        onClick={() => onSelectRepo(backlink.source)}
                      >
                        <div className="link-item-header">
                          <span className="link-title">{stripPrefix(backlink.source)}</span>
                          {linkDate && <span className="link-date">{linkDate}</span>}
                        </div>
                        {backlink.alias && <span className="link-alias">as {backlink.alias}</span>}
                        {backlink.excerpt && <p className="link-excerpt">{backlink.excerpt}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-links">No backlinks</div>
              )}
            </div>
            <div className="links-panel">
              <h4>Mentioned in diary</h4>
              {diaryBacklinks.length > 0 ? (
                <div className="links-list">
                  {diaryBacklinks.map((backlink) => (
                    <div
                      key={`${backlink.date}-${backlink.alias || ''}`}
                      className="link-item"
                      onClick={() => handleOpenDiaryDate(backlink.date)}
                    >
                      <span>{backlink.date}</span>
                      {backlink.alias && <span className="link-alias">as {backlink.alias}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-links">No diary mentions</div>
              )}
            </div>
            <div className="links-panel">
              <h4>Links to</h4>
              {outlinks.length > 0 ? (
                <div className="links-list">
                  {outlinks.map((outlink) => (
                    <div
                      key={`${outlink.target}-${outlink.alias || ''}`}
                      className="link-item"
                      onClick={() => onSelectRepo(outlink.target)}
                    >
                      <span>{stripPrefix(outlink.target)}</span>
                      {outlink.alias && <span className="link-alias">as {outlink.alias}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-links">No outgoing links</div>
              )}
            </div>
          </aside>
        )}
      </div>

      {showCreateModal && (
        <CreateRepoModal
          onSubmit={onCreateRepo}
          onClose={() => onShowCreateModal(false)}
          isLoading={isLoading}
        />
      )}

      {showSearchModal && (
        <SearchModal
          repos={visibleRepos}
          readmeContents={readmeContents}
          diaryContents={diaryContents}
          onSelectRepo={(repoName) => {
            onSetViewMode('notes');
            onSelectRepo(repoName);
            onShowSearchModal(false);
          }}
          onSelectDiary={(date) => {
            handleOpenDiaryDate(date);
            onShowSearchModal(false);
          }}
          onClose={() => onShowSearchModal(false)}
        />
      )}
    </div>
  );
}

export default MainLayout;
