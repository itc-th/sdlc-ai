# #1 สร้างโครงโค้ดเริ่มต้น (project scaffolding)

- Issue: https://github.com/itc-th/sdlc-ai/issues/1
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-16
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-16)

## ปัญหาและที่มา
repo มีเฉพาะเอกสารและแบบฟอร์ม (ระยะ 0) ยังไม่มีโครงโค้ดของแอป ทีมไม่สามารถเริ่มพัฒนาฟีเจอร์ใด ๆ ได้จนกว่าจะมีโครงสร้างโปรเจคพื้นฐาน

## ทำไมต้องทำ
ถ้าไม่ทำ ทีมไม่มีจุดเริ่มต้นในการพัฒนา ไม่มีคำสั่ง build/test/lint ที่ใช้ร่วมกัน และไม่มีโครงสร้างที่สอดคล้องกับ `docs/repo-map.md` ทำให้งานในอนาคตต้องตั้งค่าเองแต่ละคน เสี่ยงต่อความไม่สอดคล้องกัน

## ผู้ใช้ที่เกี่ยวข้อง
- Programmer — ใช้โครงโค้ดเป็นฐานพัฒนาฟีเจอร์ (ทั้งทีม)
- SA — ใช้ `pnpm dev` ดูหน้าเว็บ placeholder
- Agent — ใช้คำสั่ง build/lint ตรวจสอบโค้ด

## ขอบเขต
- ทำ:
  - ตั้งค่า pnpm workspace monorepo
  - สร้างโปรเจค Next.js + TypeScript ใน `apps/web`
  - สร้างโครงสร้าง `packages/db`, `packages/github`, `packages/agents`
  - ตั้งค่า TypeScript, ESLint, Prettier ส่วนกลาง
  - เพิ่มคำสั่ง build, test, lint ใน `CLAUDE.md`
- ไม่ทำ:
  - ยังไม่สร้าง schema ฐานข้อมูลจริง
  - ยังไม่เชื่อมต่อ GitHub App จริง
  - ยังไม่สร้างหน้าจอหรือ API จริง
  - ยังไม่ตั้งค่า CI/CD

## เกณฑ์ว่าเสร็จ
- [ ] `pnpm install` สำเร็จจาก root
- [ ] `pnpm build` สำเร็จทุก package
- [ ] `pnpm lint` ผ่านทุก package
- [ ] `pnpm dev` เปิดหน้าเว็บ placeholder ได้
- [ ] คำสั่ง build/test/lint อัปเดตใน `CLAUDE.md`

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `apps/web`, `packages/db`, `packages/github`, `packages/agents`, root config
- ไม่แตะฐานข้อมูล, API ภายนอก หรือข้อมูลจริง

## ความเสี่ยง
- [ ] ข้อมูลส่วนบุคคล
- [ ] สิทธิ์ผู้ใช้ / การยืนยันตัวตน
- [ ] โครงสร้างฐานข้อมูล
- [ ] ข้อมูลงบประมาณ

ระดับ: ต่ำ
ผู้อนุมัติเพิ่มเติม: ไม่มี (ระดับต่ำ — SA อนุมัติ)

## ข้อจำกัด
- โครงสร้างต้องสอดคล้องกับ `docs/repo-map.md` และกฎการพึ่งพา
- ต้องไม่มี secret หรือ `.env` ค่าจริงใน repo

## คำถามที่ยังไม่มีคำตอบ
- ~~เลือก ORM ตัวไหนสำหรับ `packages/db`~~ → ใช้ Drizzle
- ~~ใช้ Tailwind CSS หรือ component library อื่น~~ → ใช้ Tailwind CSS
