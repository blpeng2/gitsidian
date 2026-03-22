import katex from 'katex';
import { marked } from 'marked';

marked.setOptions({
  gfm: true,
  breaks: true,
});

function renderLatex(text: string): string {
  const withBlockMath = text.replace(/\$\$([^$]+?)\$\$/g, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="math-error">${math}</span>`;
    }
  });

  return withBlockMath.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_match, math: string) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">${math}</span>`;
    }
  });
}

function renderWikiLinksInHtml(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, repoName: string, alias?: string) => {
    const displayText = alias?.trim() || repoName.trim();
    return `<span class="wikilink" data-repo="${repoName.trim()}">${displayText}</span>`;
  });
}

export function renderMarkdown(text: string): string {
  const withLatex = renderLatex(text);
  const html = marked.parse(withLatex) as string;
  return renderWikiLinksInHtml(html);
}
