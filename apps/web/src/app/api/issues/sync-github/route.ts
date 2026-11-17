import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { getInstallationOctokit, createGitHubIssue, dbToGitHubLabels } from '@sdlc-ai/github';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getGitHubApp } from '@/lib/github';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const githubApp = getGitHubApp();
  if (!githubApp) {
    return NextResponse.json({ error: 'GitHub App not configured' }, { status: 503 });
  }

  const body = await request.json();
  const { issueId } = body;
  if (!issueId || typeof issueId !== 'string') {
    return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
  }

  // Get issue with project info
  const rows = await db
    .select({
      id: schema.issues.id,
      title: schema.issues.title,
      body: schema.issues.body,
      type: schema.issues.type,
      riskLevel: schema.issues.riskLevel,
      status: schema.issues.status,
      githubIssueId: schema.issues.githubIssueId,
      githubOwner: schema.projects.githubOwner,
      githubRepo: schema.projects.githubRepo,
    })
    .from(schema.issues)
    .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
    .where(eq(schema.issues.id, issueId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const issue = rows[0];

  // Already synced?
  if (issue.githubIssueId) {
    const url = `https://github.com/${issue.githubOwner}/${issue.githubRepo}/issues/${issue.githubIssueId}`;
    return NextResponse.json({ githubIssueId: issue.githubIssueId, githubIssueUrl: url });
  }

  try {
    const octokit = await getInstallationOctokit(githubApp, issue.githubOwner, issue.githubRepo);
    const labels = dbToGitHubLabels({ type: issue.type, riskLevel: issue.riskLevel, status: issue.status });

    const { data } = await createGitHubIssue(octokit, {
      owner: issue.githubOwner,
      repo: issue.githubRepo,
      title: issue.title,
      body: issue.body,
      labels,
    });

    const githubIssueUrl = data.html_url;

    // Update DB with real GitHub issue ID and URL
    await db
      .update(schema.issues)
      .set({
        githubIssueId: data.number,
        githubIssueUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.issues.id, issueId));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: 'issue.synced_to_github',
      targetType: 'issue',
      targetId: issueId,
      metadata: { githubIssueNumber: data.number, githubIssueUrl },
    });

    return NextResponse.json({ githubIssueId: data.number, githubIssueUrl });
  } catch (error) {
    console.error('Failed to sync issue to GitHub:', error);
    return NextResponse.json({ error: 'Failed to create GitHub issue' }, { status: 500 });
  }
}
