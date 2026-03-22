import { WikiLink, GitHubRepo, GraphData, GraphNode, GraphEdge } from '../types';

// Wiki-link pattern: [[repo-name]] or [[repo-name|display text]]
const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parse wiki-links from text
 */
export function parseWikiLinks(text: string, sourceRepo: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;
  // Reset regex lastIndex
  const regex = new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags);

  while ((match = regex.exec(text)) !== null) {
    const targetRepo = match[1].trim();
    const alias = match[2]?.trim();
    if (targetRepo && targetRepo.toLowerCase() !== sourceRepo.toLowerCase()) {
      links.push({
        source: sourceRepo,
        target: targetRepo,
        ...(alias && { alias }),
      });
    }
  }

  return links;
}

/**
 * Extract wiki-links from README content
 */
export function extractLinksFromReadme(readmeContent: string, sourceRepo: string): WikiLink[] {
  return parseWikiLinks(readmeContent, sourceRepo);
}

/**
 * Find repo name case-insensitively
 */
function findRepoName(repoNames: Set<string>, target: string): string | null {
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

  // Create edges from shared topics
  const topicMap = new Map<string, string[]>();
  repos.forEach((repo) => {
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
): { source: string; alias?: string }[] {
  const backlinks: { source: string; alias?: string }[] = [];

  Object.entries(readmeContents).forEach(([sourceRepo, content]) => {
    if (sourceRepo === repoName) return;
    const links = parseWikiLinks(content, sourceRepo);
    const linkToRepo = links.find((l) => l.target.toLowerCase() === repoName.toLowerCase());
    if (linkToRepo) {
      backlinks.push({ source: sourceRepo, alias: linkToRepo.alias });
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
  return links
    .filter((l) => findRepoName(repoNames, l.target))
    .map((l) => ({ target: findRepoName(repoNames, l.target)!, alias: l.alias }));
}

/**
 * Render wiki-links as HTML spans (for README display)
 */
export function renderWikiLinks(text: string): string {
  const regex = new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags);
  return text.replace(regex, (_match, repoName, alias) => {
    const displayText = alias?.trim() || repoName.trim();
    return `<span class="wikilink" data-repo="${repoName.trim()}">${displayText}</span>`;
  });
}

/**
 * Format repo name as wiki-link
 */
export function formatAsWikiLink(repoName: string): string {
  return `[[${repoName}]]`;
}
