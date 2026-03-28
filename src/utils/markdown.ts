import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';
import katex from 'katex';
import { marked, type Renderer } from 'marked';
import { WIKILINK_PATTERN } from './wikiLinks';

marked.setOptions({
  gfm: true,
  breaks: true,
});

function parseCodeInfo(info: string): { lang: string; filename?: string } {
  if (!info) return { lang: '' };
  const colonIdx = info.indexOf(':');
  if (colonIdx > 0) {
    return {
      lang: info.slice(0, colonIdx),
      filename: info.slice(colonIdx + 1),
    };
  }
  const spaceIdx = info.indexOf(' ');
  if (spaceIdx > 0) {
    return {
      lang: info.slice(0, spaceIdx),
      filename: info.slice(spaceIdx + 1),
    };
  }
  return { lang: info };
}

// Custom renderer that wraps code blocks with a copy button
const copyButtonRenderer: Partial<Renderer> = {
  code(token) {
    const { lang, filename } = parseCodeInfo(token.lang || '');
    const code = token.text;
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const langClass = lang ? ` class="language-${lang}"` : '';
    const displayLang = lang || 'code';
    const headerContent = filename
      ? `<span class="code-block-info"><span class="code-block-lang">${displayLang}</span><span class="code-block-filename">${filename}</span></span>`
      : `<span class="code-block-info"><span class="code-block-lang">${displayLang}</span></span>`;
    return `<div class="code-block-wrapper"><div class="code-block-header">${headerContent}<button class="code-copy-btn" data-code="${escapedCode}">Copy</button></div><pre><code${langClass}>${escapedCode}</code></pre></div>`;
  },
};

marked.use({ renderer: copyButtonRenderer });

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
  const regex = new RegExp(WIKILINK_PATTERN.source, WIKILINK_PATTERN.flags);

  return html.replace(regex, (_match, repoName: string, alias?: string) => {
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
