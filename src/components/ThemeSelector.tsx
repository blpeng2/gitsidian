import { useState, useEffect } from 'react';

const THEMES = [
  { id: 'midnight', label: '🌙 Midnight' },
  { id: 'light', label: '☀️ Light' },
  { id: 'nord', label: '🏔️ Nord' },
  { id: 'dracula', label: '🧛 Dracula' },
  { id: 'solarized', label: '🌅 Solarized' },
] as const;

type ThemeId = typeof THEMES[number]['id'];

function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem('gitsidian_theme') as ThemeId) || 'midnight';
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (currentTheme === 'midnight') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
    localStorage.setItem('gitsidian_theme', currentTheme);
  }, [currentTheme]);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('gitsidian_theme') as ThemeId;
    if (saved && saved !== 'midnight') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const currentLabel = THEMES.find(t => t.id === currentTheme)?.label || '🌙 Midnight';

  return (
    <div className="theme-selector">
      <button className="theme-toggle" onClick={() => setIsOpen(!isOpen)}>
        {currentLabel}
      </button>
      {isOpen && (
        <div className="theme-dropdown">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              className={`theme-option ${theme.id === currentTheme ? 'active' : ''}`}
              onClick={() => { setCurrentTheme(theme.id); setIsOpen(false); }}
            >
              {theme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeSelector;