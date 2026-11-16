import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { draftSpec } from '@sdlc-ai/agents';
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
  const { intentId } = body;
  if (!intentId || typeof intentId !== 'string') {
    return NextResponse.json({ error: 'intentId is required' }, { status: 400 });
  }

  const intents = await db
    .select({
      content: schema.intents.content,
      issueTitle: schema.issues.title,
      issueBody: schema.issues.body,
      issueId: schema.issues.id,
    })
    .from(schema.intents)
    .innerJoin(schema.issues, eq(schema.intents.issueId, schema.issues.id))
    .where(eq(schema.intents.id, intentId))
    .limit(1);

  if (intents.length === 0) {
    return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
  }

  const intent = intents[0];
  const content = await draftSpec({
    issueTitle: intent.issueTitle,
    issueBody: intent.issueBody,
    intentContent: intent.content ?? '',
    apiKey,
  });

  await db.insert(schema.auditLogs).values({
    userId: session.user.id,
    action: 'ai.draft_spec',
    targetType: 'intent',
    targetId: intentId,
    metadata: { issueId: intent.issueId },
  });

  return NextResponse.json({ content });
}
