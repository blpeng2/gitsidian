import { useState, useEffect, useRef, useCallback } from 'react';
import { GitHubRepo } from '../types';
import { searchDiary, searchRepos, SearchResult } from '../utils/search';
import { stripPrefix } from '../utils/strings';

interface SearchModalProps {
  repos: GitHubRepo[];
  readmeContents: Record<string, string>;
  diaryContents: Record<string, string>;
  onSelectRepo: (repoName: string) => void;
  onSelectDiary: (date: string) => void;
  onClose: () => void;
}

const MATCH_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Desc',
  topic: 'Topic',
  content: 'README',
  diary: 'Diary',
};

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function SearchModal({ repos, readmeContents, diaryContents, onSelectRepo, onSelectDiary, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Run search whenever query changes
  useEffect(() => {
    const repoResults = searchRepos(query, repos, readmeContents);
    const diaryResults = searchDiary(query, diaryContents, new Set(repos.map((repo) => repo.name)));
    setResults([...repoResults, ...diaryResults].sort((a, b) => b.score - a.score).slice(0, 50));
    setSelectedIndex(0);
  }, [query, repos, readmeContents, diaryContents]);

  // Auto-focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      if (results[selectedIndex].kind === 'repo') {
        onSelectRepo(results[selectedIndex].repoName);
      } else {
        onSelectDiary(results[selectedIndex].date);
      }
      onClose();
    }
  }, [results, selectedIndex, onSelectRepo, onSelectDiary, onClose]);

  const handleResultSelect = useCallback((result: SearchResult) => {
    if (result.kind === 'repo') {
      onSelectRepo(result.repoName);
      return;
    }
    onSelectDiary(result.date);
  }, [onSelectDiary, onSelectRepo]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="search-modal-header">
          <span className="search-modal-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search notes… (name, topics, content)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-modal-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {query && (
          <div className="search-modal-results" ref={listRef}>
            {results.length === 0 ? (
              <div className="search-no-results">No results for "{query}"</div>
            ) : (
              results.map((result, i) => (
                <div
                  key={result.kind === 'repo' ? result.repoName : result.date}
                  className={`search-result-item ${i === selectedIndex ? 'selected' : ''}`}
                  onClick={() => { handleResultSelect(result); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="search-result-name">
                    {highlightText(result.displayName, query)}
                    <span className={`search-match-badge search-match-${result.matchType}`}>
                      {MATCH_LABELS[result.matchType]}
                    </span>
                  </div>
                  {result.kind === 'diary' && result.relatedRepos.length > 0 && (
                    <div className="search-result-excerpt">
                      Linked: {result.relatedRepos.map((repoName) => stripPrefix(repoName)).join(', ')}
                    </div>
                  )}
                  {result.matchType !== 'name' && (
                    <div className="search-result-excerpt">
                      {highlightText(result.excerpt, query)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {!query && (
          <div className="search-modal-hint">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>Esc close</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchModal;
