# Spec: #14 Role-based access control

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: f925bae (main หลัง merge #11)

## ระบบย่อย
- เป้าหมาย: `apps/web`
- ได้รับผลกระทบ: ไม่มี (ไม่แก้ schema)
- กลุ่มผู้ใช้: ทุก role

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/db/src/schema/enums.ts` — userRoleEnum: ['sa', 'programmer', 'tech_lead', 'helpdesk', 'admin']
- `apps/web/src/lib/auth.ts` — session callback เพิ่ม role ใน session.user แล้ว: `(session.user as ...).role = dbUser[0].role`
- `apps/web/src/components/nav.tsx` — แสดง role badge อยู่แล้ว
- Server actions ทุกหน้าตรวจ `session?.user?.id` แต่ยังไม่ตรวจ role
- หน้า triage, review intent/spec, สร้าง intent/spec — ทุกคนที่ login ทำได้หมด

## ข้อเสนอการออกแบบ

### 1. Role helper

สร้าง `apps/web/src/lib/roles.ts`:

```typescript
type Role = 'sa' | 'programmer' | 'tech_lead' | 'helpdesk' | 'admin';

const PERMISSIONS: Record<string, Role[]> = {
  'issue.create':       ['helpdesk', 'sa', 'admin'],
  'issue.triage':       ['sa', 'admin'],
  'intent.create':      ['sa', 'admin'],
  'intent.update':      ['sa', 'admin'],
  'intent.review':      ['sa', 'tech_lead', 'admin'],
  'spec.create':        ['sa', 'admin'],
  'spec.update':        ['sa', 'admin'],
  'spec.review':        ['sa', 'tech_lead', 'admin'],
  'plan.create':        ['programmer', 'tech_lead', 'admin'],
  'plan.review':        ['programmer', 'tech_lead', 'admin'],
};

export function hasPermission(role: string | undefined, action: string): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role as Role);
}
```

ทุก role สามารถดู (read) ทุกอย่างได้ — จำกัดเฉพาะ write actions

### 2. ตรวจสิทธิ์ใน server actions

เพิ่มการตรวจ role ทุก server action ที่เป็น write:
- Triage form → ต้อง `issue.triage`
- สร้าง/แก้ intent → ต้อง `intent.create` / `intent.update`
- Review intent → ต้อง `intent.review`
- สร้าง/แก้ spec → ต้อง `spec.create` / `spec.update`
- Review spec → ต้อง `spec.review`

ถ้าไม่มีสิทธิ์ → throw Error('ไม่มีสิทธิ์') หรือ redirect

### 3. ซ่อน UI ตาม role

แต่ละหน้าตรวจ role จาก session แล้วซ่อน/แสดง:
- ปุ่ม "สร้างเรื่องใหม่" — แสดงเฉพาะ helpdesk, sa, admin
- Section "คัดแยก" — แสดงเฉพาะ sa, admin
- ปุ่ม "สร้าง Intent/Spec" — แสดงเฉพาะ sa, admin
- ปุ่มอนุมัติ/ปฏิเสธ — แสดงเฉพาะ sa, tech_lead, admin
- programmer เห็นทุกอย่างแบบ read-only

### 4. Auth session type

ต้อง cast session.user ให้มี role เพื่อใช้ตรวจ:
```typescript
const user = session.user as { id: string; role?: string };
```

### 5. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `apps/web/src/lib/roles.ts` | สร้างใหม่ — permission map + hasPermission |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ — ซ่อน triage, ตรวจ role ใน action |
| `apps/web/src/app/issues/new/page.tsx` | แก้ — ตรวจ role ก่อนแสดงหน้า |
| `apps/web/src/app/issues/page.tsx` | แก้ — ซ่อนปุ่มสร้าง issue ตาม role |
| `apps/web/src/app/issues/[id]/intent/new/page.tsx` | แก้ — ตรวจ role |
| `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` | แก้ — ซ่อนแก้ไข/review ตาม role |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/new/page.tsx` | แก้ — ตรวจ role |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` | แก้ — ซ่อนแก้ไข/review ตาม role |
| `apps/web/src/app/api/issues/route.ts` | แก้ — ตรวจ role ใน POST |
| `apps/web/src/app/api/issues/[id]/route.ts` | แก้ — ตรวจ role ใน PATCH |

## แผนย้อนกลับ
ไม่แก้ schema — revert PR ได้เลย

## เกณฑ์ว่าเสร็จ
- [ ] Helpdesk สร้าง issue ได้ แต่ triage ไม่ได้
- [ ] SA triage และอนุมัติ intent/spec ได้
- [ ] Programmer ดูได้ทุกอย่างแบบ read-only
- [ ] ซ่อนปุ่มที่ไม่มีสิทธิ์
- [ ] Server action ตรวจ role ทุกจุด
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ความเสี่ยงและ policy
ระดับ: สูง (เปลี่ยนสิทธิ์ทั้งระบบ)
- สิทธิ์ตรวจทั้ง server (action/API) และซ่อน UI
- ไม่ล็อก user ที่มี role อยู่แล้ว

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
