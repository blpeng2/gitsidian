import { useState } from 'react';
import { GitHubRepo, MetaNote, GraphData, FilterOptions } from '../types';
import GraphView from './GraphView';
import RepoList from './RepoList';
import MetaNoteEditor from './MetaNoteEditor';
import FilterPanel from './FilterPanel';

interface MainLayoutProps {
  repos: GitHubRepo[];
  metaNotes: Record<string, MetaNote>;
  selectedRepo: GitHubRepo | null;
  selectedMetaNote: MetaNote | null;
  graphData: GraphData;
  filterOptions: FilterOptions;
  isLoading: boolean;
  error: string | null;
  onSelectRepo: (repoName: string | null) => void;
  onSaveMetaNote: (note: MetaNote) => void;
  onUpdateFilters: (options: Partial<FilterOptions>) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

function MainLayout({
  repos,
  metaNotes,
  selectedRepo,
  selectedMetaNote,
  graphData,
  filterOptions,
  isLoading,
  error,
  onSelectRepo,
  onSaveMetaNote,
  onUpdateFilters,
  onRefresh,
  onLogout,
}: MainLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(true);

  // Filter repos based on options
  const filteredRepos = repos.filter(repo => {
    if (!filterOptions.showPrivate && repo.private) return false;
    if (!filterOptions.showPublic && !repo.private) return false;
    if (!filterOptions.showOrphans) {
      const isOrphan = graphData.nodes.find(n => n.data.id === repo.name)?.data.isOrphan;
      if (isOrphan) return false;
    }
    if (filterOptions.topicFilter) {
      if (!repo.topics.includes(filterOptions.topicFilter)) return false;
    }
    return true;
  });

  // Get all unique topics
  const allTopics = Array.from(new Set(repos.flatMap(repo => repo.topics)));

  // Stats
  const stats = {
    total: repos.length,
    private: repos.filter(r => r.private).length,
    public: repos.filter(r => !r.private).length,
    withNotes: Object.keys(metaNotes).length,
    orphans: graphData.nodes.filter(n => n.data.isOrphan).length,
  };

  return (
    <div className="main-layout">
      {/* Header */}
      <header className="main-header">
        <div className="header-left">
          <h1 className="logo">Gitsidian</h1>
          <span className="stats">
            {stats.total} repos · {stats.withNotes} notes · {stats.orphans} orphans
          </span>
        </div>
        <div className="header-right">
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

      {/* Error display */}
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="main-content">
        {/* Graph view */}
        <div className="graph-container">
          <GraphView
            data={graphData}
            filterOptions={filterOptions}
            selectedRepo={selectedRepo?.name || null}
            onSelectNode={onSelectRepo}
          />
        </div>

        {/* Sidebar */}
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
              metaNotes={metaNotes}
              selectedRepo={selectedRepo?.name || null}
              onSelectRepo={onSelectRepo}
            />

            {selectedRepo && (
              <MetaNoteEditor
                repo={selectedRepo}
                metaNote={selectedMetaNote}
                allRepos={repos}
                onSave={onSaveMetaNote}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default MainLayout;
