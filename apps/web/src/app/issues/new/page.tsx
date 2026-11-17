import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, and, sql } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { syncNewIssueToGitHub } from '@/lib/github-sync';
import { hasPermission, getUserRole } from '@/lib/roles';
import { AiIssueButton } from '@/components/ai-issue-button';

export default async function NewIssuePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  async function createIssue(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'issue.create')) throw new Error('ไม่มีสิทธิ์');

    const title = (formData.get('title') as string)?.trim();
    const body = (formData.get('body') as string)?.trim() || null;
    const type = (formData.get('type') as string) || null;

    if (!title || title.length > 200) throw new Error('invalid title');

    const project = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(and(eq(schema.projects.githubOwner, 'itc-th'), eq(schema.projects.githubRepo, 'sdlc-ai')))
      .limit(1);

    if (project.length === 0) throw new Error('Default project not found');

    const maxNumber = await db
      .select({ max: sql<number>`coalesce(max(${schema.issues.githubIssueNumber}), 0)` })
      .from(schema.issues)
      .where(eq(schema.issues.projectId, project[0].id));

    const nextNumber = (maxNumber[0]?.max ?? 0) + 1;

    const [created] = await db
      .insert(schema.issues)
      .values({
        projectId: project[0].id,
        githubIssueNumber: nextNumber,
        title,
        body,
        type: type as 'feature' | 'bug' | 'data_fix' | null,
        status: 'triage',
      })
      .returning();

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'issue.created',
      targetType: 'issue',
      targetId: created.id,
      metadata: { title: created.title, issueNumber: nextNumber },
    });

    await syncNewIssueToGitHub(created.id);

    redirect(`/issues/${created.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">สร้างเรื่องใหม่</h1>
        <AiIssueButton />
      </div>
      <form action={createIssue} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            ชื่อเรื่อง <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="อธิบายปัญหาหรือความต้องการ"
          />
        </div>
        <div>
          <label htmlFor="body" className="mb-1 block text-sm font-medium">
            รายละเอียด
          </label>
          <textarea
            id="body"
            name="body"
            rows={6}
            maxLength={5000}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="อธิบายเพิ่มเติม"
          />
        </div>
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            ประเภท
          </label>
          <select id="type" name="type" className="rounded border px-3 py-2 text-sm">
            <option value="">ยังไม่ระบุ</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="data_fix">Data Fix</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            สร้าง
          </button>
          <Link href="/issues" className="rounded-lg border px-6 py-2 text-sm hover:bg-gray-50">
            ยกเลิก
          </Link>
        </div>
      </form>
    </main>
  );
}
