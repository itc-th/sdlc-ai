# แผนการแก้ไข: #29 Release management — deploy แบบขั้นตอนเดียว

## 1. สรุปสิ่งที่ต้องทำ

สร้างหน้า `/releases` สำหรับ deploy issue ที่สถานะ `review` ไป production ด้วยปุ่มเดียว โดย trigger Vercel Deploy Hook, สร้าง Git tag, ปิด GitHub issue, และเปลี่ยนสถานะเป็น `done` อัตโนมัติ

## 2. ไฟล์ที่ต้องสร้าง/แก้ไข

| ไฟล์ | การเปลี่ยนแปลง | เหตุผล |
|------|----------------|--------|
| `packages/github/src/issues.ts` | แก้ไข | เพิ่ม `closeGitHubIssue()` และ `createGitTag()` |
| `packages/github/src/index.ts` | แก้ไข | export ฟังก์ชันใหม่ |
| `apps/web/src/app/releases/page.tsx` | สร้างใหม่ | หน้าจอ release + server action สำหรับ deploy |
| `apps/web/src/lib/roles.ts` | แก้ไข | เพิ่ม permission `release.deploy` |
| `apps/web/src/components/sidebar.tsx` | แก้ไข | เพิ่มเมนู Releases |
| `apps/web/src/app/issues/page.tsx` | แก้ไข | เปลี่ยนป้าย `review` → "รอ Deploy" |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ไข | เปลี่ยนป้าย `review` → "รอ Deploy" |

## 3. ขั้นตอนการทำงาน

### Step 1: เพิ่มฟังก์ชันใน packages/github

**ไฟล์ `packages/github/src/issues.ts`** — เพิ่ม:

```typescript
export interface CloseIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  comment?: string;
}

export async function closeGitHubIssue(octokit: Octokit, params: CloseIssueParams) {
  if (params.comment) {
    await octokit.rest.issues.createComment({
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,
      body: params.comment,
    });
  }
  return octokit.rest.issues.update({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    state: 'closed',
    state_reason: 'completed',
  });
}

export interface CreateTagParams {
  owner: string;
  repo: string;
  tag: string;
  message: string;
  sha: string;
}

export async function createGitTag(octokit: Octokit, params: CreateTagParams) {
  const { data: tagObj } = await octokit.rest.git.createTag({
    owner: params.owner,
    repo: params.repo,
    tag: params.tag,
    message: params.message,
    object: params.sha,
    type: 'commit',
  });
  await octokit.rest.git.createRef({
    owner: params.owner,
    repo: params.repo,
    ref: `refs/tags/${params.tag}`,
    sha: tagObj.sha,
  });
  return { sha: tagObj.sha };
}
```

**ไฟล์ `packages/github/src/index.ts`** — เพิ่ม export:

```typescript
export { closeGitHubIssue, createGitTag, type CloseIssueParams, type CreateTagParams } from './issues';
```

### Step 2: เพิ่ม permission

**ไฟล์ `apps/web/src/lib/roles.ts`** — เพิ่ม:

```typescript
'release.deploy':  ['sa', 'tech_lead', 'admin'],
```

### Step 3: สร้างหน้า /releases

**ไฟล์ `apps/web/src/app/releases/page.tsx`** — สร้างใหม่:

- Query issue ที่สถานะ `review` จาก DB
- แสดงรายการ issue พร้อมปุ่ม "Deploy" (เฉพาะผู้มีสิทธิ์ `release.deploy`)
- Server Action `deployIssue(issueId)`:
  1. ตรวจสิทธิ์ `release.deploy`
  2. ดึงข้อมูล issue และ project จาก DB
  3. POST ไปที่ `process.env.VERCEL_DEPLOY_HOOK_URL` เพื่อ trigger deploy
  4. ดึง latest commit SHA จาก GitHub (`octokit.rest.repos.getCommit`)
  5. สร้าง Git tag `release-<issueNumber>-<slug>`
  6. ปิด GitHub issue พร้อม comment
  7. อัปเดตสถานะ issue ใน DB เป็น `done`
  8. `revalidatePath('/releases')`

### Step 4: เพิ่มเมนู Releases ใน sidebar

**ไฟล์ `apps/web/src/components/sidebar.tsx`** — เพิ่มรายการ:

```typescript
{ href: '/releases', label: 'Releases', icon: '🚀' },
```

### Step 5: อัปเดตป้ายสถานะในหน้า issues

**ไฟล์ `apps/web/src/app/issues/page.tsx`** และ **`apps/web/src/app/issues/[id]/page.tsx`**:

- เปลี่ยน `review: 'รีวิว'` → `review: 'รอ Deploy'`

## 4. การทดสอบ

- `pnpm build` ผ่าน
- `pnpm lint` ผ่าน
- ทดสอบด้วยมือ:
  - เข้าหน้า `/releases` เห็น issue ที่สถานะ `review`
  - กดปุ่ม Deploy → ตรวจว่า Vercel deploy triggered, Git tag สร้างสำเร็จ, GitHub issue ปิด, สถานะเปลี่ยนเป็น `done`
  - ผู้ใช้ที่ไม่มีสิทธิ์ไม่เห็นปุ่ม Deploy

## 5. Environment Variable ที่ต้องตั้ง

| ตัวแปร | หน้าที่ |
|--------|--------|
| `VERCEL_DEPLOY_HOOK_URL` | URL ของ Vercel Deploy Hook สำหรับ production |
