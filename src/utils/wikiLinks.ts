import { WikiLink, GitHubRepo, MetaNote, GraphData, GraphNode, GraphEdge } from '../types';

// Wiki-link pattern: [[repo-name]]
const WIKILINK_PATTERN = /\[\[([^\]]+)\]\]/g;

/**
 * Parse wiki-links from text
 * @param text - Text containing [[repo-name]] patterns
 * @param sourceRepo - Name of the source repository
 * @returns Array of WikiLink objects
 */
export function parseWikiLinks(text: string, sourceRepo: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match;

  while ((match = WIKILINK_PATTERN.exec(text)) !== null) {
    const targetRepo = match[1].trim();
    if (targetRepo && targetRepo !== sourceRepo) {
      links.push({
        source: sourceRepo,
        target: targetRepo,
      });
    }
  }

  return links;
}

/**
 * Extract wiki-links from a meta note
 */
export function extractLinksFromMetaNote(metaNote: MetaNote): WikiLink[] {
  const allLinks: WikiLink[] = [];

  // Parse links from all text fields
  const textFields = [
    metaNote.purpose,
    metaNote.keyIdeas,
    metaNote.nextExperiments,
  ];

  textFields.forEach(field => {
    if (field) {
      const links = parseWikiLinks(field, metaNote.repoName);
      allLinks.push(...links);
    }
  });

  // Also add explicit related repos
  metaNote.relatedRepos.forEach(targetRepo => {
    if (targetRepo !== metaNote.repoName) {
      allLinks.push({
        source: metaNote.repoName,
        target: targetRepo,
      });
    }
  });

  // Deduplicate links
  const uniqueLinks = new Map<string, WikiLink>();
  allLinks.forEach(link => {
    const key = `${link.source}->${link.target}`;
    uniqueLinks.set(key, link);
  });

  return Array.from(uniqueLinks.values());
}

/**
 * Find wiki-links in README content
 */
export function extractLinksFromReadme(readmeContent: string, sourceRepo: string): WikiLink[] {
  return parseWikiLinks(readmeContent, sourceRepo);
}

/**
 * Generate graph data from repos and meta notes
 */
export function generateGraphData(
  repos: GitHubRepo[],
  metaNotes: Record<string, MetaNote>
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  // Create nodes for each repo
  repos.forEach(repo => {
    const metaNote = metaNotes[repo.name];
    
    nodes.push({
      data: {
        id: repo.name,
        label: repo.name,
        description: repo.description,
        isPrivate: repo.private,
        topics: repo.topics,
        updatedAt: repo.updated_at,
        hasMetaNote: !!metaNote,
        isOrphan: false, // Will be calculated later
        publicReady: metaNote?.publicReady || false,
      },
    });
  });

  // Create edges from meta notes
  Object.values(metaNotes).forEach(metaNote => {
    const links = extractLinksFromMetaNote(metaNote);
    
    links.forEach(link => {
      const edgeKey = [link.source, link.target].sort().join('-');
      
      // Only add edge if both repos exist and edge doesn't exist yet
      if (
        repos.some(r => r.name === link.source) &&
        repos.some(r => r.name === link.target) &&
        !edgeSet.has(edgeKey)
      ) {
        edges.push({
          data: {
            id: edgeKey,
            source: link.source,
            target: link.target,
            type: 'wikilink',
          },
        });
        edgeSet.add(edgeKey);
      }
    });
  });

  // Create edges from shared topics
  const topicMap = new Map<string, string[]>();
  repos.forEach(repo => {
    repo.topics.forEach(topic => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(repo.name);
    });
  });

  topicMap.forEach((repoNames) => {
    if (repoNames.length > 1) {
      // Connect repos with the same topic
      for (let i = 0; i < repoNames.length; i++) {
        for (let j = i + 1; j < repoNames.length; j++) {
          const edgeKey = [repoNames[i], repoNames[j]].sort().join('-topic');
          
          if (!edgeSet.has(edgeKey)) {
            edges.push({
              data: {
                id: edgeKey,
                source: repoNames[i],
                target: repoNames[j],
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
  edges.forEach(edge => {
    connectedNodes.add(edge.data.source);
    connectedNodes.add(edge.data.target);
  });

  nodes.forEach(node => {
    node.data.isOrphan = !connectedNodes.has(node.data.id);
  });

  return { nodes, edges };
}

/**
 * Replace wiki-links with clickable links in text
 */
export function renderWikiLinks(text: string, _onLinkClick: (repoName: string) => void): string {
  return text.replace(WIKILINK_PATTERN, (_match, repoName) => {
    return `<span class="wikilink" data-repo="${repoName.trim()}">${repoName.trim()}</span>`;
  });
}

/**
 * Validate wiki-link format
 */
export function isValidWikiLink(text: string): boolean {
  return /^\[\[.+\]\]$/.test(text.trim());
}

/**
 * Format repo name as wiki-link
 */
export function formatAsWikiLink(repoName: string): string {
  return `[[${repoName}]]`;
}
