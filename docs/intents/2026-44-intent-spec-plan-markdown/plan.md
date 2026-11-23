## 1. สรุปสิ่งที่ต้องทำ

แก้ไขหน้ารายละเอียด Intent, Spec และ Plan ให้แสดงเนื้อหาด้วย Markdown renderer แทน plain text โดยสร้าง shared component `MarkdownRenderer` ที่ใช้ร่วมกันทั้งระบบ และรองรับ Markdown features ครบถ้วน (headings, lists, code blocks, tables, links ฯลฯ)

## 2. ไฟล์ที่ต้องสร้าง/แก้ไข

| Path | การเปลี่ยนแปลง | เหตุผล |
|------|----------------|---------|
| `apps/web/src/components/ui/markdown-renderer.tsx` | สร้างใหม่ | Shared Markdown renderer component ที่ใช้ร่วมกันทั้งระบบ |
| `apps/web/src/components/ui/markdown-renderer.test.tsx` | สร้างใหม่ | Unit tests สำหรับ MarkdownRenderer |
| `apps/web/src/styles/markdown.scss` | สร้างใหม่ | CSS styling สำหรับ Markdown content |
| `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` | แก้ไข | ใช้ MarkdownRenderer แสดง intent content |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` | แก้ไข | ใช้ MarkdownRenderer แสดง spec content |
| `apps/web/src/app/issues/[id]/plan/[planId]/page.tsx` | แก้ไข | ใช้ MarkdownRenderer แสดง plan content |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ไข | ใช้ MarkdownRenderer แสดง issue description (ถ้ามี Markdown) |
| `apps/web/src/styles/variables.scss` | แก้ไข | เพิ่ม CSS variables สำหรับ Markdown theming |
| `apps/web/package.json` | แก้ไข | เพิ่ม dependencies: react-markdown, remark-gfm, rehype-highlight, rehype-sanitize, highlight.js |
| `apps/web/src/components/ui/index.ts` | แก้ไข | Export MarkdownRenderer |

## 3. ขั้นตอนการทำงาน

### Step 1: ติดตั้ง Dependencies
```bash
cd apps/web
pnpm add react-markdown remark-gfm rehype-highlight rehype-sanitize highlight.js
```

### Step 2: สร้าง CSS Variables
แก้ไข `apps/web/src/styles/variables.scss` เพิ่ม CSS variables:

```scss
:root {
  // เพิ่ม variables สำหรับ Markdown
  --markdown-code-bg: #f6f8fa;
  --markdown-code-block-bg: #0d1117;
  --markdown-border-color: #d0d7de;
  --markdown-table-header-bg: #f6f8fa;
  --markdown-table-row-alt-bg: #f6f8fa;
  --markdown-link-color: #0969da;
  --markdown-text-secondary: #57606a;
}

[data-theme='dark'] {
  --markdown-code-bg: #161b22;
  --markdown-code-block-bg: #0d1117;
  --markdown-border-color: #30363d;
  --markdown-table-header-bg: #161b22;
  --markdown-table-row-alt-bg: #0d1117;
  --markdown-link-color: #58a6ff;
  --markdown-text-secondary: #8b949e;
}
```

### Step 3: สร้าง Markdown Stylesheet
สร้างไฟล์ `apps/web/src/styles/markdown.scss` ตาม spec ที่ระบุไว้ (ครอบคลุม headings, lists, code, tables, links, blockquotes, hr)

### Step 4: สร้าง MarkdownRenderer Component
สร้าง `apps/web/src/components/ui/markdown-renderer.tsx`:

```typescript
'use client'

import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github-dark.css'
import '@/styles/markdown.scss'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSanitize]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

### Step 5: Export MarkdownRenderer
แก้ไข `apps/web/src/components/ui/index.ts` เพิ่ม:
```typescript
export { MarkdownRenderer } from './markdown-renderer'
```

### Step 6: แก้ไขหน้า Intent Detail
แก้ไข `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` ใช้ MarkdownRenderer:

```typescript
import { MarkdownRenderer } from '@/components/ui'

// ในส่วนแสดง intent.content
<MarkdownRenderer content={intent.content} className="intent-markdown" />
```

### Step 7: แก้ไขหน้า Spec Detail
แก้ไข `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` ใช้ MarkdownRenderer:

```typescript
import { MarkdownRenderer } from '@/components/ui'

// ในส่วนแสดง spec.content
<MarkdownRenderer content={spec.content} className="spec-markdown" />
```

### Step 8: แก้ไขหน้า Plan Detail
แก้ไข `apps/web/src/app/issues/[id]/plan/[planId]/page.tsx` ใช้ MarkdownRenderer:

```typescript
import { MarkdownRenderer } from '@/components/ui'

// ในส่วนแสดง plan.content
<MarkdownRenderer content={plan.content} className="plan-markdown" />
```

### Step 9: แก้ไขหน้า Issue Detail (Optional)
แก้ไข `apps/web/src/app/issues/[id]/page.tsx` ใช้ MarkdownRenderer สำหรับ issue description ถ้า format เป็น Markdown

### Step 10: สร้าง Unit Tests
สร้าง `apps/web/src/components/ui/markdown-renderer.test.tsx` ตาม spec:

```typescript
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from './markdown-renderer'

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
    expect(screen.getByText(/const/)).toBeInTheDocument()
  })

  it('should render tables correctly', () => {
    const content = '| Header |\n|--------|\n| Cell   |'
    render(<MarkdownRenderer content={content} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
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

## 4. คำสั่งทดสอบ

```bash
# ติดตั้ง dependencies
cd apps/web
pnpm install

# รัน type check
pnpm tsc --noEmit

# รัน unit tests
pnpm test markdown-renderer

# รัน dev server ทดสอบการแสดงผล
pnpm dev

# Build production เพื่อตรวจสอบ errors
pnpm build

# รัน tests ทั้งหมด
pnpm test
```

### การทดสอบ Manual
1. เปิด browser ไปที่ `http://localhost:3000`
2. เข้าหน้า issue ที่มี intent/spec/plan อนุมัติแล้ว
3. ตรวจสอบการแสดงผล Markdown:
   - Headings แสดงขนาดถูกต้อง
   - Lists มี indentation
   - Code blocks มี syntax highlighting
   - Tables มี borders
   - Links คลิกเปิด tab ใหม่ได้
4. ทดสอบ responsive บน mobile viewport
5. ทดสอบ dark mode (ถ้ามี)

## 5. เงื่อนไขสำเร็จ

- [ ] ติดตั้ง dependencies สำเร็จ (react-markdown, remark-gfm, rehype-*, highlight.js)
- [ ] สร้าง MarkdownRenderer component เสร็จ พร้อม TypeScript types
- [ ] สร้าง markdown.scss stylesheet ครอบคลุมทุก elements
- [ ] เพิ่ม CSS variables ใน variables.scss
- [ ] แก้ไขหน้า Intent detail ใช้ MarkdownRenderer
- [ ] แก้ไขหน้า Spec detail ใช้ MarkdownRenderer
- [ ] แก้ไขหน้า Plan detail ใช้ MarkdownRenderer
- [ ] Export MarkdownRenderer ใน ui/index.ts
- [ ] สร้าง unit tests ครบทุก test cases
- [ ] Unit tests ผ่านทั้งหมด (`pnpm test`)
- [ ] Type check ผ่าน (`pnpm tsc --noEmit`)
- [ ] Build สำเร็จ (`pnpm build`)
- [ ] ทดสอบ manual ครบ 5 รายการที่มี intent/spec/plan
- [ ] Markdown headings (H1-H6) แสดงผลถูกต้อง
- [ ] Lists (ordered/unordered/nested) แสดงผลถูกต้อง
- [ ] Code blocks มี syntax highlighting
- [ ] Tables แสดงผลพร้อม styling
- [ ] Links เปิด external links ใน tab ใหม่
- [ ] Blockquotes และ horizontal rules แสดงผลชัดเจน
- [ ] Responsive design ทำงานบน mobile
- [ ] ไม่มี XSS vulnerabilities (ใช้ rehype-sanitize)
- [ ] Performance ไม่ lag เมื่อเนื้อหายาว (>5000 บรรทัด)

## 6. ความเสี่ยงและข้อควรระวัง

### ความเสี่ยง

1. **Syntax Highlighting Bundle Size** — highlight.js มีขนาดใหญ่ถ้ารวมทุกภาษา
   - **แก้ไข**: Import เฉพาะภาษาที่ใช้บ่อย หรือใช้ dynamic import
   
2. **XSS Attacks** — user อาจใส่ Markdown ที่มี malicious HTML
   - **แก้ไข**: ใช้ rehype-sanitize และ whitelist tags/attributes

3. **Performance กับเนื้อหายาว** — Markdown ยาว >10,000 บรรทัดอาจทำให้ render ช้า
   - **แก้ไข**: ใช้ React.memo() และพิจารณา virtual scrolling ถ้าจำเป็น

4. **Breaking Changes** — ถ้า intent/spec/plan เก่ามี HTML แทน Markdown
   - **แก้ไข**: Component ต้อง fallback ได้ และอาจต้องมี migration script

5. **CSS Conflicts** — Markdown styles อาจชนกับ global styles
   - **แก้ไข**: Scope styles ด้วย `.markdown-content` class และใช้ CSS variables

### ข้อควรระวัง

- **ตรวจสอบ Next.js Client/Server Component**: MarkdownRenderer ต้องเป็น `'use client'` เพราะใช้ interactive features
- **Highlight.js CSS Import**: ต้อง import stylesheet ที่เหมาะสมกับ theme ของระบบ
- **External Links Security**: ต้องมี `rel="noopener noreferrer"` ทุก external link
- **Table Responsive**: Tables อาจล้นออกจาก container บน mobile — พิจารณาใช้ horizontal scroll
- **Code Block Language Detection**: ต้องระบุภาษาใน code fence ถึงจะได้ syntax highlighting
- **TypeScript Types**: ตรวจสอบว่า react-markdown types ใช้งานได้กับ Next.js 15
- **Accessibility**: ตรวจสอบ keyboard navigation และ screen reader support
- **Image Rendering**: ถ้า Markdown มีรูปภาพ ต้องจัดการ image loading และ security (ใช้ Next.js Image component)