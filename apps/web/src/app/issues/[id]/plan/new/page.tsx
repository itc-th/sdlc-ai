import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { AiDraftButton } from '@/components/ai-draft-button';
import { FormLayout } from '@/components/layout/form-layout';

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  const issues = await db
    .select({ id: schema.issues.id, title: schema.issues.title, issueNumber: schema.issues.issueNumber, status: schema.issues.status })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) notFound();
  const issue = issues[0];

  // Must have spec_approved or later status
  if (issue.status !== 'spec_approved' && issue.status !== 'in_progress' && issue.status !== 'review') {
    notFound();
  }

  async function createPlan(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const content = (formData.get('content') as string)?.trim();
    if (!content || content.length > 50000) throw new Error('invalid content');

    const [created] = await db
      .insert(schema.plans)
      .values({
        issueId: id,
        authorId: session.user.id,
        content,
        status: 'draft',
      })
      .returning();

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'plan.created',
      targetType: 'plan',
      targetId: created.id,
      metadata: { issueId: id },
    });

    redirect(`/issues/${id}/plan/${created.id}`);
  }

  return (
    <FormLayout
      breadcrumbs={[
        { label: 'หน้าแรก', href: '/dashboard' },
        { label: 'เรื่อง', href: '/issues' },
        { label: `#${issue.issueNumber} ${issue.title}`, href: `/issues/${id}` },
        { label: 'สร้างแผน' },
      ]}
      title="สร้างแผนการแก้โค้ด"
      description={`สำหรับเรื่อง #${issue.issueNumber} ${issue.title}`}
    >
      <form action={createPlan} className="flex flex-col gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="content" className="text-sm font-medium">
              เนื้อหา <span className="text-red-500">*</span>
            </label>
            <AiDraftButton
              endpoint="/api/ai/draft-plan"
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
            placeholder="ขั้นตอนการแก้โค้ด ไฟล์ที่แตะ ลำดับการทำ..."
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
    </FormLayout>
  );
}
