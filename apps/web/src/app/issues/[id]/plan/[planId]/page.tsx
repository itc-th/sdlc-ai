import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const decisionLabels: Record<string, string> = {
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  revision_requested: 'ขอแก้ไข',
};

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id, planId } = await params;

  const issues = await db
    .select({ githubIssueNumber: schema.issues.githubIssueNumber, title: schema.issues.title })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) notFound();
  const issue = issues[0];

  const plans = await db
    .select({
      id: schema.plans.id,
      issueId: schema.plans.issueId,
      content: schema.plans.content,
      status: schema.plans.status,
      authorName: schema.users.name,
      createdAt: schema.plans.createdAt,
      updatedAt: schema.plans.updatedAt,
    })
    .from(schema.plans)
    .leftJoin(schema.users, eq(schema.plans.authorId, schema.users.id))
    .where(eq(schema.plans.id, planId))
    .limit(1);

  if (plans.length === 0 || plans[0].issueId !== id) notFound();
  const plan = plans[0];

  const planApprovals = await db
    .select({
      id: schema.approvals.id,
      decision: schema.approvals.decision,
      comment: schema.approvals.comment,
      approverName: schema.users.name,
      createdAt: schema.approvals.createdAt,
    })
    .from(schema.approvals)
    .leftJoin(schema.users, eq(schema.approvals.approverId, schema.users.id))
    .where(eq(schema.approvals.targetId, planId))
    .orderBy(desc(schema.approvals.createdAt));

  async function updatePlan(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const content = (formData.get('content') as string)?.trim();
    if (!content || content.length > 50000) throw new Error('invalid content');

    await db
      .update(schema.plans)
      .set({ content, updatedAt: new Date() })
      .where(eq(schema.plans.id, planId));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'plan.updated',
      targetType: 'plan',
      targetId: planId,
      metadata: { issueId: id },
    });

    redirect(`/issues/${id}/plan/${planId}`);
  }

  async function reviewPlan(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const decision = formData.get('decision') as string;
    const comment = (formData.get('comment') as string)?.trim() || null;

    const validDecisions = ['approved', 'rejected', 'revision_requested'] as const;
    if (!validDecisions.includes(decision as typeof validDecisions[number])) {
      throw new Error('invalid decision');
    }
    if (comment && comment.length > 2000) throw new Error('comment too long');

    await db.insert(schema.approvals).values({
      targetType: 'plan',
      targetId: planId,
      approverId: session.user.id,
      decision: decision as typeof validDecisions[number],
      comment,
    });

    const newStatus = decision === 'approved' ? 'approved' : 'draft';
    await db
      .update(schema.plans)
      .set({ status: newStatus as 'draft' | 'approved' | 'rejected', updatedAt: new Date() })
      .where(eq(schema.plans.id, planId));

    // Update issue status when plan approved
    if (decision === 'approved') {
      await db
        .update(schema.issues)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(schema.issues.id, id));
    }

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: `plan.${decision}`,
      targetType: 'plan',
      targetId: planId,
      metadata: { issueId: id, decision, comment },
    });

    redirect(`/issues/${id}/plan/${planId}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/issues/${id}`} className="text-sm text-blue-600 hover:underline">
          ← กลับไป #{issue.githubIssueNumber} {issue.title}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">แผนการแก้โค้ด</h1>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
          plan.status === 'approved' ? 'bg-green-100 text-green-800' :
          plan.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {plan.status === 'approved' ? 'อนุมัติ' : plan.status === 'rejected' ? 'ปฏิเสธ' : 'ร่าง'}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        โดย {plan.authorName ?? 'ไม่ระบุ'} · สร้างเมื่อ {new Date(plan.createdAt).toLocaleString('th-TH')}
      </div>

      {plan.status === 'draft' ? (
        <form action={updatePlan} className="mt-6">
          <label htmlFor="content" className="mb-1 block text-sm font-medium">เนื้อหา</label>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            maxLength={50000}
            defaultValue={plan.content ?? ''}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit"
            className="mt-3 rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            บันทึก
          </button>
        </form>
      ) : (
        <div className="mt-6 rounded border p-4 text-sm font-mono whitespace-pre-wrap">
          {plan.content ?? '(ไม่มีเนื้อหา)'}
        </div>
      )}

      {plan.status === 'draft' && (
        <div className="mt-8 rounded border p-4">
          <h2 className="mb-4 text-lg font-semibold">ตรวจสอบ</h2>
          <form action={reviewPlan} className="flex flex-col gap-3">
            <div>
              <label htmlFor="comment" className="mb-1 block text-sm font-medium">ความเห็น</label>
              <textarea
                id="comment"
                name="comment"
                rows={3}
                maxLength={2000}
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="ความเห็นเพิ่มเติม (ไม่บังคับ)"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" name="decision" value="approved"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">
                อนุมัติ
              </button>
              <button type="submit" name="decision" value="revision_requested"
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-400">
                ขอแก้ไข
              </button>
              <button type="submit" name="decision" value="rejected"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
                ปฏิเสธ
              </button>
            </div>
          </form>
        </div>
      )}

      {planApprovals.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">ประวัติการตรวจสอบ</h2>
          <div className="space-y-2">
            {planApprovals.map((a) => (
              <div key={a.id} className="rounded border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    a.decision === 'approved' ? 'bg-green-100 text-green-800' :
                    a.decision === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {decisionLabels[a.decision] ?? a.decision}
                  </span>
                  <span className="text-gray-600">{a.approverName ?? 'ไม่ระบุ'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleString('th-TH')}
                  </span>
                </div>
                {a.comment && <p className="mt-1 text-gray-700">{a.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
