import { useMemo, useCallback } from 'react';
import { GitHubRepo, DiaryEntry } from '../types';
import DiaryEditor from './DiaryEditor';
import { IconLoading } from './Icons';

interface DiaryViewProps {
  owner: string;
  repos: GitHubRepo[];
  diaryRepo: GitHubRepo | null;
  diaryEntries: Record<string, DiaryEntry>;
  diaryContents: Record<string, string>;
  selectedDate: string | null;
  isLoadingDiary: boolean;
  onEnsureDiaryRepo: () => Promise<void>;
  onSelectDate: (date: string) => void;
  onSave: (date: string, content: string, newSha: string) => void;
}

function DiaryView({
  owner,
  repos,
  diaryRepo,
  diaryEntries,
  diaryContents,
  selectedDate,
  isLoadingDiary,
  onEnsureDiaryRepo,
  onSelectDate,
  onSave,
}: DiaryViewProps) {

  const repoNames = useMemo(
    () => repos.map((r) => r.name),
    [repos]
  );

  const diaryDates = useMemo(
    () => Object.keys(diaryEntries),
    [diaryEntries]
  );


  const handleEditorClose = useCallback(() => {
    onSelectDate('');
  }, [onSelectDate]);

  if (isLoadingDiary) {
    return (
      <div className="diary-view">
        <div className="diary-loading">
          <IconLoading style={{ marginRight: '8px' }} />
          Loading diary…
        </div>
      </div>
    );
  }

  if (!diaryRepo) {
    return (
      <div className="diary-view">
        <div className="diary-placeholder">
          <div className="placeholder-content">
            <h2>📔 Diary</h2>
            <p>Start writing daily entries. A private repository will be created to store your diary.</p>
            <button className="diary-create-btn" onClick={() => void onEnsureDiaryRepo()}>
              Create Diary
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentEntry = selectedDate ? diaryEntries[selectedDate] : undefined;
  const currentContent = selectedDate ? (diaryContents[selectedDate] ?? '') : '';
  const currentSha = currentEntry?.sha ?? null;

  return (
    <div className="diary-view">
      <div className="diary-content">
        {selectedDate ? (
          <DiaryEditor
            key={selectedDate}
            date={selectedDate}
            owner={owner}
            repoNames={repoNames}
            diaryDates={diaryDates}
            initialContent={currentContent}
            entrySha={currentSha}
            onSave={onSave}
            onClose={handleEditorClose}
          />
        ) : (
          <div className="diary-placeholder">
            <div className="placeholder-content">
              <h2>Select a date</h2>
              <p>Choose a date from the calendar to write or read your diary entry.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiaryView;
