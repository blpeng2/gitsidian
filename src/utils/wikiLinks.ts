import { WikiLink, GitHubRepo, GraphData, GraphNode, GraphEdge } from '../types';

// Wiki-link pattern: [[repo-name]] or [[repo-name|display text]]
export const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parse wiki-links from text
 */
export function parseWikiLinks(text: string, sourceRepo: string): WikiLink[] {
  const links: WikiLink[] = [];
  // Reset regex lastIndex
  const regex = new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags);

  let match = regex.exec(text);
  while (match !== null) {
    const targetRepo = match[1].trim();
    const alias = match[2]?.trim();
    if (targetRepo && targetRepo.toLowerCase() !== sourceRepo.toLowerCase()) {
      links.push({
        source: sourceRepo,
        target: targetRepo,
        ...(alias && { alias }),
      });
    }
    match = regex.exec(text);
  }

  return links;
}

/**
 * Extract wiki-links from README content
 */
function extractLinksFromReadme(readmeContent: string, sourceRepo: string): WikiLink[] {
  return parseWikiLinks(readmeContent, sourceRepo);
}

/**
 * Find repo name case-insensitively
 */
export function findRepoName(repoNames: Set<string>, target: string): string | null {
  // Exact match first
  if (repoNames.has(target)) return target;
  // Case-insensitive match
  const lower = target.toLowerCase();
  for (const name of repoNames) {
    if (name.toLowerCase() === lower) return name;
  }

  const prefixed = `gitsidian-${target}`;
  const prefixedLower = prefixed.toLowerCase();
  for (const name of repoNames) {
    if (name.toLowerCase() === prefixedLower) return name;
  }

  return null;
}

export function getLinkedReposFromContent(content: string, repoNames: Set<string>): string[] {
  const seen = new Set<string>();
  const links = parseWikiLinks(content, '__diary__');

  links.forEach((link) => {
    if (link.target.startsWith('diary/')) {
      return;
    }

    const resolved = findRepoName(repoNames, link.target);
    if (resolved) {
      seen.add(resolved);
    }
  });

  return Array.from(seen);
}

export function getDiaryBacklinks(
  repoName: string,
  diaryContents: Record<string, string>,
  repoNames: Set<string>
): { date: string; alias?: string }[] {
  const backlinks: { date: string; alias?: string }[] = [];

  Object.entries(diaryContents).forEach(([date, content]) => {
    const links = parseWikiLinks(content, `diary/${date}`);
    links.forEach((link) => {
      if (link.target.startsWith('diary/')) {
        return;
      }

      const resolved = findRepoName(repoNames, link.target);
      if (resolved?.toLowerCase() === repoName.toLowerCase()) {
        backlinks.push({ date, alias: link.alias });
      }
    });
  });

  backlinks.sort((a, b) => b.date.localeCompare(a.date));
  return backlinks;
}

/**
 * Generate graph data from repos and README contents
 */
export function generateGraphData(
  repos: GitHubRepo[],
  readmeContents: Record<string, string>
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  const repoNames = new Set(repos.map((r) => r.name));

  // Create nodes for each repo
  repos.forEach((repo) => {
    nodes.push({
      data: {
        id: repo.name,
        label: repo.name.replace(/^gitsidian-/, ''),
        description: repo.description,
        isPrivate: repo.private,
        topics: repo.topics,
        updatedAt: repo.updated_at,
        hasReadme: !!readmeContents[repo.name],
        isOrphan: false,
        language: repo.language,
        htmlUrl: repo.html_url,
      },
    });
  });

  // Create edges from README wiki-links
  Object.entries(readmeContents).forEach(([repoName, content]) => {
    const links = extractLinksFromReadme(content, repoName);

    links.forEach((link) => {
      const resolvedTarget = findRepoName(repoNames, link.target);
      if (!resolvedTarget) return;

      const edgeKey = [link.source, resolvedTarget].sort().join('-');

      if (!edgeSet.has(edgeKey)) {
        edges.push({
          data: {
            id: edgeKey,
            source: link.source,
            target: resolvedTarget,
            type: 'wikilink',
          },
        });
        edgeSet.add(edgeKey);
      }
    });
  });

  const topicMap = new Map<string, string[]>();
  const repoTopics = new Map<string, string[]>();
  repos.forEach((repo) => {
    repoTopics.set(repo.name, repo.topics);
    repo.topics.forEach((topic) => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(repo.name);
    });
  });

  topicMap.forEach((repoNamesList) => {
    if (repoNamesList.length > 1) {
      for (let i = 0; i < repoNamesList.length; i++) {
        for (let j = i + 1; j < repoNamesList.length; j++) {
          const topicsI = repoTopics.get(repoNamesList[i]) || [];
          const topicsJ = repoTopics.get(repoNamesList[j]) || [];
          const bothInbox = topicsI.includes('inbox') && topicsJ.includes('inbox');
          if (bothInbox) continue;
          const edgeKey = [repoNamesList[i], repoNamesList[j]].sort().join('-topic-');

          if (!edgeSet.has(edgeKey)) {
            edges.push({
              data: {
                id: edgeKey,
                source: repoNamesList[i],
                target: repoNamesList[j],
                type: 'topic',
              },
            });
            edgeSet.add(edgeKey);
          }
        }
      }
    }
  });

  // Calculate orphan status
  const connectedNodes = new Set<string>();
  edges.forEach((edge) => {
    connectedNodes.add(edge.data.source);
    connectedNodes.add(edge.data.target);
  });

  nodes.forEach((node) => {
    node.data.isOrphan = !connectedNodes.has(node.data.id);
  });

  return { nodes, edges };
}

/**
 * Get backlinks for a specific repo (repos that link TO this repo)
 */
export function getBacklinks(
  repoName: string,
  readmeContents: Record<string, string>
): { source: string; alias?: string; excerpt?: string }[] {
  const backlinks: { source: string; alias?: string; excerpt?: string }[] = [];
  const repoNames = new Set([...Object.keys(readmeContents), repoName]);
  const CONTEXT_CHARS = 35;
  const MAX_EXCERPT_CHARS = 80;

  const formatExcerpt = (content: string, matchIndex: number, linkText: string): string => {
    const start = Math.max(0, matchIndex - CONTEXT_CHARS);
    const end = Math.min(content.length, matchIndex + linkText.length + CONTEXT_CHARS);

    const beforeRaw = content.slice(start, matchIndex).replace(/\s+/g, ' ').trimStart();
    const linkRaw = linkText.replace(/\s+/g, ' ');
    const afterRaw = content.slice(matchIndex + linkText.length, end).replace(/\s+/g, ' ').trimEnd();

    const available = Math.max(0, MAX_EXCERPT_CHARS - linkRaw.length);
    const beforeBudget = Math.floor(available / 2);
    const afterBudget = available - beforeBudget;

    const before = beforeRaw.length > beforeBudget ? beforeRaw.slice(beforeRaw.length - beforeBudget) : beforeRaw;
    const after = afterRaw.length > afterBudget ? afterRaw.slice(0, afterBudget) : afterRaw;

    const hasPrefix = start > 0 || beforeRaw.length > beforeBudget;
    const hasSuffix = end < content.length || afterRaw.length > afterBudget;

    return `${hasPrefix ? '…' : ''}${before}${linkRaw}${after}${hasSuffix ? '…' : ''}`;
  };

  Object.entries(readmeContents).forEach(([sourceRepo, content]) => {
    if (sourceRepo === repoName) return;

    const regex = new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags);
    let match = regex.exec(content);

    while (match !== null) {
      const targetRepo = match[1].trim();
      const resolved = findRepoName(repoNames, targetRepo);

      if (resolved?.toLowerCase() === repoName.toLowerCase()) {
        const alias = match[2]?.trim();
        const linkText = match[0];
        backlinks.push({
          source: sourceRepo,
          ...(alias && { alias }),
          excerpt: formatExcerpt(content, match.index, linkText),
        });
      }

      match = regex.exec(content);
    }
  });

  return backlinks;
}

/**
 * Get outgoing links from a specific repo
 */
export function getOutlinks(
  repoName: string,
  readmeContents: Record<string, string>,
  repoNames: Set<string>
): { target: string; alias?: string }[] {
  const content = readmeContents[repoName];
  if (!content) return [];

  const links = parseWikiLinks(content, repoName);
  return links.reduce<{ target: string; alias?: string }[]>((acc, l) => {
    const resolved = findRepoName(repoNames, l.target);
    if (resolved) acc.push({ target: resolved, alias: l.alias });
    return acc;
  }, []);
}
