# สรุปสิ่งที่ต้องทำ

ปรับปรุงการแสดง Loading state ในทุกหน้าของระบบให้สอดคล้องกับ UI แบบเต็มความกว้างหน้าจอ โดยสร้าง reusable loading components ใหม่ (LoadingWrapper, LoadingSpinner, LoadingSkeleton) และนำไปใช้แทนที่การแสดง loading แบบเดิมในหน้า Dashboard, Issues, Releases และหน้าย่อยทั้งหมด

---

# ไฟล์ที่ต้องสร้าง/แก้ไข

| Path | การเปลี่ยนแปลง | เหตุผล |
|------|----------------|---------|
| `apps/web/src/components/ui/loading-wrapper.tsx` | สร้างใหม่ | Main wrapper component สำหรับจัดการ loading state แบบเต็มความกว้าง รองรับ 3 variants (spinner/skeleton/progress) |
| `apps/web/src/components/ui/loading-spinner.tsx` | สร้างใหม่ | Spinner indicator พร้อม animation และ accessibility support |
| `apps/web/src/components/ui/loading-skeleton.tsx` | สร้างใหม่ | Base skeleton component พร้อม variants สำหรับ row, card, text |
| `apps/web/src/components/skeleton.tsx` | แก้ไข | ใช้ LoadingSkeleton component ใหม่แทนการ render skeleton แบบเดิม |
| `apps/web/src/app/dashboard/page.tsx` | แก้ไข | ใช้ LoadingWrapper แทน loading state เดิม |
| `apps/web/src/app/issues/page.tsx` | แก้ไข | ใช้ LoadingWrapper variant="skeleton" สำหรับ table |
| `apps/web/src/app/issues/[id]/page.tsx` | แก้ไข | ใช้ LoadingWrapper สำหรับโหลดรายละเอียด issue |
| `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx` | แก้ไข | ใช้ LoadingWrapper สำหรับโหลด intent |
| `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx` | แก้ไข | ใช้ LoadingWrapper สำหรับโหลด spec |
| `apps/web/src/app/issues/[id]/plan/[planId]/page.tsx` | แก้ไข | ใช้ LoadingWrapper สำหรับโหลด plan |
| `apps/web/src/app/releases/page.tsx` | แก้ไข | ใช้ LoadingWrapper variant="skeleton" สำหรับ release list |
| `apps/web/src/lib/constants/loading.ts` | สร้างใหม่ | Constants สำหรับ loading (sizes, durations, messages) |
| `apps/web/src/types/loading.ts` | สร้างใหม่ | TypeScript interfaces สำหรับ loading components |
| `apps/web/src/app/globals.css` | แก้ไข | เพิ่m keyframe animations สำหรับ spin, pulse และรองรับ prefers-reduced-motion |

---

# ขั้นตอนการทำงาน

## 1. สร้าง Loading Components ใหม่

### 1.1 สร้าง Type Definitions
**ไฟล์**: `apps/web/src/types/loading.ts`
```typescript
export type LoadingVariant = 'spinner' | 'skeleton' | 'progress';
export type LoadingSize = 'sm' | 'md' | 'lg';

export interface LoadingWrapperProps {
  isLoading: boolean;
  variant?: LoadingVariant;
  size?: LoadingSize;
  fullWidth?: boolean;
  fullHeight?: boolean;
  minHeight?: string;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: LoadingSize;
  className?: string;
}

export interface LoadingSkeletonProps {
  variant?: 'row' | 'card' | 'text' | 'circle';
  count?: number;
  className?: string;
}
```

### 1.2 สร้าง Constants
**ไฟล์**: `apps/web/src/lib/constants/loading.ts`
```typescript
export const LOADING_SIZES = {
  sm: '24px',
  md: '48px',
  lg: '72px',
} as const;

export const LOADING_MESSAGES = {
  default: 'กำลังโหลด...',
  saving: 'กำลังบันทึก...',
  processing: 'กำลังประมวลผล...',
} as const;

export const LOADING_MIN_HEIGHTS = {
  default: '200px',
  full: '100vh',
  section: '400px',
} as const;
```

### 1.3 สร้าง LoadingSpinner Component
**ไฟล์**: `apps/web/src/components/ui/loading-spinner.tsx`
- ใช้ SVG circle element สำหรับ spinner
- รองรับ size props (sm/md/lg) ดึงค่าจาก `LOADING_SIZES`
- ใช้ Tailwind class `animate-spin` หรือ CSS animation
- เพิ่ม `role="status"` และ `aria-label="loading"`
- Export เป็น client component (`'use client'`)

### 1.4 สร้าง LoadingSkeleton Component
**ไฟล์**: `apps/web/src/components/ui/loading-skeleton.tsx`
- Support variants: `row`, `card`, `text`, `circle`
- ใช้ Tailwind `animate-pulse` และ gradient background
- `count` prop สำหรับ repeat skeleton elements
- Export เป็น client component

### 1.5 สร้าง LoadingWrapper Component
**ไฟล์**: `apps/web/src/components/ui/loading-wrapper.tsx`
- รับ `isLoading` boolean เพื่อ toggle
- ถ้า `isLoading === true` แสดง loading UI ตาม variant
- ถ้า `isLoading === false` แสดง children
- `fullWidth` default เป็น `true` → ใช้ `w-full`
- `fullHeight` ถ้าเป็น `true` → ใช้ `min-h-screen` และจัดกลาง vertical
- Wrapper ใช้ `<div className="relative">` ครอบ children
- Loading overlay ใช้ `absolute inset-0 bg-background/90 flex items-center justify-center`
- Export เป็น client component

## 2. เพิ่ม Animations ใน globals.css

**ไฟล์**: `apps/web/src/app/globals.css`
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin,
  .animate-pulse {
    animation: none;
  }
}
```

## 3. แก้ไข skeleton.tsx ให้ใช้ LoadingSkeleton

**ไฟล์**: `apps/web/src/components/skeleton.tsx`
- Import `LoadingSkeleton` จาก `./ui/loading-skeleton`
- แก้ไข `PageSkeleton`, `DashboardSkeleton`, `TableSkeleton`, `DetailSkeleton`, `FormSkeleton` ให้ใช้ `<LoadingSkeleton>` แทน hardcode
- ตัวอย่าง: 
  ```tsx
  export function TableSkeleton() {
    return (
      <div className="space-y-4">
        <LoadingSkeleton variant="row" count={5} />
      </div>
    );
  }
  ```

## 4. Update หน้า Dashboard

**ไฟล์**: `apps/web/src/app/dashboard/page.tsx`
- Import `LoadingWrapper` และ `useState` (ถ้ายังไม่มี)
- เพิ่ม state: `const [isLoading, setIsLoading] = useState(true);`
- ใช้ `useEffect` ที่โหลดข้อมูล Dashboard → `setIsLoading(false)` หลังโหลดเสร็จ
- Wrap เนื้อหา dashboard ด้วย:
  ```tsx
  <LoadingWrapper isLoading={isLoading} variant="skeleton" minHeight="400px">
    {/* existing dashboard content */}
  </LoadingWrapper>
  ```

## 5. Update หน้า Issues List

**ไฟล์**: `apps/web/src/app/issues/page.tsx`
- Import `LoadingWrapper`
- เพิ่ม loading state
- ใช้ `variant="skeleton"` เนื่องจากเป็น table
- Wrap table content:
  ```tsx
  <LoadingWrapper isLoading={isLoading} variant="skeleton">
    <Table>...</Table>
  </LoadingWrapper>
  ```

## 6. Update หน้า Issue Detail

**ไฟล์**: `apps/web/src/app/issues/[id]/page.tsx`
- Import `LoadingWrapper`
- เพิ่ม loading state สำหรับการโหลด issue detail
- Wrap content ด้วย `variant="spinner"` (เนื่องจากโหลดข้อมูลเดียว)

## 7. Update หน้า Intent Detail

**ไฟล์**: `apps/web/src/app/issues/[id]/intent/[intentId]/page.tsx`
- Import `LoadingWrapper`
- Wrap content สำหรับโหลด intent document
- ใช้ `variant="spinner"` หรือ `variant="skeleton"` แล้วแต่ content structure

## 8. Update หน้า Spec Detail

**ไฟล์**: `apps/web/src/app/issues/[id]/intent/[intentId]/spec/[specId]/page.tsx`
- Import `LoadingWrapper`
- Wrap content สำหรับโหลด spec document
- ใช้ pattern เดียวกับ Intent

## 9. Update หน้า Plan Detail

**ไฟล์**: `apps/web/src/app/issues/[id]/plan/[planId]/page.tsx`
- Import `LoadingWrapper`
- Wrap content สำหรับโหลด plan document

## 10. Update หน้า Releases

**ไฟล์**: `apps/web/src/app/releases/page.tsx`
- Import `LoadingWrapper`
- เพิ่ม loading state
- Wrap release list ด้วย `variant="skeleton"`

---

# คำสั่งทดสอบ

```bash
# 1. Build project
cd apps/web
pnpm build

# 2. Run dev server และทดสอบ manual
pnpm dev
# เปิด http://localhost:3000
# ทดสอบหน้า: /dashboard, /issues, /issues/[id], /releases

# 3. ทดสอบ responsive (optional)
# ใช้ Chrome DevTools → Responsive Mode
# ทดสอบ mobile (375px), tablet (768px), desktop (1440px)

# 4. ทดสอบ accessibility (optional)
# ใช้ Chrome DevTools → Lighthouse
# ตรวจสอบ Accessibility score

# 5. ทดสอบ prefers-reduced-motion (optional)
# Chrome DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion
```

---

# เงื่อนไขสำเร็จ

- [ ] สร้าง `LoadingWrapper`, `LoadingSpinner`, `LoadingSkeleton` components เสร็จสมบูรณ์
- [ ] Component รองรับ props ตาม interface ที่กำหนด (variant, size, fullWidth, etc.)
- [ ] Loading state แสดงผลแบบเต็มความกว้างหน้าจอ (`w-full`)
- [ ] Animation ทำงานถ่ไหลและ smooth (1.5s rotation/pulse)
- [ ] รองรับ `prefers-reduced-motion` (animation หยุดเมื่อ user ตั้งค่า)
- [ ] หน้า Dashboard ใช้ LoadingWrapper แล้ว
- [ ] หน้า Issues List ใช้ LoadingWrapper variant="skeleton" แล้ว
- [ ] หน้า Issue Detail ใช้ LoadingWrapper แล้ว
- [ ] หน้า Intent/Spec/Plan Detail ใช้ LoadingWrapper แล้ว
- [ ] หน้า Releases ใช้ LoadingWrapper แล้ว
- [ ] ทดสอบ `pnpm build` ผ่านไม่มี error
- [ ] ทดสอบ `pnpm dev` แล้ว loading แสดงผลถูกต้องในทุกหน้า
- [ ] Loading state มีความสอดคล้องกันในทุกหน้า (ใช้ component เดียวกัน)
- [ ] ไม่มี regression bug ในหน้าที่แก้ไข (content แสดงผลถูกต้องหลัง loading เสร็จ)
- [ ] Code มี TypeScript type safety (ไม่มี `any` หรือ type error)
- [ ] Accessibility: มี `role="status"`, `aria-label` ครบ
- [ ] Responsive: ทดสอบ mobile/tablet/desktop แล้ว layout ไม่พัง

---

# ความเสี่ยงและข้อควรระวัง

## ความเสี่ยง

1. **Breaking Changes ใน Existing Pages**
   - หน้าบางหน้าอาจมี custom loading logic ที่ซับซ้อน
   - การ wrap ด้วย LoadingWrapper อาจทำให้ layout เพี้ยน
   - **แก้**: ทดสอบแต่ละหน้าทีละหน้า ตรวจสอบ layout ก่อน commit

2. **Performance Overhead**
   - การใช้ client component (`