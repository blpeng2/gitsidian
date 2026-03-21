import { useState, useMemo } from 'react';
import { GitHubRepo } from '../types';

interface RepoListProps {
  repos: GitHubRepo[];
  readmeContents: Record<string, string>;
  selectedRepo: string | null;
  onSelectRepo: (repoName: string | null) => void;
}

function RepoList({ repos, readmeContents, selectedRepo, onSelectRepo }: RepoListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'created'>('updated');

  // Filter and sort repos
  const filteredRepos = useMemo(() => {
    let result = [...repos];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query) ||
        repo.topics.some(topic => topic.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'updated':
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [repos, searchQuery, sortBy]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="repo-list">
      <div className="repo-list-header">
        <h3>Repositories ({filteredRepos.length})</h3>
        <div className="repo-list-controls">
          <input
            type="text"
            placeholder="Search repos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="repo-search"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated' | 'name' | 'created')}
            className="repo-sort"
          >
            <option value="updated">Recently Updated</option>
            <option value="name">Name</option>
            <option value="created">Recently Created</option>
          </select>
        </div>
      </div>

      <div className="repo-list-items">
        {filteredRepos.length === 0 ? (
          <div className="no-repos">No repositories found</div>
        ) : (
          filteredRepos.map(repo => {
            const hasReadme = !!readmeContents[repo.name];
            const isSelected = selectedRepo === repo.name;

            return (
              <div
                key={repo.id}
                className={`repo-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectRepo(repo.name)}
              >
                <div className="repo-item-header">
                  <span className={`repo-visibility ${repo.private ? 'private' : 'public'}`}>
                    {repo.private ? '🔒' : '🌐'}
                  </span>
                  <span className="repo-name">{repo.name}</span>
                  {hasReadme && <span className="has-readme" title="Has README loaded">📄</span>}
                </div>
                {repo.description && (
                  <p className="repo-description">{repo.description}</p>
                )}
                <div className="repo-meta">
                  {repo.language && (
                    <span className="repo-language">{repo.language}</span>
                  )}
                  <span className="repo-updated">{formatDate(repo.updated_at)}</span>
                </div>
                {repo.topics.length > 0 && (
                  <div className="repo-topics">
                    {repo.topics.slice(0, 3).map(topic => (
                      <span key={topic} className="topic-tag">{topic}</span>
                    ))}
                    {repo.topics.length > 3 && (
                      <span className="topic-more">+{repo.topics.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RepoList;
