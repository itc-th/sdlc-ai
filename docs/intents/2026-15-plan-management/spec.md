# Spec: #15 Plan management

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: f925bae (main หลัง merge #11)

## ระบบย่อย
- เป้าหมาย: `apps/web`, `packages/db`
- ได้รับผลกระทบ: ไม่มี
- กลุ่มผู้ใช้: Programmer, SA

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- DB ยังไม่มีตาราง plans — ต้องสร้างใหม่
- `packages/db/src/schema/enums.ts` — มี documentStatusEnum (draft/approved/rejected), approvalTargetTypeEnum (intent/spec/plan/pr) — 'plan' มีในenum แล้ว
- `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` — แสดง spec section เมื่อ intent approved ต้องเพิ่ม plan section เมื่อ spec approved ในหน้า issue detail
- Issue status flow: ...spec_approved → **in_progress** → review → done

## ข้อเสนอการออกแบบ

### 1. Migration: สร้างตาราง plans

```typescript
// packages/db/src/schema/plans.ts
export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').notNull().references(() => issues.id),
  authorId: uuid('author_id').references(() => users.id),
  content: text('content'),
  status: documentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 2. หน้าจอ

#### Section Plan ในหน้า `/issues/[id]`
เพิ่มหลัง intent section: ถ้า issue มี spec ที่ approved → แสดง plan list + ปุ่มสร้าง

#### `/issues/[id]/plan/new` — สร้างแผน
- ฟอร์ม: content (textarea)
- Server action: insert plans, อัปเดต issue.status ไม่เปลี่ยน (ยังเป็น spec_approved), audit log

#### `/issues/[id]/plan/[planId]` — ดู/แก้/อนุมัติแผน
- แสดงเนื้อหา, แก้ไข (ถ้า draft), อนุมัติ/ปฏิเสธ
- อนุมัติ → issue.status = 'in_progress', audit log

### 3. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `packages/db/src/schema/plans.ts` | สร้างใหม่ |
| `packages/db/src/schema/index.ts` | แก้ — re-export plans |
| `packages/db/drizzle/0002_*.sql` | สร้างใหม่ — migration |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ — เพิ่ม plan section |
| `apps/web/src/app/issues/[id]/plan/new/page.tsx` | สร้างใหม่ |
| `apps/web/src/app/issues/[id]/plan/[planId]/page.tsx` | สร้างใหม่ |

## แผนย้อนกลับ
```sql
DROP TABLE plans;
```

## เกณฑ์ว่าเสร็จ
- [ ] สร้างแผนจากหน้า issue (หลัง spec approved) ได้
- [ ] แก้ไขแผน draft ได้
- [ ] อนุมัติแผน → issue.status = in_progress
- [ ] บันทึก audit log
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ความเสี่ยงและ policy
ระดับ: กลาง (เพิ่มตารางใหม่ ไม่แก้ตารางเดิม)

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
