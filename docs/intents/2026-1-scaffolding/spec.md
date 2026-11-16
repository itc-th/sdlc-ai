# Spec: #1 สร้างโครงโค้ดเริ่มต้น (project scaffolding)

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-16)
- วิเคราะห์จากโค้ดรุ่น: 03b6a3a (initial commit)

## ระบบย่อย
- เป้าหมาย: ทุกระบบย่อย (`apps/web`, `packages/db`, `packages/github`, `packages/agents`)
- ได้รับผลกระทบ: root config, `CLAUDE.md`, `docs/repo-map.md`
- กลุ่มผู้ใช้: Programmer, SA, Agent

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- root ไม่มี `package.json` หรือ workspace config
- `apps/web/` มีเฉพาะ `README.md`
- `packages/db/`, `packages/github/`, `packages/agents/` มีเฉพาะ `README.md`
- `.gitignore` มีอยู่แล้ว
- `CLAUDE.md` ระบุว่าคำสั่ง build, test, lint จะเพิ่มเมื่อสร้างโครงโค้ด

## ข้อเสนอการออกแบบ

### 1. Root — pnpm workspace monorepo

| ไฟล์ | หน้าที่ |
|---|---|
| `package.json` | workspace scripts: `build`, `dev`, `lint`, `test` |
| `pnpm-workspace.yaml` | ระบุ `apps/*` และ `packages/*` |
| `tsconfig.base.json` | TypeScript config กลาง (strict, ES2022, paths) |
| `.eslintrc.json` | ESLint config กลาง |
| `.prettierrc` | Prettier config |

Scripts ที่ root:
```
pnpm build    → turbo build (หรือ pnpm -r build)
pnpm dev      → turbo dev --filter=web
pnpm lint     → turbo lint
pnpm test     → turbo test
```

### 2. `apps/web` — Next.js 15 + TypeScript + Tailwind CSS

| ไฟล์/โฟลเดอร์ | หน้าที่ |
|---|---|
| `package.json` | dependencies: next, react, react-dom, tailwindcss |
| `tsconfig.json` | extends `tsconfig.base.json` |
| `next.config.ts` | Next.js config (transpilePackages สำหรับ packages/*) |
| `tailwind.config.ts` | Tailwind config |
| `postcss.config.mjs` | PostCSS + Tailwind |
| `src/app/layout.tsx` | Root layout พร้อม Tailwind globals |
| `src/app/page.tsx` | หน้า placeholder แสดงชื่อโปรเจค |
| `src/app/globals.css` | Tailwind directives |

### 3. `packages/db` — Drizzle ORM

| ไฟล์ | หน้าที่ |
|---|---|
| `package.json` | dependencies: drizzle-orm, drizzle-kit, postgres (pg driver) |
| `tsconfig.json` | extends `tsconfig.base.json` |
| `src/index.ts` | export connection helper (อ่าน `DATABASE_URL` จาก env) |
| `src/schema/index.ts` | placeholder — export empty schema |
| `drizzle.config.ts` | Drizzle Kit config สำหรับ migration |

### 4. `packages/github` — GitHub App client

| ไฟล์ | หน้าที่ |
|---|---|
| `package.json` | dependencies: octokit |
| `tsconfig.json` | extends `tsconfig.base.json` |
| `src/index.ts` | placeholder export |

### 5. `packages/agents` — Agent commands

| ไฟล์ | หน้าที่ |
|---|---|
| `package.json` | ไม่มี dependency ภายนอกเพิ่ม |
| `tsconfig.json` | extends `tsconfig.base.json` |
| `src/index.ts` | placeholder export |

### 6. กฎการพึ่งพา (ตาม repo-map)
- `packages/db` — ไม่ import จาก package อื่น
- `packages/github` — import ได้จาก `packages/db` เท่านั้น
- `packages/agents` — import ได้จาก `packages/db` และ `packages/github`
- `apps/web` — import ได้จากทุก package

### 7. อัปเดตเอกสาร
- `CLAUDE.md`: เพิ่มคำสั่ง `pnpm install`, `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm test`
- `docs/repo-map.md`: ไม่ต้องแก้ (โครงสร้างตรงตามแผนที่เดิม)

## เกณฑ์ว่าเสร็จ
- [ ] `pnpm install` สำเร็จจาก root
- [ ] `pnpm build` สำเร็จทุก package
- [ ] `pnpm lint` ผ่านทุก package
- [ ] `pnpm dev` เปิดหน้าเว็บ placeholder ได้ที่ localhost:3000
- [ ] `packages/db` ไม่ import จาก package อื่น
- [ ] คำสั่ง build/test/lint อัปเดตใน `CLAUDE.md`

## การทดสอบ
- รัน `pnpm build` และ `pnpm lint` จาก root ต้องผ่าน
- เปิด `pnpm dev` แล้วเข้า http://localhost:3000 ต้องแสดงหน้า placeholder
- ยังไม่มี unit test เพราะยังไม่มี logic (จะเพิ่มเมื่อมีฟีเจอร์จริง)

## ความเสี่ยงและ policy
ระดับ: ต่ำ
ผลตรวจตาม `docs/policies/review-checklist.md`:
- ระบบย่อยเป้าหมายและที่ได้รับผลกระทบ: ครบ (ทุกระบบย่อย + root config)
- เกณฑ์ว่าเสร็จตรวจสอบได้: ใช่
- ข้อเท็จจริงแยกจากข้อเสนอ: ใช่
- ข้อมูลส่วนบุคคล: ไม่เกี่ยว
- สิทธิ์ผู้ใช้: ไม่เกี่ยว
- โครงสร้างฐานข้อมูล: ไม่เปลี่ยน (placeholder เปล่า)

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
