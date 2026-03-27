import React, { type MouseEvent } from 'react';
import { IconGraph, IconDiary, IconClose } from './Icons';
import { stripPrefix } from '../utils/strings';

interface TabBarProps {
  tabs: string[];
  activeTab: string | null;
  viewMode: 'notes' | 'graph' | 'diary';
  onSelectTab: (repoName: string) => void;
  onCloseTab: (repoName: string) => void;
  onSelectGraph: () => void;
  onSelectDiary: () => void;
}

function TabBar({ tabs, activeTab, viewMode, onSelectTab, onCloseTab, onSelectGraph, onSelectDiary }: TabBarProps) {
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
        <IconGraph className="tab-icon" style={{marginRight: '6px'}} />
        <span className="tab-name">Graph</span>
      </div>
      <div
        className={`tab-item tab-diary ${viewMode === 'diary' ? 'active' : ''}`}
        onClick={onSelectDiary}
      >
        <IconDiary className="tab-icon" style={{marginRight: '6px'}} />
        <span className="tab-name">Diary</span>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab}
          className={`tab-item ${tab === activeTab && viewMode === 'notes' ? 'active' : ''}`}
          onClick={() => onSelectTab(tab)}
        >
          <span className="tab-name">{stripPrefix(tab)}</span>
          <button className="tab-close" onClick={(event) => handleClose(event, tab)}>
            <IconClose />
          </button>
        </div>
      ))}
    </div>
  );
}

export default React.memo(TabBar);
