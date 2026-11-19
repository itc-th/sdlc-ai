# Spec: #29 Release management — deploy แบบขั้นตอนเดียว

- สถานะ: ร่าง
- ผู้อนุมัติ: -

## 1. ระบบย่อยที่เกี่ยวข้อง

- **เชื่อม GitHub** (`packages/github`) — เพิ่มฟังก์ชันปิด issue และสร้าง Git tag
- **เว็บ** (`apps/web`) — หน้า `/releases`, sidebar, permission, ป้ายสถานะ

## 2. ข้อเท็จจริงจากระบบปัจจุบัน

- Status flow ปัจจุบัน: `triage → ... → in_progress → review → done`
- สถานะ `review` หมายถึง PR ถูก merge แล้ว รอขั้นตอนถัดไป
- ไม่มีหน้าจอสำหรับจัดการ release หรือ deploy
- `packages/github/src/issues.ts` มี `createGitHubIssue()` และ `updateGitHubIssueLabels()` เท่านั้น
- `apps/web/src/lib/roles.ts` มี permission สำหรับ issue, intent, spec, plan แต่ยังไม่มี release
- Vercel deploy ปัจจุบันใช้ auto-deploy เมื่อ push ไป main

## 3. ข้อเสนอการออกแบบ

### 3.1 ฟังก์ชันใหม่ใน packages/github

เพิ่มใน `packages/github/src/issues.ts`:

**closeGitHubIssue(octokit, params)**
- ถ้ามี comment → สร้าง comment ก่อน
- ปิด issue ด้วย state_reason: 'completed'

**createGitTag(octokit, params)**
- สร้าง annotated tag object
- สร้าง ref ชี้ไปที่ tag

Export ทั้งสองฟังก์ชันจาก `packages/github/src/index.ts`

### 3.2 หน้า /releases

Server component ที่แสดง:
- **ส่วน "รอ Deploy"** — issue ที่สถานะ `review` พร้อมปุ่ม "Deploy"
- แต่ละ issue แสดง: เลข issue, ชื่อ, วันที่เข้า review

**ปุ่ม Deploy** (Server Action):
1. Trigger Vercel Deploy Hook (POST ไปที่ `VERCEL_DEPLOY_HOOK_URL`)
2. สร้าง Git tag: `release-<issue number>-<slug>` (slug จากชื่อ issue)
3. ปิด GitHub issue พร้อม comment "Deployed and released as `<tag>`"
4. เปลี่ยนสถานะ issue ใน DB เป็น `done`

### 3.3 Permission

เพิ่มใน `apps/web/src/lib/roles.ts`:
- `release.deploy` — อนุญาตเฉพาะ `sa`, `tech_lead`, `admin`

ผู้ใช้ที่ไม่มีสิทธิ์จะเห็นหน้า releases แบบ read-only (ไม่มีปุ่ม deploy)

### 3.4 ป้ายสถานะ

อัปเดตป้าย `review` ในหน้า issues:
- เปลี่ยนข้อความจาก "รีวิว" เป็น "รอ Deploy"

### 3.5 Environment Variable

เพิ่ม `VERCEL_DEPLOY_HOOK_URL` — URL ของ Vercel Deploy Hook (ตั้งค่าใน Vercel project settings)

## 4. สิ่งที่ไม่ทำ

- ไม่เพิ่ม enum ใหม่ใน DB (ไม่มี migration)
- ไม่มีขั้นตอน UAT แยก
- ไม่มี rollback, release notes, batch deploy
