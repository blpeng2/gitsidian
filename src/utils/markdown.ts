import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderWikiLinksInHtml(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, repoName: string, alias?: string) => {
    const displayText = alias?.trim() || repoName.trim();
    return `<span class="wikilink" data-repo="${escapeHtml(repoName.trim())}">${escapeHtml(displayText)}</span>`;
  });
}

export function renderMarkdown(text: string): string {
  const withLatex = renderLatex(text);
  const html = marked.parse(withLatex) as string;
  const sanitizeConfig: DOMPurifyConfig = {
    ADD_ATTR: ['data-repo'],
  };

  return DOMPurify.sanitize(renderWikiLinksInHtml(html), sanitizeConfig);
}
