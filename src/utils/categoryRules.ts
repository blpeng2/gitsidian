import { CategoryRecommendation, GitHubRepo, NoteCategory } from '../types';

const CATEGORY_TOPICS: NoteCategory[] = ['inbox', 'active', 'reference', 'archive'];

export function getRepoCategory(repo: GitHubRepo): NoteCategory {
  for (const category of CATEGORY_TOPICS) {
    if (repo.topics.includes(category)) {
      return category;
    }
  }

  return 'inbox';
}

export function getRecommendations(
  repos: GitHubRepo[],
  readmeContents: Record<string, string>,
  backlinkCounts: Record<string, number>
): CategoryRecommendation[] {
  const recommendations: CategoryRecommendation[] = [];
  const now = Date.now();

  for (const repo of repos) {
    const currentCategory = getRepoCategory(repo);
    const daysSinceUpdate = Math.floor((now - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    const backlinkCount = backlinkCounts[repo.name] || 0;
    const hasContent = (readmeContents[repo.name]?.length || 0) > 100;

    if (currentCategory === 'inbox' && daysSinceUpdate <= 7 && hasContent) {
      recommendations.push({
        repoName: repo.name,
        currentCategory,
        suggestedCategory: 'active',
        reason: `Recently updated (${daysSinceUpdate}d ago) with content`,
      });
      continue;
    }

    if (currentCategory !== 'reference' && currentCategory !== 'archive' && backlinkCount >= 3) {
      recommendations.push({
        repoName: repo.name,
        currentCategory,
        suggestedCategory: 'reference',
        reason: `Linked from ${backlinkCount} other notes`,
      });
      continue;
    }

    if (currentCategory !== 'archive' && daysSinceUpdate > 30) {
      recommendations.push({
        repoName: repo.name,
        currentCategory,
        suggestedCategory: 'archive',
        reason: `Not updated for ${daysSinceUpdate} days`,
      });
      continue;
    }

    if (currentCategory === 'active' && daysSinceUpdate > 14 && daysSinceUpdate <= 30) {
      recommendations.push({
        repoName: repo.name,
        currentCategory,
        suggestedCategory: 'reference',
        reason: `Inactive for ${daysSinceUpdate} days, may be reference material`,
      });
    }
  }

  return recommendations;
}

export function getCategoryIcon(category: NoteCategory): string {
  switch (category) {
    case 'inbox':
      return '📥';
    case 'active':
      return '📌';
    case 'reference':
      return '📚';
    case 'archive':
      return '🗃️';
  }
}

export function getCategoryLabel(category: NoteCategory): string {
  switch (category) {
    case 'inbox':
      return 'Inbox';
    case 'active':
      return 'Active';
    case 'reference':
      return 'Reference';
    case 'archive':
      return 'Archive';
  }
}

export function setCategoryTopics(currentTopics: string[], newCategory: NoteCategory): string[] {
  const filteredTopics = currentTopics.filter((topic) => !CATEGORY_TOPICS.includes(topic as NoteCategory));
  return [...filteredTopics, newCategory];
}
