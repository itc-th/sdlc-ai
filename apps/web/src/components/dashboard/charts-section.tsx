import type { DashboardData } from '@/lib/dashboard/types';
import { LineChartCard } from './line-chart-card';
import { BarChartCard } from './bar-chart-card';
import { PieChartCard } from './pie-chart-card';

export function ChartsSection({ charts }: { charts: DashboardData['charts'] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <LineChartCard title="Issue สร้างใหม่ (30 วันล่าสุด)" data={charts.issueTrend} />
      </div>
      <BarChartCard title="จำนวนตามสถานะ" data={charts.statusDistribution} />
      <PieChartCard title="สัดส่วนระดับความเสี่ยง" data={charts.riskDistribution} />
    </div>
  );
}
