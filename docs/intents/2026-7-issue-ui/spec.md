# Spec: #7 หน้าจอรับเรื่องและจัดการ issue

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: 888f410 (main หลัง merge #5)

## ระบบย่อย
- เป้าหมาย: `apps/web`
- ได้รับผลกระทบ: ไม่มี (ใช้ schema ที่มีอยู่)
- กลุ่มผู้ใช้: Helpdesk, SA, Programmer, Tech Lead, ผู้บริหาร

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/db/src/schema/issues.ts` — ตาราง issues มี projectId (FK → projects), githubIssueNumber (NOT NULL), title, body, type, riskLevel, status (default 'triage'), assigneeId
- `packages/db/src/schema/audit-logs.ts` — ตาราง audit_logs พร้อมใช้ (userId, action, targetType, targetId, metadata)
- `apps/web/src/lib/auth.ts` — มี `auth()` สำหรับตรวจ session, `createDb()` สร้าง DB connection
- DB connection สร้างใน `auth.ts` — ต้องแยกเป็น shared module เพื่อใช้ซ้ำใน API routes
- `githubIssueNumber` เป็น NOT NULL — ต้องจัดการสำหรับ issue ที่สร้างจากเว็บ (ยังไม่ sync กับ GitHub) โดยใช้ auto-increment ภายในระบบ

## ข้อเสนอการออกแบบ

### 1. Shared DB module

สร้าง `apps/web/src/lib/db.ts` แยก DB connection ออกมาจาก auth.ts เพื่อใช้ซ้ำ

```typescript
// src/lib/db.ts
import { createDb } from '@sdlc-ai/db';
export const db = createDb(process.env.DATABASE_URL!);
```

แก้ `auth.ts` ให้ import db จาก `./db`

### 2. Default project — seed script

สร้าง `packages/db/src/seed.ts` ที่ insert default project:
```
{ name: "SDLC-AI", githubOwner: "itc-th", githubRepo: "sdlc-ai" }
```
เพิ่ม script `db:seed` ใน packages/db

### 3. API Routes

#### `GET /api/issues`
- ตรวจ session — 401 ถ้าไม่มี
- Query params: `status`, `type`, `riskLevel` (optional filters)
- Return: issues พร้อม assignee name, เรียงตาม createdAt DESC

#### `GET /api/issues/[id]`
- ตรวจ session — 401 ถ้าไม่มี
- Return: issue พร้อม assignee details

#### `POST /api/issues`
- ตรวจ session — 401 ถ้าไม่มี
- Validation: title (required, max 200), body (optional, max 5000), type (optional enum)
- Auto: projectId = default project, githubIssueNumber = max+1 ภายใน project, status = 'triage'
- บันทึก audit_log: action='issue.created'
- Return: created issue

#### `PATCH /api/issues/[id]`
- ตรวจ session — 401 ถ้าไม่มี
- Allowed fields: type, riskLevel, status, assigneeId
- Validation: enum values, assigneeId ต้องมีอยู่จริง
- บันทึก audit_log: action='issue.updated', metadata = changed fields
- Return: updated issue

### 4. หน้าจอ

#### `/issues` — รายการ issue
- Server component ดึงข้อมูลจาก DB โดยตรง (ไม่ผ่าน API)
- แสดงตาราง: เลข issue, title, type badge, risk badge, status badge, assignee, วันที่
- กรอง: dropdown สำหรับ status, type, risk (ใช้ search params)
- ปุ่ม "สร้างเรื่องใหม่" → `/issues/new`
- คลิกแถว → `/issues/[id]`

#### `/issues/new` — สร้าง issue ใหม่
- ฟอร์ม: title (required), body (textarea), type (select)
- Submit ผ่าน Server Action เรียก API `POST /api/issues`
- สำเร็จ → redirect ไป `/issues/[id]`

#### `/issues/[id]` — รายละเอียด issue
- แสดงข้อมูล issue ทั้งหมด
- Section คัดแยก (triage): dropdown สำหรับ type, risk_level, status, assignee
- Submit ผ่าน Server Action เรียก API `PATCH /api/issues/[id]`

### 5. Layout

เพิ่ม navigation bar ใน layout หลัก:
- Logo "SDLC-AI"
- เมนู: หน้าแรก, Issues
- User info + ปุ่ม logout (ย้ายจาก page.tsx)

### 6. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `apps/web/src/lib/db.ts` | สร้างใหม่ — shared DB connection |
| `apps/web/src/lib/auth.ts` | แก้ — import db จาก ./db |
| `apps/web/src/app/api/issues/route.ts` | สร้างใหม่ — GET + POST |
| `apps/web/src/app/api/issues/[id]/route.ts` | สร้างใหม่ — GET + PATCH |
| `apps/web/src/app/issues/page.tsx` | สร้างใหม่ — รายการ issue |
| `apps/web/src/app/issues/new/page.tsx` | สร้างใหม่ — ฟอร์มสร้าง |
| `apps/web/src/app/issues/[id]/page.tsx` | สร้างใหม่ — รายละเอียด + triage |
| `apps/web/src/app/layout.tsx` | แก้ — เพิ่ม nav bar |
| `apps/web/src/app/page.tsx` | แก้ — redirect ไป /issues |
| `packages/db/src/seed.ts` | สร้างใหม่ — seed default project |

## เกณฑ์ว่าเสร็จ
- [ ] หน้ารายการ issue แสดงข้อมูลจาก DB ได้
- [ ] กรอง issue ตาม status, type, risk ได้
- [ ] สร้าง issue ใหม่ผ่านฟอร์มและบันทึกลง DB ได้
- [ ] SA คัดแยก issue (เปลี่ยน type, risk, status, assignee) ได้
- [ ] API ตรวจสิทธิ์ที่ฝั่ง server ทุกเส้น
- [ ] บันทึก audit log เมื่อสร้าง/อัปเดต issue
- [ ] Input validation ทุกจุด
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## การทดสอบ
- `pnpm build` และ `pnpm lint` ผ่าน
- ทดสอบ manual: สร้าง issue, ดูรายการ, กรอง, คัดแยก
- ต้องมี DB จริงและ seed default project ก่อนทดสอบ

## ความเสี่ยงและ policy
ระดับ: กลาง
ผลตรวจตาม `docs/policies/review-checklist.md`:
- ระบบย่อยเป้าหมายและที่ได้รับผลกระทบ: `apps/web`
- เกณฑ์ว่าเสร็จตรวจสอบได้: ใช่
- ข้อเท็จจริงแยกจากข้อเสนอ: ใช่
- ข้อมูลส่วนบุคคล: ไม่มีเพิ่ม
- สิทธิ์ผู้ใช้: ตรวจ session ทุก API route
- ตรวจและจำกัดข้อมูลนำเข้า: validation title/body/enum values
- การกระทำสำคัญบันทึกใน audit log: ใช่

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
