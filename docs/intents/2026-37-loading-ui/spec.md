# 1. ระบบย่อยที่เกี่ยวข้อง

- **Frontend UI Components** - ระบบ component library ที่เก็บ reusable UI components
- **Layout System** - ระบบจัดการ layout และ responsive design
- **State Management** - ระบบจัดการ state ของแอปพลิเคชัน (loading, error, success states)
- **Design System** - ระบบกำหนดมาตรฐาน UI/UX รวมถึง color, spacing, typography
- **Page Components** - หน้าต่างๆ ที่มีการแสดง loading state ทั้งหมดในระบบ

# 2. ข้อเท็จจริงจากระบบปัจจุบัน

## การแสดง Loading ปัจจุบัน
- Loading indicator ใช้รูปแบบเดิมที่ไม่เต็มความกว้างหน้าจอ อาจเป็นแบบ centered ในพื้นที่จำกัด
- แต่ละหน้าอาจมีการจัดการ loading state แบบกระจัดกระจาย (ไม่ใช้ component เดียวกัน)
- ขนาด สี และตำแหน่งของ loading indicator อาจไม่สม่ำเสมอกัน
- Loading state ไม่สอดคล้องกับ layout ใหม่ที่เต็มความกว้างหน้าจอ

## UI Layout ปัจจุบัน
- หน้าต่างๆ ได้รับการปรับปรุงให้แสดงผลแบบเต็มความกว้างหน้าจอแล้ว
- มี design system และ styling guidelines ที่ชัดเจน
- มี responsive design รองรับหลายขนาดหน้าจอ

## Technical Stack
- มี component library อยู่แล้ว (ต้องปรับปรุง loading components)
- มีการจัดการ state แบบ centralized หรือ local state ในแต่ละหน้า
- มีการใช้ CSS framework หรือ CSS-in-JS สำหรับ styling

# 3. ข้อเสนอการออกแบบ

## 3.1 สถาปัตยกรรม Component

### Loading Component Hierarchy
```
<LoadingWrapper>
  ├── <LoadingContainer> (full-width container)
  │   ├── <LoadingSpinner> (animated indicator)
  │   ├── <LoadingText> (optional message)
  │   └── <LoadingSkeleton> (optional skeleton UI)
  └── [Actual Content] (shown when loaded)
```

### Component Props Interface
```typescript
interface LoadingWrapperProps {
  isLoading: boolean;
  variant?: 'spinner' | 'skeleton' | 'progress';
  fullWidth?: boolean; // default: true
  fullHeight?: boolean; // default: false
  message?: string;
  minHeight?: string;
  backgroundColor?: string;
  spinnerSize?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}
```

## 3.2 Design Specifications

### Visual Design
- **Container**: เต็มความกว้างหน้าจอ (100% width) สอดคล้องกับ layout ใหม่
- **Spinner**: ขนาด 48px (medium default), สี primary จาก design system
- **Position**: จัดกลางแนวนอนและแนวตั้ง (ถ้าเป็น full height) หรือจัดกลางแนวนอนเท่านั้น
- **Background**: Semi-transparent overlay (rgba(255, 255, 255, 0.9)) หรือตาม theme
- **Animation**: Smooth rotation (1.5s linear infinite) หรือ fade pulse
- **Spacing**: Minimum height ขึ้นกับบริบท (200px default, adjustable)

### Loading Variants

#### 1. Spinner Variant (Default)
- ใช้สำหรับการโหลดข้อมูลทั่วไป
- แสดง animated spinner พร้อม optional loading message
- เหมาะกับหน้าที่โหลดเร็ว (< 3 วินาที)

#### 2. Skeleton Variant
- ใช้สำหรับหน้าที่มีโครงสร้างเนื้อหาชัดเจน
- แสดง placeholder ที่เลียนแบบโครงสร้างเนื้อหาจริง
- เหมาะกับ list, table, card layouts
- ช่วยลด perceived loading time

#### 3. Progress Variant
- ใช้สำหรับการโหลดที่รู้ความคืบหน้า
- แสดง progress bar พร้อมเปอร์เซ็นต์
- เหมาะกับ file upload, batch processing

## 3.3 Technical Implementation

### Component Structure
```
src/
├── components/
│   ├── common/
│   │   ├── LoadingWrapper/
│   │   │   ├── LoadingWrapper.tsx
│   │   │   ├── LoadingWrapper.styles.ts
│   │   │   ├── LoadingWrapper.test.tsx
│   │   │   └── index.ts
│   │   ├── LoadingSpinner/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── LoadingSpinner.styles.ts
│   │   │   └── index.ts
│   │   └── LoadingSkeleton/
│   │       ├── LoadingSkeleton.tsx
│   │       ├── SkeletonRow.tsx
│   │       ├── SkeletonCard.tsx
│   │       └── index.ts
│   └── pages/
│       └── [all page components to be updated]
├── hooks/
│   └── useLoading.ts (optional custom hook)
└── styles/
    └── animations.ts (loading animations)
```

### State Management Pattern
```typescript
// In page components
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetchData()
    .then(data => setData(data))
    .finally(() => setIsLoading(false));
}, []);

return (
  <LoadingWrapper isLoading={isLoading} variant="spinner">
    <ActualContent data={data} />
  </LoadingWrapper>
);
```

### CSS/Styling Approach
- ใช้ CSS-in-JS (styled-components หรือ emotion) หรือ CSS Modules
- ใช้ CSS custom properties สำหรับ theming
- Responsive โดยใช้ media queries
- Accessibility: รองรับ `prefers-reduced-motion`

### Animation Implementation
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
}
```

## 3.4 Integration Strategy

### Phase 1: Component Development
1. พัฒนา base loading components (LoadingWrapper, LoadingSpinner, LoadingSkeleton)
2. ทำ unit tests และ visual regression tests
3. จัดทำ Storybook stories สำหรับทุก variants
4. Review กับ UX/UI team

### Phase 2: Page Migration
1. สำรวจและจัดกลุ่มหน้าตามประเภท loading pattern
2. Update หน้าทีละกลุ่ม เริ่มจากหน้าสำคัญ/ใช้บ่อย
3. ทดสอบแต่ละหน้าหลัง update
4. Deploy แบบ progressive (feature flag ถ้าจำเป็น)

### Phase 3: Documentation & Cleanup
1. จัดทำ documentation และ usage guidelines
2. ลบ old loading components ที่ไม่ใช้แล้ว
3. Final QA round
4. Knowledge sharing กับทีม

## 3.5 Responsive Design
- **Desktop (>1024px)**: Loading container เต็มความกว้างตาม content area
- **Tablet (768px-1024px)**: ปรับขนาด spinner และ spacing ให้เหมาะสม
- **Mobile (<768px)**: Spinner ขนาดเล็กลง, message สั้นลง, optimized touch targets

## 3.6 Accessibility Considerations
- เพิ่ม `role="status"` และ `aria-live="polite"` ใน loading container
- เพิ่ม `aria-busy="true"` เมื่อกำลัง loading
- เพิ่ม screen reader text สำหรับ loading state
- รองรับ keyboard navigation (ไม่ trap focus)
- รองรับ `prefers-reduced-motion` สำหรับผู้ที่ sensitive ต่อ animation

# 4. ไฟล์ที่ต้องสร้าง/แก้ไข

| ลำดับ | ชื่อไฟล์/Path | ประเภท | รายละเอียด |
|------|---------------|--------|-----------|
| 1 | `src/components/common/LoadingWrapper/LoadingWrapper.tsx` | สร้างใหม่ | Main wrapper component สำหรับจัดการ loading state |
| 2 | `src/components/common/LoadingWrapper/LoadingWrapper.styles.ts` | สร้างใหม่ | Styles สำหรับ LoadingWrapper |
| 3 | `src/components/common/LoadingWrapper/LoadingWrapper.test.tsx` | สร้างใหม่ | Unit tests สำหรับ LoadingWrapper |
| 4 | `src/components/common/LoadingWrapper/index.ts` | สร้างใหม่ | Export file |
| 5 | `src/components/common/LoadingSpinner/LoadingSpinner.tsx` | สร้างใหม่ | Spinner indicator component |
| 6 | `src/components/common/LoadingSpinner/LoadingSpinner.styles.ts` | สร้างใหม่ | Styles และ animations สำหรับ spinner |
| 7 | `src/components/common/LoadingSpinner/index.ts` | สร้างใหม่ | Export file |
| 8 | `src/components/common/LoadingSkeleton/LoadingSkeleton.tsx` | สร้างใหม่ | Base skeleton component |
| 9 | `src/components/common/LoadingSkeleton/SkeletonRow.tsx` | สร้างใหม่ | Skeleton สำหรับแถวข้อมูล |
| 10 | `src/components/common/LoadingSkeleton/SkeletonCard.tsx` | สร้างใหม่ | Skeleton สำหรับ card layout |
| 11 | `src/components/common/LoadingSkeleton/index.ts` | สร้างใหม่ | Export file |
| 12 | `src/hooks/useLoading.ts` | สร้างใหม่ | Custom hook สำหรับจัดการ loading state (optional) |
| 13 | `src/styles/animations.ts` | สร้างใหม่/แก้ไข | Reusable animation definitions |
| 14 | `src/styles/theme.ts` | แก้ไข | เพิ่ม loading-related theme variables |
| 15 | `src/components/pages/[PageName]/[PageName].tsx` | แก้ไข | Update ทุกหน้าที่มี loading state (จำนวนแล้วแต่ระบบ) |
| 16 | `src/components/common/index.ts` | แก้ไข | Export loading components |
| 17 | `.storybook/stories/LoadingWrapper.stories.tsx` | สร้างใหม่ | Storybook stories สำหรับ LoadingWrapper |
| 18 | `.storybook/stories/LoadingSkeleton.stories.tsx` | สร้างใหม่ | Storybook stories สำหรับ LoadingSkeleton |
| 19 | `docs/components/loading-components.md` | สร้างใหม่ | Documentation และ usage guidelines |
| 20 | `src/types/loading.types.ts` | สร้างใหม่ | TypeScript type definitions สำหรับ loading components |
| 21 | `src/constants/loading.constants.ts` | สร้างใหม่ | Constants สำหรับ loading (sizes, durations, messages) |
| 22 | `src/utils/loading.utils.ts` | สร้างใหม่ | Utility functions สำหรับ loading (ถ้าจำเป็น) |
| 23 | `tests/visual/loading.spec.ts` | สร้างใหม่ | Visual regression tests |
| 24 | `tests/integration/loading.test.tsx` | สร้างใหม่ | Integration tests สำหรับ loading patterns |
| 25 | `package.json` | แก้ไข | เพิ่m dependencies ถ้าจำเป็น (เช่น animation libraries) |

**หมายเหตุ:** 
- จำนวนไฟล์ในข้อ 15 (page components) ขึ้นกับจำนวนหน้าในระบบจริง ต้องทำการ audit ก่อน
- ชื่อไฟล์และ path อาจปรับเปลี่ยนตามโครงสร้างโปรเจ็กต์จริง
- ถ้าใช้ CSS Modules แทน CSS-in-JS ให้เปลี่ยนนามสกุลไฟล์เป็น `.module.css`

# 5. เกณฑ์ว่าเสร็จ

## Development Checklist
- [ ] สร้าง LoadingWrapper component เสร็จสมบูรณ์
  - [ ] รองรับ props ตาม interface ที่กำหนด
  - [ ] สามารถ toggle loading state ได้
  - [ ] แสดงผล