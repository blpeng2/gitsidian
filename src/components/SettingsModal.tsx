import React, { useState, useEffect } from 'react';

const THEMES = [
  { id: 'midnight', label: '🌙 Midnight' },
  { id: 'light', label: '☀️ Light' },
  { id: 'nord', label: '🏔️ Nord' },
  { id: 'dracula', label: '🧛 Dracula' },
  { id: 'solarized', label: '🌅 Solarized' },
] as const;

type ThemeId = typeof THEMES[number]['id'];

interface SettingsModalProps {
  onClose: () => void;
}

function SettingsModal({ onClose }: SettingsModalProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(
    () => (localStorage.getItem('gitsidian_theme') as ThemeId) || 'midnight'
  );

  useEffect(() => {
    if (currentTheme === 'midnight') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
    localStorage.setItem('gitsidian_theme', currentTheme);
  }, [currentTheme]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <h3>Theme</h3>
            <div className="settings-theme-grid">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  className={`settings-theme-btn ${theme.id === currentTheme ? 'active' : ''}`}
                  onClick={() => setCurrentTheme(theme.id)}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SettingsModal);
