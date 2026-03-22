import { useState } from 'react';

interface ReadmeEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

function ReadmeEditor({ initialContent, onSave, onCancel }: ReadmeEditorProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="readme-editor">
      <textarea
        className="readme-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your README in Markdown..."
      />
      <div className="editor-actions">
        <button onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
        <button onClick={() => onSave(content)} className="save-btn">
          💾 Save
        </button>
      </div>
    </div>
  );
}

export default ReadmeEditor;
