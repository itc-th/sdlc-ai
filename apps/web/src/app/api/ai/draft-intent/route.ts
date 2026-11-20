export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { draftIntent } from '@sdlc-ai/agents';
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

  const issues = await db
    .select({ title: schema.issues.title, body: schema.issues.body })
    .from(schema.issues)
    .where(eq(schema.issues.id, issueId))
    .limit(1);

  if (issues.length === 0) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const issue = issues[0];
  const content = await draftIntent({
    issueTitle: issue.title,
    issueBody: issue.body,
    apiKey,
  });

  await db.insert(schema.auditLogs).values({
    userId: session.user.id,
    action: 'ai.draft_intent',
    targetType: 'issue',
    targetId: issueId,
  });

  return NextResponse.json({ content });
}
