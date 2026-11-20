export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { getInstallationOctokit, createGitHubIssue, dbToGitHubLabels, commitFilesToRepo, type BatchFile } from '@sdlc-ai/github';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getGitHubApp } from '@/lib/github';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

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
      issueNumber: schema.issues.issueNumber,
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

    let ghNumber: number;
    let githubIssueUrl: string;

    // 1. Check if a GitHub issue already exists for this issueNumber
    let existingGhIssue: boolean = false;
    try {
      const { data: existing } = await octokit.rest.issues.get({
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        issue_number: issue.issueNumber,
      });
      // Issue exists on GitHub — reuse it, do NOT create a new one
      ghNumber = existing.number;
      githubIssueUrl = existing.html_url;
      existingGhIssue = true;

      // Update labels on the existing issue
      await octokit.rest.issues.setLabels({
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        issue_number: ghNumber,
        labels,
      });
    } catch {
      // Issue does not exist on GitHub — create a new one
      const { data } = await createGitHubIssue(octokit, {
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        title: issue.title,
        body: issue.body,
        labels,
      });
      ghNumber = data.number;
      githubIssueUrl = data.html_url;
    }

    // 2. Update DB with GitHub issue number
    await db
      .update(schema.issues)
      .set({ githubIssueId: ghNumber, githubIssueUrl, updatedAt: new Date() })
      .where(eq(schema.issues.id, issueId));

    await db.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: existingGhIssue ? 'issue.linked_to_github' : 'issue.synced_to_github',
      targetType: 'issue',
      targetId: issueId,
      metadata: { issueNumber: ghNumber, githubIssueUrl, existingGhIssue },
    });

    // 3. Collect approved docs into a single commit
    const year = new Date().getFullYear();
    const slug = slugify(issue.title);
    const folder = `docs/intents/${year}-${ghNumber}-${slug}`;
    const files: BatchFile[] = [];

    // Track DB updates to apply after commit
    const dbUpdates: Array<() => Promise<unknown>> = [];

    // Intents
    const intents = await db
      .select({ id: schema.intents.id, content: schema.intents.content, status: schema.intents.status })
      .from(schema.intents)
      .where(eq(schema.intents.issueId, issueId));

    for (const intent of intents) {
      if (intent.status === 'approved' && intent.content) {
        const filePath = `${folder}/intent.md`;
        files.push({ path: filePath, content: intent.content });
        dbUpdates.push(() =>
          db.update(schema.intents).set({ filePath, updatedAt: new Date() }).where(eq(schema.intents.id, intent.id)),
        );
      }

      // Specs for this intent
      const specs = await db
        .select({ id: schema.specs.id, content: schema.specs.content, status: schema.specs.status })
        .from(schema.specs)
        .where(eq(schema.specs.intentId, intent.id));

      for (const spec of specs) {
        if (spec.status === 'approved' && spec.content) {
          const filePath = `${folder}/spec.md`;
          files.push({ path: filePath, content: spec.content });
          dbUpdates.push(() =>
            db.update(schema.specs).set({ filePath, updatedAt: new Date() }).where(eq(schema.specs.id, spec.id)),
          );
        }
      }
    }

    // Plans
    const plans = await db
      .select({ id: schema.plans.id, content: schema.plans.content, status: schema.plans.status })
      .from(schema.plans)
      .where(eq(schema.plans.issueId, issueId));

    for (const plan of plans) {
      if (plan.status === 'approved' && plan.content) {
        const filePath = `${folder}/plan.md`;
        files.push({ path: filePath, content: plan.content });
        dbUpdates.push(() =>
          db.update(schema.plans).set({ filePath, updatedAt: new Date() }).where(eq(schema.plans.id, plan.id)),
        );
      }
    }

    // 4. Commit all files in one commit
    let commitSha: string | null = null;
    if (files.length > 0) {
      const result = await commitFilesToRepo(octokit, {
        owner: issue.githubOwner,
        repo: issue.githubRepo,
        files,
        message: `docs: add intent/spec/plan for #${ghNumber}`,
      });
      commitSha = result.sha;

      // Update DB with file paths and commit SHA
      for (const update of dbUpdates) {
        await update();
      }
      // Set commitSha on all synced docs
      if (intents.length > 0) {
        await db.update(schema.intents).set({ commitSha }).where(eq(schema.intents.issueId, issueId));
      }
      if (plans.length > 0) {
        await db.update(schema.plans).set({ commitSha }).where(eq(schema.plans.issueId, issueId));
      }
    }

    return NextResponse.json({
      githubIssueId: ghNumber,
      githubIssueUrl,
      docs: { files: files.map((f) => f.path), commitSha },
    });
  } catch (error) {
    console.error('Failed to sync issue to GitHub:', error);
    return NextResponse.json({ error: 'Failed to create GitHub issue' }, { status: 500 });
  }
}
