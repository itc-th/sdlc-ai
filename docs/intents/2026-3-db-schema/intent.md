# #3 สร้าง database schema หลัก

- Issue: https://github.com/itc-th/sdlc-ai/issues/3
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-16
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-16)

## ปัญหาและที่มา
ระบบยังไม่มีฐานข้อมูล ไม่สามารถเก็บข้อมูล issue, intent, spec หรือผู้ใช้ได้ ทุกฟีเจอร์ที่จะพัฒนาต่อ (หน้าจอรับเรื่อง, GitHub sync, authentication) ต้องมี schema พื้นฐานก่อน

## ทำไมต้องทำ
ถ้าไม่มี schema จะไม่สามารถพัฒนาฟีเจอร์ใด ๆ ที่เกี่ยวกับข้อมูลได้ เป็น dependency ของทุกงานถัดไป

## ผู้ใช้ที่เกี่ยวข้อง
- Programmer — ใช้ schema เป็นฐานพัฒนา API และหน้าจอ (ทั้งทีม)
- SA — ดูข้อมูล issue, intent, spec ผ่านหน้าเว็บ
- ผู้ดูแลระบบ — ดู audit log

## ขอบเขต
- ทำ:
  - สร้าง Drizzle schema สำหรับตาราง users, projects, issues, intents, specs, audit_logs
  - สร้าง migration แรก
  - เพิ่มคำสั่ง db ใน CLAUDE.md
- ไม่ทำ:
  - ยังไม่สร้าง API หรือหน้าจอ
  - ยังไม่เชื่อมต่อ GitHub sync
  - ยังไม่ทำระบบ authentication (ตาราง users เก็บข้อมูลพื้นฐานเท่านั้น)

## เกณฑ์ว่าเสร็จ
- [ ] Drizzle schema ครบทุกตาราง (users, projects, issues, intents, specs, audit_logs)
- [ ] `pnpm --filter @sdlc-ai/db db:generate` สร้าง migration สำเร็จ
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `packages/db` (schema และ migration)
- ฐานข้อมูล: PostgreSQL — สร้างตารางใหม่ทั้งหมด
- ไม่แตะระบบย่อยอื่น

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล — ตาราง users เก็บชื่อและ email
- [ ] สิทธิ์ผู้ใช้ / การยืนยันตัวตน — ตาราง users เก็บ role
- [x] โครงสร้างฐานข้อมูล — สร้างตารางใหม่ทั้งหมด
- [ ] ข้อมูลงบประมาณ

ระดับ: สูง
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy, tech lead

## ข้อจำกัด
- schema ต้องสอดคล้องกับกระบวนการใน `docs/process.md`
- ต้องไม่มี secret ใน migration files
- migration ที่ merge แล้วห้ามแก้ ต้องสร้างใหม่

## คำถามที่ยังไม่มีคำตอบ
- ~~ตาราง users เก็บฟิลด์อะไรบ้าง~~ → เชื่อมกับ GitHub account (programmer, tech lead) และ Google account (SA, helpdesk) ผ่าน OAuth
- ~~ต้องมีตาราง comments/approvals แยกหรือเก็บใน intent/spec~~ → แยก approvals เป็นตารางต่างหาก
