# SDLC-AI: กติกาสำหรับคนและ agent

อ่าน `docs/repo-map.md` ก่อนเริ่มงานทุกครั้ง

## เทคโนโลยี

- เว็บและ API: Next.js ด้วย TypeScript ใน `apps/web`
- ฐานข้อมูล: PostgreSQL โครงสร้างตารางและ migration อยู่ใน `packages/db`
- การเชื่อม GitHub (GitHub App, webhook): `packages/github`
- Agent ออกแบบและคำสั่งของ agent: `packages/agents`
- ภาษาในเอกสารและหน้าจอ: ไทย ชื่อในโค้ด: อังกฤษ

## คำสั่งที่ใช้บ่อย

```bash
pnpm install          # ติดตั้ง dependencies ทั้ง monorepo
pnpm build            # build ทุก package (turbo)
pnpm dev              # เปิด dev server ของ apps/web
pnpm lint             # lint ทุก package (turbo)
pnpm test             # test ทุก package (turbo)

# Database (packages/db)
pnpm --filter @sdlc-ai/db db:generate   # สร้าง migration จาก schema
pnpm --filter @sdlc-ai/db db:migrate    # รัน migration กับฐานข้อมูล
pnpm --filter @sdlc-ai/db db:seed      # สร้าง default project (ครั้งแรก)
```

## กระบวนการ (ห้ามข้ามขั้น)

1. ทุกงานเริ่มจาก GitHub issue
2. เขียน `docs/intents/<ปี>-<เลข issue>-<ชื่อสั้น>/intent.md` และให้คนอนุมัติ
3. เขียน `spec.md` ในโฟลเดอร์เดียวกัน และให้คนอนุมัติตามระดับความเสี่ยง
4. เสนอแผนการแก้โค้ด (`plan.md`) และรอให้ programmer อนุมัติก่อนเขียนโค้ด
5. เขียนโค้ดตาม plan → ทดสอบ → เปิด PR ที่อ้างเลข issue

## Skills สำหรับ agent

| คำสั่ง | หน้าที่ | ตัวอย่าง |
|--------|--------|---------|
| `/intent <เลข issue>` | ร่าง intent.md จาก GitHub issue | `/intent 26` |
| `/implement <เลข issue>` | เขียนโค้ดตาม plan → ทดสอบ → เปิด PR | `/implement 26` |

## Workflow สำหรับ dev (ใช้ AI agent)

```
/intent 26        # ร่าง intent → คนอนุมัติ
                  # ร่าง spec ผ่าน web app → คนอนุมัติ
                  # ร่าง plan ผ่าน web app → คนอนุมัติ
                  # กดปุ่ม "ส่งไป GitHub" ใน web app
/implement 26     # agent อ่าน plan → เขียนโค้ด → ทดสอบ → เปิด PR
                  # คน review PR → merge
```

## ก่อนเขียนโค้ด (บังคับ)

1. อ่าน `docs/repo-map.md` เพื่อเข้าใจโครงสร้าง
2. อ่าน `docs/intents/<folder>/plan.md` ทำตามนี้เป็นหลัก
3. อ่านไฟล์จริงที่ plan อ้างอิง ทุกไฟล์
4. ตรวจว่า framework มี feature อยู่แล้วก่อนเพิ่ม dependency
5. ถ้า plan ไม่ตรงกับโค้ดจริง → แจ้งผู้ใช้ก่อน ห้ามเปลี่ยนขอบเขตเอง

## ก่อน commit (บังคับ)

```bash
pnpm build   # ต้องผ่าน
pnpm lint    # ต้องผ่าน
pnpm test    # ต้องผ่าน (ถ้ามี)
```

## สิ่งที่ agent ห้ามทำ

- ห้ามอนุมัติ intent, spec, แผน หรือ PR
- ห้าม push เข้า `main` โดยตรง และห้าม merge PR
- ห้ามแก้ไฟล์ `.env*` หรือเขียน secret, token, รหัสผ่านลงในโค้ดและเอกสาร
- ห้ามแก้ migration ที่ merge แล้ว ให้สร้าง migration ใหม่
- ห้ามคัดลอกข้อมูลส่วนบุคคลจาก issue ลงไฟล์ใน repo
- ถ้าทำตาม spec ไม่ได้ ให้หยุดและรายงานในเรื่องนั้น ห้ามเปลี่ยนขอบเขตเอง

## ระดับความเสี่ยง

- สูง: แตะข้อมูลส่วนบุคคล สิทธิ์ผู้ใช้ หรือโครงสร้างฐานข้อมูล
- กลาง: แตะ `packages/github`, `packages/agents` หรือ API ที่ระบบอื่นเรียกใช้
- ต่ำ: อื่น ๆ
