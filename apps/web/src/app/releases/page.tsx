import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission, getUserRole } from '@/lib/roles';
import { getGitHubApp } from '@/lib/github';
import {
  Octokit,
  getInstallationOctokit,
  closeGitHubIssue,
  createGitTag,
} from '@sdlc-ai/github';
import { revalidatePath } from 'next/cache';
import { FormLayout } from '@/components/layout/form-layout';

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
        githubIssueId: schema.issues.githubIssueId,
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

    // Use githubIssueId for GitHub operations (may differ from issueNumber)
    const ghIssueNumber = issue.githubIssueId ?? issue.issueNumber;

    // 1. Trigger Vercel Deploy Hook
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHookUrl) {
      await fetch(deployHookUrl, { method: 'POST' });
    }

    // 2. Create Git tag (v*) + close GitHub issue
    //    Use GitHub App if configured, otherwise fall back to GITHUB_TOKEN (PAT)
    let octokit: Octokit | null = null;
    const app = getGitHubApp();
    if (app) {
      try {
        octokit = await getInstallationOctokit(app, issue.githubOwner, issue.githubRepo) as unknown as Octokit;
      } catch (err) {
        console.error('Failed to get installation octokit:', err);
      }
    }
    if (!octokit && process.env.GITHUB_TOKEN) {
      octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    }
    if (octokit) {
      try {

        // Find latest v* tag to auto-bump minor version
        const { data: tags } = await octokit.rest.repos.listTags({
          owner: issue.githubOwner,
          repo: issue.githubRepo,
          per_page: 100,
        });
        let major = 0, minor = 0;
        for (const t of tags) {
          const m = t.name.match(/^v(\d+)\.(\d+)\.\d+$/);
          if (m) {
            const tMajor = parseInt(m[1], 10);
            const tMinor = parseInt(m[2], 10);
            if (tMajor > major || (tMajor === major && tMinor > minor)) {
              major = tMajor;
              minor = tMinor;
            }
          }
        }
        const tag = `v${major}.${minor + 1}.0`;

        const { data: ref } = await octokit.rest.git.getRef({
          owner: issue.githubOwner,
          repo: issue.githubRepo,
          ref: 'heads/main',
        });

        await createGitTag(octokit, {
          owner: issue.githubOwner,
          repo: issue.githubRepo,
          tag,
          message: `Release for #${ghIssueNumber}: ${issue.title}`,
          sha: ref.object.sha,
        });

        await closeGitHubIssue(octokit, {
          owner: issue.githubOwner,
          repo: issue.githubRepo,
          issueNumber: ghIssueNumber,
          comment: `Deployed and released as \`${tag}\``,
        });
      } catch (err) {
        console.error('GitHub operations failed during deploy:', err);
      }
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
    <FormLayout
      breadcrumbs={[
        { label: 'หน้าแรก', href: '/dashboard' },
        { label: 'Releases' },
      ]}
      title="Releases"
      description="จัดการและ deploy เรื่องที่พร้อมใช้งาน"
    >

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
    </FormLayout>
  );
}
