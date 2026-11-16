# Spec: #17 Agent ร่าง intent/spec

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: f925bae (main หลัง merge #11)

## ระบบย่อย
- เป้าหมาย: `packages/agents`, `apps/web`
- ได้รับผลกระทบ: ไม่มี
- กลุ่มผู้ใช้: SA

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/agents/src/index.ts` — placeholder `export {}`
- `packages/agents/package.json` — ยังไม่มี dependency สำหรับ AI SDK
- `apps/web/src/app/issues/[id]/intent/new/page.tsx` — ฟอร์มสร้าง intent มี textarea content
- `apps/web/src/app/issues/[id]/intent/[intentId]/spec/new/page.tsx` — ฟอร์มสร้าง spec มี textarea content
- ทั้งสองหน้าเป็น server component ใช้ server action — ต้องเพิ่ม API endpoint สำหรับ AI draft (เรียกจาก client)

## ข้อเสนอการออกแบบ

### 1. packages/agents

เพิ่ม dependency `@anthropic-ai/sdk` ใน packages/agents

```typescript
// packages/agents/src/draft-intent.ts
export async function draftIntent(params: {
  issueTitle: string;
  issueBody: string | null;
  apiKey: string;
}): Promise<string>
```

ใช้ Claude API ส่ง system prompt ที่กำหนดรูปแบบ intent (ปัญหา, ทำไมต้องทำ, ผู้ใช้, ขอบเขต, เกณฑ์เสร็จ, ความเสี่ยง) + issue title/body → return draft content

```typescript
// packages/agents/src/draft-spec.ts
export async function draftSpec(params: {
  issueTitle: string;
  issueBody: string | null;
  intentContent: string;
  apiKey: string;
}): Promise<string>
```

เหมือนกัน แต่ system prompt กำหนดรูปแบบ spec (ข้อเท็จจริง, ข้อเสนอ, ไฟล์ที่แตะ, เกณฑ์เสร็จ)

### 2. API endpoints ใน apps/web

```
POST /api/ai/draft-intent  { issueId: string }  → { content: string }
POST /api/ai/draft-spec    { intentId: string }  → { content: string }
```

- ตรวจ session
- ดึง issue/intent จาก DB
- เรียก agent function
- บันทึก audit log (action: 'ai.draft_intent' / 'ai.draft_spec')
- Return draft content

### 3. ปุ่ม "ให้ AI ร่าง" ในหน้าสร้าง intent/spec

เปลี่ยนหน้าสร้าง intent/spec ให้มี client component สำหรับปุ่ม AI:
- กดปุ่ม → fetch POST /api/ai/draft-intent
- แสดง loading state
- เติม content ลง textarea
- ผู้ใช้แก้ไขได้ก่อน submit

### 4. Environment variable

เพิ่มใน `apps/web/.env.example`:
```
# AI Agent (optional — ถ้าไม่ตั้งปุ่ม AI จะซ่อน)
ANTHROPIC_API_KEY=
```

### 5. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `packages/agents/package.json` | แก้ — เพิ่ม @anthropic-ai/sdk |
| `packages/agents/src/draft-intent.ts` | สร้างใหม่ |
| `packages/agents/src/draft-spec.ts` | สร้างใหม่ |
| `packages/agents/src/index.ts` | แก้ — re-export |
| `packages/agents/tsconfig.json` | อาจแก้ — disable declaration |
| `apps/web/package.json` | แก้ — เพิ่ม @sdlc-ai/agents dependency |
| `apps/web/src/app/api/ai/draft-intent/route.ts` | สร้างใหม่ |
| `apps/web/src/app/api/ai/draft-spec/route.ts` | สร้างใหม่ |
| `apps/web/src/app/issues/[id]/intent/new/page.tsx` | แก้ — เพิ่มปุ่ม AI (client component) |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/new/page.tsx` | แก้ — เพิ่มปุ่ม AI |
| `apps/web/.env.example` | แก้ — เพิ่ม ANTHROPIC_API_KEY |

## เกณฑ์ว่าเสร็จ
- [ ] กดปุ่ม AI ในหน้าสร้าง intent → ได้ draft content
- [ ] กดปุ่ม AI ในหน้าสร้าง spec → ได้ draft content
- [ ] ผลลัพธ์เป็น draft (ไม่ auto-approve)
- [ ] ถ้าไม่ตั้ง API key → ปุ่มซ่อน
- [ ] บันทึก audit log เมื่อใช้ AI
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ความเสี่ยงและ policy
ระดับ: กลาง (แตะ packages/agents, API ภายนอก)
- API key ใน env เท่านั้น
- ห้ามส่งข้อมูลส่วนบุคคลไป API
- ผลลัพธ์เป็น draft เสมอ

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
