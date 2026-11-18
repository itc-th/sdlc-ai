import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { draftPlan, type RelevantFile } from '@sdlc-ai/agents';
import { getInstallationOctokit } from '@sdlc-ai/github';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getGitHubApp } from '@/lib/github';

/** Extract file paths mentioned in spec/intent content */
function extractFilePaths(text: string): string[] {
  const patterns = [
    /`((?:apps|packages|src|docs)\/[a-zA-Z0-9_\-/.]+\.[a-zA-Z]+)`/g,
    /│\s*((?:apps|packages|src)\/[a-zA-Z0-9_\-/.]+\.[a-zA-Z]+)/g,
  ];
  const paths = new Set<string>();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      paths.add(match[1]);
    }
  }
  return [...paths].slice(0, 10); // limit to 10 files
}

/** Fetch a file from GitHub repo, returns null if not found */
async function fetchFileFromGitHub(
  octokit: Awaited<ReturnType<typeof getInstallationOctokit>>,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if (!Array.isArray(data) && 'content' in data && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

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

  // Get issue with project info
  const issues = await db
    .select({
      title: schema.issues.title,
      body: schema.issues.body,
      githubOwner: schema.projects.githubOwner,
      githubRepo: schema.projects.githubRepo,
    })
    .from(schema.issues)
    .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
    .where(eq(schema.issues.id, issueId))
    .limit(1);

  if (issues.length === 0) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  // Get latest approved intent
  const intents = await db
    .select({ content: schema.intents.content, id: schema.intents.id })
    .from(schema.intents)
    .where(eq(schema.intents.issueId, issueId))
    .orderBy(desc(schema.intents.createdAt))
    .limit(1);

  if (intents.length === 0 || !intents[0].content) {
    return NextResponse.json({ error: 'No intent found' }, { status: 404 });
  }

  // Get latest approved spec
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

  // Fetch repo-map and relevant files from GitHub
  let repoMap: string | undefined;
  const relevantFiles: RelevantFile[] = [];

  const githubApp = getGitHubApp();
  if (githubApp) {
    try {
      const octokit = await getInstallationOctokit(githubApp, issue.githubOwner, issue.githubRepo);

      // Fetch repo-map.md
      const repoMapContent = await fetchFileFromGitHub(octokit, issue.githubOwner, issue.githubRepo, 'docs/repo-map.md');
      if (repoMapContent) repoMap = repoMapContent;

      // Extract file paths from spec + intent and fetch them
      const allText = `${intents[0].content}\n${specs[0].content}`;
      const filePaths = extractFilePaths(allText);

      const fileResults = await Promise.all(
        filePaths.map(async (path) => {
          const content = await fetchFileFromGitHub(octokit, issue.githubOwner, issue.githubRepo, path);
          return content ? { path, content } : null;
        }),
      );

      for (const f of fileResults) {
        if (f) relevantFiles.push(f);
      }
    } catch (error) {
      console.error('Failed to fetch codebase context:', error);
      // Continue without context — graceful degradation
    }
  }

  const content = await draftPlan({
    issueTitle: issue.title,
    issueBody: issue.body,
    intentContent: intents[0].content,
    specContent: specs[0].content,
    repoMap,
    relevantFiles,
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
