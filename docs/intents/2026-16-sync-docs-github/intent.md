# #16 Sync intent/spec ไป GitHub repo

- Issue: https://github.com/itc-th/sdlc-ai/issues/16
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-17
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)

## ปัญหาและที่มา
เมื่ออนุมัติ intent/spec ผ่านเว็บแล้ว เนื้อหาอยู่ใน DB เท่านั้น ไม่มีไฟล์ .md ใน repo ทำให้ agent ที่ทำงานกับ codebase ไม่เห็น intent/spec ล่าสุด และไม่มี version history ใน git

## ทำไมต้องทำ
ตาม CLAUDE.md กระบวนการระบุว่า intent.md และ spec.md ต้องอยู่ใน `docs/intents/` ถ้าไม่ sync ไป repo เอกสารจะอยู่แค่ใน DB ขัดกับกระบวนการ

## ผู้ใช้ที่เกี่ยวข้อง
- SA — อนุมัติ intent/spec แล้วไฟล์ sync ไป repo อัตโนมัติ
- Agent — อ่าน intent/spec จาก repo

## ขอบเขต
- ทำ:
  - เมื่ออนุมัติ intent → commit intent.md ไป repo ผ่าน GitHub API
  - เมื่ออนุมัติ spec → commit spec.md ไป repo ผ่าน GitHub API
  - ใช้ GitHub App installation token (จาก packages/github)
  - อัปเดต filePath ในตาราง intents/specs
  - Graceful degradation ถ้า GitHub App ไม่ตั้งค่า
- ไม่ทำ:
  - ยังไม่ sync กลับ (อ่านจาก repo เข้า DB)
  - ยังไม่ทำ conflict resolution

## เกณฑ์ว่าเสร็จ
- [ ] อนุมัติ intent แล้วไฟล์ intent.md ปรากฏใน repo ได้
- [ ] อนุมัติ spec แล้วไฟล์ spec.md ปรากฏใน repo ได้
- [ ] filePath ในตาราง intents/specs อัปเดตหลัง commit
- [ ] ถ้าไม่ตั้ง GitHub App ระบบยังทำงานได้ (ไม่ sync)
- [ ] บันทึก audit log
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `apps/web`, `packages/github`
- ฐานข้อมูล: อ่าน/เขียนตาราง intents, specs, issues, projects, audit_logs

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล
- [ ] สิทธิ์ผู้ใช้ / การยืนยันตัวตน
- [ ] โครงสร้างฐานข้อมูล
- [ ] ข้อมูลงบประมาณ

ระดับ: กลาง (แตะ packages/github)
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy

## ข้อจำกัด
- ห้ามเขียน secret/token ลงไฟล์ที่ commit
- ต้องจัดการกรณี commit ล้มเหลว (graceful degradation)

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
