import { useState, useMemo } from 'react';
import { GitHubRepo, NoteCategory } from '../types';
import { getCategoryLabel, getRepoCategory } from '../utils/categoryRules';
import { stripPrefix } from '../utils/strings';
import { IconNote, IconChevronRight, IconChevronDown, IconInbox, IconActive, IconReference, IconArchive } from './Icons';

interface RepoListProps {
  repos: GitHubRepo[];
  selectedRepo: string | null;
  onSelectRepo: (repoName: string | null) => void;
  categoryFilter: NoteCategory | 'all';
  onCategoryFilterChange: (cat: NoteCategory | 'all') => void;
  onMoveCategory: (repoName: string, category: NoteCategory) => void;
  searchQuery: string;
}

const CategoryIcon = ({ category, className = '' }: { category: NoteCategory | 'all', className?: string }) => {
  switch (category) {
    case 'inbox': return <IconInbox className={className} />;
    case 'active': return <IconActive className={className} />;
    case 'reference': return <IconReference className={className} />;
    case 'archive': return <IconArchive className={className} />;
    case 'all': return <IconNote className={className} />;
    default: return <IconNote className={className} />;
  }
};

function RepoList({
  repos,
  selectedRepo,
  onSelectRepo,
  categoryFilter,
  onCategoryFilterChange,
  onMoveCategory,
  searchQuery,
  }: RepoListProps) {
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'created'>('updated');
  const [collapsedSections, setCollapsedSections] = useState<Record<NoteCategory, boolean>>({
    inbox: false,
    active: false,
    reference: false,
    archive: false,
  });
  const categories: (NoteCategory | 'all')[] = ['all', 'inbox', 'active', 'reference', 'archive'];
  const displayCategories: NoteCategory[] = ['inbox', 'active', 'reference', 'archive'];

  const filteredRepos = useMemo(() => {
    let result = [...repos];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((repo) =>
        repo.name.toLowerCase().includes(query)
        || repo.description?.toLowerCase().includes(query)
        || repo.topics.some((topic) => topic.toLowerCase().includes(query))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((repo) => getRepoCategory(repo) === categoryFilter);
    }

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
  }, [repos, searchQuery, sortBy, categoryFilter]);

  const reposByCategory = useMemo(() => {
    const grouped: Record<NoteCategory, GitHubRepo[]> = {
      inbox: [],
      active: [],
      reference: [],
      archive: [],
    };

    filteredRepos.forEach((repo) => {
      grouped[getRepoCategory(repo)].push(repo);
    });

    return grouped;
  }, [filteredRepos]);

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

  const handleToggleSection = (category: NoteCategory) => {
    setCollapsedSections((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  };

  const renderRepoItem = (repo: GitHubRepo) => {
    const isSelected = selectedRepo === repo.name;

    return (
      <div
        key={repo.id}
        className={`repo-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectRepo(repo.name)}
      >
        <div className="repo-item-header">
          <span className={`repo-visibility ${repo.private ? 'private' : 'public'}`}>
            {repo.private ? 'Private' : 'Public'}
          </span>
          <span className="repo-category-badge"><CategoryIcon category={getRepoCategory(repo)} /></span>
          <span className="repo-name">{stripPrefix(repo.name)}</span>
          <div className="category-move-actions">
            {(['inbox', 'active', 'reference', 'archive'] as NoteCategory[])
              .filter((category) => category !== getRepoCategory(repo))
              .map((category) => (
                <button
                  key={category}
                  className="category-move-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveCategory(repo.name, category);
                  }}
                  title={`Move to ${getCategoryLabel(category)}`}
                >
                  <CategoryIcon category={category} />
                </button>
              ))}
          </div>
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
            {repo.topics.slice(0, 3).map((topic) => (
              <span key={topic} className="topic-tag">{topic}</span>
            ))}
            {repo.topics.length > 3 && (
              <span className="topic-more">+{repo.topics.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="repo-list">
      <div className="repo-list-header">
        <h3>Repositories ({filteredRepos.length})</h3>
        <div className="repo-list-controls">
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
      <div className="category-tabs">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-tab ${categoryFilter === category ? 'active' : ''}`}
            onClick={() => onCategoryFilterChange(category)}
          >
            <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
              <CategoryIcon category={category} /> {category === 'all' ? 'All' : getCategoryLabel(category)}
            </span>
            <span className="category-count">
              {category === 'all'
                ? repos.length
                : repos.filter((repo) => getRepoCategory(repo) === category).length}
            </span>
          </button>
        ))}
      </div>

      <div className="repo-list-items">
        {filteredRepos.length === 0 ? (
          <div className="no-repos">No repositories found</div>
        ) : (
          displayCategories
            .filter((category) => reposByCategory[category].length > 0)
            .map((category) => (
              <div key={category} className="repo-category-section">
                <button
                  className="repo-category-header"
                  onClick={() => handleToggleSection(category)}
                >
                  <span style={{display: 'flex', alignItems: 'center'}}>{collapsedSections[category] ? <IconChevronRight /> : <IconChevronDown />}</span>
                  <span style={{display: 'flex', alignItems: 'center'}}><CategoryIcon category={category} /></span>
                  <span>{getCategoryLabel(category)}</span>
                  <span className="repo-category-size">{reposByCategory[category].length}</span>
                </button>
                {!collapsedSections[category] && (
                  <div className="repo-category-items">
                    {reposByCategory[category].map((repo) => renderRepoItem(repo))}
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default RepoList;
