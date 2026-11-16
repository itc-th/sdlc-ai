# #11 หน้าจอจัดการ intent และ spec

- Issue: https://github.com/itc-th/sdlc-ai/issues/11
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-17
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)

## ปัญหาและที่มา
ระบบมีหน้าจอจัดการ issue แล้ว (issue #7) แต่ขั้นตอน intent (ขั้น 3) และ spec (ขั้น 4) ตามกระบวนการใน docs/process.md ยังต้องทำผ่าน markdown files ใน repo โดยตรง ทำให้ SA ที่ไม่คุ้น git ใช้งานไม่สะดวก และไม่มีระบบอนุมัติผ่านเว็บ

## ทำไมต้องทำ
ถ้าไม่มีหน้าจอ ทีมต้องสร้าง/แก้ไข intent และ spec ผ่าน IDE หรือ command line ไม่สามารถอนุมัติ/ปฏิเสธผ่านเว็บได้ และสถานะ issue ต้องอัปเดตเอง ทำให้กระบวนการมีโอกาสผิดพลาด

## ผู้ใช้ที่เกี่ยวข้อง
- SA — สร้าง/แก้ไข intent, อนุมัติ intent/spec (~3-5 คน)
- Programmer — ดู intent/spec ที่เกี่ยวข้องกับ issue ที่ได้รับมอบหมาย
- Tech Lead — อนุมัติ spec ระดับความเสี่ยงสูง
- เจ้าของ policy — อนุมัติ spec ระดับกลาง-สูง

## ขอบเขต
- ทำ:
  - หน้าสร้าง/แก้ไข/ดู intent จากหน้ารายละเอียด issue
  - หน้าสร้าง/แก้ไข/ดู spec จากหน้ารายละเอียด intent
  - ระบบอนุมัติ/ปฏิเสธ intent และ spec พร้อม comment
  - อัปเดตสถานะ issue อัตโนมัติ (intent_draft → intent_approved → spec_draft → spec_approved)
  - เพิ่มคอลัมน์ content ในตาราง intents และ specs สำหรับเก็บเนื้อหา (แทนการอ้าง filePath อย่างเดียว)
  - บันทึก audit log ทุกการสร้าง/แก้ไข/อนุมัติ
- ไม่ทำ:
  - ยังไม่ sync intent/spec ไปเป็นไฟล์ใน GitHub repo
  - ยังไม่ทำ role-based access control ละเอียด (ทุก role เห็นทุก intent/spec)
  - ยังไม่ทำ markdown preview/editor (ใช้ textarea ธรรมดา)
  - ยังไม่ทำ diff/version history

## เกณฑ์ว่าเสร็จ
- [ ] สร้าง intent ใหม่จากหน้ารายละเอียด issue ได้
- [ ] แก้ไข intent ที่เป็น draft ได้
- [ ] อนุมัติ/ปฏิเสธ intent ได้ พร้อม comment
- [ ] สร้าง spec ใหม่จากหน้ารายละเอียด intent ได้
- [ ] แก้ไข spec ที่เป็น draft ได้
- [ ] อนุมัติ/ปฏิเสธ spec ได้ พร้อม comment
- [ ] สถานะ issue อัปเดตอัตโนมัติตามความคืบหน้า
- [ ] บันทึก audit log ทุกการสร้าง/แก้ไข/อนุมัติ
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `apps/web` (หน้าจอ, server actions), `packages/db` (เพิ่ม content column)
- ฐานข้อมูล: อ่าน/เขียนตาราง intents, specs, approvals, issues, audit_logs
- ต้องสร้าง migration ใหม่สำหรับเพิ่ม content column

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล
- [x] สิทธิ์ผู้ใช้ / การยืนยันตัวตน — ตรวจ session ทุก API
- [x] โครงสร้างฐานข้อมูล — เพิ่ม content column ในตาราง intents และ specs
- [ ] ข้อมูลงบประมาณ

ระดับ: สูง (แตะโครงสร้างฐานข้อมูลและสิทธิ์ผู้ใช้)
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy, tech lead

## ข้อจำกัด
- ต้องตรวจและจำกัดข้อมูลนำเข้าทุกจุด (validation)
- การอนุมัติต้องบันทึกใน audit log
- ผู้อนุมัติไม่ควรเป็นผู้เขียน intent/spec เดียวกัน (แต่ยังไม่บังคับในรุ่นนี้)

## คำถามที่ยังไม่มีคำตอบ
- ~~เพิ่ม content column ในตาราง intents/specs หรือใช้ filePath อ้างอิงไฟล์อย่างเดียว?~~ → เพิ่ม content column (text, nullable)
