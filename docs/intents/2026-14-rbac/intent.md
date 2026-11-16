# #14 Role-based access control

- Issue: https://github.com/itc-th/sdlc-ai/issues/14
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-17
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)

## ปัญหาและที่มา
ระบบมี role ในตาราง users (sa, programmer, tech_lead, helpdesk, admin) แต่ยังไม่บังคับสิทธิ์ตาม role — ทุกคนที่ login ได้สามารถทำได้ทุกอย่าง ทำให้ helpdesk สามารถอนุมัติ spec หรือ programmer สามารถ triage issue ได้

## ทำไมต้องทำ
ตามกระบวนการใน process.md แต่ละขั้นมีผู้รับผิดชอบต่างกัน ถ้าไม่บังคับสิทธิ์ กระบวนการจะไม่มีความน่าเชื่อถือ

## ผู้ใช้ที่เกี่ยวข้อง
- Helpdesk — สร้าง issue เท่านั้น
- SA — triage, สร้าง/อนุมัติ intent/spec
- Programmer — ดู issue/intent/spec ที่ได้รับมอบหมาย, เสนอแผน
- Tech Lead — อนุมัติ spec ระดับสูง
- Admin — จัดการ user/role

## ขอบเขต
- ทำ:
  - Middleware หรือ helper ตรวจ role ก่อนทำ action
  - Helpdesk: สร้าง issue, ดู issue
  - SA: ทุกอย่างของ helpdesk + triage, สร้าง/แก้ intent/spec, อนุมัติ intent/spec
  - Programmer: ดู issue/intent/spec, เสนอแผน (เมื่อมีหน้า plan)
  - Tech Lead: ทุกอย่างของ programmer + อนุมัติ spec ระดับสูง
  - Admin: จัดการ role ของ user
  - แสดง error message เมื่อไม่มีสิทธิ์
- ไม่ทำ:
  - ยังไม่ทำหน้าจัดการ user/role (admin ใช้ DB โดยตรง)
  - ยังไม่ทำ permission granular ระดับ field

## เกณฑ์ว่าเสร็จ
- [ ] Helpdesk สร้าง issue ได้ แต่ triage ไม่ได้
- [ ] SA triage และอนุมัติ intent/spec ได้
- [ ] Programmer ดู issue/intent/spec ได้ แต่ triage/อนุมัติไม่ได้
- [ ] แสดง error หรือซ่อนปุ่มเมื่อไม่มีสิทธิ์
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `apps/web`
- ฐานข้อมูล: อ่านตาราง users (ไม่แก้ schema)

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล
- [x] สิทธิ์ผู้ใช้ / การยืนยันตัวตน — เปลี่ยนแปลงสิทธิ์ทั้งระบบ
- [ ] โครงสร้างฐานข้อมูล
- [ ] ข้อมูลงบประมาณ

ระดับ: สูง (แตะสิทธิ์ผู้ใช้ทั้งระบบ)
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy, tech lead

## ข้อจำกัด
- ต้องตรวจสิทธิ์ทั้งฝั่ง server (server action/API) และซ่อน UI ฝั่ง client
- ต้องไม่ล็อก user ที่มี role อยู่แล้วออกจากระบบ

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
