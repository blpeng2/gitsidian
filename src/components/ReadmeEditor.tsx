import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SaveStatus } from '../types';
import { renderMarkdown } from '../utils/markdown';
import { stripPrefix } from '../utils/strings';
import { githubService } from '../services/github';
import { storageService } from '../services/storage';
import { IconBold, IconItalic, IconStrikethrough, IconH1, IconH2, IconH3, IconBulletList, IconNumberedList, IconCheckbox, IconLink, IconWikiLink, IconCode, IconCodeBlock, IconImage, IconQuote, IconHRule, IconEdit, IconClose, IconLock, IconGlobe } from './Icons';

interface SlashCommand {
  id: string;
  label: string;
  icon: React.ReactNode;
  insert: string;
  cursorOffset?: number;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Heading 1', icon: <IconH1 />, insert: '# ' },
  { id: 'h2', label: 'Heading 2', icon: <IconH2 />, insert: '## ' },
  { id: 'h3', label: 'Heading 3', icon: <IconH3 />, insert: '### ' },
  { id: 'bullet', label: 'Bullet List', icon: <IconBulletList />, insert: '- ' },
  { id: 'numbered', label: 'Numbered List', icon: <IconNumberedList />, insert: '1. ' },
  { id: 'todo', label: 'To-do', icon: <IconCheckbox />, insert: '- [ ] ' },
  { id: 'code', label: 'Code Block', icon: <IconCodeBlock />, insert: '```\n\n```', cursorOffset: 4 },
  { id: 'quote', label: 'Quote', icon: <IconQuote />, insert: '> ' },
  {
    id: 'table',
    label: 'Table',
    icon: '⊞',
    insert: '| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n',
  },
  { id: 'math', label: 'Math Block', icon: '∑', insert: '$$\n\n$$', cursorOffset: 3 },
  { id: 'hr', label: 'Divider', icon: <IconHRule />, insert: '\n---\n' },
];

function getCaretPixelPos(textarea: HTMLTextAreaElement, caretPos: number): { top: number; left: number } {
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  const props = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
    'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize',
    'whiteSpace', 'wordBreak', 'overflowWrap',
  ] as const;
  for (const prop of props) {
    const cssProp = prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    mirror.style.setProperty(cssProp, style.getPropertyValue(cssProp));
  }
  mirror.style.position = 'absolute';
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.overflow = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordBreak = 'break-word';

  const before = document.createTextNode(textarea.value.substring(0, caretPos));
  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  mirror.appendChild(before);
  mirror.appendChild(marker);

  const container = textarea.parentElement ?? document.body;
  container.appendChild(mirror);
  try {
    const markerRect = marker.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      top: markerRect.top - containerRect.top + textarea.scrollTop + 20,
      left: Math.min(markerRect.left - containerRect.left, containerRect.width - 220),
    };
  } finally {
    container.removeChild(mirror);
  }
}

interface ReadmeEditorProps {
  repoName: string;
  repoNames: string[];
  repoOwner: string;
  initialContent: string;
  currentTopics: string[];
  isPrivate: boolean;
  onUpdateTopics: (topics: string[]) => void;
  onSave: (content: string) => void;
  onClose: () => void;
  onToggleVisibility: () => Promise<void> | void;
}

function ReadmeEditor({
  repoName,
  repoNames,
  repoOwner,
  initialContent,
  currentTopics,
  isPrivate,
  onUpdateTopics,
  onSave,
  onClose,
  onToggleVisibility,
}: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showWikiPicker, setShowWikiPicker] = useState(false);
  const [wikiSearch, setWikiSearch] = useState('');
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [uploadOverlayState, setUploadOverlayState] = useState<null | 'uploading' | 'success'>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pasteToast, setPasteToast] = useState<null | 'pasting' | 'success' | 'error'>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [showInlineWikiPicker, setShowInlineWikiPicker] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [showVisibilityConfirm, setShowVisibilityConfirm] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState(false);
  const [inlineWikiSearch, setInlineWikiSearch] = useState('');
  const [inlineWikiSelectedIndex, setInlineWikiSelectedIndex] = useState(0);
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shaRef = useRef<string | null>(null);
  const contentRef = useRef(initialContent);
  const lastSavedContentRef = useRef(initialContent);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const historyRef = useRef<string[]>([initialContent]);
  const historyIndexRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wikiPickerRef = useRef<HTMLDivElement>(null);
  const topicPickerRef = useRef<HTMLDivElement>(null);
  const renderedPreview = useMemo(
    () => content ? renderMarkdown(content) : '',
    [content]
  );
  const slashInsertPosRef = useRef(0);
  const wikiInsertPosRef = useRef(0);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const pasteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPasteToastTimer = useCallback(() => {
    if (pasteToastTimerRef.current) {
      clearTimeout(pasteToastTimerRef.current);
      pasteToastTimerRef.current = null;
    }
  }, []);

  const queuePasteToastClear = useCallback((delayMs: number) => {
    clearPasteToastTimer();
    pasteToastTimerRef.current = setTimeout(() => {
      setPasteToast(null);
      pasteToastTimerRef.current = null;
    }, delayMs);
  }, [clearPasteToastTimer]);

  const clearUploadOverlayTimer = useCallback(() => {
    if (uploadOverlayTimerRef.current) {
      clearTimeout(uploadOverlayTimerRef.current);
      uploadOverlayTimerRef.current = null;
    }
  }, []);

  const saveToGitHub = useCallback(async () => {
    const contentToSave = contentRef.current;
    if (contentToSave === lastSavedContentRef.current) {
      setSaveStatus('saved');
      return;
    }
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    setErrorMsg(null);

    try {
      const newSha = await githubService.updateReadme(repoOwner, repoName, contentToSave, shaRef.current);
      shaRef.current = newSha;
      lastSavedContentRef.current = contentToSave;
      onSave(contentToSave);
      storageService.removeDraft(repoName);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      const message = error instanceof Error ? error.message : 'Save failed';
      setErrorMsg(message);
      if (message.includes('409')) {
        try {
          const freshSha = await githubService.getReadmeSha(repoOwner, repoName);
          shaRef.current = freshSha;
        } catch (shaError) {
          console.warn('Failed to refresh SHA:', shaError instanceof Error ? shaError.message : shaError);
        }
      }
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void saveToGitHub();
      }
    }
  }, [repoOwner, repoName, onSave]);

  const queueDebouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void saveToGitHub();
    }, 3000);
  }, [saveToGitHub]);

  const updateContent = useCallback((newContent: string) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newContent);
    if (newHistory.length > 200) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setContent(newContent);
    contentRef.current = newContent;
    setSaveStatus('modified');
    setErrorMsg(null);
    setUploadError(null);
    storageService.setDraft(repoName, newContent);
    queueDebouncedSave();
  }, [repoName, queueDebouncedSave]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const nextContent = historyRef.current[historyIndexRef.current];
      setContent(nextContent);
      contentRef.current = nextContent;
      setSaveStatus('modified');
      setErrorMsg(null);
      storageService.setDraft(repoName, nextContent);
      queueDebouncedSave();
    }
  }, [repoName, queueDebouncedSave]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextContent = historyRef.current[historyIndexRef.current];
      setContent(nextContent);
      contentRef.current = nextContent;
      setSaveStatus('modified');
      setErrorMsg(null);
      storageService.setDraft(repoName, nextContent);
      queueDebouncedSave();
    }
  }, [repoName, queueDebouncedSave]);

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    updateContent(newContent);
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(
        selectedText ? cursorPos : start + before.length,
        selectedText ? cursorPos : start + before.length
      );
    }, 0);
  }, [content, updateContent]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    clearUploadOverlayTimer();
    setUploadError(null);
    setUploadOverlayState('uploading');
    try {
      const timestamp = Date.now();
      const originalName = file.name || 'image.png';
      const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}-${safeName}`;

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Failed to read image as base64'));
            return;
          }

          const [, contentPart] = reader.result.split(',');
          if (!contentPart) {
            reject(new Error('Invalid image payload'));
            return;
          }

          resolve(contentPart);
        };
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const imageUrl = await githubService.uploadImage(repoOwner, repoName, filename, base64);
      insertMarkdown(`![${originalName}](${imageUrl})`);
      setPasteToast('success');
      queuePasteToastClear(1500);
      setUploadOverlayState('success');
      uploadOverlayTimerRef.current = setTimeout(() => {
        setUploadOverlayState(null);
        uploadOverlayTimerRef.current = null;
      }, 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed';
      setUploadError(message);
      setPasteToast('error');
      queuePasteToastClear(5000);
      setUploadOverlayState(null);
    }
  }, [repoOwner, repoName, insertMarkdown, clearUploadOverlayTimer, queuePasteToastClear]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showInlineWikiPicker) {
      const filtered = repoNames
        .filter((name) => name !== repoName)
        .filter((name) => stripPrefix(name).toLowerCase().includes(inlineWikiSearch.toLowerCase()));

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowInlineWikiPicker(false);
        setInlineWikiSearch('');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setInlineWikiSelectedIndex((index) => Math.min(index + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setInlineWikiSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[inlineWikiSelectedIndex]) {
          insertWikiLink(filtered[inlineWikiSelectedIndex]);
        }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (filtered[inlineWikiSelectedIndex]) {
          insertWikiLink(filtered[inlineWikiSelectedIndex]);
        }
        return;
      }
    }

    if (showSlashMenu) {
      const filtered = SLASH_COMMANDS.filter((command) => (
        command.id.startsWith(slashSearch)
          || command.label.toLowerCase().startsWith(slashSearch)
      ));

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        setSlashSearch('');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex((index) => Math.min(index + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[slashSelectedIndex]) {
          handleSlashCommand(filtered[slashSelectedIndex]);
        }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (filtered[slashSelectedIndex]) {
          handleSlashCommand(filtered[slashSelectedIndex]);
        }
        return;
      }
    }

    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      void saveToGitHub();
    }
    // Tab inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      insertMarkdown('  ');
    }
  };

  const insertWikiLink = useCallback((targetRepo: string) => {
    const linkText = `[[${stripPrefix(targetRepo)}]]`;

    if (showInlineWikiPicker) {
      const insertStart = wikiInsertPosRef.current;
      const insertEnd = Math.max(insertStart, textareaRef.current?.selectionStart ?? insertStart);
      const newContent = content.substring(0, insertStart) + linkText + content.substring(insertEnd);
      updateContent(newContent);
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        const newCursor = insertStart + linkText.length;
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
      setShowInlineWikiPicker(false);
      setInlineWikiSearch('');
      setInlineWikiSelectedIndex(0);
      return;
    }

    insertMarkdown(linkText);
    setShowWikiPicker(false);
    setWikiSearch('');
  }, [showInlineWikiPicker, content, insertMarkdown, updateContent]);

  const handleSlashCommand = useCallback((cmd: SlashCommand) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const insertStart = slashInsertPosRef.current;
    const newContent = content.substring(0, insertStart) + cmd.insert + content.substring(cursor);
    updateContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newCursor = insertStart + (cmd.cursorOffset ?? cmd.insert.length);
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
    setShowSlashMenu(false);
    setSlashSearch('');
    setSlashSelectedIndex(0);
  }, [content, updateContent]);

  useEffect(() => {
    githubService.getReadmeSha(repoOwner, repoName).then((sha) => {
      shaRef.current = sha;
    }).catch(() => undefined);
  }, [repoOwner, repoName]);

  useEffect(() => {
    const draft = storageService.getDraft(repoName);
    if (draft && draft !== initialContent) {
      setContent(draft);
      contentRef.current = draft;
      setSaveStatus('modified');
      historyRef.current = [draft];
      historyIndexRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showWikiPicker && !showTopicPicker) return;

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;

      if (showWikiPicker && wikiPickerRef.current && !wikiPickerRef.current.contains(target)) {
        setShowWikiPicker(false);
      }

      if (showTopicPicker && topicPickerRef.current && !topicPickerRef.current.contains(target)) {
        setShowTopicPicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showWikiPicker, showTopicPicker]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        storageService.setDraft(repoName, contentRef.current);
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (contentRef.current !== lastSavedContentRef.current) {
        event.preventDefault();
        void saveToGitHub();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearPasteToastTimer();
      clearUploadOverlayTimer();
    };
  }, [repoName, saveToGitHub, clearPasteToastTimer, clearUploadOverlayTimer]);

  return (
    <div className="editor-fullscreen">
      <div className="editor-header">
        <div className="editor-title">
          <span className="editor-icon"><IconEdit /></span>
          <h2>{stripPrefix(repoName)}</h2>
          <button
            className="editor-visibility-toggle"
            onClick={() => {
              setPendingVisibility(!isPrivate);
              setShowVisibilityConfirm(true);
            }}
            title={isPrivate ? 'Switch to Public' : 'Switch to Private'}
            disabled={isUpdatingVisibility}
          >
            {isPrivate ? <IconLock /> : <IconGlobe />}
            <span>{isPrivate ? 'Private' : 'Public'}</span>
          </button>
          <button
            className="editor-topic-toggle"
            onClick={() => setShowTopicPicker(!showTopicPicker)}
            title="Add topic"
          >
            <span className="topic-hash">#</span>
            <span>Topics</span>
          </button>
        </div>
        <div className="editor-header-actions">
          <button
            className={`editor-tab ${!showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(false)}
          >
            Edit
          </button>
          <button
            className={`editor-tab ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(true)}
          >
            Preview
          </button>
          <div className="editor-header-separator" />
          <span className={`save-status save-status-${saveStatus}`}>
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'modified' && '● Modified'}
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'error' && `✗ ${errorMsg || 'Error'}`}
          </span>
          {saveStatus === 'error' && (
            <button onClick={() => void saveToGitHub()} className="retry-save-btn">
              Retry
            </button>
          )}
          <button
            onClick={() => {
              if (contentRef.current !== lastSavedContentRef.current) {
                void saveToGitHub();
              }
              onClose();
            }}
            className="editor-close-btn"
            style={{display: 'flex', alignItems: 'center', gap: '4px'}}
          >
            <IconClose /> Close
          </button>
        </div>
      </div>

      {showVisibilityConfirm && (
        <div className="modal-overlay">
          <div className="visibility-confirm-dialog">
            <p>Are you sure you want to make this note {pendingVisibility ? 'private' : 'public'}?</p>
            <p className="dialog-warning">{pendingVisibility ? 'Private' : 'Public'} notes can be viewed by anyone.</p>
            <div className="dialog-buttons">
              <button
                className="dialog-btn-cancel"
                onClick={() => setShowVisibilityConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="dialog-btn-confirm"
                onClick={async () => {
                  setShowVisibilityConfirm(false);
                  setIsUpdatingVisibility(true);
                  try {
                    await Promise.resolve(onToggleVisibility());
                  } finally {
                    setIsUpdatingVisibility(false);
                  }
                }}
              >
                {pendingVisibility ? 'Make Private' : 'Make Public'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showPreview && (
        <div className="editor-toolbar">
          <button title="Bold (Ctrl+B)" onClick={() => insertMarkdown('**', '**')}><IconBold /></button>
          <button title="Italic (Ctrl+I)" onClick={() => insertMarkdown('*', '*')}><IconItalic /></button>
          <button title="Strikethrough" onClick={() => insertMarkdown('~~', '~~')}><IconStrikethrough /></button>
          <div className="toolbar-separator" />
          <button title="Heading 1" onClick={() => insertMarkdown('# ')}><IconH1 /></button>
          <button title="Heading 2" onClick={() => insertMarkdown('## ')}><IconH2 /></button>
          <button title="Heading 3" onClick={() => insertMarkdown('### ')}><IconH3 /></button>
          <div className="toolbar-separator" />
          <button title="Bullet List" onClick={() => insertMarkdown('- ')}><IconBulletList /></button>
          <button title="Numbered List" onClick={() => insertMarkdown('1. ')}><IconNumberedList /></button>
          <button title="Checkbox" onClick={() => insertMarkdown('- [ ] ')}><IconCheckbox /></button>
          <div className="toolbar-separator" />
          <button title="Link" onClick={() => insertMarkdown('[', '](url)')}><IconLink /></button>
          <div className="toolbar-dropdown-container" ref={wikiPickerRef}>
            <button
              title="Wiki-link"
              className={showWikiPicker ? 'active' : ''}
              onClick={() => {
                setShowWikiPicker(!showWikiPicker);
                setShowTopicPicker(false);
                setWikiSearch('');
              }}
            >
              <IconWikiLink />
            </button>
            {showWikiPicker && (
              <div className="toolbar-dropdown">
                <input
                  type="text"
                  className="toolbar-dropdown-search"
                  placeholder="Search notes..."
                  value={wikiSearch}
                  onChange={(e) => setWikiSearch(e.target.value)}
                  autoFocus
                />
                <div className="toolbar-dropdown-list">
                  {repoNames
                    .filter((name) => name !== repoName)
                    .filter((name) => stripPrefix(name).toLowerCase().includes(wikiSearch.toLowerCase()))
                    .map((name) => (
                      <button
                        key={name}
                        className="toolbar-dropdown-item"
                        onClick={() => insertWikiLink(name)}
                      >
                        {stripPrefix(name)}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="toolbar-dropdown-container" ref={topicPickerRef}>
            <button
              title="Topics"
              className={showTopicPicker ? 'active' : ''}
              onClick={() => {
                setShowTopicPicker(!showTopicPicker);
                setShowWikiPicker(false);
              }}
            >
              #
            </button>
            {showTopicPicker && (
              <div className="toolbar-dropdown">
                <div className="topic-tags-edit">
                  {currentTopics.map((topic) => (
                    <span key={topic} className="topic-tag-edit">
                      {topic}
                      <button onClick={() => onUpdateTopics(currentTopics.filter((t) => t !== topic))}>×</button>
                    </span>
                  ))}
                </div>
                <div className="topic-input-row">
                  <input
                    type="text"
                    className="toolbar-dropdown-search"
                    placeholder="Add topic..."
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && topicInput.trim()) {
                        e.preventDefault();
                        const newTopic = topicInput.trim();
                        if (!currentTopics.includes(newTopic)) {
                          onUpdateTopics([...currentTopics, newTopic]);
                        }
                        setTopicInput('');
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
          <button title="Code" onClick={() => insertMarkdown('`', '`')}><IconCode /></button>
          <button title="Code Block" onClick={() => insertMarkdown('```\n', '\n```')}><IconCodeBlock /></button>
          <div className="toolbar-separator" />
          <label className="toolbar-upload-btn" title="Upload Image" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0 8px', borderRadius: '4px'}}>
            <IconImage />
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleImageUpload(file);
                }
                e.target.value = '';
              }}
            />
          </label>
          {uploadError && (
            <span className="upload-error" style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
              ⚠ {uploadError}
            </span>
          )}
          <div className="toolbar-separator" />
          <button title="Quote" onClick={() => insertMarkdown('> ')}><IconQuote /></button>
          <button title="Horizontal Rule" onClick={() => insertMarkdown('\n---\n')}><IconHRule /></button>
        </div>
      )}

      <div className="editor-body" ref={editorBodyRef}>
        {uploadOverlayState && (
          <div className="upload-overlay">
            <span>{uploadOverlayState === 'success' ? '✅ Image uploaded' : '📤 Uploading image...'}</span>
          </div>
        )}
        {pasteToast && !showPreview && (
          <div
            className={`paste-toast paste-toast-${pasteToast}`}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 35,
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 500,
              border: `1px solid ${pasteToast === 'error' ? 'var(--accent-danger)' : 'var(--border-color)'}`,
              background: pasteToast === 'error' ? 'color-mix(in srgb, var(--accent-danger) 12%, var(--surface-primary) 88%)' : 'var(--surface-primary)',
              color: pasteToast === 'error' ? 'var(--accent-danger)' : 'var(--text-primary)',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.18)',
            }}
          >
            {pasteToast === 'pasting' && '📋 Image pasted, uploading...'}
            {pasteToast === 'success' && '✅ Image uploaded'}
            {pasteToast === 'error' && `⚠ ${uploadError ?? 'Image upload failed'}`}
          </div>
        )}
        {showInlineWikiPicker && !showPreview && (() => {
          const filtered = repoNames
            .filter((name) => name !== repoName)
            .filter((name) => stripPrefix(name).toLowerCase().includes(inlineWikiSearch.toLowerCase()))
            .slice(0, 8);
          return filtered.length > 0 ? (
            <div
              className="inline-autocomplete-dropdown"
              style={{ top: overlayPos.top, left: overlayPos.left }}
            >
              {filtered.map((name, index) => (
                <button
                  key={name}
                  className={`inline-autocomplete-item ${index === inlineWikiSelectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    insertWikiLink(name);
                  }}
                  onMouseEnter={() => setInlineWikiSelectedIndex(index)}
                >
                  <span className="inline-autocomplete-icon"><IconWikiLink /></span>
                  {stripPrefix(name)}
                </button>
              ))}
            </div>
          ) : null;
        })()}
        {showSlashMenu && !showPreview && (() => {
          const filtered = SLASH_COMMANDS.filter((command) => (
            command.id.startsWith(slashSearch)
              || command.label.toLowerCase().startsWith(slashSearch)
          ));
          return filtered.length > 0 ? (
            <div
              className="inline-autocomplete-dropdown slash-command-dropdown"
              style={{ top: overlayPos.top, left: overlayPos.left }}
            >
              {filtered.map((cmd, index) => (
                <button
                  key={cmd.id}
                  className={`inline-autocomplete-item ${index === slashSelectedIndex ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSlashCommand(cmd);
                  }}
                  onMouseEnter={() => setSlashSelectedIndex(index)}
                >
                  <span className="inline-autocomplete-icon slash-icon">{cmd.icon}</span>
                  {cmd.label}
                </button>
              ))}
            </div>
          ) : null;
        })()}
        {showPreview ? (
          <div
            className="editor-preview"
            dangerouslySetInnerHTML={{ __html: renderedPreview }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={(e) => {
              const newValue = e.target.value;
              const cursor = e.target.selectionStart;
              updateContent(newValue);

              const textBefore = newValue.substring(0, cursor);

              const wikiMatch = /\[\[([^\][\n]*)$/.exec(textBefore);
              const slashMatch = /(?:^|\n)(\/([a-z]*))$/.exec(textBefore);

              if (wikiMatch) {
                const insertStart = cursor - wikiMatch[0].length;
                wikiInsertPosRef.current = insertStart;
                setInlineWikiSearch(wikiMatch[1]);
                setInlineWikiSelectedIndex(0);
                if (!showInlineWikiPicker) {
                  setShowInlineWikiPicker(true);
                  const pos = getCaretPixelPos(e.target, insertStart);
                  setOverlayPos(pos);
                }
                if (showSlashMenu) {
                  setShowSlashMenu(false);
                  setSlashSearch('');
                }
              } else if (slashMatch) {
                const insertStart = cursor - slashMatch[1].length;
                slashInsertPosRef.current = insertStart;
                setSlashSearch(slashMatch[2]);
                setSlashSelectedIndex(0);
                if (!showSlashMenu) {
                  setShowSlashMenu(true);
                  const pos = getCaretPixelPos(e.target, insertStart);
                  setOverlayPos(pos);
                }
                if (showInlineWikiPicker) {
                  setShowInlineWikiPicker(false);
                  setInlineWikiSearch('');
                }
              } else {
                if (showInlineWikiPicker) {
                  setShowInlineWikiPicker(false);
                  setInlineWikiSearch('');
                }
                if (showSlashMenu) {
                  setShowSlashMenu(false);
                  setSlashSearch('');
                }
              }
            }}
            onKeyDown={handleKeyDown}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith('image/')) {
                void handleImageUpload(file);
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData.items;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                  e.preventDefault();
                  setPasteToast('pasting');
                  queuePasteToastClear(3000);
                  const file = items[i].getAsFile();
                  if (file) {
                    void handleImageUpload(file);
                  }
                  return;
                }
              }
            }}
            onFocus={() => {
              setShowWikiPicker(false);
              setShowTopicPicker(false);
              setShowInlineWikiPicker(false);
              setInlineWikiSearch('');
              setShowSlashMenu(false);
              setSlashSearch('');
            }}
            placeholder="Write your note in Markdown...&#10;&#10;Use [[repo-name]] to link to other notes."
            spellCheck={false}
            autoFocus
          />
        )}
      </div>

      <div className="editor-footer">
        <span className="editor-stats">
          {content.length} chars · {content.split('\n').length} lines
          {saveStatus === 'modified' && ' · Modified'}
        </span>
        <span className="editor-shortcut-hint">Auto-saves after 3s · Ctrl+S to save now</span>
      </div>
    </div>
  );
}

export default ReadmeEditor;
