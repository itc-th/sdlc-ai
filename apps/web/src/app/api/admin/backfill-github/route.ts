export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { syncIntentToGitHub, syncPlanToGitHub, syncSpecToGitHub } from '@/lib/github-sync';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown[]> = { intents: [], specs: [], plans: [] };

  // Sync approved intents without file_path
  const intents = await db
    .select({ id: schema.intents.id })
    .from(schema.intents)
    .where(and(eq(schema.intents.status, 'approved'), isNull(schema.intents.filePath)));

  for (const intent of intents) {
    const r = await syncIntentToGitHub(intent.id);
    results.intents.push({ id: intent.id, result: r });
  }

  // Sync approved specs without file_path
  const specs = await db
    .select({ id: schema.specs.id })
    .from(schema.specs)
    .where(and(eq(schema.specs.status, 'approved'), isNull(schema.specs.filePath)));

  for (const spec of specs) {
    const r = await syncSpecToGitHub(spec.id);
    results.specs.push({ id: spec.id, result: r });
  }

  // Sync approved plans without file_path
  const plans = await db
    .select({ id: schema.plans.id })
    .from(schema.plans)
    .where(and(eq(schema.plans.status, 'approved'), isNull(schema.plans.filePath)));

  for (const plan of plans) {
    const r = await syncPlanToGitHub(plan.id);
    results.plans.push({ id: plan.id, result: r });
  }

  return NextResponse.json(results);
}
