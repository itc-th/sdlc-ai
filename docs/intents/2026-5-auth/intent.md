# #5 ระบบ Authentication (GitHub OAuth + Google OAuth)

- Issue: https://github.com/itc-th/sdlc-ai/issues/5
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-17
- สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)

## ปัญหาและที่มา
ระบบยังไม่มีการ login ผู้ใช้ไม่สามารถเข้าถึงหน้าจอจัดการงานได้ ทุกฟีเจอร์ที่เกี่ยวกับสิทธิ์ผู้ใช้ (ดู issue, อนุมัติ intent/spec, มอบหมายงาน) ต้องมี authentication ก่อน

## ทำไมต้องทำ
ถ้าไม่มี authentication จะไม่สามารถระบุตัวตนผู้ใช้ได้ ไม่สามารถแบ่งสิทธิ์ตาม role (SA, programmer, tech lead, helpdesk) และไม่สามารถบันทึก audit log ว่าใครทำอะไร

## ผู้ใช้ที่เกี่ยวข้อง
- Programmer, Tech Lead — login ด้วย GitHub account
- SA, Helpdesk — login ด้วย Google account
- ทุก role — ใช้ session เพื่อเข้าถึงหน้าจอ

## ขอบเขต
- ทำ:
  - ติดตั้ง Auth.js (NextAuth v5) ใน apps/web
  - ตั้งค่า GitHub OAuth provider และ Google OAuth provider
  - เชื่อม Auth.js กับตาราง users/accounts ผ่าน Drizzle adapter
  - สร้างหน้า login
  - สร้าง middleware ป้องกันหน้าที่ต้อง login
  - แสดงข้อมูลผู้ใช้ (ชื่อ, avatar) และปุ่ม logout
- ไม่ทำ:
  - ยังไม่ทำระบบ role-based access control (RBAC) ละเอียด
  - ยังไม่ทำหน้า admin จัดการ users
  - ยังไม่เข้ารหัส access_token/refresh_token ใน DB (จะทำเมื่อต่อ GitHub App จริง)

## เกณฑ์ว่าเสร็จ
- [ ] Login ผ่าน GitHub OAuth ได้
- [ ] Login ผ่าน Google OAuth ได้
- [ ] สร้าง/อัปเดต user record ใน DB เมื่อ login สำเร็จ
- [ ] Session management ทำงานถูกต้อง (login/logout)
- [ ] Middleware ป้องกันหน้าที่ต้อง login
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## ระบบและข้อมูลที่แตะ
- โฟลเดอร์: `apps/web` (Auth.js config, หน้า login, middleware), `packages/db` (อาจปรับ schema เล็กน้อยให้ compatible กับ Auth.js adapter)
- ฐานข้อมูล: ตาราง users, accounts — อ่านเขียนผ่าน Auth.js adapter
- API ภายนอก: GitHub OAuth, Google OAuth

## ความเสี่ยง
- [x] ข้อมูลส่วนบุคคล — เก็บ name, email, avatar จาก OAuth
- [x] สิทธิ์ผู้ใช้ / การยืนยันตัวตน — เป็นระบบ auth โดยตรง
- [ ] โครงสร้างฐานข้อมูล — อาจปรับ schema เล็กน้อย
- [ ] ข้อมูลงบประมาณ

ระดับ: สูง
ผู้อนุมัติเพิ่มเติม: SA, เจ้าของ policy, tech lead

## ข้อจำกัด
- ต้องไม่เก็บ OAuth client secret ใน repo (ใช้ env variable)
- ต้องตรวจสอบ session ที่ฝั่ง server ทุก API
- ต้องใช้ HTTPS ใน production

## คำถามที่ยังไม่มีคำตอบ
- ~~Auth.js adapter ต้องปรับ schema~~ → เพิ่มตาราง sessions และ verification_tokens
- ~~กำหนด role อัตโนมัติตาม provider~~ → ใช่ GitHub → programmer, Google → sa (admin แก้ทีหลังได้)
