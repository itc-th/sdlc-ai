# #29 Release management: หน้าจอ deploy แบบขั้นตอนเดียว

- Issue: https://github.com/itc-th/sdlc-ai/issues/29
- ผู้ร่าง: Claude (agent)  วันที่: 2026-11-19
- สถานะ: ร่าง  ผู้อนุมัติ: -

## ปัญหาและที่มา

ระบบปัจจุบันไม่มีหน้าจอสำหรับ deploy และปิด issue ต้องทำด้วยมือทุกขั้นตอน (deploy Vercel, สร้าง Git tag, ปิด GitHub issue, เปลี่ยนสถานะ) เสี่ยงลืมขั้นตอนและติดตามสถานะไม่ได้

## ทำไมต้องทำ

ถ้าไม่ทำ ทีมต้อง deploy และปิด issue ด้วยมือทุกครั้ง เสี่ยงลืมสร้าง tag หรือลืมปิด issue การรวมทุกขั้นตอนไว้ในปุ่มเดียวลดความผิดพลาดและประหยัดเวลา

## ผู้ใช้ที่เกี่ยวข้อง

- SA, Tech Lead, Admin — กดปุ่ม deploy
- Programmer — ดูสถานะ release (read-only)

## ขอบเขต

- ทำ:
  - สร้างหน้า `/releases` แสดง issue ที่สถานะ `review` (พร้อม deploy)
  - ปุ่ม deploy ขั้นตอนเดียว: trigger Vercel Deploy Hook → สร้าง Git tag (`release-<issue number>-<ชื่อสั้น>`) → ปิด GitHub issue พร้อม comment → เปลี่ยนสถานะเป็น `done`
  - เพิ่ม permission `release.deploy` (SA, Tech Lead, Admin)
  - เพิ่มเมนู Releases ใน sidebar
  - เพิ่มฟังก์ชัน `closeGitHubIssue()` และ `createGitTag()` ใน `packages/github`
- ไม่ทำ:
  - ขั้นตอน UAT แยก (deploy ตรงจาก `review` → `done`)
  - Rollback mechanism
  - Release notes อัตโนมัติ
  - Batch deploy หลาย issue พร้อมกัน

## เกณฑ์ว่าเสร็จ

- [ ] หน้า `/releases` แสดง issue ที่สถานะ `review`
- [ ] กดปุ่ม deploy → trigger Vercel Deploy Hook สำเร็จ
- [ ] deploy สร้าง Git tag `release-<issue number>-<ชื่อสั้น>` อัตโนมัติ
- [ ] deploy ปิด GitHub issue พร้อม comment อัตโนมัติ
- [ ] deploy เปลี่ยนสถานะ issue เป็น `done`
- [ ] ผู้ใช้ที่ไม่มีสิทธิ์ `release.deploy` ไม่เห็นปุ่ม deploy
- [ ] `pnpm build && pnpm lint` ผ่าน

## ระบบและข้อมูลที่แตะ

| ระบบย่อย | โฟลเดอร์/ไฟล์ | รายละเอียด |
|---|---|---|
| เชื่อม GitHub | `packages/github/src/issues.ts` | เพิ่ม `closeGitHubIssue()`, `createGitTag()` |
| เชื่อม GitHub | `packages/github/src/index.ts` | export ฟังก์ชันใหม่ |
| เว็บ | `apps/web/src/app/releases/page.tsx` | หน้าจอ release ใหม่ |
| เว็บ | `apps/web/src/lib/roles.ts` | เพิ่ม permission `release.deploy` |
| เว็บ | `apps/web/src/components/sidebar.tsx` | เพิ่มเมนู Releases |
| เว็บ | `apps/web/src/app/issues/page.tsx` | อัปเดตป้ายสถานะ `review` → "รอ Deploy" |
| เว็บ | `apps/web/src/app/issues/[id]/page.tsx` | อัปเดตป้ายสถานะ `review` → "รอ Deploy" |
| Environment | `VERCEL_DEPLOY_HOOK_URL` | env var สำหรับ Deploy Hook URL |

## ความเสี่ยง

- [x] สิทธิ์ผู้ใช้ / การยืนยันตัวตน
- [ ] โครงสร้างฐานข้อมูล
- [ ] ข้อมูลส่วนบุคคล
- [ ] ข้อมูลงบประมาณ

ระดับ: กลาง (แตะ packages/github API และ permission แต่ไม่แก้ DB schema)
ผู้อนุมัติเพิ่มเติม: Tech Lead หรือ Admin

## ข้อจำกัด

- ต้องตั้ง Vercel Deploy Hook ใน project settings และใส่ URL ใน env var `VERCEL_DEPLOY_HOOK_URL`
- Git tag format: `release-<issue number>-<ชื่อสั้น>`

## คำถามที่ยังไม่มีคำตอบ

- ไม่มี
