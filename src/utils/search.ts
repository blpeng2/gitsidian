import { GitHubRepo } from '../types';
import { stripPrefix } from './strings';

export type SearchMatchType = 'name' | 'description' | 'topic' | 'content';

export interface SearchResult {
  repoName: string;
  displayName: string;      // repo.name with gitsidian- prefix stripped
  description: string;
  matchType: SearchMatchType;
  excerpt: string;          // context around the match
  score: number;
}

function getExcerpt(text: string, query: string): string {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text.slice(0, 120) + (text.length > 120 ? '…' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 80);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export function searchRepos(
  query: string,
  repos: GitHubRepo[],
  readmeContents: Record<string, string>
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const results: SearchResult[] = [];

  for (const repo of repos) {
    const displayName = stripPrefix(repo.name);
    const nameScore = displayName.toLowerCase() === lower ? 100
      : displayName.toLowerCase().includes(lower) ? 80 : -1;
    const descScore = repo.description?.toLowerCase().includes(lower) ? 60 : -1;
    const topicScore = repo.topics.some(t => t.toLowerCase().includes(lower)) ? 50 : -1;
    const readme = readmeContents[repo.name] ?? '';
    const contentScore = readme.toLowerCase().includes(lower) ? 30 : -1;

    const best = Math.max(nameScore, descScore, topicScore, contentScore);
    if (best < 0) continue;

    let matchType: SearchMatchType;
    let excerpt: string;

    if (best === nameScore) {
      matchType = 'name';
      excerpt = displayName;
    } else if (best === descScore) {
      matchType = 'description';
      excerpt = getExcerpt(repo.description ?? '', q);
    } else if (best === topicScore) {
      matchType = 'topic';
      const t = repo.topics.find(t => t.toLowerCase().includes(lower)) ?? '';
      excerpt = `#${t}`;
    } else {
      matchType = 'content';
      excerpt = getExcerpt(readme, q);
    }

    results.push({ repoName: repo.name, displayName, description: repo.description ?? '', matchType, excerpt, score: best });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 50);
}
