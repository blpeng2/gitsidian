import React, { useState, useEffect, useCallback } from 'react';
import { GitHubRepo, MetaNote } from '../types';

interface MetaNoteEditorProps {
  repo: GitHubRepo;
  metaNote: MetaNote | null;
  allRepos: GitHubRepo[];
  onSave: (note: MetaNote) => void;
}

function MetaNoteEditor({ repo, metaNote, allRepos, onSave }: MetaNoteEditorProps) {
  const [purpose, setPurpose] = useState('');
  const [keyIdeas, setKeyIdeas] = useState('');
  const [relatedRepos, setRelatedRepos] = useState<string[]>([]);
  const [nextExperiments, setNextExperiments] = useState('');
  const [publicReady, setPublicReady] = useState(false);
  const [publicChecklist, setPublicChecklist] = useState({
    readme: false,
    license: false,
    sensitiveData: false,
    documentation: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRepoPicker, setShowRepoPicker] = useState(false);

  // Load existing note
  useEffect(() => {
    if (metaNote) {
      setPurpose(metaNote.purpose || '');
      setKeyIdeas(metaNote.keyIdeas || '');
      setRelatedRepos(metaNote.relatedRepos || []);
      setNextExperiments(metaNote.nextExperiments || '');
      setPublicReady(metaNote.publicReady || false);
      setPublicChecklist(metaNote.publicChecklist || {
        readme: false,
        license: false,
        sensitiveData: false,
        documentation: false,
      });
      setTags(metaNote.tags || []);
    } else {
      // Reset form for new note
      setPurpose('');
      setKeyIdeas('');
      setRelatedRepos([]);
      setNextExperiments('');
      setPublicReady(false);
      setPublicChecklist({
        readme: false,
        license: false,
        sensitiveData: false,
        documentation: false,
      });
      setTags([]);
    }
  }, [repo.name, metaNote]);

  // Save note
  const handleSave = useCallback(() => {
    setIsSaving(true);

    const note: MetaNote = {
      repoId: repo.id,
      repoName: repo.name,
      purpose,
      keyIdeas,
      relatedRepos,
      nextExperiments,
      publicReady,
      publicChecklist,
      tags,
      createdAt: metaNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(note);
    
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  }, [repo, purpose, keyIdeas, relatedRepos, nextExperiments, publicReady, publicChecklist, tags, metaNote, onSave]);

  // Add related repo
  const handleAddRelatedRepo = (repoName: string) => {
    if (!relatedRepos.includes(repoName) && repoName !== repo.name) {
      setRelatedRepos([...relatedRepos, repoName]);
    }
    setShowRepoPicker(false);
  };

  // Remove related repo
  const handleRemoveRelatedRepo = (repoName: string) => {
    setRelatedRepos(relatedRepos.filter(r => r !== repoName));
  };

  // Add tag
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Handle tag input keydown
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Toggle checklist item
  const handleChecklistToggle = (item: keyof typeof publicChecklist) => {
    setPublicChecklist({
      ...publicChecklist,
      [item]: !publicChecklist[item],
    });
  };

  // Calculate public readiness
  const readinessScore = Object.values(publicChecklist).filter(Boolean).length;
  const readinessPercentage = (readinessScore / 4) * 100;

  // Available repos for linking (excluding current)
  const availableRepos = allRepos.filter(r => 
    r.name !== repo.name && !relatedRepos.includes(r.name)
  );

  return (
    <div className="meta-note-editor">
      <div className="meta-note-header">
        <h3>Meta Note: {repo.name}</h3>
        <button 
          className="save-btn" 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="meta-note-form">
        {/* Purpose */}
        <div className="form-field">
          <label>Purpose</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Why does this repo exist? What problem does it solve?"
            rows={3}
          />
        </div>

        {/* Key Ideas */}
        <div className="form-field">
          <label>Key Ideas</label>
          <textarea
            value={keyIdeas}
            onChange={(e) => setKeyIdeas(e.target.value)}
            placeholder="Core concepts and main takeaways. Use [[repo-name]] to link other repos."
            rows={4}
          />
        </div>

        {/* Related Repos */}
        <div className="form-field">
          <label>Related Repos</label>
          <div className="related-repos">
            {relatedRepos.map(repoName => (
              <span key={repoName} className="related-repo-tag">
                [[{repoName}]]
                <button onClick={() => handleRemoveRelatedRepo(repoName)}>×</button>
              </span>
            ))}
            <button 
              className="add-repo-btn"
              onClick={() => setShowRepoPicker(!showRepoPicker)}
            >
              + Add Repo
            </button>
          </div>
          {showRepoPicker && (
            <div className="repo-picker">
              <input
                type="text"
                placeholder="Search repos..."
                autoFocus
              />
              <div className="repo-picker-list">
                {availableRepos.slice(0, 10).map(r => (
                  <div
                    key={r.id}
                    className="repo-picker-item"
                    onClick={() => handleAddRelatedRepo(r.name)}
                  >
                    <span className={r.private ? 'private' : 'public'}>
                      {r.private ? '🔒' : '🌐'}
                    </span>
                    {r.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next Experiments */}
        <div className="form-field">
          <label>Next Experiments</label>
          <textarea
            value={nextExperiments}
            onChange={(e) => setNextExperiments(e.target.value)}
            placeholder="What to try next? Future directions and ideas."
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="form-field">
          <label>Tags</label>
          <div className="tags-container">
            {tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button onClick={() => handleRemoveTag(tag)}>×</button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag..."
              className="tag-input"
            />
          </div>
        </div>

        {/* Public Conversion */}
        <div className="form-field public-section">
          <label>Public Conversion</label>
          <div className="readiness-bar">
            <div 
              className="readiness-fill"
              style={{ width: `${readinessPercentage}%` }}
            />
            <span className="readiness-text">{readinessScore}/4 Ready</span>
          </div>
          <div className="checklist">
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={publicChecklist.readme}
                onChange={() => handleChecklistToggle('readme')}
              />
              <span>README exists and is complete</span>
            </label>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={publicChecklist.license}
                onChange={() => handleChecklistToggle('license')}
              />
              <span>License file added</span>
            </label>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={publicChecklist.sensitiveData}
                onChange={() => handleChecklistToggle('sensitiveData')}
              />
              <span>No sensitive data</span>
            </label>
            <label className="checklist-item">
              <input
                type="checkbox"
                checked={publicChecklist.documentation}
                onChange={() => handleChecklistToggle('documentation')}
              />
              <span>Documentation is ready</span>
            </label>
          </div>
          <label className="public-ready-toggle">
            <input
              type="checkbox"
              checked={publicReady}
              onChange={(e) => setPublicReady(e.target.checked)}
            />
            <span>Mark as public-ready</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default MetaNoteEditor;
