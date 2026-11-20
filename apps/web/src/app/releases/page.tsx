import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission, getUserRole } from '@/lib/roles';
import { getGitHubApp } from '@/lib/github';
import {
  getInstallationOctokit,
  closeGitHubIssue,
  createGitTag,
} from '@sdlc-ai/github';
import { revalidatePath } from 'next/cache';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default async function ReleasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const role = getUserRole(session);

  const reviewIssues = await db
    .select({
      id: schema.issues.id,
      issueNumber: schema.issues.issueNumber,
      title: schema.issues.title,
      projectId: schema.issues.projectId,
      updatedAt: schema.issues.updatedAt,
    })
    .from(schema.issues)
    .where(eq(schema.issues.status, 'review'))
    .orderBy(desc(schema.issues.updatedAt));

  const canDeploy = hasPermission(role, 'release.deploy');

  async function deployIssue(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id) redirect('/login');
    if (!hasPermission(getUserRole(session), 'release.deploy')) {
      throw new Error('ไม่มีสิทธิ์ deploy');
    }

    const issueId = formData.get('issueId') as string;
    if (!issueId) throw new Error('ไม่พบ issueId');

    // Load issue + project
    const rows = await db
      .select({
        id: schema.issues.id,
        issueNumber: schema.issues.issueNumber,
        title: schema.issues.title,
        status: schema.issues.status,
        projectId: schema.issues.projectId,
        githubOwner: schema.projects.githubOwner,
        githubRepo: schema.projects.githubRepo,
      })
      .from(schema.issues)
      .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
      .where(eq(schema.issues.id, issueId))
      .limit(1);

    if (rows.length === 0) throw new Error('ไม่พบ issue');
    const issue = rows[0];
    if (issue.status !== 'review') throw new Error('issue ไม่อยู่ในสถานะ review');

    // 1. Trigger Vercel Deploy Hook
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHookUrl) {
      await fetch(deployHookUrl, { method: 'POST' });
    }

    // 2. Create Git tag + close GitHub issue
    const app = getGitHubApp();
    if (app) {
      const octokit = await getInstallationOctokit(app, issue.githubOwner, issue.githubRepo);
      const tag = `release-${issue.issueNumber}-${slugify(issue.title)}`;

      // Get latest commit SHA from default branch
      const { data: ref } = await octokit.rest.git.getRef({
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        ref: 'heads/main',
      });

      await createGitTag(octokit, {
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        tag,
        message: `Release for #${issue.issueNumber}: ${issue.title}`,
        sha: ref.object.sha,
      });

      await closeGitHubIssue(octokit, {
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        issueNumber: issue.issueNumber,
        comment: `Deployed and released as \`${tag}\``,
      });
    }

    // 3. Update issue status to done
    await db
      .update(schema.issues)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(schema.issues.id, issueId));

    // 4. Audit log
    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'release.deploy',
      targetType: 'issue',
      targetId: issueId,
      metadata: { issueNumber: issue.issueNumber },
    });

    revalidatePath('/releases');
    revalidatePath('/issues');
    revalidatePath('/dashboard');
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Releases</h1>

      <section>
        <h2 className="mb-4 text-lg font-semibold">รอ Deploy ({reviewIssues.length})</h2>

        {reviewIssues.length === 0 ? (
          <p className="text-sm text-gray-500">ไม่มี issue ที่รอ deploy</p>
        ) : (
          <div className="space-y-3">
            {reviewIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded border p-4"
              >
                <div>
                  <span className="text-sm text-gray-400">#{issue.issueNumber}</span>{' '}
                  <span className="font-medium">{issue.title}</span>
                  <p className="mt-1 text-xs text-gray-500">
                    อัปเดตเมื่อ {new Date(issue.updatedAt).toLocaleString('th-TH')}
                  </p>
                </div>
                {canDeploy && (
                  <form action={deployIssue}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                    >
                      Deploy
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
