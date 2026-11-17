# แผนที่ repo

ไฟล์นี้เป็นแหล่งความรู้เดียวที่ agent ทุกตัวใช้ระบุว่างานอยู่ระบบย่อยใด ต้องอัปเดตใน PR เดียวกับที่เปลี่ยนโครงสร้าง

## ระบบย่อย

| ระบบย่อย | โฟลเดอร์ | หน้าที่ | ผู้ใช้ | พึ่งพา |
|---|---|---|---|---|
| เว็บและ API | `apps/web` | หน้าจอรับเรื่อง คัดแยก ออกแบบ อนุมัติ รายงาน และ API | Helpdesk, SA, Programmer, Tech Lead, Admin | db, github, agents |
| ฐานข้อมูล | `packages/db` | โครงสร้างตาราง migration และการเข้าถึงข้อมูล | ระบบย่อยอื่น | ไม่มี |
| เชื่อม GitHub | `packages/github` | GitHub App, สร้าง issue, sync labels, commit ไฟล์ที่อนุมัติ, รับ webhook | ระบบย่อยอื่น | ไม่มี |
| Agent | `packages/agents` | ร่าง intent/spec ด้วย AI (Claude API) | SA ผ่านหน้าเว็บ | ไม่มี |
| เอกสาร | `docs` | intent, spec, policy, แนวทางหน้าจอ | ทุกคนและ agent | ไม่มี |

## โครงสร้างไฟล์หลัก

### apps/web

```
src/
├── app/
│   ├── dashboard/page.tsx          # สถิติ issue (จำนวนตามสถานะ/ประเภท/ความเสี่ยง)
│   ├── issues/
│   │   ├── page.tsx                # รายการ issue + filter
│   │   ├── new/page.tsx            # สร้าง issue
│   │   └── [id]/
│   │       ├── page.tsx            # รายละเอียด issue + triage + intent/plan sections
│   │       ├── intent/
│   │       │   ├── new/page.tsx    # สร้าง intent (+ ปุ่ม AI ร่าง)
│   │       │   └── [intentId]/
│   │       │       ├── page.tsx    # ดู/แก้/อนุมัติ intent + sync to GitHub
│   │       │       └── spec/
│   │       │           ├── new/page.tsx      # สร้าง spec (+ ปุ่ม AI ร่าง)
│   │       │           └── [specId]/page.tsx  # ดู/แก้/อนุมัติ spec + sync to GitHub
│   │       └── plan/
│   │           ├── new/page.tsx    # สร้าง plan (ต้อง spec approved)
│   │           └── [planId]/page.tsx  # ดู/แก้/อนุมัติ plan
│   ├── login/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # Auth.js (GitHub + Google OAuth)
│       ├── issues/
│       │   ├── route.ts            # GET (list) / POST (create) issues
│       │   └── [id]/route.ts       # GET / PATCH issue
│       ├── ai/
│       │   ├── draft-intent/route.ts  # POST — AI ร่าง intent
│       │   └── draft-spec/route.ts    # POST — AI ร่าง spec
│       └── webhooks/github/route.ts   # GitHub webhook receiver
├── components/
│   ├── nav.tsx                     # Navigation bar
│   └── ai-draft-button.tsx         # Client component ปุ่ม "ให้ AI ร่าง"
├── lib/
│   ├── auth.ts / auth.config.ts    # Auth.js v5 config
│   ├── db.ts                       # Drizzle client singleton
│   ├── github.ts                   # GitHub App singleton (nullable)
│   ├── github-sync.ts              # Sync helpers (issue→GitHub, intent/spec→repo)
│   └── roles.ts                    # RBAC permission map
└── middleware.ts                   # Auth middleware
```

### packages/db

```
src/schema/
├── users.ts        # ผู้ใช้ (role: sa/programmer/tech_lead/helpdesk/admin)
├── projects.ts     # โปรเจกต์ (githubOwner, githubRepo)
├── issues.ts       # เรื่อง (status: triage→intent_draft→...→done)
├── intents.ts      # Intent document (content, filePath, commitSha)
├── specs.ts        # Spec document (content, filePath, commitSha)
├── plans.ts        # Plan document (content, status)
├── approvals.ts    # การอนุมัติ (targetType: intent/spec/plan)
├── audit-logs.ts   # บันทึกการกระทำ
└── enums.ts        # Shared enums (documentStatusEnum, etc.)
drizzle/            # Migration files (0000–0003)
```

### packages/github

```
src/
├── client.ts       # createGitHubApp() factory
├── installation.ts # getInstallationOctokit()
├── issues.ts       # createGitHubIssue(), updateGitHubIssueLabels()
├── labels.ts       # label ↔ DB enum mapping
├── files.ts        # commitFileToRepo() — commit ไฟล์ไป repo
└── webhook.ts      # verifyWebhookSignature() (HMAC SHA-256)
```

### packages/agents

```
src/
├── draft-intent.ts  # draftIntent() — ร่าง intent ด้วย Claude API
└── draft-spec.ts    # draftSpec() — ร่าง spec ด้วย Claude API
```

## RBAC (Role-Based Access Control)

| สิทธิ์ | helpdesk | programmer | tech_lead | sa | admin |
|---|---|---|---|---|---|
| issue.create | ✓ | | | ✓ | ✓ |
| issue.triage | | | | ✓ | ✓ |
| intent.create/update | | | | ✓ | ✓ |
| intent.review | | | ✓ | ✓ | ✓ |
| spec.create/update | | | | ✓ | ✓ |
| spec.review | | | ✓ | ✓ | ✓ |
| plan.create/update/review | | ✓ | ✓ | ✓ | ✓ |

## Issue Status Flow

```
triage → intent_draft → intent_approved → spec_draft → spec_approved → in_progress → review → done
                                                                                            → cancelled
```

## Environment Variables (apps/web/.env)

| ตัวแปร | จำเป็น | หน้าที่ |
|---|---|---|
| AUTH_SECRET | ✓ | Auth.js session encryption |
| AUTH_GITHUB_ID/SECRET | ✓ | GitHub OAuth |
| AUTH_GOOGLE_ID/SECRET | | Google OAuth (optional) |
| DATABASE_URL | ✓ | PostgreSQL connection |
| GITHUB_APP_ID/PRIVATE_KEY/WEBHOOK_SECRET | | GitHub App integration (optional) |
| ANTHROPIC_API_KEY | | AI draft ปุ่ม "ให้ AI ร่าง" (optional) |

## กฎการพึ่งพา

- `packages/db` ไม่เรียกระบบย่อยอื่น
- `packages/github` ไม่เรียกระบบย่อยอื่น
- `packages/agents` ไม่เรียกระบบย่อยอื่น
- `packages/*` ไม่เรียก `apps/web`
- งานที่แตะมากกว่าหนึ่งระบบย่อยต้องระบุทุกตัวใน spec
