# Spec: #16 Sync intent/spec ไป GitHub repo

- Intent: [intent.md](./intent.md)
- ผู้ร่าง: Claude (agent)  สถานะ: อนุมัติแล้ว  ผู้อนุมัติ: sakchai (2026-11-17)
- วิเคราะห์จากโค้ดรุ่น: f925bae (main หลัง merge #11)

## ระบบย่อย
- เป้าหมาย: `apps/web`, `packages/github`
- ได้รับผลกระทบ: ไม่มี
- กลุ่มผู้ใช้: SA, Agent

## ข้อเท็จจริงจากการวิเคราะห์โค้ด
- `packages/github/src/index.ts` — มี `createGitHubApp`, `getInstallationOctokit` พร้อมใช้
- `apps/web/src/lib/github.ts` — มี `githubApp` singleton (nullable ถ้าไม่ตั้ง env)
- `apps/web/src/lib/github-sync.ts` — มี pattern sync ไป GitHub (graceful degradation)
- `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` — reviewIntent action อนุมัติ intent แล้วอัปเดต DB → ต้องเพิ่ม commit ไฟล์
- `packages/db/src/schema/intents.ts` — มี `filePath` (nullable) สำหรับเก็บ path หลัง commit
- `packages/db/src/schema/specs.ts` — มี `filePath` (nullable) + `commitSha`
- GitHub API สำหรับ commit ไฟล์: `octokit.rest.repos.createOrUpdateFileContents()`

## ข้อเสนอการออกแบบ

### 1. เพิ่ม function ใน packages/github

```typescript
// packages/github/src/files.ts
export async function commitFileToRepo(octokit, params: {
  owner: string; repo: string;
  path: string; content: string; message: string;
  branch?: string;
}) → { sha: string }
```

ใช้ `repos.createOrUpdateFileContents` — ถ้าไฟล์มีอยู่แล้วต้องส่ง sha เดิม (ดึงจาก `repos.getContent` ก่อน)

### 2. Sync helper ใน apps/web

```typescript
// apps/web/src/lib/github-sync.ts — เพิ่ม function
export async function syncIntentToGitHub(intentId: string, issueNumber: number, content: string)
export async function syncSpecToGitHub(specId: string, issueNumber: number, intentId: string, content: string)
```

Path format: `docs/intents/<year>-<issueNumber>-<slug>/intent.md` หรือ `spec.md`
ใช้ issue number จาก DB, slug จาก issue title (sanitize)

### 3. เรียก sync หลังอนุมัติ

แก้ reviewIntent ใน intent detail page:
- หลัง `decision === 'approved'` → เรียก `syncIntentToGitHub()`
- อัปเดต `intents.filePath` และ `intents.commitSha` (ถ้ามี)

แก้ reviewSpec ใน spec detail page:
- หลัง `decision === 'approved'` → เรียก `syncSpecToGitHub()`
- อัปเดต `specs.filePath` และ `specs.commitSha`

### 4. ไฟล์ที่สร้าง/แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `packages/github/src/files.ts` | สร้างใหม่ — commitFileToRepo |
| `packages/github/src/index.ts` | แก้ — re-export files |
| `apps/web/src/lib/github-sync.ts` | แก้ — เพิ่ม syncIntentToGitHub, syncSpecToGitHub |
| `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` | แก้ — เรียก sync หลังอนุมัติ |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` | แก้ — เรียก sync หลังอนุมัติ |

## เกณฑ์ว่าเสร็จ
- [ ] อนุมัติ intent → ไฟล์ intent.md ปรากฏใน repo
- [ ] อนุมัติ spec → ไฟล์ spec.md ปรากฏใน repo
- [ ] filePath/commitSha อัปเดตใน DB
- [ ] ถ้าไม่ตั้ง GitHub App → ไม่ sync (graceful)
- [ ] บันทึก audit log
- [ ] `pnpm build` และ `pnpm lint` ผ่าน

## ความเสี่ยงและ policy
ระดับ: กลาง (แตะ packages/github)
- ห้ามเขียน secret ลงไฟล์ที่ commit
- Graceful degradation

## คำถามที่ยังไม่มีคำตอบ
- ไม่มี
