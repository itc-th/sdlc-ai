# #17 Agent ร่าง intent/spec

- Issue: https://github.com/itc-th/sdlc-ai/issues/17
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-17
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)

## ปัญหาและที่มา
การร่าง intent และ spec ต้องทำด้วยมือ เสียเวลาในการรวบรวมข้อมูลจาก issue, codebase, process.md แล้วเขียนตามรูปแบบที่กำหนด ระบบย่อย Agent (packages/agents) ตาม repo-map ยังเป็น placeholder

## ทำไมต้องทำ
ถ้ามี agent ช่วยร่าง จะลดเวลาจากเปิด issue ถึง intent อนุมัติ (ตัวชี้วัดใน process.md) และทำให้คุณภาพ intent/spec สม่ำเสมอตามรูปแบบ

## ผู้ใช้ที่เกี่ยวข้อง
- SA — กดปุ่มให้ agent ร่าง intent/spec แล้ว review/แก้ไข (~3-5 คน)

## ขอบเขต
- ทำ:
  - สร้าง agent service ใน packages/agents ที่เรียก Claude API
  - ปุ่ม "ให้ AI ร่าง" ในหน้าสร้าง intent — ส่ง issue title/body ให้ agent แล้วเติม content
  - ปุ่ม "ให้ AI ร่าง" ในหน้าสร้าง spec — ส่ง intent content + issue info ให้ agent แล้วเติม content
  - ผลลัพธ์เป็น draft เสมอ ต้องให้คนตรวจและอนุมัติ
- ไม่ทำ:
  - ยังไม่ทำ agent วิเคราะห์โค้ด (code analysis)
  - ยังไม่ทำ auto-generate plan
  - ยังไม่ทำ streaming response

## เกณฑ์ว่าเสร็จ
- [ ] กดปุ่ม "ให้ AI ร่าง" ในหน้าสร้าง intent แล้วได้ draft content
- [ ] กดปุ่ม "ให้ AI ร่าง" ในหน้าสร้าง spec แล้วได้ draft content
- [ ] ผลลัพธ์เป็น draft เสมอ (ไม่ auto-approve)
- [ ] Graceful degradation ถ้าไม่ตั้ง API key
- [ ] บันทึก audit log เมื่อใช้ agent
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `packages/agents`, `apps/web`
- ฐานข้อมูล: อ่านตาราง issues, intents (ไม่แก้ schema)
- API ภายนอก: Anthropic Claude API

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล
- [ ] สิทธิ์ผู้ใช้ / การยืนยันตัวตน
- [ ] โครงสร้างฐานข้อมูล
- [ ] ข้อมูลงบประมาณ — มีค่าใช้จ่าย API แต่ผลลัพธ์เป็น draft ต้องคนอนุมัติ

ระดับ: กลาง (แตะ packages/agents และ API ภายนอก)
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy

## ข้อจำกัด
- API key ต้องเก็บใน env variable เท่านั้น
- ห้ามส่งข้อมูลส่วนบุคคลไป API ภายนอก
- ผลลัพธ์จาก agent ต้องเป็น draft เสมอ ห้าม auto-approve

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
