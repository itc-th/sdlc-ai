# แผนการแก้โค้ด: แสดงผล Markdown ในรายละเอียด Issues

## 1. สรุปสิ่งที่ต้องทำ

เพิ่ม Markdown renderer เพื่อแปลงเนื้อหา Issue จาก plain text เป็น formatted HTML โดยใช้ `marked` library และ `DOMPurify` สำหรับความปลอดภัย พร้อม CSS styling ที่สอดคล้องกับ design system

## 2. ไฟล์ที่ต้องสร้าง/แก้ไข

| Path | การเปลี่ยนแปลง | เหตุผล |
|------|---------------|--------|
| `apps/web/package.json` | เพิ่ม dependencies: `marked@^11.0.0`, `dompurify@^3.0.0`, `@types/dompurify@^3.0.0` | ติดตั้ง libraries สำหรับ Markdown parsing และ HTML sanitization |
| `apps/web/src/lib/markdown.ts` | **สร้างใหม่** — ฟังก์ชัน `renderMarkdown()` และการ config marked | Core logic สำหรับแปลง Markdown เป็น HTML อย่างปลอดภัย |
| `apps/web/src/components/markdown-content.tsx` | **สร้างใหม่** — React component สำหรับแสดงผล Markdown | Reusable component ที่ใช้ได้ทั่วระบบ |
| `apps/web/src/app/globals.css` | เพิ่ม CSS variables และ `.markdown-body` styles | Styling สำหรับ Markdown elements ทั้งหมด |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ไขส่วนแสดงเนื้อหา Issue ใช้ `<MarkdownContent>` แทน plain text | ใช้งาน Markdown renderer ในหน้ารายละเอียด Issue |
| `apps/web/__tests__/lib/markdown.test.ts` | **สร้างใหม่** — Unit tests สำหรับ Markdown rendering | ทดสอบการแปลง Markdown และการป้องกัน XSS |

## 3. ขั้นตอนการทำงาน

### Step 1: ติดตั้ง Dependencies

```bash
cd apps/web
pnpm add marked dompurify
pnpm add -D @types/dompurify
```

### Step 2: สร้างไฟล์ `apps/web/src/lib/markdown.ts`

สร้าง utility function สำหรับ Markdown rendering:

```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked options
marked.setOptions({
  gfm: true,              // GitHub Flavored Markdown
  breaks: true,           // Convert \n to <br>
  headerIds: true,        // Add IDs to headings
  mangle: false,          // Don't mangle email addresses
});

// Custom renderer
const renderer = new marked.Renderer();

// Customize link rendering (open external links in new tab)
renderer.link = ({ href, title, text }) => {
  const isExternal = href.startsWith('http') && (typeof window !== 'undefined' && !href.includes(window.location.hostname));
  const target = isExternal ? '_blank' : '_self';
  const rel = isExternal ? 'noopener noreferrer' : '';
  
  return `<a href="${href}" ${title ? `title="${title}"` : ''} target="${target}" ${rel ? `rel="${rel}"` : ''}>${text}</a>`;
};

// Customize code block rendering
renderer.code = ({ text, lang }) => {
  const language = lang || 'plaintext';
  return `<pre class="code-block"><code class="language-${language}">${text}</code></pre>`;
};

/**
 * Render Markdown to sanitized HTML
 * @param markdownText - Raw Markdown string
 * @returns Sanitized HTML string
 */
export function renderMarkdown(markdownText: string | null | undefined): string {
  if (!markdownText) return '';
  
  try {
    // Step 1: Parse and render Markdown to HTML
    const rawHtml = marked(markdownText, { renderer }) as string;
    
    // Step 2: Sanitize HTML (server-side safe)
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'hr', 'span', 'div'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'class', 'id', 'align'
      ],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|data:image\/|mailto:|tel:)/i
    });
    
    return cleanHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // Fallback to escaped plain text
    return escapeHtml(markdownText);
  }
}

/**
 * Escape HTML entities for fallback
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### Step 3: สร้าง React Component `apps/web/src/components/markdown-content.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import { renderMarkdown } from '@/lib/markdown';

interface MarkdownContentProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * Component for rendering Markdown content safely
 */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  // Memoize to prevent unnecessary re-rendering
  const renderedContent = useMemo(() => {
    return renderMarkdown(content);
  }, [content]);
  
  if (!renderedContent) {
    return <div className="text-gray-500 italic">ไม่มีเนื้อหา</div>;
  }
  
  return (
    <div 
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
```

### Step 4: เพิ่ม CSS Styles ใน `apps/web/src/app/globals.css`

เพิ่ม CSS variables และ `.markdown-body` styles ต่อท้ายไฟล์:

```css
/* Markdown Content Styles */
:root {
  --font-family-mono: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  
  /* Light theme colors */
  --text-color-primary: #24292f;
  --text-color-secondary: #57606a;
  --text-color-heading: #1f2328;
  --link-color: #0969da;
  --link-color-hover: #0550ae;
  --code-bg-color: #f6f8fa;
  --code-block-bg-color: #f6f8fa;
  --border-color-light: #d0d7de;
  --border-color-medium: #d0d7de;
  --table-header-bg: #f6f8fa;
  --table-row-bg: #ffffff;
  --table-row-alt-bg: #f6f8fa;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-color-primary: #e6edf3;
    --text-color-secondary: #8b949e;
    --text-color-heading: #e6edf3;
    --link-color: #2f81f7;
    --link-color-hover: #539bf5;
    --code-bg-color: #161b22;
    --code-block-bg-color: #161b22;
    --border-color-light: #30363d;
    --border-color-medium: #30363d;
    --table-header-bg: #161b22;
    --table-row-bg: #0d1117;
    --table-row-alt-bg: #161b22;
  }
}

/* Base Markdown styles */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-color-primary);
  word-wrap: break-word;
}

/* Headings */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text-color-heading);
}

.markdown-body h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-color-light);
}

.markdown-body h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-color-light);
}

.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1em; }
.markdown-body h5 { font-size: 0.875em; }
.markdown-body h6 { font-size: 0.85em; color: var(--text-color-secondary); }

/* Paragraphs */
.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
}

/* Text formatting */
.markdown-body strong { font-weight: 600; }
.markdown-body em { font-style: italic; }
.markdown-body del {
  text-decoration: line-through;
  color: var(--text-color-secondary);
}

/* Lists */
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body li { margin-bottom: 0.25em; }
.markdown-body li > p { margin-bottom: 8px; }

/* Links */
.markdown-body a {
  color: var(--link-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

.markdown-body a:hover {
  color: var(--link-color-hover);
  text-decoration: underline;
}

/* Code */
.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  font-family: var(--font-family-mono);
  background-color: var(--code-bg-color);
  border-radius: 3px;
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--code-block-bg-color);
  border-radius: 6px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color-medium);
}

.markdown-body pre code {
  padding: 0;
  margin: 0;
  background-color: transparent;
  border: 0;
  font-size: 100%;
}

/* Tables */
.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid var(--border-color-medium);
}

.markdown-body table th {
  font-weight: 600;
  background-color: var(--table-header-bg);
  text-align: left;
}

.markdown-body table tr {
  background-color: var(--table-row-bg);
}

.markdown-body table tr:nth-child(2n) {
  background-color: var(--table-row-alt-bg);
}

/* Blockquotes */
.markdown-body blockquote {
  padding: 0 1em;
  margin: 0 0 16px 0;
  color: var(--text-color-secondary);
  border-left: 4px solid var(--border-color-medium);
}

/* Horizontal rules */
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--border-color-light);
  border: 0;
}

/* Images */
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .markdown-body {
    font-size: 14px;
  }
  
  .markdown-body table {
    display: block;
    overflow-x: auto;
  }
}
```

### Step 5: แก้ไข `apps/web/src/app/issues/[id]/page.tsx`

ค้นหาส่วนที่แสดงเนื้อหา Issue (ประมาณบรรทัดที่แสดง `issue.description`) และแทนที่ด้วย:

```typescript
import { MarkdownContent } from '@/components/markdown-content';

// ... existing code ...

// ในส่วน JSX ที่แสดงเนื้อหา Issue:
<div className="mt-4">
  <h3 className="text-lg font-semibold mb-2">รายละเอียด</h3>
  <MarkdownContent content={issue.description} />
</div>
```

### Step 6: สร้าง Unit Tests `apps/