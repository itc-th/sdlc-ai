import type { SummaryCardData } from '@/lib/dashboard/types';

const colorClasses: Record<SummaryCardData['color'], string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
};

export function SummaryCard({ data }: { data: SummaryCardData }) {
  return (
    <div className="rounded-lg border p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${colorClasses[data.color]}`}>
          <span className="text-lg font-bold">{typeof data.value === 'number' ? data.value : '#'}</span>
        </div>
        {data.change !== null && (
          <span className={`text-xs font-medium ${
            data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {data.trend === 'up' ? '\u2191' : data.trend === 'down' ? '\u2193' : '\u2192'}
            {data.change > 0 ? '+' : ''}{data.change}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{data.value}</p>
        <p className="mt-1 text-xs text-gray-500">{data.title}</p>
      </div>
    </div>
  );
}
