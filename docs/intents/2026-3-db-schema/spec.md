# Spec: #3 สร้าง database schema หลัก

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-16)
- วิเคราะห์จากโค้ดรุ่น: f1f00ef (main หลัง merge #1)

## ระบบย่อย
- เป้าหมาย: `packages/db`
- ได้รับผลกระทบ: `CLAUDE.md` (เพิ่มคำสั่ง db)
- กลุ่มผู้ใช้: Programmer, SA, ผู้ดูแลระบบ

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/db/src/schema/index.ts` — placeholder เปล่า (`export {}`)
- `packages/db/src/index.ts` — มี `createDb()` ที่ import จาก schema แล้ว
- `packages/db/drizzle.config.ts` — config พร้อมใช้ ชี้ไปที่ `./src/schema/index.ts`
- Drizzle ORM + postgres driver ติดตั้งแล้ว, drizzle-kit พร้อม generate migration

## ข้อเสนอการออกแบบ

### ER Diagram (ภาพรวม)

```
users ──< accounts
users ──< approvals
users ──< audit_logs
projects ──< issues
issues ──< intents
intents ──< specs
intents ──< approvals (target_type='intent')
specs ──< approvals (target_type='spec')
```

### ตาราง

#### 1. `users`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | default gen |
| name | text NOT NULL | ชื่อแสดงผล |
| email | text NOT NULL UNIQUE | |
| role | enum('sa','programmer','tech_lead','helpdesk','admin') NOT NULL | |
| avatar_url | text | |
| created_at | timestamp NOT NULL | default now |
| updated_at | timestamp NOT NULL | default now |

#### 2. `accounts` (OAuth providers)
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | NOT NULL |
| provider | enum('github','google') NOT NULL | |
| provider_account_id | text NOT NULL | ID จาก provider |
| access_token | text | encrypted ในอนาคต |
| refresh_token | text | encrypted ในอนาคต |
| created_at | timestamp NOT NULL | |

UNIQUE(provider, provider_account_id)

#### 3. `projects`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| github_owner | text NOT NULL | org/user ใน GitHub |
| github_repo | text NOT NULL | ชื่อ repo |
| created_at | timestamp NOT NULL | |
| updated_at | timestamp NOT NULL | |

UNIQUE(github_owner, github_repo)

#### 4. `issues`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | NOT NULL |
| github_issue_number | integer NOT NULL | เลข issue ใน GitHub |
| title | text NOT NULL | |
| body | text | |
| type | enum('feature','bug','data_fix') | |
| risk_level | enum('low','medium','high') | |
| status | enum('triage','intent_draft','intent_approved','spec_draft','spec_approved','in_progress','review','done','cancelled') NOT NULL | |
| reporter_github_login | text | ผู้เปิด issue |
| assignee_id | uuid FK → users | SA/programmer ที่รับผิดชอบ |
| created_at | timestamp NOT NULL | |
| updated_at | timestamp NOT NULL | |

UNIQUE(project_id, github_issue_number)

#### 5. `intents`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| issue_id | uuid FK → issues | NOT NULL |
| author_id | uuid FK → users | ผู้ร่าง |
| file_path | text NOT NULL | path ใน repo เช่น docs/intents/2026-3-db-schema/intent.md |
| status | enum('draft','approved','rejected') NOT NULL | default 'draft' |
| created_at | timestamp NOT NULL | |
| updated_at | timestamp NOT NULL | |

#### 6. `specs`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| intent_id | uuid FK → intents | NOT NULL |
| author_id | uuid FK → users | ผู้ร่าง |
| file_path | text NOT NULL | path ใน repo |
| commit_sha | text | โค้ดรุ่นที่วิเคราะห์ |
| status | enum('draft','approved','rejected') NOT NULL | default 'draft' |
| created_at | timestamp NOT NULL | |
| updated_at | timestamp NOT NULL | |

#### 7. `approvals`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| target_type | enum('intent','spec','plan','pr') NOT NULL | ประเภทสิ่งที่อนุมัติ |
| target_id | uuid NOT NULL | FK ไปยัง intents.id หรือ specs.id |
| approver_id | uuid FK → users | NOT NULL |
| decision | enum('approved','rejected','revision_requested') NOT NULL | |
| comment | text | หมายเหตุ |
| created_at | timestamp NOT NULL | |

#### 8. `audit_logs`
| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | NULL ถ้าเป็น system action |
| action | text NOT NULL | เช่น 'issue.created', 'intent.approved' |
| target_type | text | เช่น 'issue', 'intent', 'spec' |
| target_id | uuid | |
| metadata | jsonb | ข้อมูลเพิ่มเติม |
| created_at | timestamp NOT NULL | |

### ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `packages/db/src/schema/enums.ts` | สร้างใหม่ — pgEnum ทั้งหมด |
| `packages/db/src/schema/users.ts` | สร้างใหม่ — users + accounts |
| `packages/db/src/schema/projects.ts` | สร้างใหม่ — projects |
| `packages/db/src/schema/issues.ts` | สร้างใหม่ — issues |
| `packages/db/src/schema/intents.ts` | สร้างใหม่ — intents |
| `packages/db/src/schema/specs.ts` | สร้างใหม่ — specs |
| `packages/db/src/schema/approvals.ts` | สร้างใหม่ — approvals |
| `packages/db/src/schema/audit-logs.ts` | สร้างใหม่ — audit_logs |
| `packages/db/src/schema/index.ts` | แก้ — re-export ทุก schema |
| `CLAUDE.md` | แก้ — เพิ่มคำสั่ง db |

### กฎการพึ่งพา
- `packages/db` ไม่ import จาก package อื่น — ถูกต้องตาม repo-map

## เกณฑ์ว่าเสร็จ
- [ ] Drizzle schema ครบทุกตาราง (users, accounts, projects, issues, intents, specs, approvals, audit_logs)
- [ ] `pnpm --filter @sdlc-ai/db db:generate` สร้าง migration สำเร็จ
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package
- [ ] คำสั่ง db เพิ่มใน `CLAUDE.md`

## การทดสอบ
- `pnpm build` และ `pnpm lint` ผ่าน
- `drizzle-kit generate` สร้าง SQL migration ที่มีตารางครบ 8 ตาราง
- ยังไม่ทดสอบกับ database จริง (จะทำเมื่อตั้งค่า dev environment)

## ความเสี่ยงและ policy
ระดับ: สูง
ผลตรวจตาม `docs/policies/review-checklist.md`:
- ระบบย่อยเป้าหมายและที่ได้รับผลกระทบ: `packages/db`, `CLAUDE.md`
- เกณฑ์ว่าเสร็จตรวจสอบได้: ใช่
- ข้อเท็จจริงแยกจากข้อเสนอ: ใช่
- ข้อมูลส่วนบุคคล: ตาราง users เก็บ name, email — เก็บเท่าที่จำเป็นสำหรับแสดงผลและ login
- สิทธิ์ผู้ใช้: ตาราง users เก็บ role สำหรับแบ่งสิทธิ์
- โครงสร้างฐานข้อมูล: สร้างตารางใหม่ทั้งหมด — แผนย้อนกลับคือ drop ทุกตาราง (ยังไม่มีข้อมูลจริง)

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
