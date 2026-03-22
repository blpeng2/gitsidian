import { useState, type FormEvent } from 'react';

interface CreateRepoModalProps {
  onSubmit: (name: string, description: string, isPrivate: boolean) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function CreateRepoModal({ onSubmit, onClose, isLoading }: CreateRepoModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void onSubmit(name.trim(), description.trim(), isPrivate);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Note</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="repo-name">Name</label>
            <div className="repo-name-input">
              <span className="repo-prefix">gitsidian-</span>
              <input
                type="text"
                id="repo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-notes"
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="repo-desc">Description</label>
            <input
              type="text"
              id="repo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                disabled={isLoading}
              />
              Private repository
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRepoModal;
