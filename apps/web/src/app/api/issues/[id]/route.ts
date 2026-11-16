import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { syncLabelsToGitHub } from '@/lib/github-sync';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const issues = await db
    .select({
      id: schema.issues.id,
      projectId: schema.issues.projectId,
      githubIssueNumber: schema.issues.githubIssueNumber,
      title: schema.issues.title,
      body: schema.issues.body,
      type: schema.issues.type,
      riskLevel: schema.issues.riskLevel,
      status: schema.issues.status,
      assigneeId: schema.issues.assigneeId,
      assigneeName: schema.users.name,
      reporterGithubLogin: schema.issues.reporterGithubLogin,
      createdAt: schema.issues.createdAt,
      updatedAt: schema.issues.updatedAt,
    })
    .from(schema.issues)
    .leftJoin(schema.users, eq(schema.issues.assigneeId, schema.users.id))
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (issues.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(issues[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check issue exists
  const existing = await db
    .select({ id: schema.issues.id })
    .from(schema.issues)
    .where(eq(schema.issues.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  const changes: Record<string, unknown> = {};

  const validTypes = ['feature', 'bug', 'data_fix'] as const;
  const validRiskLevels = ['low', 'medium', 'high'] as const;
  const validStatuses = [
    'triage', 'intent_draft', 'intent_approved', 'spec_draft',
    'spec_approved', 'in_progress', 'review', 'done', 'cancelled',
  ] as const;

  if ('type' in body) {
    if (body.type !== null && !validTypes.includes(body.type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }
    updates.type = body.type;
    changes.type = body.type;
  }

  if ('riskLevel' in body) {
    if (body.riskLevel !== null && !validRiskLevels.includes(body.riskLevel)) {
      return NextResponse.json({ error: 'invalid riskLevel' }, { status: 400 });
    }
    updates.riskLevel = body.riskLevel;
    changes.riskLevel = body.riskLevel;
  }

  if ('status' in body) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }
    updates.status = body.status;
    changes.status = body.status;
  }

  if ('assigneeId' in body) {
    if (body.assigneeId !== null) {
      const user = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, body.assigneeId))
        .limit(1);
      if (user.length === 0) {
        return NextResponse.json({ error: 'assignee not found' }, { status: 400 });
      }
    }
    updates.assigneeId = body.assigneeId;
    changes.assigneeId = body.assigneeId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(schema.issues)
    .set(updates)
    .where(eq(schema.issues.id, id))
    .returning();

  // Audit log
  await db.insert(schema.auditLogs).values({
    userId: session.user.id,
    action: 'issue.updated',
    targetType: 'issue',
    targetId: id,
    metadata: changes,
  });

  await syncLabelsToGitHub(id);

  return NextResponse.json(updated);
}
