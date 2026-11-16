# #9 GitHub App integration: webhook รับ issue และ sync สองทาง

- Issue: https://github.com/itc-th/sdlc-ai/issues/9
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-17
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)

## ปัญหาและที่มา
ระบบยังไม่เชื่อมต่อกับ GitHub ทำให้ issue ที่เปิดใน GitHub ไม่เข้ามาในระบบ และ issue ที่สร้างจากเว็บไม่ไปปรากฏใน GitHub ทีมต้อง maintain ข้อมูลสองที่แยกกัน ตามกระบวนการใน docs/process.md ขั้น 1 (รับเรื่อง) ระบุว่า issue มาจาก GitHub

## ทำไมต้องทำ
ถ้าไม่มี sync ทีมต้องสร้าง issue ซ้ำทั้งสองระบบ เสี่ยงข้อมูลไม่ตรงกัน และไม่สามารถใช้ SDLC-AI เป็นระบบหลักในการจัดการงานได้

## ผู้ใช้ที่เกี่ยวข้อง
- ใครก็ได้ — เปิด issue ใน GitHub (~ไม่จำกัด)
- Helpdesk — เห็น issue จาก GitHub ปรากฏในระบบอัตโนมัติ
- SA — triage issue ในเว็บแล้ว labels sync กลับ GitHub
- Programmer — เห็นสถานะตรงกันทั้งสองที่

## ขอบเขต
- ทำ:
  - สร้าง GitHub App client ใน packages/github (Octokit)
  - Webhook endpoint ใน apps/web รับ issues events พร้อม verify signature
  - Sync issue จาก GitHub → DB (สร้าง/อัปเดต)
  - Sync issue จาก DB → GitHub (สร้าง issue, อัปเดต labels)
  - Map labels ↔ type/risk_level/status
  - บันทึก audit log
- ไม่ทำ:
  - ยังไม่ sync PR events
  - ยังไม่ sync intent/spec files ไป GitHub (จะทำในงานถัดไป)
  - ยังไม่ทำ GitHub App installation flow ในเว็บ (ตั้งค่าผ่าน env)

## เกณฑ์ว่าเสร็จ
- [ ] Webhook endpoint รับ issues events ได้และ verify signature
- [ ] Issue ที่เปิดใน GitHub sync เข้า DB ได้ (สร้าง record ใหม่)
- [ ] Issue ที่แก้ไขใน GitHub sync อัปเดต DB ได้
- [ ] สร้าง issue ผ่านเว็บแล้ว sync ไปสร้างใน GitHub ได้
- [ ] Triage issue ผ่านเว็บแล้ว labels sync กลับ GitHub ได้
- [ ] บันทึก audit log ทุกการ sync
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `packages/github` (GitHub client), `apps/web` (webhook endpoint, แก้ issue API)
- ฐานข้อมูล: อ่าน/เขียนตาราง issues, projects, audit_logs
- API ภายนอก: GitHub REST API (Octokit)

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล
- [ ] สิทธิ์ผู้ใช้ / การยืนยันตัวตน — webhook ต้อง verify signature
- [ ] โครงสร้างฐานข้อมูล
- [ ] ข้อมูลงบประมาณ

ระดับ: กลาง (แตะ packages/github และ API ที่ระบบอื่นเรียกใช้)
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy

## ข้อจำกัด
- GitHub App credentials ต้องเก็บใน env variable เท่านั้น
- Webhook secret ต้อง verify ทุก request
- ต้องจัดการ race condition เมื่อ webhook มาพร้อมกับ user update

## คำถามที่ยังไม่มีคำตอบ
- ~~ใช้ GitHub App หรือ PAT~~ → ใช้ GitHub App (installation token + private key)
