import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, sql, inArray } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const statusLabels: Record<string, string> = {
  triage: 'คัดแยก', intent_draft: 'ร่าง Intent', intent_approved: 'Intent อนุมัติ',
  spec_draft: 'ร่าง Spec', spec_approved: 'Spec อนุมัติ', in_progress: 'กำลังพัฒนา',
  review: 'รีวิว', done: 'เสร็จ', cancelled: 'ยกเลิก',
};

const typeLabels: Record<string, string> = {
  feature: 'Feature', bug: 'Bug', data_fix: 'Data Fix',
};

const riskLabels: Record<string, string> = {
  low: 'ต่ำ', medium: 'กลาง', high: 'สูง',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // Count by status
  const statusCounts = await db
    .select({
      status: schema.issues.status,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.issues)
    .groupBy(schema.issues.status);

  // Count by type
  const typeCounts = await db
    .select({
      type: schema.issues.type,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.issues)
    .where(sql`${schema.issues.type} IS NOT NULL`)
    .groupBy(schema.issues.type);

  // Count by risk
  const riskCounts = await db
    .select({
      riskLevel: schema.issues.riskLevel,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.issues)
    .where(sql`${schema.issues.riskLevel} IS NOT NULL`)
    .groupBy(schema.issues.riskLevel);

  // Pending issues
  const pendingIssues = await db
    .select({
      id: schema.issues.id,
      githubIssueNumber: schema.issues.githubIssueNumber,
      title: schema.issues.title,
      status: schema.issues.status,
      type: schema.issues.type,
      createdAt: schema.issues.createdAt,
    })
    .from(schema.issues)
    .where(inArray(schema.issues.status, ['triage', 'in_progress']))
    .orderBy(schema.issues.createdAt)
    .limit(10);

  const totalIssues = statusCounts.reduce((sum, r) => sum + r.count, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {/* Total */}
      <div className="mb-6 rounded border bg-gray-50 p-4 text-center">
        <div className="text-3xl font-bold">{totalIssues}</div>
        <div className="text-sm text-gray-500">Issue ทั้งหมด</div>
      </div>

      {/* Status cards */}
      <h2 className="mb-3 text-lg font-semibold">ตามสถานะ</h2>
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Object.entries(statusLabels).map(([key, label]) => {
          const count = statusCounts.find((r) => r.status === key)?.count ?? 0;
          return (
            <Link
              key={key}
              href={`/issues?status=${key}`}
              className="rounded border p-3 text-center hover:bg-gray-50"
            >
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </Link>
          );
        })}
      </div>

      {/* Type cards */}
      <h2 className="mb-3 text-lg font-semibold">ตามประเภท</h2>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {Object.entries(typeLabels).map(([key, label]) => {
          const count = typeCounts.find((r) => r.type === key)?.count ?? 0;
          return (
            <Link
              key={key}
              href={`/issues?type=${key}`}
              className="rounded border p-3 text-center hover:bg-gray-50"
            >
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </Link>
          );
        })}
      </div>

      {/* Risk cards */}
      <h2 className="mb-3 text-lg font-semibold">ตามระดับความเสี่ยง</h2>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {Object.entries(riskLabels).map(([key, label]) => {
          const count = riskCounts.find((r) => r.riskLevel === key)?.count ?? 0;
          return (
            <Link
              key={key}
              href={`/issues?riskLevel=${key}`}
              className="rounded border p-3 text-center hover:bg-gray-50"
            >
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </Link>
          );
        })}
      </div>

      {/* Pending issues */}
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
                <span className="text-gray-400">#{issue.githubIssueNumber}</span>{' '}
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
    </main>
  );
}
