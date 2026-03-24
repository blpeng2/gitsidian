import { type MouseEvent, useState, useRef, useCallback } from 'react';
import { FilterOptions, GitHubRepo, GraphData, NoteCategory } from '../types';
import GraphView from './GraphView';
import RepoList from './RepoList';
import { getBacklinks, getOutlinks } from '../utils/wikiLinks';
import { renderMarkdown } from '../utils/markdown';
import ReadmeEditor from './ReadmeEditor';
import CreateRepoModal from './CreateRepoModal';
import TabBar from './TabBar';
import TitleBar from './TitleBar';
import SearchModal from './SearchModal';
import { IconLoading, IconPlus, IconEdit } from './Icons';
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
  viewMode: 'notes' | 'graph';
  openTabs: string[];
  categoryFilter: NoteCategory | 'all';
  recommendations: Record<string, string>;
  onSelectRepo: (repoName: string | null) => void;
  onCloseTab: (repoName: string) => void;
  onCategoryFilterChange: (cat: NoteCategory | 'all') => void;
  onDismissError: () => void;
  onLogout: () => void;
  onCreateRepo: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  onReadmeSaved: (repoName: string, content: string) => void;
  onUpdateTopics: (repoName: string, topics: string[]) => Promise<void>;
  onShowCreateModal: (show: boolean) => void;
  onEditReadme: (editing: boolean) => void;
  onCloseEditor: () => void;
  onSetViewMode: (mode: 'notes' | 'graph') => void;
  onMoveCategory: (repoName: string, category: NoteCategory) => void;
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
  recommendations,
  onSelectRepo,
  onCloseTab,
  onCategoryFilterChange,
  onDismissError,
  onCreateRepo,
  onReadmeSaved,
  onUpdateTopics,
  onShowCreateModal,
  onEditReadme,
  onCloseEditor,
  onSetViewMode,
  onMoveCategory,
}: MainLayoutProps) {
  const stripPrefix = (name: string) => name.replace(/^gitsidian-/, '');

  const [showExplorer, setShowExplorer] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(260);
  const [searchQuery, setSearchQuery] = useState('');

  const explorerWidthRef = useRef(explorerWidth);
  explorerWidthRef.current = explorerWidth;

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
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const selectedReadme = selectedRepo ? readmeContents[selectedRepo.name] || '' : '';
  const backlinks = selectedRepo ? getBacklinks(selectedRepo.name, readmeContents) : [];
  const outlinks = selectedRepo
    ? getOutlinks(selectedRepo.name, readmeContents, new Set(repos.map((repo) => repo.name)))
    : [];

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
          <div className="explorer-header">
            <h3>Notes</h3>
            <span className="explorer-count">{repos.length}</span>
          </div>
          <RepoList
            repos={repos}
            readmeContents={readmeContents}
            selectedRepo={selectedRepo?.name || null}
            onSelectRepo={onSelectRepo}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={onCategoryFilterChange}
            recommendations={recommendations}
            onMoveCategory={onMoveCategory}
            searchQuery={searchQuery}
          />
          <button className="explorer-new-btn" onClick={() => onShowCreateModal(true)} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
            <IconPlus /> New Note
          </button>
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
          />

          {viewMode === 'graph' ? (
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
                onUpdateTopics={(topics: string[]) => void onUpdateTopics(selectedRepo.name, topics)}
                onSave={(content: string) => onReadmeSaved(selectedRepo.name, content)}
                onClose={onCloseEditor}
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
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedReadme) }}
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
                  {backlinks.map((backlink) => (
                    <div
                      key={backlink.source}
                      className="link-item"
                      onClick={() => onSelectRepo(backlink.source)}
                    >
                      <span>{stripPrefix(backlink.source)}</span>
                      {backlink.alias && <span className="link-alias">as {backlink.alias}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-links">No backlinks</div>
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
          repos={repos}
          readmeContents={readmeContents}
          onSelectRepo={(repoName) => {
            onSelectRepo(repoName);
            onShowSearchModal(false);
          }}
          onClose={() => onShowSearchModal(false)}
        />
      )}
    </div>
  );
}

export default MainLayout;
