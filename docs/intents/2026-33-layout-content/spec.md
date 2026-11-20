# 1. ระบบย่อยที่เกี่ยวข้อง

- **Frontend Layout System** — ระบบจัดการ layout หลักของ application รวมถึง main container, content area
- **Navigation System** — ระบบ sidebar menu และ breadcrumb navigation
- **Form Component Library** — component ต่างๆ ที่ใช้ในการสร้างฟอร์ม เช่น input fields, buttons, labels
- **Routing System** — ระบบจัดการ URL และการนำทางระหว่างหน้า เพื่อสร้าง breadcrumb
- **CSS/Styling Framework** — ระบบ styling ที่ใช้ในโปรเจกต์ (เช่น Tailwind CSS, CSS Modules, Styled Components)
- **Responsive Design System** — ระบบจัดการ breakpoints และ responsive behavior

---

# 2. ข้อเท็จจริงจากระบบปัจจุบัน

## 2.1 Layout Structure
- Content area ปัจจุบันมี `max-width` ที่จำกัดความกว้าง (น่าจะอยู่ที่ 1200px - 1440px)
- Sidebar menu อยู่ด้านซ้ายแล้ว (จากงานก่อนหน้า) มีความกว้างคงที่
- มี padding/margin ที่กำหนดไว้รอบ content area
- Content ไม่ได้ใช้พื้นที่หน้าจอเต็มประสิทธิภาพ โดยเฉพาะบนหน้าจอขนาดใหญ่

## 2.2 Form Components ปัจจุบัน
- ฟอร์มแสดงเฉพาะ input fields และ labels โดยตรง
- ไม่มี breadcrumb navigation
- ไม่มี page title ที่เด่นชัด (อาจมีแต่ไม่มี visual hierarchy ที่ชัดเจน)
- ไม่มี description หรือ subtitle อธิบายบริบทของหน้า
- Spacing และ typography อาจไม่สม่ำเสมอกันทั้งระบบ

## 2.3 Technical Stack
- ใช้ CSS framework หรือ styling solution ที่มีอยู่ในโปรเจกต์
- มี routing system ที่สามารถใช้สร้าง breadcrumb path ได้
- ระบบรองรับ responsive design อยู่แล้ว

---

# 3. ข้อเสนอการออกแบบ

## 3.1 Content Area Layout Adjustment

### 3.1.1 CSS Structure
```css
/* Layout Container */
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 260px; /* ความกว้างคงที่ของ sidebar */
  flex-shrink: 0;
}

.content-area {
  flex: 1; /* ขยายเต็มพื้นที่ที่เหลือ */
  /* ลบ max-width ออก */
  padding: 24px 32px; /* padding ซ้าย-ขวาที่เหมาะสม */
  overflow-x: auto;
}
```

### 3.1.2 Responsive Behavior
- **Desktop (> 1024px)**: Content ขยายเต็มหน้าจอหลังหัก sidebar
- **Tablet (768px - 1024px)**: Sidebar อาจ collapse เป็น icon หรือ overlay, content ขยายเต็มหน้าจอ
- **Mobile (< 768px)**: จัดการในงานแยกต่างหาก (อยู่นอก scope)

## 3.2 Form Layout Components

### 3.2.1 Breadcrumb Navigation Component
```typescript
// Component Structure
interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Visual Design
- ขนาดตัวอักษร: 14px
- สี: neutral-600 สำหรับ links, neutral-800 สำหรับหน้าปัจจุบัน
- Separator: "/" หรือ chevron icon
- Hover state: underline หรือเปลี่ยนสี
- Margin-bottom: 16px จาก page title
```

**ตำแหน่ง**: ด้านบนสุดของ content area ก่อน page title

### 3.2.2 Page Title Component
```typescript
// Component Structure
interface PageTitleProps {
  title: string;
  actions?: ReactNode; // ปุ่มหรือ actions ด้านขวา
}

// Visual Design
- ขนาดตัวอักษร: 32px - 36px (Heading 1)
- Font weight: 700 (Bold)
- สี: neutral-900
- Margin-bottom: 8px จาก subtitle
- Layout: Flex row (title ซ้าย, actions ขวา)
```

### 3.2.3 Subtitle/Description Component
```typescript
// Component Structure
interface PageDescriptionProps {
  description: string;
}

// Visual Design
- ขนาดตัวอักษร: 16px
- Font weight: 400 (Regular)
- สี: neutral-600
- Line height: 1.5
- Max-width: 800px (เพื่อความอ่านง่าย)
- Margin-bottom: 32px จาก form content
```

### 3.2.4 Form Container Component
```typescript
// Component Structure
interface FormLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

// Layout Structure
<div className="form-layout">
  <Breadcrumb items={breadcrumbs} />
  <PageTitle title={title} actions={actions} />
  {description && <PageDescription description={description} />}
  <div className="form-content">
    {children}
  </div>
</div>
```

## 3.3 Visual Hierarchy & Typography

### Typography Scale
```
H1 (Page Title): 32-36px, font-weight: 700
H2 (Section Title): 24px, font-weight: 600
H3 (Subsection): 20px, font-weight: 600
Body Large: 16px, font-weight: 400
Body Regular: 14px, font-weight: 400
Small: 12px, font-weight: 400
```

### Spacing System
```
Section spacing: 48px
Component spacing: 32px
Element spacing: 16px
Tight spacing: 8px
```

### Color Palette
```
Text Primary: neutral-900
Text Secondary: neutral-600
Text Tertiary: neutral-500
Link: blue-600
Link Hover: blue-700
Border: neutral-200
Background: white
```

## 3.4 Technical Implementation

### 3.4.1 Breadcrumb Generation
- ใช้ routing information เพื่อสร้าง breadcrumb path อัตโนมัติ
- กำหนด route configuration พร้อม breadcrumb labels
```typescript
// Route config example
{
  path: '/settings/profile',
  breadcrumbs: [
    { label: 'Home', path: '/' },
    { label: 'Settings', path: '/settings' },
    { label: 'Profile' }
  ]
}
```

### 3.4.2 Layout Component Integration
- สร้าง `FormLayout` component เป็น wrapper สำหรับทุกหน้าที่มีฟอร์ม
- ใช้ composition pattern ให้ flexible
- Support prop drilling หรือ context สำหรับ configuration

### 3.4.3 CSS Implementation Strategy
- ใช้ CSS-in-JS หรือ CSS Modules เพื่อ scope styling
- กำหนด design tokens สำหรับ colors, spacing, typography
- สร้าง utility classes สำหรับ reusable styles
- รองรับ dark mode ถ้าระบบมี (future-proof)

---

# 4. ไฟล์ที่ต้องสร้าง/แก้ไข

| ลำดับ | ประเภท | ชื่อไฟล์/Path | รายละเอียดการเปลี่ยนแปลง |
|------|--------|--------------|--------------------------|
| 1 | สร้างใหม่ | `components/layout/Breadcrumb/Breadcrumb.tsx` | Component สำหรับแสดง breadcrumb navigation |
| 2 | สร้างใหม่ | `components/layout/Breadcrumb/Breadcrumb.module.css` | Styles สำหรับ Breadcrumb component |
| 3 | สร้างใหม่ | `components/layout/Breadcrumb/index.ts` | Export file สำหรับ Breadcrumb |
| 4 | สร้างใหม่ | `components/layout/PageTitle/PageTitle.tsx` | Component สำหรับแสดง page title พร้อม actions |
| 5 | สร้างใหม่ | `components/layout/PageTitle/PageTitle.module.css` | Styles สำหรับ PageTitle component |
| 6 | สร้างใหม่ | `components/layout/PageTitle/index.ts` | Export file สำหรับ PageTitle |
| 7 | สร้างใหม่ | `components/layout/PageDescription/PageDescription.tsx` | Component สำหรับแสดง description |
| 8 | สร้างใหม่ | `components/layout/PageDescription/PageDescription.module.css` | Styles สำหรับ PageDescription |
| 9 | สร้างใหม่ | `components/layout/PageDescription/index.ts` | Export file สำหรับ PageDescription |
| 10 | สร้างใหม่ | `components/layout/FormLayout/FormLayout.tsx` | Main layout wrapper component สำหรับฟอร์ม |
| 11 | สร้างใหม่ | `components/layout/FormLayout/FormLayout.module.css` | Styles สำหรับ FormLayout component |
| 12 | สร้างใหม่ | `components/layout/FormLayout/index.ts` | Export file สำหรับ FormLayout |
| 13 | แก้ไข | `styles/layout.css` หรือ `components/AppLayout.module.css` | ปรับ content-area ให้ขยายเต็มหน้าจอ, ลบ max-width |
| 14 | แก้ไข | `components/AppLayout.tsx` หรือไฟล์ main layout | อัพเดท layout structure เพื่อรองรับ flexible content |
| 15 | สร้างใหม่ | `styles/design-tokens.css` หรือ `theme/tokens.ts` | กำหนด design tokens (colors, spacing, typography) |
| 16 | สร้างใหม่ | `utils/breadcrumbUtils.ts` | Utility functions สำหรับสร้าง breadcrumb จาก route |
| 17 | แก้ไข | `config/routes.ts` หรือไฟล์ route configuration | เพิ่ม breadcrumb configuration ในแต่ละ route |
| 18 | แก้ไข | `pages/**/*.tsx` (ทุกหน้าที่มีฟอร์ม) | Wrap content ด้วย FormLayout component |
| 19 | สร้างใหม่ | `components/layout/FormLayout/FormLayout.stories.tsx` | Storybook stories สำหรับ FormLayout (ถ้ามี Storybook) |
| 20 | สร้างใหม่ | `components/layout/FormLayout/FormLayout.test.tsx` | Unit tests สำหรับ FormLayout components |
| 21 | แก้ไข | `styles/globals.css` | อัพเดท global typography และ base styles |
| 22 | สร้างใหม่ | `docs/form-layout-guide.md` | Documentation สำหรับการใช้งาน FormLayout |

---

# 5. เกณฑ์ว่าเสร็จ

## 5.1 Content Area Layout
- [ ] Content area ขยายเต็มความกว้างหน้าจอ (flex: 1) หลังหัก sidebar ออก
- [ ] ไม่มี max-width จำกัดความกว้างของ content area
- [ ] มี padding ซ้าย-ขวา 24-32px ที่สม่ำเสมอ
- [ ] ทดสอบบนหน้าจอขนาดต่างๆ (1920px, 1440px, 1366px, 1024px) แสดงผลถูกต้อง
- [ ] ไม่มี horizontal scrollbar ที่ไม่จำเป็น

## 5.2 Breadcrumb Navigation
- [ ] Breadcrumb แสดงผลที่ด้านบนสุดของทุกหน้า
- [ ] แสดงเส้นทางปัจจุบันถูกต้องตาม route structure
- [ ] Links ใน breadcrumb ทำงานได้ (นำทางไปหน้าที่ถูกต้อง)
- [ ] Separator แสดงผลระหว่าง breadcrumb items
- [ ] Item สุดท้าย (หน้าปัจจุบัน) ไม่เป็น link และมีสีต่างจาก links อื่น
- [ ] Hover state ของ links ทำงานถูกต้อง
- [ ] รองรับ keyboard navigation (tab, enter)

## 5.3 Page Title
- [ ] Page title แสดงผลชัดเจนด้วยขนาดตัวอักษร 32-36px
- [ ] Font weight เป็น 700 (Bold)
- [ ] มี margin-bottom 8px จาก subtitle/description
- [ ] ถ้ามี action buttons แสดงผลด้านขวาของ title (flex layout)
- [ ] Responsive: บน tablet title และ