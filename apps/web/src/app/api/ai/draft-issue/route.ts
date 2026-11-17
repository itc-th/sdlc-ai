import { NextRequest, NextResponse } from 'next/server';
import { draftIssue } from '@sdlc-ai/agents';
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
  const { description } = body;
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  const result = await draftIssue({ description: description.trim(), apiKey });

  return NextResponse.json(result);
}
