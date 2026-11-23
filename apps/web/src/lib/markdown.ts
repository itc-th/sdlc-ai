import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render Markdown to sanitized HTML
 */
export function renderMarkdown(markdownText: string | null | undefined): string {
  if (!markdownText) return '';

  try {
    const rawHtml = marked.parse(markdownText) as string;

    const cleanHtml = sanitizeHtml(rawHtml, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'hr', 'span', 'div',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height'],
        code: ['class'],
        pre: ['class'],
        td: ['align'],
        th: ['align'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });

    return cleanHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return escapeHtml(markdownText);
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
