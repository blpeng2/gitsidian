import { useState, useRef, useCallback, useEffect } from 'react';
import { renderMarkdown } from '../utils/markdown';
import { githubService } from '../services/github';

interface ReadmeEditorProps {
  repoName: string;
  repoNames: string[];
  repoOwner: string;
  initialContent: string;
  currentTopics: string[];
  onUpdateTopics: (topics: string[]) => void;
  onSave: (content: string) => void;
  onCancel: () => void;
}

function ReadmeEditor({
  repoName,
  repoNames,
  repoOwner,
  initialContent,
  currentTopics,
  onUpdateTopics,
  onSave,
  onCancel,
}: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [showWikiPicker, setShowWikiPicker] = useState(false);
  const [wikiSearch, setWikiSearch] = useState('');
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const historyRef = useRef<string[]>([initialContent]);
  const historyIndexRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wikiPickerRef = useRef<HTMLDivElement>(null);
  const topicPickerRef = useRef<HTMLDivElement>(null);

  const updateContent = useCallback((newContent: string) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newContent);
    if (newHistory.length > 200) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setContent(newContent);
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setContent(historyRef.current[historyIndexRef.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setContent(historyRef.current[historyIndexRef.current]);
    }
  }, []);

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

    setIsUploading(true);
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
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [repoOwner, repoName, insertMarkdown]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      onSave(content);
    }
    // Tab inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      insertMarkdown('  ');
    }
  };

  const stripPrefix = (name: string) => name.replace(/^gitsidian-/, '');

  const insertWikiLink = useCallback((targetRepo: string) => {
    insertMarkdown(`[[${stripPrefix(targetRepo)}]]`);
    setShowWikiPicker(false);
    setWikiSearch('');
  }, [insertMarkdown]);

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

  const hasChanges = content !== initialContent;

  return (
    <div className="editor-fullscreen">
      <div className="editor-header">
        <div className="editor-title">
          <span className="editor-icon">📝</span>
          <h2>{stripPrefix(repoName)}</h2>
          {hasChanges && <span className="editor-unsaved">● Unsaved</span>}
        </div>
        <div className="editor-header-actions">
          <button
            className={`editor-tab ${!showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(false)}
          >
            ✏️ Edit
          </button>
          <button
            className={`editor-tab ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(true)}
          >
            👁 Preview
          </button>
          <div className="editor-header-separator" />
          <button onClick={onCancel} className="editor-cancel-btn">
            Cancel
          </button>
          <button onClick={() => onSave(content)} className="editor-save-btn" disabled={!hasChanges}>
            💾 Save
          </button>
        </div>
      </div>

      {!showPreview && (
        <div className="editor-toolbar">
          <button title="Bold (Ctrl+B)" onClick={() => insertMarkdown('**', '**')}>B</button>
          <button title="Italic (Ctrl+I)" onClick={() => insertMarkdown('*', '*')}>I</button>
          <button title="Strikethrough" onClick={() => insertMarkdown('~~', '~~')}>S̶</button>
          <div className="toolbar-separator" />
          <button title="Heading 1" onClick={() => insertMarkdown('# ')}>H1</button>
          <button title="Heading 2" onClick={() => insertMarkdown('## ')}>H2</button>
          <button title="Heading 3" onClick={() => insertMarkdown('### ')}>H3</button>
          <div className="toolbar-separator" />
          <button title="Bullet List" onClick={() => insertMarkdown('- ')}>•</button>
          <button title="Numbered List" onClick={() => insertMarkdown('1. ')}>1.</button>
          <button title="Checkbox" onClick={() => insertMarkdown('- [ ] ')}>☐</button>
          <div className="toolbar-separator" />
          <button title="Link" onClick={() => insertMarkdown('[', '](url)')}>🔗</button>
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
              ⟦⟧
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
          <button title="Code" onClick={() => insertMarkdown('`', '`')}>{'<>'}</button>
          <button title="Code Block" onClick={() => insertMarkdown('```\n', '\n```')}>{'{ }'}</button>
          <div className="toolbar-separator" />
          <label className="toolbar-upload-btn" title="Upload Image">
            📎
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
          <div className="toolbar-separator" />
          <button title="Quote" onClick={() => insertMarkdown('> ')}>❝</button>
          <button title="Horizontal Rule" onClick={() => insertMarkdown('\n---\n')}>—</button>
        </div>
      )}

      <div className="editor-body">
        {isUploading && (
          <div className="upload-overlay">
            <span>📤 Uploading image...</span>
          </div>
        )}
        {showPreview ? (
          <div
            className="editor-preview"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={(e) => updateContent(e.target.value)}
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
          {hasChanges && ' · Modified'}
        </span>
        <span className="editor-shortcut-hint">Ctrl+S to save · Tab to indent</span>
      </div>
    </div>
  );
}

export default ReadmeEditor;
