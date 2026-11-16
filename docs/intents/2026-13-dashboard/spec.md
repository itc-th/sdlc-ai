# Spec: #13 Dashboard รายงานภาพรวม

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: f925bae (main หลัง merge #11)

## ระบบย่อย
- เป้าหมาย: `apps/web`
- ได้รับผลกระทบ: ไม่มี
- กลุ่มผู้ใช้: ผู้บริหาร, SA

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/db/src/schema/issues.ts` — issues มี status (enum 9 ค่า), type (enum 3 ค่า), riskLevel (enum 3 ค่า)
- `apps/web/src/app/issues/page.tsx` — หน้ารายการ issue ใช้ server component ดึง DB โดยตรง
- `apps/web/src/components/nav.tsx` — nav bar มีลิงก์ Issues อยู่แล้ว ต้องเพิ่มลิงก์ Dashboard

## ข้อเสนอการออกแบบ

### 1. หน้า `/dashboard`
Server component ดึงข้อมูลจาก DB โดยตรง:
- `SELECT status, count(*) FROM issues GROUP BY status` — นับตาม status
- `SELECT type, count(*) FROM issues WHERE type IS NOT NULL GROUP BY type` — นับตาม type
- `SELECT risk_level, count(*) FROM issues WHERE risk_level IS NOT NULL GROUP BY risk_level` — นับตาม risk
- Query issue ที่ค้าง: status IN ('triage', 'in_progress') เรียงตาม createdAt ASC limit 10

แสดงผล:
- 3 กลุ่มการ์ด: สถานะ, ประเภท, ระดับความเสี่ยง — แต่ละการ์ดแสดงชื่อ + จำนวน
- ตารางรายการ issue ค้าง พร้อมลิงก์ไปหน้า issue detail

### 2. Nav bar
เพิ่มลิงก์ "Dashboard" ใน nav.tsx ก่อน Issues

### 3. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `apps/web/src/app/dashboard/page.tsx` | สร้างใหม่ |
| `apps/web/src/components/nav.tsx` | แก้ — เพิ่มลิงก์ Dashboard |

## เกณฑ์ว่าเสร็จ
- [ ] หน้า dashboard แสดงจำนวน issue แบ่งตาม status/type/risk ได้
- [ ] แสดงรายการ issue ค้าง (triage, in_progress) ได้
- [ ] มีลิงก์ใน nav bar
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ความเสี่ยงและ policy
ระดับ: ต่ำ
- ไม่แก้ schema, อ่านข้อมูลอย่างเดียว, ตรวจ session

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
