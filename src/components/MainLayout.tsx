import { useMemo, useState, type MouseEvent } from 'react';
import { FilterOptions, GitHubRepo, GraphData } from '../types';
import GraphView from './GraphView';
import RepoList from './RepoList';
import FilterPanel from './FilterPanel';
import { getBacklinks, getOutlinks, renderWikiLinks } from '../utils/wikiLinks';
import ReadmeEditor from './ReadmeEditor';
import CreateRepoModal from './CreateRepoModal';

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
  onSelectRepo: (repoName: string | null) => void;
  onUpdateFilters: (options: Partial<FilterOptions>) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onCreateRepo: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  onSaveReadme: (repoName: string, content: string) => Promise<void>;
  onShowCreateModal: (show: boolean) => void;
  onEditReadme: (editing: boolean) => void;
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
  onSelectRepo,
  onUpdateFilters,
  onRefresh,
  onLogout,
  onCreateRepo,
  onSaveReadme,
  onShowCreateModal,
  onEditReadme,
}: MainLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(true);
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

  const allTopics = useMemo(() => Array.from(new Set(repos.flatMap((repo) => repo.topics))), [repos]);

  const stats = useMemo(
    () => ({
      total: repos.length,
      private: repos.filter((repo) => repo.private).length,
      public: repos.filter((repo) => !repo.private).length,
      withReadme: Object.keys(readmeContents).length,
      orphans: graphData.nodes.filter((node) => node.data.isOrphan).length,
    }),
    [repos, readmeContents, graphData.nodes]
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
          <span className="stats">
            {stats.total} repos · {stats.withReadme} with README · {stats.orphans} orphans
          </span>
        </div>
        <div className="header-right">
          <button onClick={() => onShowCreateModal(true)} className="create-btn">
            ✚ New Note
          </button>
          <button onClick={onRefresh} className="refresh-btn" disabled={isLoading}>
            {isLoading ? 'Loading...' : '↻ Refresh'}
          </button>
          <button onClick={() => setShowSidebar(!showSidebar)} className="toggle-sidebar-btn">
            {showSidebar ? '◀ Hide List' : '▶ Show List'}
          </button>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}
      {isLoadingReadmes && <div className="loading-readmes">⏳ Loading README files...</div>}

      <div className="main-content">
        <div className="graph-container">
          <GraphView
            data={graphData}
            filterOptions={filterOptions}
            selectedRepo={selectedRepo?.name || null}
            onSelectNode={onSelectRepo}
          />
        </div>

        {showSidebar && (
          <aside className="sidebar">
            <FilterPanel
              filterOptions={filterOptions}
              topics={allTopics}
              stats={stats}
              onUpdateFilters={onUpdateFilters}
            />

            <RepoList
              repos={filteredRepos}
              readmeContents={readmeContents}
              selectedRepo={selectedRepo?.name || null}
              onSelectRepo={onSelectRepo}
            />

            {selectedRepo && (
              <div className="readme-viewer">
                <div className="readme-viewer-header">
                  <h3>{stripPrefix(selectedRepo.name)}</h3>
                  <div className="readme-viewer-actions">
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

                <div className="readme-meta">
                  {selectedRepo.language && <span className="language-badge">{selectedRepo.language}</span>}
                  {selectedRepo.topics.map((topic) => (
                    <span key={topic} className="topic-tag">
                      {topic}
                    </span>
                  ))}
                </div>

                {isEditingReadme && selectedRepo ? (
                  <ReadmeEditor
                    initialContent={selectedReadme}
                    onSave={(content) => void onSaveReadme(selectedRepo.name, content)}
                    onCancel={() => onEditReadme(false)}
                  />
                ) : selectedReadme ? (
                  <div
                    className="readme-content"
                    onClick={handleReadmeClick}
                    dangerouslySetInnerHTML={{ __html: renderWikiLinks(selectedReadme) }}
                  />
                ) : (
                  <div className="no-readme">No README found</div>
                )}

                <div className="links-section">
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
                          {backlink.alias && <span>as {backlink.alias}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-links">No backlinks</div>
                  )}
                </div>

                <div className="links-section">
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
                          {outlink.alias && <span>as {outlink.alias}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-links">No outgoing links</div>
                  )}
                </div>
              </div>
            )}
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
    </div>
  );
}

export default MainLayout;
