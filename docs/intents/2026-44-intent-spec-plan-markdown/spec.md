## 1. ระบบย่อยที่เกี่ยวข้อง

- **Intent Management System** - ระบบจัดการ Intent Spec Plan ที่ต้องแก้ไขการแสดงผล
- **Issue Management System** - ระบบที่มี Markdown renderer component ที่จะนำมาใช้ร่วมกัน
- **Frontend UI Components** - ส่วนแสดงผลที่ต้องอัพเดท component
- **API Layer** - ส่วนที่ส่งข้อมูล Intent Spec Plan content มาแสดงผล (ไม่ต้องแก้ไขถ้าส่ง Markdown มาอยู่แล้ว)

## 2. ข้อเท็จจริงจากระบบปัจจุบัน

- Intent Spec Plan detail view ปัจจุบันแสดงเนื้อหาในรูปแบบ plain text หรือใช้ `dangerouslySetInnerHTML` สำหรับ HTML ธรรมดา
- หน้า Issues ใช้ Markdown renderer library (น่าจะเป็น `react-markdown` หรือ `marked` + `highlight.js`) ที่ทำงานได้ดี
- ข้อมูล Intent Spec Plan ใน database เก็บในรูปแบบ Markdown text อยู่แล้ว
- Component architecture แยก Issues และ Intent Spec Plan เป็นคนละ module
- CSS styling สำหรับ Markdown content อยู่ใน global stylesheet หรือ scoped ใน Issues component
- ไม่มี Markdown editor สำหรับ Intent Spec Plan (ใช้ textarea ธรรมดา)
- Performance ของ Issues page ดี ไม่มีปัญหา lag เมื่อแสดง Markdown content ที่ยาว

## 3. ข้อเสนอการออกแบบ

### 3.1 Architecture Overview

```
IntentSpecPlanDetail Component
    ├── IntentHeader (ไม่เปลี่ยนแปลง)
    ├── MarkdownRenderer (ใหม่/นำมาใช้ร่วม)
    │   ├── react-markdown library
    │   ├── rehype-highlight (syntax highlighting)
    │   ├── rehype-sanitize (security)
    │   └── Custom renderers for components
    └── IntentFooter (ไม่เปลี่ยนแปลง)
```

### 3.2 Technical Implementation

#### 3.2.1 Shared Markdown Component
สร้าง shared component `MarkdownRenderer` ที่ใช้ร่วมกันระหว่าง Issues และ Intent Spec Plan:

```typescript
// src/components/shared/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSanitize]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // Custom renderers สำหรับ components อื่นๆ ถ้าจำเป็น
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

#### 3.2.2 Integration with Intent Spec Plan

```typescript
// src/components/intent/IntentSpecPlanDetail.tsx
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'

export const IntentSpecPlanDetail: React.FC<Props> = ({ intentId }) => {
  const { data: intent, isLoading } = useIntent(intentId)
  
  if (isLoading) return <Skeleton />
  
  return (
    <div className="intent-detail-container">
      <IntentHeader intent={intent} />
      
      <div className="intent-content">
        <MarkdownRenderer 
          content={intent.specPlanContent} 
          className="intent-markdown"
        />
      </div>
      
      <IntentFooter intent={intent} />
    </div>
  )
}
```

#### 3.2.3 CSS Styling

สร้าง shared stylesheet สำหรับ Markdown content:

```scss
// src/styles/markdown.scss
.markdown-content {
  line-height: 1.6;
  color: var(--text-primary);
  
  // Headings
  h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }
  
  h1 { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  
  // Lists
  ul, ol {
    padding-left: 2em;
    margin-bottom: 16px;
  }
  
  li {
    margin-bottom: 4px;
  }
  
  // Code
  code {
    background-color: var(--code-bg);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background-color: var(--code-block-bg);
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 16px;
    
    code {
      background-color: transparent;
      padding: 0;
    }
  }
  
  // Tables
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
    
    th, td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: var(--table-header-bg);
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: var(--table-row-alt-bg);
    }
  }
  
  // Links
  a {
    color: var(--link-color);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  // Blockquotes
  blockquote {
    border-left: 4px solid var(--border-color);
    padding-left: 16px;
    margin-left: 0;
    color: var(--text-secondary);
    font-style: italic;
  }
  
  // Horizontal rules
  hr {
    border: none;
    border-top: 2px solid var(--border-color);
    margin: 24px 0;
  }
  
  // Responsive
  @media (max-width: 768px) {
    font-size: 0.95em;
    
    table {
      font-size: 0.9em;
    }
    
    pre {
      padding: 12px;
    }
  }
}
```

#### 3.2.4 Package Dependencies

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-sanitize": "^6.0.0",
    "highlight.js": "^11.9.0"
  }
}
```

### 3.3 Security Considerations

- ใช้ `rehype-sanitize` เพื่อป้องกัน XSS attacks
- กำหนด `rel="noopener noreferrer"` สำหรับ external links
- Whitelist HTML tags และ attributes ที่อนุญาต
- ไม่อนุญาตให้ใช้ inline scripts หรือ event handlers

### 3.4 Performance Optimization

- ใช้ React.memo() สำหรับ MarkdownRenderer component
- Lazy load highlight.js languages ที่ไม่ค่อยใช้
- ใช้ virtual scrolling ถ้า Intent Spec Plan มีความยาวมาก (>10,000 บรรทัด)
- Cache rendered HTML output ถ้า content ไม่เปลี่ยนบ่อย

### 3.5 Testing Strategy

```typescript
// MarkdownRenderer.test.tsx
describe('MarkdownRenderer', () => {
  it('should render headings correctly', () => {
    const content = '# H1\n## H2\n### H3'
    render(<MarkdownRenderer content={content} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('H1')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('H2')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('H3')
  })
  
  it('should render code blocks with syntax highlighting', () => {
    const content = '```javascript\nconst x = 1;\n```'
    render(<MarkdownRenderer content={content} />)
    expect(screen.getByText('const')).toHaveClass('hljs-keyword')
  })
  
  it('should render tables correctly', () => {
    const content = '| Header |\n|--------|\n| Cell   |'
    render(<MarkdownRenderer content={content} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader')).toHaveTextContent('Header')
  })
  
  it('should sanitize dangerous HTML', () => {
    const content = '<script>alert("xss")</script>'
    render(<MarkdownRenderer content={content} />)
    expect(screen.queryByText('alert')).not.toBeInTheDocument()
  })
  
  it('should open external links in new tab', () => {
    const content = '[Link](https://example.com)'
    render(<MarkdownRenderer content={content} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
```

## 4. ไฟล์ที่ต้องสร้าง/แก้ไข

| ลำดับ | ชื่อไฟล์ | ประเภท | รายละเอียด |
|------|---------|--------|-----------|
| 1 | `src/components/shared/MarkdownRenderer.tsx` | สร้างใหม่ | Shared Markdown renderer component |
| 2 | `src/components/shared/MarkdownRenderer.test.tsx` | สร้างใหม่ | Unit tests สำหรับ MarkdownRenderer |
| 3 | `src/styles/markdown.scss` | สร้างใหม่ | CSS styling สำหรับ Markdown content |
| 4 | `src/components/intent/IntentSpecPlanDetail.tsx` | แก้ไข | Integration ของ MarkdownRenderer |
| 5 | `src/components/intent/IntentSpecPlanDetail.test.tsx` | แก้ไข | เพิ่ม test cases สำหรับ Markdown rendering |
| 6 | `src/components/issues/IssueDetail.tsx` | แก้ไข | Refactor ให้ใช้ shared MarkdownRenderer |
| 7 | `src/styles/variables.scss` | แก้ไข | เพิ่ม CSS variables สำหรับ Markdown theming |
| 8 | `package.json` | แก้ไข | เพิ่ม dependencies: react-markdown, remark-gfm, rehype-* |
| 9 | `src/utils/markdown.ts` | สร้างใหม่ | Utility functions สำหรับ Markdown processing (ถ้าจำเป็น) |
| 10 | `src/components/shared/index.ts` | แก้ไข | Export MarkdownRenderer |
| 11 | `.storybook/stories/MarkdownRenderer.stories.tsx` | สร้างใหม่ | Storybook stories สำหรับ MarkdownRenderer |
| 12 | `docs/components/markdown-renderer.md` | สร้างใหม่ | เอกสารการใช้งาน MarkdownRenderer component |

## 5. เกณฑ์ว่าเสร็จ (Checklist)

### 5.1 Functional Requirements
- [ ] แสดงผล Markdown headings (H1-H6) ได้ถูกต้องตามลำดับชั้น
- [ ] รองรับ ordered lists และ unordered lists พร้อม nested lists (อย่างน้อย 3 ระดับ)
- [ ] Code blocks แสดงผลพร้อม syntax highlighting สำหรับภาษา: JavaScript, TypeScript, Python, Java, SQL, JSON, YAML
- [ ] Inline code แสดงผลด้วย monospace font และ background color ที่แตกต่าง
- [ ] Text formatting (bold, italic, strikethrough, bold+italic) แสดงผลถูกต้อง
- [ ] Links ทั้ง internal และ external สามารถคลิกได้
- [ ] External links เปิดใน tab ใหม่พร้อม `rel="noopener noreferrer"`
- [ ] Tables แสดงผลพร้อม borders, header styling และ alternating row colors
- [ ] Table text alignment (left, center, right) ทำงานตาม Markdown syntax
- [ ] Blockquotes แสดงผลด้วย left border และ indentation
- [ ] Horizontal rules แสดงเป็นเส้นแบ่งที่ชัดเจน

### 5