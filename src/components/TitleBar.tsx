import React, { useState } from 'react';
import SettingsModal from './SettingsModal';
import { IconSidebarClose, IconSidebarOpen, IconSettings, IconAI } from './Icons';

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
  const [appVersion] = useState<string>(() => {
    return (window as unknown as { __APP_VERSION__?: string }).__APP_VERSION__ ?? '';
  });

  return (
    <>
      <div className="title-bar">
        <div className="title-bar-traffic" />
        <button
          className="title-bar-btn"
          onClick={onToggleExplorer}
          title={showExplorer ? 'Hide sidebar' : 'Show sidebar'}
        >
          {showExplorer ? <IconSidebarClose /> : <IconSidebarOpen />}
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
          <IconSettings />
        </button>
        <button
          className="title-bar-btn"
          onClick={() => window.webkit?.messageHandlers?.toggleAIPanel?.postMessage(null)}
          title="Toggle AI Panel (⌘\)"
        >
          <IconAI />
        </button>
        {appVersion && (
          <span className="title-bar-version">{appVersion}</span>
        )}
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default React.memo(TitleBar);
