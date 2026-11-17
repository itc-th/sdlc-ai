import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { draftPlan } from '@sdlc-ai/agents';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { issueId } = body;
  if (!issueId || typeof issueId !== 'string') {
    return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
  }

  // Get issue
  const issues = await db
    .select({ title: schema.issues.title, body: schema.issues.body })
    .from(schema.issues)
    .where(eq(schema.issues.id, issueId))
    .limit(1);

  if (issues.length === 0) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  // Get latest approved intent for this issue
  const intents = await db
    .select({ content: schema.intents.content, id: schema.intents.id })
    .from(schema.intents)
    .where(eq(schema.intents.issueId, issueId))
    .orderBy(desc(schema.intents.createdAt))
    .limit(1);

  if (intents.length === 0 || !intents[0].content) {
    return NextResponse.json({ error: 'No intent found' }, { status: 404 });
  }

  // Get latest approved spec for this intent
  const specs = await db
    .select({ content: schema.specs.content })
    .from(schema.specs)
    .where(eq(schema.specs.intentId, intents[0].id))
    .orderBy(desc(schema.specs.createdAt))
    .limit(1);

  if (specs.length === 0 || !specs[0].content) {
    return NextResponse.json({ error: 'No spec found' }, { status: 404 });
  }

  const issue = issues[0];
  const content = await draftPlan({
    issueTitle: issue.title,
    issueBody: issue.body,
    intentContent: intents[0].content,
    specContent: specs[0].content,
    apiKey,
  });

  await db.insert(schema.auditLogs).values({
    userId: session.user.id,
    action: 'ai.draft_plan',
    targetType: 'issue',
    targetId: issueId,
  });

  return NextResponse.json({ content });
}
