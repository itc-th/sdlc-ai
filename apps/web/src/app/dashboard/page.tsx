import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql, inArray, gte, count } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { FormLayout } from '@/components/layout/form-layout';
import { SummaryCardsSection } from '@/components/dashboard/summary-cards-section';
import { ChartsSection } from '@/components/dashboard/charts-section';
import type { SummaryCardData, ChartDataPoint } from '@/lib/dashboard/types';

const statusLabels: Record<string, string> = {
  triage: 'คัดแยก', intent_draft: 'ร่าง Intent', intent_approved: 'Intent อนุมัติ',
  spec_draft: 'ร่าง Spec', spec_approved: 'Spec อนุมัติ', in_progress: 'กำลังพัฒนา',
  review: 'รีวิว', done: 'เสร็จ', cancelled: 'ยกเลิก',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [statusCounts, riskCounts, trendData, pendingIssues] = await Promise.all([
    db
      .select({
        status: schema.issues.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.issues)
      .groupBy(schema.issues.status),
    db
      .select({
        riskLevel: schema.issues.riskLevel,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.issues)
      .where(sql`${schema.issues.riskLevel} IS NOT NULL`)
      .groupBy(schema.issues.riskLevel),
    db
      .select({
        date: sql<string>`to_char(${schema.issues.createdAt}, 'MM/DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.issues)
      .where(gte(schema.issues.createdAt, thirtyDaysAgo))
      .groupBy(sql`to_char(${schema.issues.createdAt}, 'MM/DD')`, sql`DATE(${schema.issues.createdAt})`)
      .orderBy(sql`DATE(${schema.issues.createdAt})`),
    db
      .select({
        id: schema.issues.id,
        issueNumber: schema.issues.issueNumber,
        title: schema.issues.title,
        status: schema.issues.status,
        type: schema.issues.type,
      })
      .from(schema.issues)
      .where(inArray(schema.issues.status, ['triage', 'in_progress']))
      .orderBy(schema.issues.createdAt)
      .limit(10),
  ]);

  const totalIssues = statusCounts.reduce((sum, r) => sum + r.count, 0);
  const inProgressCount = statusCounts.find((r) => r.status === 'in_progress')?.count ?? 0;
  const doneCount = statusCounts.find((r) => r.status === 'done')?.count ?? 0;
  const reviewCount = statusCounts.find((r) => r.status === 'review')?.count ?? 0;

  const summaryCards: SummaryCardData[] = [
    { title: 'Issue ทั้งหมด', value: totalIssues, change: null, trend: 'neutral', color: 'blue' },
    { title: 'กำลังพัฒนา', value: inProgressCount, change: null, trend: 'neutral', color: 'orange' },
    { title: 'รอ Deploy', value: reviewCount, change: null, trend: 'neutral', color: 'purple' },
    { title: 'เสร็จแล้ว', value: doneCount, change: null, trend: 'neutral', color: 'green' },
  ];

  const issueTrend: ChartDataPoint[] = trendData.map((d) => ({ label: d.date, value: d.count }));
  const statusDistribution: ChartDataPoint[] = statusCounts.map((d) => ({
    label: d.status,
    value: d.count,
  }));
  const riskDistribution: ChartDataPoint[] = riskCounts.map((d) => ({
    label: d.riskLevel!,
    value: d.count,
  }));

  return (
    <FormLayout
      breadcrumbs={[{ label: 'หน้าแรก' }]}
      title="แดชบอร์ด"
      description="ภาพรวมสถิติเรื่องและการดำเนินงาน"
    >
      {/* Summary Cards */}
      <SummaryCardsSection cards={summaryCards} />

      {/* Charts */}
      <div className="mt-6">
        <ChartsSection charts={{ issueTrend, statusDistribution, riskDistribution }} />
      </div>

      {/* Pending issues */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Issue ที่ค้าง</h2>
        {pendingIssues.length > 0 ? (
          <div className="rounded border">
            {pendingIssues.map((issue, i) => (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className={`flex items-center justify-between p-3 text-sm hover:bg-gray-50 ${i > 0 ? 'border-t' : ''}`}
              >
                <div>
                  <span className="text-gray-400">#{issue.issueNumber}</span>{' '}
                  {issue.title}
                </div>
                <div className="flex items-center gap-2">
                  {issue.type && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{issue.type}</span>
                  )}
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                    {statusLabels[issue.status] ?? issue.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">ไม่มี issue ค้าง</p>
        )}
      </div>
    </FormLayout>
  );
}
