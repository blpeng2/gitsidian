import { type MouseEvent } from 'react';

interface TabBarProps {
  tabs: string[];
  activeTab: string | null;
  onSelectTab: (repoName: string) => void;
  onCloseTab: (repoName: string) => void;
}

function TabBar({ tabs, activeTab, onSelectTab, onCloseTab }: TabBarProps) {
  const stripPrefix = (name: string) => name.replace(/^gitsidian-/, '');

  const handleClose = (event: MouseEvent, repoName: string) => {
    event.stopPropagation();
    onCloseTab(repoName);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`tab-item ${tab === activeTab ? 'active' : ''}`}
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
