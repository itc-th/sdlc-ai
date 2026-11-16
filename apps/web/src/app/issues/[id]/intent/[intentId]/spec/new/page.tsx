import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export default async function NewSpecPage({
  params,
}: {
  params: Promise<{ id: string; intentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id, intentId } = await params;

  // Verify issue exists
  const issues = await db
    .select({ githubIssueNumber: schema.issues.githubIssueNumber, title: schema.issues.title })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) notFound();
  const issue = issues[0];

  // Verify intent exists and is approved
  const intents = await db
    .select({ id: schema.intents.id, status: schema.intents.status, issueId: schema.intents.issueId })
    .from(schema.intents)
    .where(eq(schema.intents.id, intentId))
    .limit(1);

  if (intents.length === 0 || intents[0].issueId !== id || intents[0].status !== 'approved') {
    notFound();
  }

  async function createSpec(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const content = (formData.get('content') as string)?.trim();
    if (!content || content.length > 50000) throw new Error('invalid content');

    const [created] = await db
      .insert(schema.specs)
      .values({
        intentId,
        authorId: session.user.id,
        content,
        status: 'draft',
      })
      .returning();

    // Update issue status to spec_draft
    await db
      .update(schema.issues)
      .set({ status: 'spec_draft', updatedAt: new Date() })
      .where(eq(schema.issues.id, id));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'spec.created',
      targetType: 'spec',
      targetId: created.id,
      metadata: { issueId: id, intentId },
    });

    redirect(`/issues/${id}/intent/${intentId}/spec/${created.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/issues/${id}/intent/${intentId}`} className="text-sm text-blue-600 hover:underline">
          ← กลับไป Intent ของ #{issue.githubIssueNumber}
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold">สร้าง Spec</h1>
      <form action={createSpec} className="flex flex-col gap-4">
        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium">
            เนื้อหา <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={20}
            maxLength={50000}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            placeholder="ข้อเท็จจริงจากโค้ด ข้อเสนอการออกแบบ เกณฑ์ว่าเสร็จ..."
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            สร้าง
          </button>
          <Link href={`/issues/${id}/intent/${intentId}`} className="rounded-lg border px-6 py-2 text-sm hover:bg-gray-50">
            ยกเลิก
          </Link>
        </div>
      </form>
    </main>
  );
}
