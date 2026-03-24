import { useState, useEffect } from 'react';
import { ghCliService } from '../services/ghCli';
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
  const [updateInfo, setUpdateInfo] = useState<{ version: string; downloadUrl: string; releaseUrl: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { version, downloadUrl, releaseUrl } = (e as CustomEvent).detail;
      setUpdateInfo({ version, downloadUrl, releaseUrl });
    };
    window.addEventListener('updateAvailable', handler);
    return () => window.removeEventListener('updateAvailable', handler);
  }, []);

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
        {updateInfo && (
          <button
            className="title-bar-update-badge"
            onClick={() => void ghCliService.openExternal(updateInfo.downloadUrl)}
            title={`v${updateInfo.version} available — click to download`}
          >
            ↑ {updateInfo.version}
          </button>
        )}
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default TitleBar;
