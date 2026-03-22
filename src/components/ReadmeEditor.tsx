import { useState, useRef, useCallback } from 'react';
import { renderWikiLinks } from '../utils/wikiLinks';

interface ReadmeEditorProps {
  repoName: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

function ReadmeEditor({ repoName, initialContent, onSave, onCancel }: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(
        selectedText ? cursorPos : start + before.length,
        selectedText ? cursorPos : start + before.length
      );
    }, 0);
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
          <button title="Wiki-link" onClick={() => insertMarkdown('[[', ']]')}>⟦⟧</button>
          <button title="Code" onClick={() => insertMarkdown('`', '`')}>{'<>'}</button>
          <button title="Code Block" onClick={() => insertMarkdown('```\n', '\n```')}>{'{ }'}</button>
          <div className="toolbar-separator" />
          <button title="Quote" onClick={() => insertMarkdown('> ')}>❝</button>
          <button title="Horizontal Rule" onClick={() => insertMarkdown('\n---\n')}>—</button>
        </div>
      )}

      <div className="editor-body">
        {showPreview ? (
          <div
            className="editor-preview"
            dangerouslySetInnerHTML={{ __html: renderWikiLinks(content) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
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
