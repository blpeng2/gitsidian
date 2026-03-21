import { FilterOptions } from '../types';

interface FilterPanelProps {
  filterOptions: FilterOptions;
  topics: string[];
  stats: {
    total: number;
    private: number;
    public: number;
    withReadme: number;
    orphans: number;
  };
  onUpdateFilters: (options: Partial<FilterOptions>) => void;
}

function FilterPanel({ filterOptions, topics, stats, onUpdateFilters }: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <h3>Filters</h3>
      
      {/* Visibility filters */}
      <div className="filter-section">
        <h4>Visibility</h4>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filterOptions.showPrivate}
            onChange={(e) => onUpdateFilters({ showPrivate: e.target.checked })}
          />
          <span>🔒 Private ({stats.private})</span>
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filterOptions.showPublic}
            onChange={(e) => onUpdateFilters({ showPublic: e.target.checked })}
          />
          <span>🌐 Public ({stats.public})</span>
        </label>
      </div>

      {/* Orphan filter */}
      <div className="filter-section">
        <h4>Connections</h4>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filterOptions.showOrphans}
            onChange={(e) => onUpdateFilters({ showOrphans: e.target.checked })}
          />
          <span>Show orphans ({stats.orphans})</span>
        </label>
      </div>

      {/* Topic filter */}
      <div className="filter-section">
        <h4>Topic</h4>
        <select
          value={filterOptions.topicFilter || ''}
          onChange={(e) => onUpdateFilters({ 
            topicFilter: e.target.value || null 
          })}
          className="topic-filter-select"
        >
          <option value="">All Topics</option>
          {topics.map(topic => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </div>

      {/* Quick actions */}
      <div className="filter-section">
        <h4>Quick Views</h4>
        <button
          className="quick-view-btn"
          onClick={() => onUpdateFilters({
            showPrivate: true,
            showPublic: true,
            showOrphans: true,
            topicFilter: null,
          })}
        >
          Show All
        </button>
        <button
          className="quick-view-btn"
          onClick={() => onUpdateFilters({
            showPrivate: true,
            showPublic: false,
            showOrphans: true,
            topicFilter: null,
          })}
        >
          Private Only
        </button>
        <button
          className="quick-view-btn"
          onClick={() => onUpdateFilters({
            showPrivate: false,
            showPublic: true,
            showOrphans: true,
            topicFilter: null,
          })}
        >
          Public Only
        </button>
        <button
          className="quick-view-btn"
          onClick={() => onUpdateFilters({
            showPrivate: true,
            showPublic: true,
            showOrphans: false,
            topicFilter: null,
          })}
        >
          Connected Only
        </button>
      </div>
    </div>
  );
}

export default FilterPanel;
