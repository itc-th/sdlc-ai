'use client';

import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { pieChartOptions } from '@/lib/dashboard/chart-config';
import type { ChartDataPoint } from '@/lib/dashboard/types';

ChartJS.register(ArcElement, Tooltip, Legend);

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  low: 'ต่ำ',
  medium: 'กลาง',
  high: 'สูง',
};

export function PieChartCard({ title, data }: { title: string; data: ChartDataPoint[] }) {
  const chartData = {
    labels: data.map((d) => RISK_LABELS[d.label] ?? d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => RISK_COLORS[d.label] ?? '#6b7280'),
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };

  return (
    <div className="rounded-lg border p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-[250px]">
        {data.length > 0 ? (
          <Pie data={chartData} options={pieChartOptions} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            ไม่มีข้อมูล
          </div>
        )}
      </div>
    </div>
  );
}
