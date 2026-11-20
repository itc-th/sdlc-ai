# สรุปสิ่งที่ต้องทำ

ปรับปรุงหน้า Dashboard (`apps/web/src/app/dashboard/page.tsx`) ให้แสดง Summary Cards พร้อมกราฟจาก Chart.js โดยใช้ข้อมูล issue จากฐานข้อมูล แสดงสถิติแบบ real-time, responsive design, และเพิ่ม loading/error state ที่เหมาะสม

---

## ไฟล์ที่ต้องสร้าง/แก้ไข

| Path | การเปลี่ยนแปลง | เหตุผล |
|------|---------------|--------|
| `apps/web/package.json` | เพิ่ม dependencies: `chart.js`, `react-chartjs-2` | ติดตั้ง Chart.js library |
| `apps/web/src/app/dashboard/page.tsx` | ปรับจาก server component ให้ดึงข้อมูล issue และส่งไปยัง client components | Main dashboard page พร้อม data fetching |
| `apps/web/src/components/dashboard/summary-cards-section.tsx` | สร้างใหม่ — wrapper สำหรับ 4 summary cards | จัดการ layout grid responsive |
| `apps/web/src/components/dashboard/summary-card.tsx` | สร้างใหม่ — card แสดง KPI พร้อม icon, number, change percentage | แสดงข้อมูลสรุปแต่ละ metric |
| `apps/web/src/components/dashboard/charts-section.tsx` | สร้างใหม่ — wrapper สำหรับกราฟ 3 ชนิด | จัดการ layout กราฟ |
| `apps/web/src/components/dashboard/line-chart-card.tsx` | สร้างใหม่ — Line chart แสดง issue creation trend | แสดงแนวโน้มการสร้าง issue ตามเวลา |
| `apps/web/src/components/dashboard/bar-chart-card.tsx` | สร้างใหม่ — Bar chart แสดง issue ตาม status | แสดงจำนวน issue แต่ละสถานะ |
| `apps/web/src/components/dashboard/pie-chart-card.tsx` | สร้างใหม่ — Pie chart แสดง issue ตาม risk | แสดงสัดส่วน risk level |
| `apps/web/src/lib/dashboard/types.ts` | สร้างใหม่ — TypeScript interfaces | Type safety สำหรับข้อมูล dashboard |
| `apps/web/src/lib/dashboard/data-processor.ts` | สร้างใหม่ — ฟังก์ชันแปลงข้อมูล issue เป็นรูปแบบสำหรับกราฟ | Data transformation logic |
| `apps/web/src/lib/dashboard/chart-config.ts` | สร้างใหม่ — Chart.js default configurations | Reusable chart settings |

---

## ขั้นตอนการทำงาน

### 1. ติดตั้ง Dependencies

```bash
cd apps/web
pnpm add chart.js react-chartjs-2
```

### 2. สร้าง Type Definitions

**ไฟล์:** `apps/web/src/lib/dashboard/types.ts`

```typescript
export interface SummaryCardData {
  title: string;
  value: number | string;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
  color: 'blue' | 'green' | 'orange' | 'purple';
  icon: string; // lucide-react icon name
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  summary: {
    totalIssues: SummaryCardData;
    inProgress: SummaryCardData;
    completed: SummaryCardData;
    avgCompletionTime: SummaryCardData;
  };
  charts: {
    issueTrend: ChartDataPoint[]; // last 30 days
    statusDistribution: ChartDataPoint[];
    riskDistribution: ChartDataPoint[];
  };
}
```

### 3. สร้าง Data Processor

**ไฟล์:** `apps/web/src/lib/dashboard/data-processor.ts`

```typescript
import { db } from '@/lib/db';
import { issues } from '@repo/db/schema';
import { sql, count, and, gte } from 'drizzle-orm';
import type { DashboardData } from './types';

export async function fetchDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Total issues
  const totalIssues = await db.select({ count: count() }).from(issues);
  
  // In progress issues
  const inProgressIssues = await db
    .select({ count: count() })
    .from(issues)
    .where(sql`${issues.status} = 'in_progress'`);

  // Completed issues
  const completedIssues = await db
    .select({ count: count() })
    .from(issues)
    .where(sql`${issues.status} = 'done'`);

  // Issue trend (last 30 days) - group by date
  const trendData = await db
    .select({
      date: sql<string>`DATE(${issues.createdAt})`,
      count: count(),
    })
    .from(issues)
    .where(gte(issues.createdAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${issues.createdAt})`)
    .orderBy(sql`DATE(${issues.createdAt})`);

  // Status distribution
  const statusData = await db
    .select({
      status: issues.status,
      count: count(),
    })
    .from(issues)
    .groupBy(issues.status);

  // Risk distribution
  const riskData = await db
    .select({
      risk: issues.risk,
      count: count(),
    })
    .from(issues)
    .where(sql`${issues.risk} IS NOT NULL`)
    .groupBy(issues.risk);

  // Calculate changes (mock - ต้องเก็บข้อมูลเก่าเปรียบเทียบ)
  const totalChange = 5.2;
  const inProgressChange = -2.3;
  const completedChange = 8.1;

  return {
    summary: {
      totalIssues: {
        title: 'Total Issues',
        value: totalIssues[0].count,
        change: totalChange,
        trend: totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'neutral',
        color: 'blue',
        icon: 'FileText',
      },
      inProgress: {
        title: 'In Progress',
        value: inProgressIssues[0].count,
        change: inProgressChange,
        trend: inProgressChange > 0 ? 'up' : inProgressChange < 0 ? 'down' : 'neutral',
        color: 'orange',
        icon: 'Activity',
      },
      completed: {
        title: 'Completed',
        value: completedIssues[0].count,
        change: completedChange,
        trend: completedChange > 0 ? 'up' : completedChange < 0 ? 'down' : 'neutral',
        color: 'green',
        icon: 'CheckCircle2',
      },
      avgCompletionTime: {
        title: 'Avg. Completion Time',
        value: '5.2 days',
        change: -1.5,
        trend: 'down',
        color: 'purple',
        icon: 'Clock',
      },
    },
    charts: {
      issueTrend: trendData.map((d) => ({ label: d.date, value: d.count })),
      statusDistribution: statusData.map((d) => ({ label: d.status, value: d.count })),
      riskDistribution: riskData.map((d) => ({ label: d.risk!, value: d.count })),
    },
  };
}
```

### 4. สร้าง Chart Config

**ไฟล์:** `apps/web/src/lib/dashboard/chart-config.ts`

```typescript
import type { ChartOptions } from 'chart.js';

export const baseChartOptions: ChartOptions<'line' | 'bar' | 'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },
};

export const lineChartOptions: ChartOptions<'line'> = {
  ...baseChartOptions,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

export const barChartOptions: ChartOptions<'bar'> = {
  ...baseChartOptions,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

export const pieChartOptions: ChartOptions<'pie'> = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      display: true,
      position: 'right',
    },
  },
};
```

### 5. สร้าง Summary Card Component

**ไฟล์:** `apps/web/src/components/dashboard/summary-card.tsx`

```typescript
'use client';

import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { SummaryCardData } from '@/lib/dashboard/types';

interface SummaryCardProps {
  data: SummaryCardData;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
};

export function SummaryCard({ data }: SummaryCardProps) {
  const Icon = Icons[data.icon as keyof typeof Icons] as LucideIcon;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg border ${
            colorClasses[data.color]
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            data.trend === 'up'
              ? 'text-green-600'
              : data.trend === 'down'
              ? 'text-red-600'
              : 'text-gray-500'
          }`}
        >
          {data.trend === 'up' && <Icons.TrendingUp className="h-4 w-4" />}
          {data.trend === 'down' && <Icons.TrendingDown className="h-4 w-4" />}
          {data.change > 0 ? '+' : ''}
          {data.change}%
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-muted-foreground">{data.title}</h3>
        <p className="mt-2 text-3xl font-bold">{data.value}</p>
      </div>
    </div>
  );
}
```

**ไฟล์:** `apps/web/src/components/dashboard/summary-cards-section.tsx`

```typescript
'use client';

import type { DashboardData } from '@/lib/dashboard/types';
import { SummaryCard } from './summary-card';

interface SummaryCardsSectionProps {
  data: DashboardData['summary'];
}

export function SummaryCardsSection({ data }: SummaryCardsSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard data={data.totalIssues} />
      <SummaryCard data={data.inProgress} />
      <SummaryCard data={data.completed} />
      <SummaryCard data={data.avgCompletionTime} />
    </div>
  );
}
```

### 6. สร้าง Chart Components

**ไฟล์:** `apps/web/src/components/dashboard/line-chart-card.tsx`

```typescript
'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { lineChartOptions } from '@/lib/dashboard/chart-config';
import type { ChartDataPoint } from '@/lib/dashboard/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface LineChartCardProps {
  data: ChartDataPoint[];
}

export function LineChartCard({ data }: LineChartCardProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Issues Created',
        data: data.map((d) => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Issue Creation Trend (Last 30 Days)</h3>
      <div className="h-[300px]">
        <Line data={chartData} options={lineChartOptions} />
      </div>
    </div>
  );
}
```

**ไฟล์:** `apps/web/src/components/dashboard/bar-chart-card.tsx`

```typescript
'use client';