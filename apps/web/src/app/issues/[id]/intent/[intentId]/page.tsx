import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission, getUserRole } from '@/lib/roles';
import { syncIntentToGitHub } from '@/lib/github-sync';
import { FormLayout } from '@/components/layout/form-layout';

const decisionLabels: Record<string, string> = {
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  revision_requested: 'ขอแก้ไข',
};

export default async function IntentDetailPage({
  params,
}: {
  params: Promise<{ id: string; intentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id, intentId } = await params;

  // Get intent with author
  const intents = await db
    .select({
      id: schema.intents.id,
      issueId: schema.intents.issueId,
      content: schema.intents.content,
      status: schema.intents.status,
      authorId: schema.intents.authorId,
      authorName: schema.users.name,
      createdAt: schema.intents.createdAt,
      updatedAt: schema.intents.updatedAt,
    })
    .from(schema.intents)
    .leftJoin(schema.users, eq(schema.intents.authorId, schema.users.id))
    .where(eq(schema.intents.id, intentId))
    .limit(1);

  if (intents.length === 0 || intents[0].issueId !== id) notFound();
  const intent = intents[0];

  // Get issue info
  const issues = await db
    .select({ issueNumber: schema.issues.issueNumber, title: schema.issues.title })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) notFound();
  const issue = issues[0];

  // Get approvals for this intent
  const intentApprovals = await db
    .select({
      id: schema.approvals.id,
      decision: schema.approvals.decision,
      comment: schema.approvals.comment,
      approverName: schema.users.name,
      createdAt: schema.approvals.createdAt,
    })
    .from(schema.approvals)
    .leftJoin(schema.users, eq(schema.approvals.approverId, schema.users.id))
    .where(eq(schema.approvals.targetId, intentId))
    .orderBy(desc(schema.approvals.createdAt));

  // Get specs for this intent
  const intentSpecs = await db
    .select({
      id: schema.specs.id,
      status: schema.specs.status,
      authorName: schema.users.name,
      createdAt: schema.specs.createdAt,
    })
    .from(schema.specs)
    .leftJoin(schema.users, eq(schema.specs.authorId, schema.users.id))
    .where(eq(schema.specs.intentId, intentId))
    .orderBy(desc(schema.specs.createdAt));

  const role = getUserRole(session);

  async function updateIntent(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'intent.update')) throw new Error('ไม่มีสิทธิ์');

    const content = (formData.get('content') as string)?.trim();
    if (!content || content.length > 50000) throw new Error('invalid content');

    await db
      .update(schema.intents)
      .set({ content, updatedAt: new Date() })
      .where(eq(schema.intents.id, intentId));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'intent.updated',
      targetType: 'intent',
      targetId: intentId,
      metadata: { issueId: id },
    });

    redirect(`/issues/${id}/intent/${intentId}`);
  }

  async function reviewIntent(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'intent.review')) throw new Error('ไม่มีสิทธิ์');

    const decision = formData.get('decision') as string;
    const comment = (formData.get('comment') as string)?.trim() || null;

    const validDecisions = ['approved', 'rejected', 'revision_requested'] as const;
    if (!validDecisions.includes(decision as typeof validDecisions[number])) {
      throw new Error('invalid decision');
    }
    if (comment && comment.length > 2000) throw new Error('comment too long');

    // Insert approval record
    await db.insert(schema.approvals).values({
      targetType: 'intent',
      targetId: intentId,
      approverId: session.user.id,
      decision: decision as typeof validDecisions[number],
      comment,
    });

    // Update intent status
    const newStatus = decision === 'approved' ? 'approved' : 'draft';
    await db
      .update(schema.intents)
      .set({ status: newStatus as 'draft' | 'approved' | 'rejected', updatedAt: new Date() })
      .where(eq(schema.intents.id, intentId));

    // Update issue status
    const newIssueStatus = decision === 'approved' ? 'intent_approved' : 'intent_draft';
    await db
      .update(schema.issues)
      .set({ status: newIssueStatus, updatedAt: new Date() })
      .where(eq(schema.issues.id, id));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: `intent.${decision}`,
      targetType: 'intent',
      targetId: intentId,
      metadata: { issueId: id, decision, comment },
    });

    // Sync approved intent to GitHub repo
    if (decision === 'approved') {
      await syncIntentToGitHub(intentId);
    }

    redirect(`/issues/${id}/intent/${intentId}`);
  }

  return (
    <FormLayout
      breadcrumbs={[
        { label: 'หน้าแรก', href: '/dashboard' },
        { label: 'เรื่อง', href: '/issues' },
        { label: `#${issue.issueNumber} ${issue.title}`, href: `/issues/${id}` },
        { label: 'Intent' },
      ]}
      title="Intent"
    >
      <div className="flex items-center gap-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
          intent.status === 'approved' ? 'bg-green-100 text-green-800' :
          intent.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {intent.status === 'approved' ? 'อนุมัติ' : intent.status === 'rejected' ? 'ปฏิเสธ' : 'ร่าง'}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        โดย {intent.authorName ?? 'ไม่ระบุ'} · สร้างเมื่อ {new Date(intent.createdAt).toLocaleString('th-TH')}
      </div>

      {/* Content / Edit form */}
      {intent.status === 'draft' && hasPermission(role, 'intent.update') ? (
        <form action={updateIntent} className="mt-6">
          <label htmlFor="content" className="mb-1 block text-sm font-medium">เนื้อหา</label>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            maxLength={50000}
            defaultValue={intent.content ?? ''}
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
          {intent.content ?? '(ไม่มีเนื้อหา)'}
        </div>
      )}

      {/* Review section — show when draft */}
      {intent.status === 'draft' && hasPermission(role, 'intent.review') && (
        <div className="mt-8 rounded border p-4">
          <h2 className="mb-4 text-lg font-semibold">ตรวจสอบ</h2>
          <form action={reviewIntent} className="flex flex-col gap-3">
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
              <button
                type="submit"
                name="decision"
                value="approved"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
              >
                อนุมัติ
              </button>
              <button
                type="submit"
                name="decision"
                value="revision_requested"
                className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-400"
              >
                ขอแก้ไข
              </button>
              <button
                type="submit"
                name="decision"
                value="rejected"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                ปฏิเสธ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spec section — show when intent approved */}
      {intent.status === 'approved' && (
        <div className="mt-8 rounded border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Spec</h2>
            {intentSpecs.length === 0 && hasPermission(role, 'spec.create') && (
              <Link
                href={`/issues/${id}/intent/${intentId}/spec/new`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                สร้าง Spec
              </Link>
            )}
          </div>
          {intentSpecs.length > 0 ? (
            <div className="space-y-2">
              {intentSpecs.map((spec) => (
                <Link
                  key={spec.id}
                  href={`/issues/${id}/intent/${intentId}/spec/${spec.id}`}
                  className="flex items-center justify-between rounded border p-3 text-sm hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      spec.status === 'approved' ? 'bg-green-100 text-green-800' :
                      spec.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {spec.status === 'approved' ? 'อนุมัติ' : spec.status === 'rejected' ? 'ปฏิเสธ' : 'ร่าง'}
                    </span>
                    <span className="text-gray-600">โดย {spec.authorName ?? 'ไม่ระบุ'}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(spec.createdAt).toLocaleString('th-TH')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">ยังไม่มี spec</p>
          )}
        </div>
      )}

      {/* Approval history */}
      {intentApprovals.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">ประวัติการตรวจสอบ</h2>
          <div className="space-y-2">
            {intentApprovals.map((a) => (
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
                {a.comment && (
                  <p className="mt-1 text-gray-700">{a.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </FormLayout>
  );
}
