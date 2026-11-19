# แผนการปรับ Layout และปรับปรุงรูปแบบฟอร์ม

## 1. สรุปสิ่งที่ต้องทำ

ปรับ content area ให้ขยายเต็มความกว้างหน้าจอหลังหักเมนูด้านซ้าย และสร้าง layout components ใหม่ (Breadcrumb, PageTitle, PageDescription, FormLayout) พร้อมนำไปใช้ในหน้าที่มีฟอร์มทั้งหมด เพื่อให้ผู้ใช้เข้าใจบริบทและตำแหน่งปัจจุบันในระบบได้ชัดเจน

## 2. ไฟล์ที่ต้องสร้าง/แก้ไข

| Path | การเปลี่ยนแปลง | เหตุผล |
|------|----------------|--------|
| `apps/web/src/components/layout/breadcrumb.tsx` | สร้างใหม่ — Component แสดง breadcrumb navigation | แสดงเส้นทางปัจจุบัน รองรับ link และ separator |
| `apps/web/src/components/layout/page-header.tsx` | สร้างใหม่ — Component แสดง page title + subtitle + actions | จัดการ visual hierarchy ของส่วนหัวหน้า |
| `apps/web/src/components/layout/form-layout.tsx` | สร้างใหม่ — Wrapper component รวม breadcrumb + header + content | Template สำหรับหน้าฟอร์มทั้งหมด |
| `apps/web/src/lib/breadcrumbs.ts` | สร้างใหม่ — Utility functions สร้าง breadcrumb จาก pathname | Generate breadcrumb items อัตโนมัติ |
| `apps/web/src/app/globals.css` | แก้ไข — เพิ่ม design tokens และ typography scale | กำหนดมาตรฐาน spacing, colors, typography |
| `apps/web/src/components/sidebar.tsx` | แก้ไข — ตรวจสอบ width และ flex behavior | ให้ sidebar มีความกว้างคงที่ (flex-shrink: 0) |
| `apps/web/src/app/layout.tsx` | แก้ไข — ปรับ main content area ให้ใช้ flex: 1 | Content ขยายเต็มพื้นที่หลังหัก sidebar |
| `apps/web/src/app/dashboard/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/new/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/intent/new/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/new/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/plan/new/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/issues/[id]/plan/[planId]/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |
| `apps/web/src/app/releases/page.tsx` | แก้ไข — Wrap ด้วย FormLayout | นำ layout ใหม่ไปใช้ |

## 3. ขั้นตอนการทำงาน

### 3.1 สร้าง Design Tokens (globals.css)

1. เปิดไฟล์ `apps/web/src/app/globals.css`
2. เพิ่ม CSS variables สำหรับ:
   - **Typography scale**: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`
   - **Font weights**: `--font-regular`, `--font-medium`, `--font-semibold`, `--font-bold`
   - **Spacing scale**: `--spacing-2`, `--spacing-4`, `--spacing-6`, `--spacing-8`, `--spacing-12`, `--spacing-16`, `--spacing-24`, `--spacing-32`, `--spacing-48`
   - **Colors**: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--link`, `--link-hover`, `--border`, `--bg-primary`
3. ตรวจสอบว่า Tailwind CSS config ใช้ค่าเหล่านี้ได้ (ถ้าใช้ Tailwind)

### 3.2 ปรับ Layout Structure (layout.tsx + sidebar.tsx)

1. เปิดไฟล์ `apps/web/src/components/sidebar.tsx`
   - ตรวจสอบว่ามี `className` ที่กำหนดความกว้างคงที่ (เช่น `w-64` หรือ `width: 16rem`)
   - เพิ่ม `flex-shrink-0` เพื่อป้องกัน sidebar หด
2. เปิดไฟล์ `apps/web/src/app/layout.tsx`
   - หา `<main>` element ที่ wrap content
   - เพิ่ม `className="flex-1 overflow-x-auto"` ให้ content area
   - ลบ `max-w-*` หรือ `container` class ที่จำกัดความกว้าง (ถ้ามี)
   - เพิ่ม `padding-left` และ `padding-right` ประมาณ `1.5rem` - `2rem` (24px - 32px)

### 3.3 สร้าง Breadcrumb Utility (lib/breadcrumbs.ts)

1. สร้างไฟล์ `apps/web/src/lib/breadcrumbs.ts`
2. สร้าง interface:
   ```typescript
   export interface BreadcrumbItem {
     label: string;
     href?: string;
   }
   ```
3. สร้าง function `generateBreadcrumbs(pathname: string): BreadcrumbItem[]`
   - แปลง pathname เป็น segments (แยกด้วย `/`)
   - Map segments เป็น labels (เช่น `issues` → "เรื่อง", `new` → "สร้างใหม่")
   - สร้าง href สำหรับแต่ละ segment (ยกเว้น segment สุดท้าย)
   - Return array ของ BreadcrumbItem (เริ่มด้วย "หน้าแรก")

### 3.4 สร้าง Breadcrumb Component (components/layout/breadcrumb.tsx)

1. สร้างไฟล์ `apps/web/src/components/layout/breadcrumb.tsx`
2. สร้าง Server Component รับ props:
   ```typescript
   interface BreadcrumbProps {
     items: BreadcrumbItem[];
   }
   ```
3. Render:
   - วน loop `items` แสดงเป็น `<Link>` (ถ้ามี href) หรือ `<span>` (ถ้าไม่มี)
   - แทรก separator (`/` หรือ chevron icon) ระหว่าง items
   - Item สุดท้ายใช้สี `text-secondary` และไม่เป็น link
4. Styling:
   - ขนาดตัวอักษร `text-sm` (14px)
   - สี link: `text-link`, hover: `text-link-hover`, current: `text-secondary`
   - Margin-bottom: `mb-4` (16px)

### 3.5 สร้าง Page Header Component (components/layout/page-header.tsx)

1. สร้างไฟล์ `apps/web/src/components/layout/page-header.tsx`
2. สร้าง Server Component รับ props:
   ```typescript
   interface PageHeaderProps {
     title: string;
     description?: string;
     actions?: React.ReactNode;
   }
   ```
3. Render:
   - Wrapper `<div>` ใช้ `flex justify-between items-start`
   - ส่วนซ้าย:
     - `<h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>`
     - `{description && <p className="text-base text-secondary max-w-3xl">{description}</p>}`
   - ส่วนขวา: `{actions}`
   - Margin-bottom: `mb-8` (32px)

### 3.6 สร้าง Form Layout Component (components/layout/form-layout.tsx)

1. สร้างไฟล์ `apps/web/src/components/layout/form-layout.tsx`
2. สร้าง Server Component รับ props:
   ```typescript
   interface FormLayoutProps {
     breadcrumbs?: BreadcrumbItem[];
     title: string;
     description?: string;
     actions?: React.ReactNode;
     children: React.ReactNode;
   }
   ```
3. Render:
   - `<div className="p-6 md:p-8">`
   - `{breadcrumbs && <Breadcrumb items={breadcrumbs} />}`
   - `<PageHeader title={title} description={description} actions={actions} />`
   - `<div className="space-y-6">{children}</div>`
   - `</div>`

### 3.7 นำ FormLayout ไปใช้ในหน้าต่างๆ

สำหรับแต่ละไฟล์ในรายการด้านล่าง ให้ทำตามขั้นตอน:

1. Import `FormLayout` และ `generateBreadcrumbs` จาก `@/components/layout/form-layout` และ `@/lib/breadcrumbs`
2. ใช้ `usePathname()` (ถ้าเป็น Client Component) หรือดึง pathname จาก params/searchParams (ถ้าเป็น Server Component)
3. สร้าง breadcrumb items ด้วย `generateBreadcrumbs(pathname)`
4. Wrap เนื้อหาหน้าด้วย `<FormLayout breadcrumbs={breadcrumbs} title="..." description="..." actions={...}>`
5. ย้าย existing content เข้าไปใน `children` ของ FormLayout

**ไฟล์ที่ต้องแก้:**
- `apps/web/src/app/dashboard/page.tsx` — title: "แดชบอร์ด", description: "ภาพรวมสถิติเรื่องและการดำเนินงาน"
- `apps/web/src/app/issues/page.tsx` — title: "รายการเรื่อง", description: "จัดการและติดตามสถานะเรื่องทั้งหมด", actions: ปุ่ม "สร้างเรื่องใหม่"
- `apps/web/src/app/issues/new/page.tsx` — title: "สร้างเรื่องใหม่", description: "กรอกข้อมูลเพื่อสร้างเรื่องใหม่ในระบบ"
- `apps/web/src/app/issues/[id]/page.tsx` — title: `เรื่อง #${id}`, description: "รายละเอียดและประวัติการดำเนินการ", actions: ปุ่มแก้ไข/ปิดเรื่อง (ถ้ามี)
- `apps/web/src/app/issues/[id]/intent/new/page.tsx` — title: "สร้าง Intent", description: "ร่าง Intent สำหรับเรื่องนี้", actions: ปุ่ม "ให้ AI ร่าง"
- `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` — title: "Intent", description: "ทบทวนและอนุมัติ Intent", actions: ปุ่มอนุมัติ/แก้ไข
- `apps/web/src/app/issues/[id]/intent/[intentId]/spec/new/page.tsx` — title: "สร้าง Spec", description: "ร่าง Spec ตาม Intent", actions: ปุ่ม "ให้ AI ร่าง"
- `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` — title: "Spec", description: "ทบทวนและอนุมัติ Spec", actions: ปุ่มอนุมัติ/แก้ไข
- `apps/web/src/app/issues/[id]/plan/new/page.tsx` — title: "สร้าง Plan", description: "วางแผนการแก้โค้ดตาม Spec"
- `apps