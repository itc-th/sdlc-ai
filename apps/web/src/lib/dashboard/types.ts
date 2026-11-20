export interface SummaryCardData {
  title: string;
  value: number | string;
  change: number | null; // percentage, null = no comparison data
  trend: 'up' | 'down' | 'neutral';
  color: 'blue' | 'green' | 'orange' | 'purple';
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DashboardData {
  summary: SummaryCardData[];
  charts: {
    issueTrend: ChartDataPoint[];
    statusDistribution: ChartDataPoint[];
    riskDistribution: ChartDataPoint[];
  };
}
