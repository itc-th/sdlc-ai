import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { verifyWebhookSignature, gitHubLabelsToDb } from '@sdlc-ai/github';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface GitHubIssueEvent {
  action: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    labels: Array<{ name: string }>;
    user: { login: string } | null;
    updated_at: string;
  };
  repository: {
    name: string;
    owner: { login: string };
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  if (event !== 'issues') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payload: GitHubIssueEvent = JSON.parse(rawBody);
  const { action, issue, repository } = payload;

  // Find project by GitHub owner/repo
  const projects = await db
    .select({ id: schema.projects.id, githubOwner: schema.projects.githubOwner, githubRepo: schema.projects.githubRepo })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.githubOwner, repository.owner.login),
        eq(schema.projects.githubRepo, repository.name),
      ),
    )
    .limit(1);

  if (projects.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'unknown repo' });
  }

  const project = projects[0];
  const labelNames = issue.labels.map((l) => l.name);
  const rawLabelData = gitHubLabelsToDb(labelNames);

  // Cast to proper enum types for drizzle
  const labelData = {
    type: rawLabelData.type as 'feature' | 'bug' | 'data_fix' | undefined,
    riskLevel: rawLabelData.riskLevel as 'low' | 'medium' | 'high' | undefined,
    status: rawLabelData.status as typeof schema.issues.status.enumValues[number] | undefined,
  };

  const now = new Date();
  const eventTime = new Date(issue.updated_at);

  if (action === 'opened') {
    // Insert or update (in case of race condition / duplicate webhook)
    const existing = await db
      .select({ id: schema.issues.id })
      .from(schema.issues)
      .where(
        and(
          eq(schema.issues.projectId, project.id),
          eq(schema.issues.issueNumber, issue.number),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.issues)
        .set({
          title: issue.title,
          body: issue.body,
          reporterGithubLogin: issue.user?.login ?? null,
          ...labelData,
          updatedAt: now,
        })
        .where(eq(schema.issues.id, existing[0].id));

      await db.insert(schema.auditLogs).values({
        action: 'issue.synced_from_github',
        targetType: 'issue',
        targetId: existing[0].id,
        metadata: { githubAction: action, issueNumber: issue.number },
      });
    } else {
      const [created] = await db
        .insert(schema.issues)
        .values({
          projectId: project.id,
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body,
          reporterGithubLogin: issue.user?.login ?? null,
          type: labelData.type ?? null,
          riskLevel: labelData.riskLevel ?? null,
          status: labelData.status ?? 'triage',
        })
        .returning();

      await db.insert(schema.auditLogs).values({
        action: 'issue.created_from_github',
        targetType: 'issue',
        targetId: created.id,
        metadata: { githubAction: action, issueNumber: issue.number },
      });
    }
  } else if (action === 'edited') {
    const existing = await findIssue(project.id, issue.number);
    if (existing && eventTime >= existing.updatedAt) {
      await db
        .update(schema.issues)
        .set({ title: issue.title, body: issue.body, updatedAt: now })
        .where(eq(schema.issues.id, existing.id));

      await db.insert(schema.auditLogs).values({
        action: 'issue.synced_from_github',
        targetType: 'issue',
        targetId: existing.id,
        metadata: { githubAction: action, issueNumber: issue.number },
      });
    }
  } else if (action === 'labeled' || action === 'unlabeled') {
    const existing = await findIssue(project.id, issue.number);
    if (existing && eventTime >= existing.updatedAt) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (labelData.type !== undefined) updates.type = labelData.type;
      if (labelData.riskLevel !== undefined) updates.riskLevel = labelData.riskLevel;
      if (labelData.status !== undefined) updates.status = labelData.status;

      await db
        .update(schema.issues)
        .set(updates)
        .where(eq(schema.issues.id, existing.id));

      await db.insert(schema.auditLogs).values({
        action: 'issue.synced_from_github',
        targetType: 'issue',
        targetId: existing.id,
        metadata: { githubAction: action, issueNumber: issue.number, labels: labelNames },
      });
    }
  } else if (action === 'closed') {
    const existing = await findIssue(project.id, issue.number);
    if (existing) {
      await db
        .update(schema.issues)
        .set({ status: 'done', updatedAt: now })
        .where(eq(schema.issues.id, existing.id));

      await db.insert(schema.auditLogs).values({
        action: 'issue.synced_from_github',
        targetType: 'issue',
        targetId: existing.id,
        metadata: { githubAction: action, issueNumber: issue.number },
      });
    }
  } else if (action === 'reopened') {
    const existing = await findIssue(project.id, issue.number);
    if (existing) {
      await db
        .update(schema.issues)
        .set({ status: 'triage', updatedAt: now })
        .where(eq(schema.issues.id, existing.id));

      await db.insert(schema.auditLogs).values({
        action: 'issue.synced_from_github',
        targetType: 'issue',
        targetId: existing.id,
        metadata: { githubAction: action, issueNumber: issue.number },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

async function findIssue(projectId: string, issueNumber: number) {
  const rows = await db
    .select({ id: schema.issues.id, updatedAt: schema.issues.updatedAt })
    .from(schema.issues)
    .where(
      and(
        eq(schema.issues.projectId, projectId),
        eq(schema.issues.issueNumber, issueNumber),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
