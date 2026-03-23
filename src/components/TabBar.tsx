import { type MouseEvent } from 'react';

interface TabBarProps {
  tabs: string[];
  activeTab: string | null;
  viewMode: 'notes' | 'graph';
  onSelectTab: (repoName: string) => void;
  onCloseTab: (repoName: string) => void;
  onSelectGraph: () => void;
}

function TabBar({ tabs, activeTab, viewMode, onSelectTab, onCloseTab, onSelectGraph }: TabBarProps) {
  const stripPrefix = (name: string) => name.replace(/^gitsidian-/, '');

  const handleClose = (event: MouseEvent, repoName: string) => {
    event.stopPropagation();
    onCloseTab(repoName);
  };

  return (
    <div className="tab-bar">
      <div
        className={`tab-item tab-graph ${viewMode === 'graph' ? 'active' : ''}`}
        onClick={onSelectGraph}
      >
        <span className="tab-name">📊 Graph</span>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`tab-item ${tab === activeTab && viewMode === 'notes' ? 'active' : ''}`}
          onClick={() => onSelectTab(tab)}
        >
          <span className="tab-name">{stripPrefix(tab)}</span>
          <button className="tab-close" onClick={(event) => handleClose(event, tab)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default TabBar;
