import Link from 'next/link';
import { eq, desc, and } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission, getUserRole } from '@/lib/roles';

const statusLabels: Record<string, string> = {
  triage: 'คัดแยก',
  intent_draft: 'ร่าง Intent',
  intent_approved: 'Intent อนุมัติ',
  spec_draft: 'ร่าง Spec',
  spec_approved: 'Spec อนุมัติ',
  in_progress: 'กำลังพัฒนา',
  review: 'รอ Deploy',
  done: 'เสร็จ',
  cancelled: 'ยกเลิก',
};

const statusColors: Record<string, string> = {
  triage: 'bg-yellow-100 text-yellow-800',
  intent_draft: 'bg-gray-100 text-gray-800',
  intent_approved: 'bg-blue-100 text-blue-800',
  spec_draft: 'bg-gray-100 text-gray-800',
  spec_approved: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  review: 'bg-orange-100 text-orange-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const typeLabels: Record<string, string> = {
  feature: 'Feature',
  bug: 'Bug',
  data_fix: 'Data Fix',
};

const riskLabels: Record<string, string> = {
  low: 'ต่ำ',
  medium: 'กลาง',
  high: 'สูง',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; riskLevel?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = getUserRole(session);

  const params = await searchParams;
  const conditions = [];
  if (params.status) conditions.push(eq(schema.issues.status, params.status as typeof schema.issues.status.enumValues[number]));
  if (params.type) conditions.push(eq(schema.issues.type, params.type as typeof schema.issues.type.enumValues[number]));
  if (params.riskLevel) conditions.push(eq(schema.issues.riskLevel, params.riskLevel as typeof schema.issues.riskLevel.enumValues[number]));

  const issues = await db
    .select({
      id: schema.issues.id,
      githubIssueNumber: schema.issues.githubIssueNumber,
      title: schema.issues.title,
      type: schema.issues.type,
      riskLevel: schema.issues.riskLevel,
      status: schema.issues.status,
      assigneeName: schema.users.name,
      createdAt: schema.issues.createdAt,
    })
    .from(schema.issues)
    .leftJoin(schema.users, eq(schema.issues.assigneeId, schema.users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.issues.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Issues</h1>
        {hasPermission(role, 'issue.create') && (
          <Link
            href="/issues/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            สร้างเรื่องใหม่
          </Link>
        )}
      </div>

      {/* Filters */}
      <form className="mb-6 flex gap-3">
        <select name="status" defaultValue={params.status ?? ''} className="rounded border px-3 py-1.5 text-sm">
          <option value="">ทุกสถานะ</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="type" defaultValue={params.type ?? ''} className="rounded border px-3 py-1.5 text-sm">
          <option value="">ทุกประเภท</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="riskLevel" defaultValue={params.riskLevel ?? ''} className="rounded border px-3 py-1.5 text-sm">
          <option value="">ทุกระดับความเสี่ยง</option>
          {Object.entries(riskLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="rounded bg-gray-100 px-4 py-1.5 text-sm hover:bg-gray-200">
          กรอง
        </button>
      </form>

      {/* Table */}
      {issues.length === 0 ? (
        <p className="text-gray-500">ไม่พบ issue</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">#</th>
              <th className="pb-2 pr-4">ชื่อเรื่อง</th>
              <th className="pb-2 pr-4">ประเภท</th>
              <th className="pb-2 pr-4">ความเสี่ยง</th>
              <th className="pb-2 pr-4">สถานะ</th>
              <th className="pb-2 pr-4">ผู้รับผิดชอบ</th>
              <th className="pb-2">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} className="border-b hover:bg-gray-50">
                <td className="py-3 pr-4 text-gray-500">{issue.githubIssueNumber}</td>
                <td className="py-3 pr-4">
                  <Link href={`/issues/${issue.id}`} className="text-blue-600 hover:underline">
                    {issue.title}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  {issue.type && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{typeLabels[issue.type] ?? issue.type}</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {issue.riskLevel && (
                    <span className={`rounded px-2 py-0.5 text-xs ${riskColors[issue.riskLevel] ?? ''}`}>
                      {riskLabels[issue.riskLevel] ?? issue.riskLevel}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded px-2 py-0.5 text-xs ${statusColors[issue.status] ?? ''}`}>
                    {statusLabels[issue.status] ?? issue.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-600">{issue.assigneeName ?? '-'}</td>
                <td className="py-3 text-gray-500">
                  {new Date(issue.createdAt).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
