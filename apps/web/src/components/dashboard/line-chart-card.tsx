'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { lineChartOptions } from '@/lib/dashboard/chart-config';
import type { ChartDataPoint } from '@/lib/dashboard/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function LineChartCard({ title, data }: { title: string; data: ChartDataPoint[] }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: title,
        data: data.map((d) => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="rounded-lg border p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-[250px]">
        {data.length > 0 ? (
          <Line data={chartData} options={lineChartOptions} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            ไม่มีข้อมูล
          </div>
        )}
      </div>
    </div>
  );
}
