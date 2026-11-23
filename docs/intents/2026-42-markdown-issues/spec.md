# Technical Specification: แสดงผล Markdown ในรายละเอียด Issues

## 1. ระบบย่อยที่เกี่ยวข้อง

- **Issue Management Module** — หน้าแสดงรายละเอียด Issues
- **Frontend Rendering Engine** — ส่วนที่แสดงผล UI
- **Security Layer** — ส่วนที่ทำ input sanitization และป้องกัน XSS
- **CSS/Styling System** — Design system และ stylesheet ของระบบ
- **Testing Framework** — สำหรับ unit tests และ integration tests

## 2. ข้อเท็จจริงจากระบบปัจจุบัน

### 2.1 การจัดเก็บข้อมูล
- รายละเอียด Issues จัดเก็บเป็น plain text ในฐานข้อมูล
- ไม่มีการแยกประเภท format หรือ content type
- ผู้ใช้สามารถป้อน Markdown syntax ได้ แต่ระบบไม่ได้ validate หรือ process

### 2.2 การแสดงผล
- แสดงเนื้อหาผ่าน simple text rendering (เช่น `<pre>`, `<div>` หรือ `<p>` tag)
- ไม่มีการ parse หรือ transform เนื้อหาก่อนแสดงผล
- Markdown syntax characters แสดงออกมาเป็น literal text

### 2.3 UI Components
- หน้ารายละเอียด Issues ใช้ component structure แบบ modular
- มี CSS framework/design system อยู่แล้ว (สมมติว่าใช้ระบบ CSS variables)
- รองรับ responsive design

### 2.4 Performance Baseline
- เวลาโหลดหน้ารายละเอียด Issues ปัจจุบันอยู่ที่ประมาณ 300-500ms (ขึ้นอยู่กับความยาวของเนื้อหา)

## 3. ข้อเสนอการออกแบบ

### 3.1 Architecture Overview

```
[Issue Data (Plain Text Markdown)]
           ↓
[Markdown Parser] → [AST (Abstract Syntax Tree)]
           ↓
[HTML Renderer]
           ↓
[HTML Sanitizer] ← [Security Rules]
           ↓
[Styled HTML Output] → [DOM]
```

### 3.2 Technology Stack

**Markdown Library:** `marked` v11.x
- เหตุผล: เร็ว, น้ำหนักเบา (~50KB minified), รองรับ CommonMark + GFM (GitHub Flavored Markdown)
- มี built-in security features
- API ใช้งานง่าย, มี TypeScript support

**HTML Sanitizer:** `DOMPurify` v3.x
- เหตุผล: Industry standard สำหรับ XSS prevention
- รองรับ whitelist-based sanitization
- Performance ดี, maintainable

**Alternative Considerations:**
- `markdown-it`: Feature-rich แต่หนักกว่า, เหมาะถ้าต้องการ plugins
- `react-markdown`: เหมาะถ้าใช้ React และต้องการ component-based rendering

### 3.3 Implementation Details

#### 3.3.1 Markdown Rendering Pipeline

```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked
marked.setOptions({
  gfm: true,              // GitHub Flavored Markdown
  breaks: true,           // Convert \n to <br>
  headerIds: true,        // Add IDs to headings
  mangle: false,          // Don't mangle email addresses
  sanitize: false,        // We'll use DOMPurify instead
});

// Custom renderer for specific elements (optional)
const renderer = new marked.Renderer();

// Customize link rendering (open in new tab, add rel attributes)
renderer.link = (href, title, text) => {
  const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
  const target = isExternal ? '_blank' : '_self';
  const rel = isExternal ? 'noopener noreferrer' : '';
  
  return `<a href="${href}" ${title ? `title="${title}"` : ''} target="${target}" ${rel ? `rel="${rel}"` : ''}>${text}</a>`;
};

// Customize code block rendering
renderer.code = (code, language) => {
  const lang = language || 'plaintext';
  return `<pre class="code-block"><code class="language-${lang}">${code}</code></pre>`;
};

// Main rendering function
function renderMarkdown(markdownText) {
  if (!markdownText) return '';
  
  try {
    // Step 1: Parse and render Markdown to HTML
    const rawHtml = marked(markdownText, { renderer });
    
    // Step 2: Sanitize HTML
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'del', 'code', 'pre',
        'ul', 'ol', 'li',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'hr'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'class', 'id',
        'align'
      ],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):\/\/|data:image\/|mailto:|tel:)/i
    });
    
    return cleanHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // Fallback to plain text
    return escapeHtml(markdownText);
  }
}

// Utility function for fallback
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

#### 3.3.2 React Component Integration (ถ้าใช้ React)

```javascript
import React, { useMemo } from 'react';
import { renderMarkdown } from './markdownRenderer';
import './IssueDetail.css';

function IssueDetailContent({ content }) {
  // Memoize to prevent unnecessary re-rendering
  const renderedContent = useMemo(() => {
    return renderMarkdown(content);
  }, [content]);
  
  return (
    <div 
      className="issue-detail-content markdown-body"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

export default IssueDetailContent;
```

#### 3.3.3 Vue Component Integration (ถ้าใช้ Vue)

```vue
<template>
  <div 
    class="issue-detail-content markdown-body"
    v-html="renderedContent"
  />
</template>

<script>
import { computed } from 'vue';
import { renderMarkdown } from './markdownRenderer';

export default {
  name: 'IssueDetailContent',
  props: {
    content: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const renderedContent = computed(() => {
      return renderMarkdown(props.content);
    });
    
    return {
      renderedContent
    };
  }
};
</script>

<style scoped>
@import './IssueDetail.css';
</style>
```

#### 3.3.4 CSS Styling

```css
/* Base styles for Markdown content */
.markdown-body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
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
.markdown-body strong {
  font-weight: 600;
}

.markdown-body em {
  font-style: italic;
}

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

.markdown-body li {
  margin-bottom: 0.25em;
}

.markdown-body li > p {
  margin-bottom: 8px;
}

.markdown-body ul ul,
.markdown-body ul ol,
.markdown-body ol ol,
.markdown-body ol ul {
  margin-top: 0.25em;
  margin-bottom: 0;
}

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

.markdown-body a:visited {
  color: var(--link-color-visited);
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
}

.markdown-body pre code {
  display: inline;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
  font-size: 100%;
}

.markdown-body .code-block {
  position: relative;
  border: 1px solid var(--border-color-medium);
}

/* Tables */
.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
  overflow: auto;
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
  border-top: 1px solid var(--border-color-medium);
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

.markdown-body blockquote > :first-child {
  margin-top: 0;
}

.markdown-body blockquote > :last-child {
  margin-bottom: 0;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .markdown-body {
    font-size: 14px;
  }
  
  .markdown-body h1 { font-size: 1.75em; }
  .markdown-body h2 { font-size: 1.5em; }
  .markdown-body h3 { font-size: 1.25em; }
  
  .markdown-body pre {
    padding: 12px;
  }
  
  .markdown-body table {
    display: block;
    overflow-x: auto;
  }
}
```

#### 3.3.5 CSS Variables Definition

```css
:root {
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
  --font-family-mono: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
  --font-size-base: 16px;
  
  /* Colors - Light Theme */
  --text-color-primary: #24292f;
  --text-color-secondary: #57606a;
  --text-color-heading: #1f2328;
  
  --link-color: #0969da;
  --link-color-hover: #0550ae;
  --link-color-visited: