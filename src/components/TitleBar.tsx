import { useState } from 'react';
import SettingsModal from './SettingsModal';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        toggleAIPanel?: { postMessage: (message: null) => void };
      };
    };
  }
}

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showExplorer: boolean;
  onToggleExplorer: () => void;
}

function TitleBar({ searchQuery, onSearchChange, showExplorer, onToggleExplorer }: TitleBarProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="title-bar">
        <div className="title-bar-traffic" />
        <button
          className="title-bar-btn"
          onClick={onToggleExplorer}
          title={showExplorer ? 'Hide sidebar' : 'Show sidebar'}
        >
          {showExplorer ? '◀' : '▶'}
        </button>
        <input
          className="title-bar-search"
          type="text"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button
          className="title-bar-btn"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙️
        </button>
        <button
          className="title-bar-btn"
          onClick={() => window.webkit?.messageHandlers?.toggleAIPanel?.postMessage(null)}
          title="Toggle AI Panel (⌘\)"
        >
          🤖
        </button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default TitleBar;
