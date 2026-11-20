import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission, getUserRole } from '@/lib/roles';
import { AiDraftButton } from '@/components/ai-draft-button';

export default async function NewIntentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  const issues = await db
    .select({ id: schema.issues.id, title: schema.issues.title, issueNumber: schema.issues.issueNumber })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) notFound();
  const issue = issues[0];
  // Always show AI button; API will return 503 if key not configured

  async function createIntent(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'intent.create')) throw new Error('ไม่มีสิทธิ์');

    const content = (formData.get('content') as string)?.trim();
    if (!content || content.length > 50000) throw new Error('invalid content');

    const [created] = await db
      .insert(schema.intents)
      .values({
        issueId: id,
        authorId: session.user.id,
        content,
        status: 'draft',
      })
      .returning();

    // Update issue status to intent_draft
    await db
      .update(schema.issues)
      .set({ status: 'intent_draft', updatedAt: new Date() })
      .where(eq(schema.issues.id, id));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'intent.created',
      targetType: 'intent',
      targetId: created.id,
      metadata: { issueId: id },
    });

    redirect(`/issues/${id}/intent/${created.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-2">
        <Link href={`/issues/${id}`} className="text-sm text-blue-600 hover:underline">
          ← กลับไป #{issue.issueNumber} {issue.title}
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold">สร้าง Intent</h1>
      <form action={createIntent} className="flex flex-col gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="content" className="text-sm font-medium">
              เนื้อหา <span className="text-red-500">*</span>
            </label>
            <AiDraftButton
              endpoint="/api/ai/draft-intent"
              payload={{ issueId: id }}
              textareaId="content"
            />
          </div>
          <textarea
            id="content"
            name="content"
            required
            rows={16}
            maxLength={50000}
            className="w-full rounded border px-3 py-2 text-sm font-mono"
            placeholder="อธิบายปัญหา ที่มา ขอบเขต เกณฑ์ว่าเสร็จ..."
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            สร้าง
          </button>
          <Link href={`/issues/${id}`} className="rounded-lg border px-6 py-2 text-sm hover:bg-gray-50">
            ยกเลิก
          </Link>
        </div>
      </form>
    </main>
  );
}
