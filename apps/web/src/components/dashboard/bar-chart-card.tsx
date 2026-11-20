'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { barChartOptions } from '@/lib/dashboard/chart-config';
import type { ChartDataPoint } from '@/lib/dashboard/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const STATUS_COLORS: Record<string, string> = {
  triage: '#6b7280',
  intent_draft: '#f59e0b',
  intent_approved: '#f59e0b',
  spec_draft: '#3b82f6',
  spec_approved: '#3b82f6',
  in_progress: '#8b5cf6',
  review: '#f97316',
  done: '#22c55e',
  cancelled: '#ef4444',
};

export function BarChartCard({ title, data }: { title: string; data: ChartDataPoint[] }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: title,
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => STATUS_COLORS[d.label] ?? '#6b7280'),
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="rounded-lg border p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-[250px]">
        {data.length > 0 ? (
          <Bar data={chartData} options={barChartOptions} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            ไม่มีข้อมูล
          </div>
        )}
      </div>
    </div>
  );
}
