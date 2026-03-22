import { useMemo, type MouseEvent } from 'react';
import { FilterOptions, GitHubRepo, GraphData } from '../types';
import GraphView from './GraphView';
import RepoList from './RepoList';
import { getBacklinks, getOutlinks } from '../utils/wikiLinks';
import { renderMarkdown } from '../utils/markdown';
import ReadmeEditor from './ReadmeEditor';
import CreateRepoModal from './CreateRepoModal';
import ThemeSelector from './ThemeSelector';
import TabBar from './TabBar';

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
  isEditingReadme: boolean;
  viewMode: 'notes' | 'graph';
  openTabs: string[];
  onSelectRepo: (repoName: string | null) => void;
  onCloseTab: (repoName: string) => void;
  onUpdateFilters: (options: Partial<FilterOptions>) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onCreateRepo: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  onSaveReadme: (repoName: string, content: string) => Promise<void>;
  onUpdateTopics: (repoName: string, topics: string[]) => Promise<void>;
  onShowCreateModal: (show: boolean) => void;
  onEditReadme: (editing: boolean) => void;
  onSetViewMode: (mode: 'notes' | 'graph') => void;
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
  isEditingReadme,
  viewMode,
  openTabs,
  onSelectRepo,
  onCloseTab,
  onRefresh,
  onCreateRepo,
  onSaveReadme,
  onUpdateTopics,
  onShowCreateModal,
  onEditReadme,
  onSetViewMode,
}: MainLayoutProps) {
  const stripPrefix = (name: string) => name.replace(/^gitsidian-/, '');

  const filteredRepos = useMemo(
    () =>
      repos.filter((repo) => {
        if (!filterOptions.showPrivate && repo.private) return false;
        if (!filterOptions.showPublic && !repo.private) return false;
        if (!filterOptions.showOrphans) {
          const isOrphan = graphData.nodes.find((node) => node.data.id === repo.name)?.data.isOrphan;
          if (isOrphan) return false;
        }
        if (filterOptions.topicFilter && !repo.topics.includes(filterOptions.topicFilter)) return false;
        return true;
      }),
    [repos, filterOptions, graphData.nodes]
  );

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
      <header className="main-header">
        <div className="header-left">
          <h1 className="logo">Gitsidian</h1>
        </div>
        <div className="header-right">
          {/* View mode toggle */}
          <button
            className={`view-toggle-btn ${viewMode === 'notes' ? 'active' : ''}`}
            onClick={() => onSetViewMode('notes')}
          >
            📝 Notes
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'graph' ? 'active' : ''}`}
            onClick={() => onSetViewMode('graph')}
          >
            📊 Graph
          </button>
          <div className="header-separator" />
          <button onClick={() => onShowCreateModal(true)} className="create-btn">
            ✚ New Note
          </button>
          <ThemeSelector />
          <button onClick={onRefresh} className="refresh-btn" disabled={isLoading}>
            {isLoading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {isLoadingReadmes && <div className="loading-readmes">⏳ Loading README files...</div>}

      <div className="main-content">
        {viewMode === 'graph' ? (
          /* GRAPH MODE: full-width graph like before */
          <div className="graph-container">
            <GraphView
              data={graphData}
              filterOptions={filterOptions}
              selectedRepo={selectedRepo?.name || null}
              onSelectNode={onSelectRepo}
            />
          </div>
        ) : (
          /* NOTES MODE: 3-panel Obsidian layout */
          <>
            {/* LEFT: File Explorer */}
            <aside className="explorer-sidebar">
              <div className="explorer-header">
                <h3>Notes</h3>
                <span className="explorer-count">{repos.length}</span>
              </div>
              <RepoList
                repos={filteredRepos}
                readmeContents={readmeContents}
                selectedRepo={selectedRepo?.name || null}
                onSelectRepo={onSelectRepo}
              />
              <button className="explorer-new-btn" onClick={() => onShowCreateModal(true)}>
                + New Note
              </button>
            </aside>

            {/* CENTER: Note Viewer/Editor */}
            <main className="note-main">
              <TabBar
                tabs={openTabs}
                activeTab={selectedRepo?.name || null}
                onSelectTab={(repoName) => onSelectRepo(repoName)}
                onCloseTab={onCloseTab}
              />
              {selectedRepo ? (
                isEditingReadme ? (
                  <ReadmeEditor
                    repoName={selectedRepo.name}
                    repoOwner={selectedRepo.owner.login}
                    repoNames={repos.map((repo) => repo.name)}
                    initialContent={selectedReadme}
                    currentTopics={selectedRepo.topics}
                    onUpdateTopics={(topics: string[]) => void onUpdateTopics(selectedRepo.name, topics)}
                    onSave={(content: string) => void onSaveReadme(selectedRepo.name, content)}
                    onCancel={() => onEditReadme(false)}
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
                        <button onClick={() => onEditReadme(true)} className="edit-readme-btn">
                          ✎ Edit
                        </button>
                      </div>
                    </div>
                    {selectedRepo.language || selectedRepo.topics.length > 0 ? (
                      <div className="note-meta">
                        {selectedRepo.language && (
                          <span className="language-badge">{selectedRepo.language}</span>
                        )}
                        {selectedRepo.topics.map((topic) => (
                          <span key={topic} className="topic-tag">
                            {topic}
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

            {/* RIGHT: Backlinks & Outlinks panel */}
            {selectedRepo && !isEditingReadme && (
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
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateRepoModal
          onSubmit={onCreateRepo}
          onClose={() => onShowCreateModal(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default MainLayout;
