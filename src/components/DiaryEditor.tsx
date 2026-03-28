import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SaveStatus } from '../types';
import { githubService } from '../services/github';
import { storageService } from '../services/storage';
import { renderMarkdown } from '../utils/markdown';
import { stripPrefix } from '../utils/strings';
import { findRepoName } from '../utils/wikiLinks';

interface DiaryEditorProps {
  date: string;
  owner: string;
  repoNames: string[];
  diaryDates: string[];
  initialContent: string;
  entrySha: string | null;
  onSave: (date: string, content: string, newSha: string) => void;
  onClose: () => void;
  onNavigateRepo?: (repoName: string) => void;
  onNavigateDate?: (date: string) => void;
}

function DiaryEditor({ date, owner, repoNames, diaryDates, initialContent, entrySha, onSave, onClose, onNavigateRepo, onNavigateDate }: DiaryEditorProps) {
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

  const ownerRef = useRef(owner);
  const dateRef = useRef(date);
  const onSaveRef = useRef(onSave);
  const initialContentRef = useRef(initialContent);
  
  ownerRef.current = owner;
  dateRef.current = date;
  onSaveRef.current = onSave;
  initialContentRef.current = initialContent;

  useEffect(() => {
    const draft = storageService.getDiaryDraft(date);
    const nextContent = draft !== null && draft !== initialContent ? draft : initialContent;
    setContent(nextContent);
    contentRef.current = nextContent;
    shaRef.current = entrySha;
    setSaveStatus(draft !== null && draft !== initialContent ? 'modified' : 'saved');
  }, [date, initialContent, entrySha]);

  const saveToGitHub = useCallback(async () => {
    const currentContent = contentRef.current;
    const currentOwner = ownerRef.current;
    const currentDate = dateRef.current;
    const currentOnSave = onSaveRef.current;

    console.log('[Diary] saveToGitHub called', { currentDate, contentLength: currentContent.length });

    if (!currentContent.trim()) {
      console.log('[Diary] Skipping save - empty content');
      return;
    }
    setSaveStatus('saving');
    try {
      console.log('[Diary] Calling API...');
      const newSha = await githubService.saveDiaryEntry(currentOwner, currentDate, currentContent, shaRef.current);
      console.log('[Diary] API success, new SHA:', newSha);
      shaRef.current = newSha;
      storageService.removeDiaryDraft(currentDate);
      setSaveStatus('saved');
      currentOnSave(currentDate, currentContent, newSha);
    } catch (error) {
      console.error('[Diary] Save error:', error);
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 409) {
        console.log('[Diary] Conflict detected, retrying...');
        const fresh = await githubService.getDiaryEntry(currentOwner, currentDate);
        if (fresh) {
          shaRef.current = fresh.sha;
          try {
            const newSha = await githubService.saveDiaryEntry(currentOwner, currentDate, currentContent, fresh.sha);
            console.log('[Diary] Retry success, new SHA:', newSha);
            shaRef.current = newSha;
            storageService.removeDiaryDraft(currentDate);
            setSaveStatus('saved');
            currentOnSave(currentDate, currentContent, newSha);
            return;
          } catch {
            // fall through to error
          }
        }
      }
      setSaveStatus('error');
    }
  }, []);

  // Debounced autosave
  const scheduleSave = useCallback(() => {
    console.log('[Diary] scheduleSave called');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      console.log('[Diary] Auto-save timer fired');
      void saveToGitHub();
    }, 3000);
  }, [saveToGitHub]);

  // Handle content change
  const handleChange = useCallback((newContent: string) => {
    console.log('[Diary] handleChange called');
    setContent(newContent);
    storageService.setDiaryDraft(date, newContent);
    setSaveStatus('modified');
    scheduleSave();
  }, [date, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const finalContent = contentRef.current;
      const currentOwner = ownerRef.current;
      const currentDate = dateRef.current;
      const currentInitial = initialContentRef.current;
      const currentOnSave = onSaveRef.current;

      if (finalContent.trim() && finalContent !== currentInitial) {
        console.log('[Diary] Saving on unmount:', currentDate);
        void githubService.saveDiaryEntry(currentOwner, currentDate, finalContent, shaRef.current)
          .then((newSha) => {
            console.log('[Diary] Unmount save successful:', currentDate);
            storageService.removeDiaryDraft(currentDate);
            currentOnSave(currentDate, finalContent, newSha);
          })
          .catch(async (error) => {
            if (error instanceof Error && 'status' in error && (error as { status: number }).status === 409) {
              console.log('[Diary] Unmount save conflict, retrying with fresh SHA...');
              const fresh = await githubService.getDiaryEntry(currentOwner, currentDate);
              if (fresh) {
                try {
                  const newSha = await githubService.saveDiaryEntry(currentOwner, currentDate, finalContent, fresh.sha);
                  console.log('[Diary] Unmount save retry successful:', currentDate);
                  storageService.removeDiaryDraft(currentDate);
                  currentOnSave(currentDate, finalContent, newSha);
                  return;
                } catch (retryErr) {
                  console.error('[Diary] Unmount save retry failed:', retryErr);
                }
              }
            }
            console.error('[Diary] Unmount save failed:', error);
          });
      }
    };
  }, []);

  useEffect(() => {
    if (saveStatus === 'modified') {
      const timer = setTimeout(() => {
        void saveToGitHub();
      }, 3000);
      saveTimerRef.current = timer;
    }
  }, []);

  // Wiki-link autocomplete
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void saveToGitHub();
      return;
    }

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

  const handleAskAI = useCallback(() => {
    const handler = (window.webkit?.messageHandlers as Record<string, { postMessage: (body: unknown) => void } | undefined> | undefined)?.diaryAIPrompt;
    if (handler) {
      handler.postMessage(content);
    }
  }, [content]);

  const handlePreviewClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('wikilink')) {
      return;
    }

    const rawTarget = target.getAttribute('data-repo')?.trim();
    if (!rawTarget) {
      return;
    }

    if (rawTarget.startsWith('diary/')) {
      const linkedDate = rawTarget.slice('diary/'.length);
      if (linkedDate) {
        onNavigateDate?.(linkedDate);
      }
      return;
    }

    const resolvedRepo = findRepoName(new Set(repoNames), rawTarget);
    if (resolvedRepo) {
      onNavigateRepo?.(resolvedRepo);
    }
  }, [onNavigateDate, onNavigateRepo, repoNames]);

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
            <div className="diary-toolbar-separator" />
            <button className="diary-ai-btn" onClick={handleAskAI} title="AI에게 질문">✨ AI</button>
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
              onClick={handlePreviewClick}
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
