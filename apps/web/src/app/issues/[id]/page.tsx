import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { syncLabelsToGitHub } from '@/lib/github-sync';
import { hasPermission, getUserRole } from '@/lib/roles';
import { AiTriageButton } from '@/components/ai-triage-button';

const statusLabels: Record<string, string> = {
  triage: 'คัดแยก', intent_draft: 'ร่าง Intent', intent_approved: 'Intent อนุมัติ',
  spec_draft: 'ร่าง Spec', spec_approved: 'Spec อนุมัติ', in_progress: 'กำลังพัฒนา',
  review: 'รีวิว', done: 'เสร็จ', cancelled: 'ยกเลิก',
};

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const role = getUserRole(session);

  const { id } = await params;

  // Run all queries in parallel
  const [issues, allUsers, issueIntents, issuePlans] = await Promise.all([
    db
      .select({
        id: schema.issues.id,
        githubIssueNumber: schema.issues.githubIssueNumber,
        title: schema.issues.title,
        body: schema.issues.body,
        type: schema.issues.type,
        riskLevel: schema.issues.riskLevel,
        status: schema.issues.status,
        assigneeId: schema.issues.assigneeId,
        assigneeName: schema.users.name,
        createdAt: schema.issues.createdAt,
        updatedAt: schema.issues.updatedAt,
      })
      .from(schema.issues)
      .leftJoin(schema.users, eq(schema.issues.assigneeId, schema.users.id))
      .where(eq(schema.issues.id, id))
      .limit(1),
    db
      .select({ id: schema.users.id, name: schema.users.name, role: schema.users.role })
      .from(schema.users)
      .orderBy(schema.users.name),
    db
      .select({
        id: schema.intents.id,
        status: schema.intents.status,
        authorName: schema.users.name,
        createdAt: schema.intents.createdAt,
      })
      .from(schema.intents)
      .leftJoin(schema.users, eq(schema.intents.authorId, schema.users.id))
      .where(eq(schema.intents.issueId, id))
      .orderBy(desc(schema.intents.createdAt)),
    db
      .select({
        id: schema.plans.id,
        status: schema.plans.status,
        authorName: schema.users.name,
        createdAt: schema.plans.createdAt,
      })
      .from(schema.plans)
      .leftJoin(schema.users, eq(schema.plans.authorId, schema.users.id))
      .where(eq(schema.plans.issueId, id))
      .orderBy(desc(schema.plans.createdAt)),
  ]);

  if (issues.length === 0) notFound();
  const issue = issues[0];

  // Check if issue has an approved spec (needed to show plan section)
  const hasApprovedSpec = issueIntents.some((intent) => intent.status === 'approved');

  async function updateIssue(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'issue.triage')) throw new Error('ไม่มีสิทธิ์');

    const updates: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    const type = formData.get('type') as string;
    const riskLevel = formData.get('riskLevel') as string;
    const status = formData.get('status') as string;
    const assigneeId = formData.get('assigneeId') as string;

    if (type !== undefined) { updates.type = type || null; changes.type = type || null; }
    if (riskLevel !== undefined) { updates.riskLevel = riskLevel || null; changes.riskLevel = riskLevel || null; }
    if (status) { updates.status = status; changes.status = status; }
    if (assigneeId !== undefined) { updates.assigneeId = assigneeId || null; changes.assigneeId = assigneeId || null; }

    updates.updatedAt = new Date();

    await db.update(schema.issues).set(updates).where(eq(schema.issues.id, id));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'issue.updated',
      targetType: 'issue',
      targetId: id,
      metadata: changes,
    });

    await syncLabelsToGitHub(id);

    redirect(`/issues/${id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2">
        <Link href="/issues" className="text-sm text-blue-600 hover:underline">← กลับไปรายการ</Link>
      </div>
      <h1 className="text-2xl font-bold">
        <span className="text-gray-400">#{issue.githubIssueNumber}</span> {issue.title}
      </h1>
      <div className="mt-2 flex gap-2 text-xs">
        <span className="rounded bg-gray-100 px-2 py-0.5">
          {statusLabels[issue.status] ?? issue.status}
        </span>
        {issue.type && <span className="rounded bg-gray-100 px-2 py-0.5">{issue.type}</span>}
        {issue.riskLevel && <span className="rounded bg-gray-100 px-2 py-0.5">ความเสี่ยง: {issue.riskLevel}</span>}
      </div>

      {issue.body && (
        <div className="mt-6 rounded border p-4 text-sm whitespace-pre-wrap">
          {issue.body}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        สร้างเมื่อ {new Date(issue.createdAt).toLocaleString('th-TH')}
        {issue.assigneeName && <> · ผู้รับผิดชอบ: {issue.assigneeName}</>}
      </div>

      {/* Triage section */}
      {hasPermission(role, 'issue.triage') && (
      <div className="mt-8 rounded border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">คัดแยก (Triage)</h2>
          <AiTriageButton issueId={id} />
        </div>
        <form action={updateIssue} className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium">ประเภท</label>
            <select id="type" name="type" defaultValue={issue.type ?? ''} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">ยังไม่ระบุ</option>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="data_fix">Data Fix</option>
            </select>
          </div>
          <div>
            <label htmlFor="riskLevel" className="mb-1 block text-sm font-medium">ระดับความเสี่ยง</label>
            <select id="riskLevel" name="riskLevel" defaultValue={issue.riskLevel ?? ''} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">ยังไม่ระบุ</option>
              <option value="low">ต่ำ</option>
              <option value="medium">กลาง</option>
              <option value="high">สูง</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium">สถานะ</label>
            <select id="status" name="status" defaultValue={issue.status} className="w-full rounded border px-3 py-2 text-sm">
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assigneeId" className="mb-1 block text-sm font-medium">ผู้รับผิดชอบ</label>
            <select id="assigneeId" name="assigneeId" defaultValue={issue.assigneeId ?? ''} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">ไม่ระบุ</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
      )}
      {/* Intent section */}
      <div className="mt-8 rounded border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Intent</h2>
          {issueIntents.length === 0 && hasPermission(role, 'intent.create') && (
            <Link
              href={`/issues/${id}/intent/new`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              สร้าง Intent
            </Link>
          )}
        </div>
        {issueIntents.length > 0 ? (
          <div className="space-y-2">
            {issueIntents.map((intent) => (
              <Link
                key={intent.id}
                href={`/issues/${id}/intent/${intent.id}`}
                className="flex items-center justify-between rounded border p-3 text-sm hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    intent.status === 'approved' ? 'bg-green-100 text-green-800' :
                    intent.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {intent.status === 'approved' ? 'อนุมัติ' : intent.status === 'rejected' ? 'ปฏิเสธ' : 'ร่าง'}
                  </span>
                  <span className="text-gray-600">โดย {intent.authorName ?? 'ไม่ระบุ'}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(intent.createdAt).toLocaleString('th-TH')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">ยังไม่มี intent</p>
        )}
      </div>

      {/* Plan section — show when spec is approved */}
      {(issue.status === 'spec_approved' || issue.status === 'in_progress' || issue.status === 'review' || issue.status === 'done' || issuePlans.length > 0) && (
        <div className="mt-8 rounded border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">แผนการแก้โค้ด</h2>
            {issuePlans.length === 0 && (
              <Link
                href={`/issues/${id}/plan/new`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                สร้างแผน
              </Link>
            )}
          </div>
          {issuePlans.length > 0 ? (
            <div className="space-y-2">
              {issuePlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/issues/${id}/plan/${plan.id}`}
                  className="flex items-center justify-between rounded border p-3 text-sm hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      plan.status === 'approved' ? 'bg-green-100 text-green-800' :
                      plan.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {plan.status === 'approved' ? 'อนุมัติ' : plan.status === 'rejected' ? 'ปฏิเสธ' : 'ร่าง'}
                    </span>
                    <span className="text-gray-600">โดย {plan.authorName ?? 'ไม่ระบุ'}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(plan.createdAt).toLocaleString('th-TH')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">ยังไม่มีแผน</p>
          )}
        </div>
      )}
    </main>
  );
}
