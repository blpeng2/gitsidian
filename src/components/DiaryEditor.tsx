import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SaveStatus } from '../types';
import { githubService } from '../services/github';
import { storageService } from '../services/storage';
import { renderMarkdown } from '../utils/markdown';
import { stripPrefix } from '../utils/strings';

interface DiaryEditorProps {
  date: string;
  owner: string;
  repoNames: string[];
  diaryDates: string[];
  initialContent: string;
  entrySha: string | null;
  onSave: (date: string, content: string, newSha: string) => void;
  onClose: () => void;
}

function DiaryEditor({ date, owner, repoNames, diaryDates, initialContent, entrySha, onSave, onClose }: DiaryEditorProps) {
  const [content, setContent] = useState(() => {
    const draft = storageService.getDiaryDraft(date);
    return draft !== null && draft !== initialContent ? draft : initialContent;
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    storageService.getDiaryDraft(date) !== null && storageService.getDiaryDraft(date) !== initialContent ? 'modified' : 'saved'
  );
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showWikiPicker, setShowWikiPicker] = useState(false);
  const [wikiFilter, setWikiFilter] = useState('');
  const [wikiSelectedIndex, setWikiSelectedIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shaRef = useRef(entrySha);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;
  const renderedPreview = useMemo(
    () => content ? renderMarkdown(content) : '',
    [content]
  );

  // Format date for display
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Save to GitHub
  const saveToGitHub = useCallback(async () => {
    const currentContent = contentRef.current;
    if (!currentContent.trim()) return;
    setSaveStatus('saving');
    try {
      const newSha = await githubService.saveDiaryEntry(owner, date, currentContent, shaRef.current);
      shaRef.current = newSha;
      storageService.removeDiaryDraft(date);
      setSaveStatus('saved');
      onSave(date, currentContent, newSha);
    } catch (error) {
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 409) {
        // SHA conflict — re-fetch and retry
        const fresh = await githubService.getDiaryEntry(owner, date);
        if (fresh) {
          shaRef.current = fresh.sha;
          try {
            const newSha = await githubService.saveDiaryEntry(owner, date, currentContent, fresh.sha);
            shaRef.current = newSha;
            storageService.removeDiaryDraft(date);
            setSaveStatus('saved');
            onSave(date, currentContent, newSha);
            return;
          } catch {
            // fall through to error
          }
        }
      }
      setSaveStatus('error');
    }
  }, [owner, date, onSave]);

  // Debounced autosave
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveToGitHub();
    }, 3000);
  }, [saveToGitHub]);

  // Handle content change
  const handleChange = useCallback((newContent: string) => {
    setContent(newContent);
    storageService.setDiaryDraft(date, newContent);
    setSaveStatus('modified');
    scheduleSave();
  }, [date, scheduleSave]);

  // Ctrl+S immediate save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        void saveToGitHub();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveToGitHub]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // Content will be in draft already via handleChange
      }
    };
  }, []);

  // Wiki-link autocomplete
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showWikiPicker) {
      const filtered = getFilteredWikiItems();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setWikiSelectedIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setWikiSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered.length > 0) {
          insertWikiLink(filtered[wikiSelectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowWikiPicker(false);
        return;
      }
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    handleChange(value);

    // Detect [[ trigger
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const textBefore = value.substring(0, pos);
    const match = textBefore.match(/\[\[([^\]]*)$/);
    if (match) {
      setShowWikiPicker(true);
      setWikiFilter(match[1].toLowerCase());
      setWikiSelectedIndex(0);
    } else {
      setShowWikiPicker(false);
    }
  };

  const getFilteredWikiItems = useCallback(() => {
    const items: { value: string; label: string }[] = [];
    
    // Repo names
    repoNames.forEach((name) => {
      items.push({ value: name, label: stripPrefix(name) });
    });
    
    // Diary dates
    diaryDates.forEach((d) => {
      if (d !== date) {
        items.push({ value: `diary/${d}`, label: `diary/${d}` });
      }
    });

    if (!wikiFilter) return items.slice(0, 20);
    return items
      .filter((item) => item.label.toLowerCase().includes(wikiFilter) || item.value.toLowerCase().includes(wikiFilter))
      .slice(0, 20);
  }, [repoNames, diaryDates, date, wikiFilter]);

  const insertWikiLink = (item: { value: string; label: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const textBefore = content.substring(0, pos);
    const textAfter = content.substring(pos);
    const bracketStart = textBefore.lastIndexOf('[[');
    if (bracketStart === -1) return;

    const newContent = textBefore.substring(0, bracketStart) + `[[${item.value}]]` + textAfter;
    handleChange(newContent);
    setShowWikiPicker(false);

    // Restore cursor position
    const newPos = bracketStart + item.value.length + 4;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  // Toolbar actions
  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    handleChange(newContent);
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + before.length + selected.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const statusLabel = saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'modified' ? '● Modified' : saveStatus === 'saving' ? '⟳ Saving…' : '✕ Error';

  return (
    <div className="diary-editor">
      <div className="diary-editor-header">
        <div className="diary-editor-title">
          <h2>{displayDate}</h2>
          <span className={`save-status ${saveStatus}`}>{statusLabel}</span>
        </div>
        <div className="diary-editor-tabs">
          <button
            className={`editor-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            Edit
          </button>
          <button
            className={`editor-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        </div>
        <button className="diary-editor-close" onClick={onClose} title="Close">✕</button>
      </div>

      {activeTab === 'edit' ? (
        <div className="diary-editor-body">
          <div className="diary-toolbar">
            <button onClick={() => insertAtCursor('**', '**')} title="Bold">B</button>
            <button onClick={() => insertAtCursor('*', '*')} title="Italic"><em>I</em></button>
            <button onClick={() => insertAtCursor('# ')} title="Heading">H</button>
            <button onClick={() => insertAtCursor('- ')} title="List">•</button>
            <button onClick={() => insertAtCursor('> ')} title="Quote">"</button>
            <button onClick={() => insertAtCursor('`', '`')} title="Code">&lt;/&gt;</button>
            <button onClick={() => insertAtCursor('[[')} title="Wiki Link">[[</button>
          </div>
          <div className="diary-textarea-wrapper">
            <textarea
              ref={textareaRef}
              className="diary-textarea"
              value={content}
              onChange={handleTextareaInput}
              onKeyDown={handleTextareaKeyDown}
              placeholder={`Write your diary entry for ${date}...`}
              autoFocus
            />
            {showWikiPicker && (
              <div className="wiki-picker diary-wiki-picker">
                {getFilteredWikiItems().map((item, index) => (
                  <div
                    key={item.value}
                    className={`wiki-picker-item ${index === wikiSelectedIndex ? 'selected' : ''}`}
                    onClick={() => insertWikiLink(item)}
                    onMouseEnter={() => setWikiSelectedIndex(index)}
                  >
                    {item.label}
                  </div>
                ))}
                {getFilteredWikiItems().length === 0 && (
                  <div className="wiki-picker-empty">No matches</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="diary-preview">
          {content ? (
            <div
              className="note-content"
              dangerouslySetInnerHTML={{ __html: renderedPreview }}
            />
          ) : (
            <div className="diary-preview-empty">Nothing to preview</div>
          )}
        </div>
      )}

      <div className="diary-editor-footer">
        <span>{content.length} chars · {content.split('\n').length} lines</span>
      </div>
    </div>
  );
}

export default DiaryEditor;
