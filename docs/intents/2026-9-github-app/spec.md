# Spec: #9 GitHub App integration: webhook รับ issue และ sync สองทาง

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: 25751a0 (main หลัง merge #7)

## ระบบย่อย
- เป้าหมาย: `packages/github`, `apps/web`
- ได้รับผลกระทบ: `packages/db` (ไม่แก้ schema แต่เพิ่ม dependency ของ github package)
- กลุ่มผู้ใช้: ใครก็ได้ (เปิด issue ใน GitHub), Helpdesk, SA, Programmer

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/github/src/index.ts` — placeholder `export {}` ยังไม่มี logic
- `packages/github/package.json` — มี dependency `octokit: ^4` พร้อมใช้
- `packages/db/src/schema/issues.ts` — issues มี `githubIssueNumber` (NOT NULL, integer), `reporterGithubLogin` (text, nullable), unique index บน `(projectId, githubIssueNumber)`
- `packages/db/src/schema/projects.ts` — projects มี `githubOwner` และ `githubRepo` สำหรับ map กับ GitHub repo
- `packages/db/src/schema/enums.ts` — issueTypeEnum: `['feature', 'bug', 'data_fix']`, riskLevelEnum: `['low', 'medium', 'high']`, issueStatusEnum: `['triage', ...]`
- `apps/web/src/app/issues/new/page.tsx` — สร้าง issue ใน DB โดยยังไม่ sync ไป GitHub (auto-increment `githubIssueNumber` จาก max+1)
- `apps/web/src/app/issues/[id]/page.tsx` — triage form อัปเดต type/risk/status/assignee ใน DB โดยยังไม่ sync labels กลับ GitHub
- `apps/web/src/app/api/issues/route.ts` — POST สร้าง issue (ใช้จาก API client) ยังไม่ sync GitHub
- `apps/web/src/app/api/issues/[id]/route.ts` — PATCH อัปเดต issue ยังไม่ sync GitHub
- `apps/web/.env.example` — ยังไม่มี GitHub App env variables

## ข้อเสนอการออกแบบ

### 1. GitHub App Client (`packages/github`)

สร้าง client สำหรับ GitHub App ที่รับ credentials ผ่าน constructor:

```typescript
// packages/github/src/client.ts
import { App } from 'octokit';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

export function createGitHubApp(config: GitHubAppConfig): App {
  return new App({
    appId: config.appId,
    privateKey: config.privateKey,
    webhooks: { secret: config.webhookSecret },
  });
}
```

```typescript
// packages/github/src/issues.ts
import type { Octokit } from 'octokit';

export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string | null;
  labels?: string[];
}

export interface UpdateLabelsParams {
  owner: string;
  repo: string;
  issueNumber: number;
  labels: string[];
}

export async function createGitHubIssue(octokit: Octokit, params: CreateIssueParams) {
  return octokit.rest.issues.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body ?? undefined,
    labels: params.labels,
  });
}

export async function updateGitHubIssueLabels(octokit: Octokit, params: UpdateLabelsParams) {
  return octokit.rest.issues.setLabels({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    labels: params.labels,
  });
}
```

```typescript
// packages/github/src/labels.ts — mapping ระหว่าง DB enum กับ GitHub labels

export const TYPE_LABEL_PREFIX = 'type:';
export const RISK_LABEL_PREFIX = 'risk:';
export const STATUS_LABEL_PREFIX = 'status:';

export function dbToGitHubLabels(issue: {
  type?: string | null;
  riskLevel?: string | null;
  status?: string | null;
}): string[] {
  const labels: string[] = [];
  if (issue.type) labels.push(`${TYPE_LABEL_PREFIX}${issue.type}`);
  if (issue.riskLevel) labels.push(`${RISK_LABEL_PREFIX}${issue.riskLevel}`);
  if (issue.status) labels.push(`${STATUS_LABEL_PREFIX}${issue.status}`);
  return labels;
}

export function gitHubLabelsToDb(labels: string[]): {
  type?: string;
  riskLevel?: string;
  status?: string;
} {
  const result: { type?: string; riskLevel?: string; status?: string } = {};
  for (const label of labels) {
    if (label.startsWith(TYPE_LABEL_PREFIX)) result.type = label.slice(TYPE_LABEL_PREFIX.length);
    if (label.startsWith(RISK_LABEL_PREFIX)) result.riskLevel = label.slice(RISK_LABEL_PREFIX.length);
    if (label.startsWith(STATUS_LABEL_PREFIX)) result.status = label.slice(STATUS_LABEL_PREFIX.length);
  }
  return result;
}
```

```typescript
// packages/github/src/index.ts — re-export ทุกอย่าง
export { createGitHubApp, type GitHubAppConfig } from './client';
export { createGitHubIssue, updateGitHubIssueLabels, type CreateIssueParams, type UpdateLabelsParams } from './issues';
export { dbToGitHubLabels, gitHubLabelsToDb, TYPE_LABEL_PREFIX, RISK_LABEL_PREFIX, STATUS_LABEL_PREFIX } from './labels';
export { verifyWebhookSignature } from './webhook';
```

### 2. Webhook Signature Verification

```typescript
// packages/github/src/webhook.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### 3. Webhook Endpoint (`apps/web`)

```
POST /api/webhooks/github
```

- อ่าน raw body และ header `x-hub-signature-256`
- เรียก `verifyWebhookSignature()` — 401 ถ้าไม่ผ่าน
- ตรวจ header `x-github-event` — ประมวลผลเฉพาะ `issues`
- Action ที่รองรับ: `opened`, `edited`, `labeled`, `unlabeled`, `closed`, `reopened`
- ค้นหา project จาก `repository.owner.login` + `repository.name`
- **`opened`**: insert issue ใหม่ (ใช้ `ON CONFLICT DO UPDATE` กัน duplicate)
- **`edited`**: อัปเดต title/body
- **`labeled`/`unlabeled`**: แปลง labels → type/riskLevel/status แล้วอัปเดต
- **`closed`**: set status = 'done'
- **`reopened`**: set status = 'triage'
- บันทึก audit_log ทุก action (userId = null เพราะมาจาก webhook)
- Return 200 OK

### 4. Sync DB → GitHub (เมื่อสร้าง/อัปเดต issue ผ่านเว็บ)

#### สร้าง issue ผ่านเว็บ → sync ไป GitHub
แก้ server action ใน `issues/new/page.tsx` และ `POST /api/issues`:
1. หลัง insert ลง DB แล้ว เรียก `createGitHubIssue()` ด้วย installation token
2. อัปเดต `githubIssueNumber` ใน DB ด้วยเลขจาก GitHub response (แทนที่ auto-increment)
3. ถ้า GitHub API ล้มเหลว ยังคง save ลง DB ได้ (graceful degradation) แต่ log error

#### Triage ผ่านเว็บ → sync labels กลับ GitHub
แก้ server action ใน `issues/[id]/page.tsx` และ `PATCH /api/issues/[id]`:
1. หลังอัปเดต DB แล้ว เรียก `updateGitHubIssueLabels()` ด้วย labels ที่แปลงจาก type/risk/status
2. ถ้า GitHub API ล้มเหลว ยังคง save ลง DB ได้ (graceful degradation) แต่ log error

### 5. Installation Token Helper

```typescript
// packages/github/src/installation.ts
import type { App } from 'octokit';

export async function getInstallationOctokit(app: App, owner: string, repo: string) {
  const { data: installation } = await app.octokit.rest.apps.getRepoInstallation({
    owner,
    repo,
  });
  return app.getInstallationOctokit(installation.id);
}
```

### 6. GitHub App Singleton ใน apps/web

```typescript
// apps/web/src/lib/github.ts
import { createGitHubApp } from '@sdlc-ai/github';

export const githubApp = process.env.GITHUB_APP_ID
  ? createGitHubApp({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    })
  : null;
```

ถ้า env ไม่ครบ จะไม่สร้าง app → sync จะ skip อัตโนมัติ (ทำให้ dev environment ไม่ต้องตั้งค่า GitHub App)

### 7. Race Condition Handling

เมื่อ webhook มาพร้อมกับ user update ใช้ `updatedAt` เปรียบเทียบ:
- Webhook handler: อัปเดตเฉพาะเมื่อ webhook event timestamp ≥ record's `updatedAt`
- DB → GitHub sync: ใช้ `ON CONFLICT` ที่ unique index `(projectId, githubIssueNumber)` กัน duplicate

### 8. Environment Variables ใหม่

เพิ่มใน `apps/web/.env.example`:
```
# GitHub App (optional — ถ้าไม่ตั้งจะไม่ sync กับ GitHub)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
```

### 9. Next.js Route Config

Webhook endpoint ต้อง disable body parsing เพื่ออ่าน raw body สำหรับ signature verification:

```typescript
// apps/web/src/app/api/webhooks/github/route.ts
export const dynamic = 'force-dynamic';
// Next.js App Router ไม่ auto-parse body — ใช้ request.text() ได้เลย
```

### 10. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `packages/github/src/client.ts` | สร้างใหม่ — GitHub App factory |
| `packages/github/src/issues.ts` | สร้างใหม่ — create/update issue functions |
| `packages/github/src/labels.ts` | สร้างใหม่ — label ↔ DB enum mapping |
| `packages/github/src/webhook.ts` | สร้างใหม่ — signature verification |
| `packages/github/src/installation.ts` | สร้างใหม่ — installation token helper |
| `packages/github/src/index.ts` | แก้ — re-export ทุก module |
| `packages/github/package.json` | อาจเพิ่ม `@sdlc-ai/db` ใน dependencies ถ้าต้องการ type |
| `apps/web/src/lib/github.ts` | สร้างใหม่ — GitHub App singleton |
| `apps/web/src/app/api/webhooks/github/route.ts` | สร้างใหม่ — webhook endpoint |
| `apps/web/src/app/issues/new/page.tsx` | แก้ — เพิ่ม sync ไป GitHub หลัง create |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ — เพิ่ม sync labels หลัง triage |
| `apps/web/src/app/api/issues/route.ts` | แก้ — เพิ่ม sync ไป GitHub หลัง POST |
| `apps/web/src/app/api/issues/[id]/route.ts` | แก้ — เพิ่ม sync labels หลัง PATCH |
| `apps/web/.env.example` | แก้ — เพิ่ม GitHub App env vars |
| `apps/web/package.json` | เพิ่ม dependency `@sdlc-ai/github` |

## เกณฑ์ว่าเสร็จ
- [ ] Webhook endpoint รับ issues events ได้และ verify signature
- [ ] Issue ที่เปิดใน GitHub sync เข้า DB ได้ (สร้าง record ใหม่)
- [ ] Issue ที่แก้ไขใน GitHub sync อัปเดต DB ได้
- [ ] สร้าง issue ผ่านเว็บแล้ว sync ไปสร้างใน GitHub ได้
- [ ] Triage issue ผ่านเว็บแล้ว labels sync กลับ GitHub ได้
- [ ] บันทึก audit log ทุกการ sync
- [ ] GitHub App env เป็น optional (dev environment ไม่ต้องตั้งก็ใช้งานได้)
- [ ] `pnpm build` ผ่านทุก package
- [ ] `pnpm lint` ผ่านทุก package

## การทดสอบ
- `pnpm build` และ `pnpm lint` ผ่าน
- ทดสอบ manual:
  - ตั้ง GitHub App → เปิด issue ใน GitHub → ตรวจว่า DB มี record
  - แก้ issue ใน GitHub → ตรวจว่า DB อัปเดต
  - สร้าง issue ผ่านเว็บ → ตรวจว่า GitHub มี issue
  - Triage ผ่านเว็บ → ตรวจว่า GitHub labels เปลี่ยน
- ถ้าไม่ตั้ง GitHub App env → ระบบยังใช้งานได้ปกติ (ไม่ sync)

## ความเสี่ยงและ policy
ระดับ: กลาง
ผลตรวจตาม `docs/policies/review-checklist.md`:
- ระบบย่อยเป้าหมายและที่ได้รับผลกระทบ: `packages/github`, `apps/web`
- เกณฑ์ว่าเสร็จตรวจสอบได้: ใช่
- ข้อเท็จจริงแยกจากข้อเสนอ: ใช่
- ข้อมูลส่วนบุคคล: ไม่มีเพิ่ม (ใช้ `reporterGithubLogin` ที่มีอยู่แล้ว)
- สิทธิ์ผู้ใช้: webhook verify signature, API ตรวจ session เดิม
- ตรวจและจำกัดข้อมูลนำเข้า: webhook verify signature + validate event type
- การกระทำสำคัญบันทึกใน audit log: ใช่ (ทุกการ sync)
- Credentials เก็บใน env variable เท่านั้น: ใช่

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
