import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and, sql } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission, getUserRole } from '@/lib/roles';
import { syncNewIssueToGitHub } from '@/lib/github-sync';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const riskLevel = searchParams.get('riskLevel');

  const conditions = [];
  if (status) conditions.push(eq(schema.issues.status, status as typeof schema.issues.status.enumValues[number]));
  if (type) conditions.push(eq(schema.issues.type, type as typeof schema.issues.type.enumValues[number]));
  if (riskLevel) conditions.push(eq(schema.issues.riskLevel, riskLevel as typeof schema.issues.riskLevel.enumValues[number]));

  const issues = await db
    .select({
      id: schema.issues.id,
      githubIssueNumber: schema.issues.githubIssueNumber,
      title: schema.issues.title,
      type: schema.issues.type,
      riskLevel: schema.issues.riskLevel,
      status: schema.issues.status,
      assigneeName: schema.users.name,
      createdAt: schema.issues.createdAt,
    })
    .from(schema.issues)
    .leftJoin(schema.users, eq(schema.issues.assigneeId, schema.users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.issues.createdAt));

  return NextResponse.json(issues);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(getUserRole(session), 'issue.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: issueBody, type } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'title must be 200 characters or less' }, { status: 400 });
  }
  if (issueBody && typeof issueBody === 'string' && issueBody.length > 5000) {
    return NextResponse.json({ error: 'body must be 5000 characters or less' }, { status: 400 });
  }

  const validTypes = ['feature', 'bug', 'data_fix'] as const;
  if (type && !validTypes.includes(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  // Get default project
  const project = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(
      eq(schema.projects.githubOwner, 'itc-th'),
      eq(schema.projects.githubRepo, 'sdlc-ai'),
    ))
    .limit(1);

  if (project.length === 0) {
    return NextResponse.json({ error: 'Default project not found. Run db:seed first.' }, { status: 500 });
  }

  // Auto-increment issue number within project
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
      title: title.trim(),
      body: issueBody?.trim() || null,
      type: type || null,
      status: 'triage',
    })
    .returning();

  // Audit log
  await db.insert(schema.auditLogs).values({
    userId: session.user.id,
    action: 'issue.created',
    targetType: 'issue',
    targetId: created.id,
    metadata: { title: created.title, issueNumber: nextNumber },
  });

  await syncNewIssueToGitHub(created.id);

  return NextResponse.json(created, { status: 201 });
}
