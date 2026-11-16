# Spec: #5 ระบบ Authentication (GitHub OAuth + Google OAuth)

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: ba15fa0 (main หลัง merge #3)

## ระบบย่อย
- เป้าหมาย: `apps/web`, `packages/db`
- ได้รับผลกระทบ: `CLAUDE.md`
- กลุ่มผู้ใช้: ทุก role (SA, programmer, tech lead, helpdesk, admin)

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/db/src/schema/users.ts` — มีตาราง `users` (id uuid, name, email, role, avatar_url) และ `accounts` (provider enum github/google, provider_account_id, access_token, refresh_token)
- `packages/db/src/schema/enums.ts` — มี `userRoleEnum` (sa, programmer, tech_lead, helpdesk, admin) และ `oauthProviderEnum` (github, google)
- `apps/web` — Next.js 15 App Router + Tailwind CSS, ยังไม่มี auth
- Auth.js v5 (NextAuth) ต้องการตาราง `sessions` และ `verification_tokens` เพิ่มจากที่มีอยู่
- ตาราง `accounts` ที่มีอยู่ต้องเพิ่มฟิลด์ `type`, `token_type`, `expires_at`, `scope`, `id_token`, `session_state` เพื่อให้ Auth.js adapter ทำงานได้

## ข้อเสนอการออกแบบ

### 1. ปรับ schema — `packages/db`

#### เพิ่มฟิลด์ในตาราง `accounts`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| type | text NOT NULL | 'oauth' / 'oidc' (Auth.js ต้องการ) |
| token_type | text | |
| expires_at | integer | unix timestamp |
| scope | text | |
| id_token | text | สำหรับ Google OIDC |
| session_state | text | |

#### เพิ่มตาราง `sessions`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| session_token | text PK | |
| user_id | uuid FK → users | NOT NULL |
| expires | timestamp NOT NULL | |

#### เพิ่มตาราง `verification_tokens`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| identifier | text NOT NULL | |
| token | text NOT NULL | |
| expires | timestamp NOT NULL | |

PK(identifier, token)

#### ปรับ `accounts` PK
Auth.js adapter ต้องการ composite key (provider, provider_account_id) แทน uuid PK — จะเพิ่ม `provider` + `providerAccountId` เป็น compound primary key และเปลี่ยน id column ให้เป็น optional หรือลบออก

### 2. Auth.js config — `apps/web`

| ไฟล์ | หน้าที่ |
|---|---|
| `src/lib/auth.ts` | Auth.js config: providers (GitHub, Google), Drizzle adapter, callbacks |
| `src/lib/auth-adapter.ts` | Custom Drizzle adapter (ใช้ schema ที่มีอยู่) |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js API route handler |
| `src/middleware.ts` | ป้องกันหน้าที่ต้อง login (redirect ไป /login) |
| `src/app/login/page.tsx` | หน้า login — ปุ่ม "Login with GitHub" และ "Login with Google" |
| `src/app/layout.tsx` | แก้ — wrap SessionProvider |
| `src/app/page.tsx` | แก้ — แสดงข้อมูลผู้ใช้ (ชื่อ, avatar) และปุ่ม logout |
| `.env.example` | เพิ่มตัวอย่าง env variables (ไม่มีค่าจริง) |

### 3. Auth callbacks — กำหนด role อัตโนมัติ

ใน `signIn` callback:
- ถ้า account.provider === 'github' → กำหนด role = 'programmer'
- ถ้า account.provider === 'google' → กำหนด role = 'sa'
- ถ้า user มีอยู่แล้ว → ไม่เปลี่ยน role

ใน `session` callback:
- เพิ่ม user.id และ user.role เข้าไปใน session object

### 4. Middleware

- ป้องกันทุก route ยกเว้น `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`
- ถ้าไม่มี session → redirect ไป `/login`

### 5. Environment variables (ตัวอย่างใน `.env.example`)

```
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
DATABASE_URL=
```

### 6. Dependencies เพิ่ม

| Package | ใน | เหตุผล |
|---|---|---|
| `next-auth@beta` (Auth.js v5) | `apps/web` | Auth library สำหรับ Next.js |
| `@auth/drizzle-adapter` | `apps/web` | เชื่อม Auth.js กับ Drizzle schema |

## เกณฑ์ว่าเสร็จ
- [ ] Login ผ่าน GitHub OAuth ได้
- [ ] Login ผ่าน Google OAuth ได้
- [ ] สร้าง/อัปเดต user record ใน DB เมื่อ login สำเร็จ (role กำหนดอัตโนมัติตาม provider)
- [ ] Session management ทำงานถูกต้อง (login/logout)
- [ ] Middleware ป้องกันหน้าที่ต้อง login
- [ ] `.env.example` มีตัวอย่าง env ครบ (ไม่มีค่าจริง)
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## การทดสอบ
- `pnpm build` และ `pnpm lint` ผ่าน
- `drizzle-kit generate` สร้าง migration ที่มีตาราง sessions, verification_tokens และ alter accounts
- ทดสอบ login flow จริงต้องตั้ง OAuth apps ใน GitHub/Google และมี DATABASE_URL

## ความเสี่ยงและ policy
ระดับ: สูง
ผลตรวจตาม `docs/policies/review-checklist.md`:
- ระบบย่อยเป้าหมายและที่ได้รับผลกระทบ: `apps/web`, `packages/db`, `CLAUDE.md`
- เกณฑ์ว่าเสร็จตรวจสอบได้: ใช่
- ข้อเท็จจริงแยกจากข้อเสนอ: ใช่
- ข้อมูลส่วนบุคคล: เก็บ name, email, avatar จาก OAuth — เท่าที่จำเป็น
- สิทธิ์ผู้ใช้: ระบบ auth โดยตรง — ตรวจ session ที่ server ทุก request ผ่าน middleware
- โครงสร้างฐานข้อมูล: เพิ่ม 2 ตาราง (sessions, verification_tokens) และ alter accounts — แผนย้อนกลับคือ revert migration

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
