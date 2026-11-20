## 1. ระบบย่อยที่เกี่ยวข้อง

- **Dashboard Module** - ระบบหลักที่จะทำการปรับปรุง
- **API Gateway / Backend Services** - สำหรับดึงข้อมูล KPIs และข้อมูลกราฟ
- **Authentication & Authorization Module** - ตรวจสอบสิทธิ์การเข้าถึงข้อมูล
- **UI Component Library** - คลังส่วนประกอบ UI ที่ใช้ร่วมกันในระบบ
- **State Management** (Redux/Context API) - จัดการ state ของ Dashboard
- **Chart.js Library** - ไลบรารีสำหรับสร้างกราฟแสดงข้อมูล

## 2. ข้อเท็จจริงจากระบบปัจจุบัน

### 2.1 โครงสร้างหน้า Dashboard ปัจจุบัน
- แสดงข้อมูลในรูปแบบตาราง (Table) เป็นหลัก
- ไม่มีการแสดงข้อมูลสรุป (Summary) ที่เด่นชัด
- ไม่มีกราฟหรือ visualization ของข้อมูล
- Layout แบบ static ไม่ responsive บนอุปกรณ์ขนาดเล็ก

### 2.2 API Endpoints ที่มีอยู่
- `GET /api/dashboard/summary` - ดึงข้อมูล KPIs (Total Users, Revenue, Orders, etc.)
- `GET /api/dashboard/statistics?period={daily|weekly|monthly}` - ดึงข้อมูลสถิติตามช่วงเวลา
- `GET /api/dashboard/trends?type={sales|users|revenue}&range={7d|30d|90d}` - ดึงข้อมูล trends

### 2.3 ข้อมูลที่ระบบปัจจุบันมี
- ยอดผู้ใช้งานทั้งหมด (Total Users)
- ยอดขายรวม (Total Revenue)
- จำนวนคำสั่งซื้อ (Total Orders)
- อัตราการเติบโต (Growth Rate) แยกตามหมวดหมู่
- ข้อมูล time-series สำหรับ 7, 30, 90 วัน

### 2.4 Tech Stack ปัจจุบัน
- **Frontend**: React 18.x, TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS / Styled Components
- **HTTP Client**: Axios
- **Build Tool**: Vite / Webpack

### 2.5 ข้อจำกัดและ Pain Points
- ผู้ใช้ต้อง scroll หาข้อมูลที่ต้องการ
- ไม่มี visual representation ทำให้เข้าใจข้อมูลได้ช้า
- Performance ช้าเมื่อมีข้อมูลมาก (render table หนัก)
- ไม่รองรับการใช้งานบน mobile/tablet

## 3. ข้อเสนอการออกแบบ

### 3.1 Architecture Design

```
┌─────────────────────────────────────────────────┐
│           Dashboard Container                    │
│  - Fetch data from API                          │
│  - Manage loading/error states                  │
│  - Coordinate child components                  │
└───────────────┬─────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼──────┐         ┌──────▼─────────┐
│ Summary  │         │  Chart         │
│ Cards    │         │  Section       │
│ Section  │         │                │
└──────────┘         └────────────────┘
```

### 3.2 Component Structure

```typescript
src/
├── features/
│   └── dashboard/
│       ├── components/
│       │   ├── DashboardContainer.tsx      // Main container
│       │   ├── SummaryCardsSection.tsx     // Cards wrapper
│       │   ├── SummaryCard.tsx             // Individual card
│       │   ├── ChartsSection.tsx           // Charts wrapper
│       │   ├── LineChartCard.tsx           // Line chart component
│       │   ├── BarChartCard.tsx            // Bar chart component
│       │   ├── PieChartCard.tsx            // Pie chart component
│       │   ├── LoadingState.tsx            // Loading skeleton
│       │   └── ErrorState.tsx              // Error display
│       ├── hooks/
│       │   ├── useDashboardData.ts         // Data fetching hook
│       │   ├── useChartData.ts             // Chart data processing
│       │   └── useResponsive.ts            // Responsive helper
│       ├── types/
│       │   └── dashboard.types.ts          // TypeScript interfaces
│       ├── utils/
│       │   ├── chartConfig.ts              // Chart.js configurations
│       │   ├── dataFormatter.ts            // Data transformation
│       │   └── constants.ts                // Constants
│       └── services/
│           └── dashboardApi.ts             // API calls
```

### 3.3 Summary Cards Design

**Card Types และข้อมูลที่แสดง:**

1. **Total Users Card**
   - จำนวนผู้ใช้ทั้งหมด
   - เปอร์เซ็นต์เปลี่ยนแปลง (increase/decrease)
   - Icon แสดง trend (↑/↓)
   - สี: Blue

2. **Total Revenue Card**
   - ยอดขายรวม (formatted เป็นสกุลเงิน)
   - เปอร์เซ็นต์เปลี่ยนแปลง
   - Icon แสดง trend
   - สี: Green

3. **Total Orders Card**
   - จำนวนคำสั่งซื้อทั้งหมด
   - เปอร์เซ็นต์เปลี่ยนแปลง
   - Icon แสดง trend
   - สี: Orange

4. **Average Order Value Card**
   - ยอดขายเฉลี่ยต่อ order
   - เปอร์เซ็นต์เปลี่ยนแปลง
   - Icon แสดง trend
   - สี: Purple

**Card Layout (Desktop):**
```
[Card 1] [Card 2] [Card 3] [Card 4]
  25%      25%      25%      25%
```

**Card Layout (Tablet):**
```
[Card 1] [Card 2]
  50%      50%
[Card 3] [Card 4]
  50%      50%
```

**Card Layout (Mobile):**
```
[Card 1]
  100%
[Card 2]
  100%
[Card 3]
  100%
[Card 4]
  100%
```

### 3.4 Chart Configuration

**Chart Types และการใช้งาน:**

1. **Line Chart - Revenue Trend**
   - แสดงแนวโน้มรายได้ตามเวลา (7/30/90 วัน)
   - X-axis: วันที่
   - Y-axis: ยอดรายได้
   - สามารถเลือกช่วงเวลาได้
   - แสดง tooltip เมื่อ hover

2. **Bar Chart - Orders by Category**
   - แสดงจำนวน orders แบ่งตามหมวดหมู่สินค้า
   - X-axis: หมวดหมู่
   - Y-axis: จำนวน orders
   - เรียง descending ตามจำนวน

3. **Pie Chart - User Distribution**
   - แสดงสัดส่วนผู้ใช้แบ่งตาม segment/status
   - แสดง percentage
   - Interactive legend

**Chart.js Configuration Template:**

```typescript
// chartConfig.ts
export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const,
  },
};

export const lineChartOptions = {
  ...baseChartOptions,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number) => formatCurrency(value),
      },
    },
  },
};
```

### 3.5 Data Flow

```
User Loads Dashboard
        ↓
DashboardContainer mounted
        ↓
useDashboardData hook triggered
        ↓
├─→ Fetch Summary Data (/api/dashboard/summary)
│        ↓
│   Update Redux Store
│        ↓
│   Render SummaryCards
│
└─→ Fetch Chart Data (/api/dashboard/statistics)
         ↓
    Process data (useChartData)
         ↓
    Update Redux Store
         ↓
    Render Charts
```

### 3.6 State Management

**Redux Slice Structure:**

```typescript
// dashboardSlice.ts
interface DashboardState {
  summary: {
    data: SummaryData | null;
    loading: boolean;
    error: string | null;
  };
  charts: {
    data: ChartData | null;
    loading: boolean;
    error: string | null;
  };
  filters: {
    period: 'daily' | 'weekly' | 'monthly';
    dateRange: { start: string; end: string };
  };
}

// Actions:
// - fetchSummaryData
// - fetchChartData
// - updateFilters
// - clearErrors
```

### 3.7 API Integration

**Service Layer:**

```typescript
// dashboardApi.ts
export const dashboardApi = {
  getSummary: async (): Promise<SummaryData> => {
    const response = await apiClient.get('/api/dashboard/summary');
    return response.data;
  },

  getStatistics: async (params: StatisticsParams): Promise<ChartData> => {
    const response = await apiClient.get('/api/dashboard/statistics', { params });
    return response.data;
  },

  getTrends: async (params: TrendsParams): Promise<TrendData> => {
    const response = await apiClient.get('/api/dashboard/trends', { params });
    return response.data;
  },
};
```

### 3.8 Responsive Design Strategy

**Breakpoints:**
- Desktop: ≥ 1024px
- Tablet: 768px - 1023px
- Mobile: < 768px

**Strategy:**
- ใช้ CSS Grid/Flexbox สำหรับ layout
- ใช้ Tailwind responsive utilities
- Chart resize automatically ด้วย responsive: true
- Font sizes ปรับตาม viewport
- Touch-friendly targets บน mobile (min 44x44px)

### 3.9 Performance Optimization

**Techniques:**

1. **Code Splitting**
   - Lazy load Chart.js และ components
   - Dynamic import สำหรับ chart types ที่ไม่ได้ใช้ทันที

2. **Memoization**
   - ใช้ `React.memo()` สำหรับ cards และ charts
   - ใช้ `useMemo()` สำหรับ data processing
   - ใช้ `useCallback()` สำหรับ event handlers

3. **Data Caching**
   - Cache API responses ใน Redux (5 minutes)
   - Implement stale-while-revalidate pattern

4. **Chart Optimization**
   - Limit data points (max 90 สำหรับ line chart)
   - Disable animations บน mobile (optional)
   - Use decimation plugin สำหรับ dataset ใหญ่

### 3.10 Error Handling & Loading States

**Loading State:**
- แสดง Skeleton loaders สำหรับ cards และ charts
- ใช้ shimmer effect
- Maintain layout stability (no layout shift)

**Error State:**
- แสดง error message พร้อม retry button
- แยก error แสดงต่าง component (card error ไม่กระทบ charts)
- Log errors ไปยัง monitoring service

**Empty State:**
- แสดง message เมื่อไม่มีข้อมูล
- Provide helpful guidance

### 3.11 Accessibility (a11y)

- Semantic HTML tags
- ARIA labels สำหรับ charts และ cards
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratio ≥ 4.5:1
- Alternative text สำหรับ visual data

### 3.12 Testing Strategy

**Unit Tests:**
- Component rendering tests
- Hook logic tests
- Utility function tests
- Data formatter tests

**Integration Tests:**
- API integration tests
- Redux store tests
- Chart data flow tests

**E2E Tests (Optional):**
- Dashboard loading scenario
- Filter interaction scenario
- Responsive behavior scenario

## 4. ไฟล์ที่ต้องสร้าง/แก้ไข

| ลำดับ | ประเภท | ชื่อไฟล์ | Path | คำอธิบาย |
|------|--------|---------|------|----------|
| 1 | สร้างใหม่ | DashboardContainer.tsx | src/features/dashboard/components/ | Main container component |
| 2 | สร้างใหม่ | SummaryCardsSection.tsx | src/features/dashboard/components/ | Wrapper สำหรับ summary cards |
| 3 | สร้างใหม่ | SummaryCard.tsx | src/features/dashboard/components/ | Individual summary card component |
| 4 | สร้างใหม่ | ChartsSection.tsx | src/features/dashboard/components/ | Wrapper สำหรับ charts |
| 5 | สร้างใหม่ | LineChartCard.tsx | src/features/dashboard/components/ | Line chart component |
| 6 | สร้างใหม่ | BarChartCard.