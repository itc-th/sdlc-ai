import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission, getUserRole } from '@/lib/roles';
import { syncSpecToGitHub } from '@/lib/github-sync';

const decisionLabels: Record<string, string> = {
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  revision_requested: 'ขอแก้ไข',
};

export default async function SpecDetailPage({
  params,
}: {
  params: Promise<{ id: string; intentId: string; specId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id, intentId, specId } = await params;

  // Get issue info
  const issues = await db
    .select({ githubIssueNumber: schema.issues.githubIssueNumber, title: schema.issues.title })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) notFound();
  const issue = issues[0];

  // Get spec with author
  const specs = await db
    .select({
      id: schema.specs.id,
      intentId: schema.specs.intentId,
      content: schema.specs.content,
      status: schema.specs.status,
      authorId: schema.specs.authorId,
      authorName: schema.users.name,
      createdAt: schema.specs.createdAt,
      updatedAt: schema.specs.updatedAt,
    })
    .from(schema.specs)
    .leftJoin(schema.users, eq(schema.specs.authorId, schema.users.id))
    .where(eq(schema.specs.id, specId))
    .limit(1);

  if (specs.length === 0 || specs[0].intentId !== intentId) notFound();
  const spec = specs[0];

  // Get approvals for this spec
  const specApprovals = await db
    .select({
      id: schema.approvals.id,
      decision: schema.approvals.decision,
      comment: schema.approvals.comment,
      approverName: schema.users.name,
      createdAt: schema.approvals.createdAt,
    })
    .from(schema.approvals)
    .leftJoin(schema.users, eq(schema.approvals.approverId, schema.users.id))
    .where(eq(schema.approvals.targetId, specId))
    .orderBy(desc(schema.approvals.createdAt));

  const role = getUserRole(session);

  async function updateSpec(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'spec.update')) throw new Error('ไม่มีสิทธิ์');

    const content = (formData.get('content') as string)?.trim();
    if (!content || content.length > 50000) throw new Error('invalid content');

    await db
      .update(schema.specs)
      .set({ content, updatedAt: new Date() })
      .where(eq(schema.specs.id, specId));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'spec.updated',
      targetType: 'spec',
      targetId: specId,
      metadata: { issueId: id, intentId },
    });

    redirect(`/issues/${id}/intent/${intentId}/spec/${specId}`);
  }

  async function reviewSpec(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'spec.review')) throw new Error('ไม่มีสิทธิ์');

    const decision = formData.get('decision') as string;
    const comment = (formData.get('comment') as string)?.trim() || null;

    const validDecisions = ['approved', 'rejected', 'revision_requested'] as const;
    if (!validDecisions.includes(decision as typeof validDecisions[number])) {
      throw new Error('invalid decision');
    }
    if (comment && comment.length > 2000) throw new Error('comment too long');

    // Insert approval record
    await db.insert(schema.approvals).values({
      targetType: 'spec',
      targetId: specId,
      approverId: session.user.id,
      decision: decision as typeof validDecisions[number],
      comment,
    });

    // Update spec status
    const newStatus = decision === 'approved' ? 'approved' : 'draft';
    await db
      .update(schema.specs)
      .set({ status: newStatus as 'draft' | 'approved' | 'rejected', updatedAt: new Date() })
      .where(eq(schema.specs.id, specId));

    // Update issue status
    const newIssueStatus = decision === 'approved' ? 'spec_approved' : 'spec_draft';
    await db
      .update(schema.issues)
      .set({ status: newIssueStatus, updatedAt: new Date() })
      .where(eq(schema.issues.id, id));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: `spec.${decision}`,
      targetType: 'spec',
      targetId: specId,
      metadata: { issueId: id, intentId, decision, comment },
    });

    // Sync approved spec to GitHub repo
    if (decision === 'approved') {
      await syncSpecToGitHub(specId);
    }

    redirect(`/issues/${id}/intent/${intentId}/spec/${specId}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/issues/${id}/intent/${intentId}`} className="text-sm text-blue-600 hover:underline">
          ← กลับไป Intent ของ #{issue.githubIssueNumber}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Spec</h1>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
          spec.status === 'approved' ? 'bg-green-100 text-green-800' :
          spec.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {spec.status === 'approved' ? 'อนุมัติ' : spec.status === 'rejected' ? 'ปฏิเสธ' : 'ร่าง'}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">
        โดย {spec.authorName ?? 'ไม่ระบุ'} · สร้างเมื่อ {new Date(spec.createdAt).toLocaleString('th-TH')}
      </div>

      {/* Content / Edit form */}
      {spec.status === 'draft' && hasPermission(role, 'spec.update') ? (
        <form action={updateSpec} className="mt-6">
          <label htmlFor="content" className="mb-1 block text-sm font-medium">เนื้อหา</label>
          <textarea
            id="content"
            name="content"
            required
            rows={20}
            maxLength={50000}
            defaultValue={spec.content ?? ''}
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
          {spec.content ?? '(ไม่มีเนื้อหา)'}
        </div>
      )}

      {/* Review section — show when draft */}
      {spec.status === 'draft' && hasPermission(role, 'spec.review') && (
        <div className="mt-8 rounded border p-4">
          <h2 className="mb-4 text-lg font-semibold">ตรวจสอบ</h2>
          <form action={reviewSpec} className="flex flex-col gap-3">
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

      {/* Approval history */}
      {specApprovals.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">ประวัติการตรวจสอบ</h2>
          <div className="space-y-2">
            {specApprovals.map((a) => (
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
    </main>
  );
}
