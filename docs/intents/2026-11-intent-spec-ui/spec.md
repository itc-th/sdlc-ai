# Spec: #11 หน้าจอจัดการ intent และ spec

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: e8397c7 (main หลัง merge #9)

## ระบบย่อย
- เป้าหมาย: `apps/web`, `packages/db`
- ได้รับผลกระทบ: ไม่มี
- กลุ่มผู้ใช้: SA, Programmer, Tech Lead, เจ้าของ policy

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/db/src/schema/intents.ts` — ตาราง intents มี issueId (FK), authorId (FK), filePath (NOT NULL), status (document_status enum: draft/approved/rejected) — ไม่มี content column
- `packages/db/src/schema/specs.ts` — ตาราง specs มี intentId (FK), authorId (FK), filePath (NOT NULL), commitSha, status — ไม่มี content column
- `packages/db/src/schema/approvals.ts` — ตาราง approvals มี targetType (enum: intent/spec/plan/pr), targetId, approverId (FK), decision (enum: approved/rejected/revision_requested), comment
- `packages/db/src/schema/enums.ts` — documentStatusEnum: ['draft', 'approved', 'rejected'], approvalDecisionEnum: ['approved', 'rejected', 'revision_requested']
- `apps/web/src/app/issues/[id]/page.tsx` — หน้ารายละเอียด issue มี triage section อยู่แล้ว ต้องเพิ่ม section intent ด้านล่าง
- migration ที่มีอยู่: `drizzle/0000_safe_sunspot.sql` — เป็น initial migration ที่สร้างทุกตาราง
- `filePath` เป็น NOT NULL — ต้องเปลี่ยนเป็น nullable หรือใส่ค่า default เมื่อสร้าง intent/spec ผ่านเว็บ

## ข้อเสนอการออกแบบ

### 1. Migration: เพิ่ม content column และแก้ filePath

สร้าง migration ใหม่:
```sql
ALTER TABLE intents ADD COLUMN content text;
ALTER TABLE intents ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE specs ADD COLUMN content text;
ALTER TABLE specs ALTER COLUMN file_path DROP NOT NULL;
```

แก้ schema ให้ตรงกับ migration:
- `intents.ts`: เพิ่ม `content: text('content')`, แก้ `filePath` เป็น nullable
- `specs.ts`: เพิ่ม `content: text('content')`, แก้ `filePath` เป็น nullable

### 2. หน้าจอ Intent

#### ส่วน Intent ในหน้า `/issues/[id]`
เพิ่มด้านล่าง triage section:
- ถ้ายังไม่มี intent → แสดงปุ่ม "สร้าง Intent"
- ถ้ามี intent → แสดงสถานะ, เนื้อหา, ประวัติการอนุมัติ, ลิงก์ไปหน้า intent

#### `/issues/[id]/intent/new` — สร้าง intent ใหม่
- ฟอร์ม: content (textarea)
- Server action: insert intents, อัปเดต issue.status → 'intent_draft', audit log
- Redirect ไป `/issues/[id]`

#### `/issues/[id]/intent/[intentId]` — ดู/แก้ไข intent
- แสดงเนื้อหา intent
- ถ้า status = 'draft' → แสดงฟอร์มแก้ไข
- แสดง section อนุมัติ:
  - ปุ่ม "อนุมัติ" / "ปฏิเสธ" / "ขอแก้ไข" พร้อม comment
  - Server action: insert approvals, อัปเดต intent.status, อัปเดต issue.status → 'intent_approved', audit log
- ถ้า intent approved → แสดงปุ่ม "สร้าง Spec"
- แสดงประวัติ approvals ด้านล่าง

### 3. หน้าจอ Spec

#### `/issues/[id]/intent/[intentId]/spec/new` — สร้าง spec ใหม่
- ฟอร์ม: content (textarea)
- Server action: insert specs, อัปเดต issue.status → 'spec_draft', audit log
- Redirect ไป spec detail

#### `/issues/[id]/intent/[intentId]/spec/[specId]` — ดู/แก้ไข spec
- แสดงเนื้อหา spec
- ถ้า status = 'draft' → แสดงฟอร์มแก้ไข
- แสดง section อนุมัติ (เหมือน intent)
  - Server action: insert approvals, อัปเดต spec.status, อัปเดต issue.status → 'spec_approved', audit log
- แสดงประวัติ approvals ด้านล่าง

### 4. การอัปเดตสถานะ issue อัตโนมัติ

| เหตุการณ์ | issue.status เปลี่ยนเป็น |
|---|---|
| สร้าง intent | intent_draft |
| อนุมัติ intent | intent_approved |
| ปฏิเสธ intent | intent_draft (กลับไปแก้) |
| สร้าง spec | spec_draft |
| อนุมัติ spec | spec_approved |
| ปฏิเสธ spec | spec_draft (กลับไปแก้) |

### 5. Validation

- content: required, max 50,000 characters
- approval comment: optional, max 2,000 characters
- ตรวจว่า issue มีอยู่จริงก่อนสร้าง intent
- ตรวจว่า intent มีอยู่จริงและ approved ก่อนสร้าง spec
- ตรวจว่า intent/spec เป็น draft ก่อนอนุญาตแก้ไข

### 6. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `packages/db/src/schema/intents.ts` | แก้ — เพิ่ม content, filePath nullable |
| `packages/db/src/schema/specs.ts` | แก้ — เพิ่ม content, filePath nullable |
| `packages/db/drizzle/0001_*.sql` | สร้างใหม่ — migration เพิ่ม content column |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ — เพิ่ม section Intent/Spec |
| `apps/web/src/app/issues/[id]/intent/new/page.tsx` | สร้างใหม่ — ฟอร์มสร้าง intent |
| `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` | สร้างใหม่ — ดู/แก้/อนุมัติ intent |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/new/page.tsx` | สร้างใหม่ — ฟอร์มสร้าง spec |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` | สร้างใหม่ — ดู/แก้/อนุมัติ spec |

## แผนย้อนกลับ (rollback)
Migration เพิ่ม nullable column เท่านั้น (ไม่ลบ/เปลี่ยน column เดิม) สามารถ revert ด้วย:
```sql
ALTER TABLE intents DROP COLUMN content;
ALTER TABLE intents ALTER COLUMN file_path SET NOT NULL;
ALTER TABLE specs DROP COLUMN content;
ALTER TABLE specs ALTER COLUMN file_path SET NOT NULL;
```

## เกณฑ์ว่าเสร็จ
- [ ] สร้าง intent ใหม่จากหน้ารายละเอียด issue ได้
- [ ] แก้ไข intent ที่เป็น draft ได้
- [ ] อนุมัติ/ปฏิเสธ intent ได้ พร้อม comment
- [ ] สร้าง spec ใหม่จากหน้ารายละเอียด intent (ต้อง approved ก่อน) ได้
- [ ] แก้ไข spec ที่เป็น draft ได้
- [ ] อนุมัติ/ปฏิเสธ spec ได้ พร้อม comment
- [ ] สถานะ issue อัปเดตอัตโนมัติตามตาราง
- [ ] Input validation ทุกจุด
- [ ] บันทึก audit log ทุกการสร้าง/แก้ไข/อนุมัติ
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## การทดสอบ
- `pnpm build` และ `pnpm lint` ผ่าน
- ทดสอบ manual: สร้าง intent จาก issue, แก้ไข, อนุมัติ, สร้าง spec, อนุมัติ
- ตรวจว่า issue.status อัปเดตอัตโนมัติตามตาราง
- ต้องรัน migration ใหม่ก่อนทดสอบ

## ความเสี่ยงและ policy
ระดับ: สูง (แตะโครงสร้างฐานข้อมูลและระบบอนุมัติ)
ผลตรวจตาม `docs/policies/review-checklist.md`:
- ระบบย่อยเป้าหมายและที่ได้รับผลกระทบ: `apps/web`, `packages/db`
- เกณฑ์ว่าเสร็จตรวจสอบได้: ใช่
- ข้อเท็จจริงแยกจากข้อเสนอ: ใช่
- ข้อมูลส่วนบุคคล: ไม่มีเพิ่ม
- สิทธิ์ผู้ใช้: ตรวจ session ทุก server action
- การเปลี่ยนโครงสร้างฐานข้อมูลมีแผนย้อนกลับ: ใช่
- ตรวจและจำกัดข้อมูลนำเข้า: validation content/comment length
- การกระทำสำคัญบันทึกใน audit log: ใช่

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
