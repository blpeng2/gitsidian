import { useMemo } from 'react';
import { DiaryEntry, GitHubRepo } from '../types';
import { stripPrefix } from '../utils/strings';
import { getLinkedReposFromContent } from '../utils/wikiLinks';

interface TimelineViewProps {
  repos: GitHubRepo[];
  diaryEntries: Record<string, DiaryEntry>;
  diaryContents: Record<string, string>;
  onSelectRepo: (repoName: string) => void;
  onSelectDiaryDate: (date: string) => void;
}

interface TimelineItem {
  id: string;
  date: string;
  kind: 'repo-created' | 'repo-updated' | 'diary';
  title: string;
  subtitle: string;
  relatedRepos: string[];
  excerpt?: string;
  repoName?: string;
  diaryDate?: string;
}

function formatMonthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

function formatTimelineDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function TimelineView({ repos, diaryEntries, diaryContents, onSelectRepo, onSelectDiaryDate }: TimelineViewProps) {
  const items = useMemo(() => {
    const repoNames = new Set(repos.map((repo) => repo.name));
    const timelineItems: TimelineItem[] = [];

    repos.forEach((repo) => {
      timelineItems.push({
        id: `repo-created-${repo.name}`,
        date: repo.created_at,
        kind: 'repo-created',
        title: stripPrefix(repo.name),
        subtitle: 'Note created',
        relatedRepos: [repo.name],
        repoName: repo.name,
      });

      const createdAt = new Date(repo.created_at).getTime();
      const updatedAt = new Date(repo.updated_at).getTime();
      if (Math.abs(updatedAt - createdAt) > 24 * 60 * 60 * 1000) {
        timelineItems.push({
          id: `repo-updated-${repo.name}`,
          date: repo.updated_at,
          kind: 'repo-updated',
          title: stripPrefix(repo.name),
          subtitle: 'Note updated',
          relatedRepos: [repo.name],
          repoName: repo.name,
        });
      }
    });

    Object.keys(diaryEntries).forEach((date) => {
      const content = diaryContents[date] ?? '';
      timelineItems.push({
        id: `diary-${date}`,
        date: `${date}T00:00:00`,
        kind: 'diary',
        title: date,
        subtitle: 'Diary entry',
        relatedRepos: getLinkedReposFromContent(content, repoNames),
        excerpt: content ? content.slice(0, 160) : undefined,
        diaryDate: date,
      });
    });

    return timelineItems.sort((a, b) => b.date.localeCompare(a.date));
  }, [repos, diaryEntries, diaryContents]);

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
      const key = item.date.slice(0, 7);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const groupKeys = useMemo(() => Object.keys(groupedItems).sort((a, b) => b.localeCompare(a)), [groupedItems]);

  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <h2>Timeline</h2>
        <p>Review diary entries and note activity in one chronological stream.</p>
      </div>

      {items.length === 0 ? (
        <div className="timeline-empty">No activity yet.</div>
      ) : (
        <div className="timeline-groups">
          {groupKeys.map((month) => (
            <section key={month} className="timeline-group">
              <h3>{formatMonthLabel(month)}</h3>
              <div className="timeline-items">
                {groupedItems[month].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`timeline-item timeline-item-${item.kind}`}
                    onClick={() => {
                      if (item.repoName) {
                        onSelectRepo(item.repoName);
                        return;
                      }
                      if (item.diaryDate) {
                        onSelectDiaryDate(item.diaryDate);
                      }
                    }}
                  >
                    <div className="timeline-item-meta">
                      <span className="timeline-item-kind">{item.subtitle}</span>
                      <span className="timeline-item-date">{formatTimelineDate(item.date)}</span>
                    </div>
                    <div className="timeline-item-title">{item.kind === 'diary' ? item.title : item.title}</div>
                    {item.excerpt && <div className="timeline-item-excerpt">{item.excerpt}</div>}
                    {item.relatedRepos.length > 0 && (
                      <div className="timeline-item-links">
                        {item.relatedRepos.map((repoName) => (
                          <span key={`${item.id}-${repoName}`} className="timeline-related-repo">
                            {stripPrefix(repoName)}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimelineView;
