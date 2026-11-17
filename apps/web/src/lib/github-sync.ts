import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import {
  getInstallationOctokit,
  createGitHubIssue,
  updateGitHubIssueLabels,
  dbToGitHubLabels,
  commitFileToRepo,
} from '@sdlc-ai/github';
import { db } from './db';
import { getGitHubApp } from './github';

/**
 * After creating an issue in DB, sync it to GitHub.
 * Updates githubIssueNumber with the real GitHub issue number.
 * Returns silently on failure (graceful degradation).
 */
export async function syncNewIssueToGitHub(issueId: string) {
  const githubApp = getGitHubApp();
  if (!githubApp) return;

  try {
    const rows = await db
      .select({
        id: schema.issues.id,
        title: schema.issues.title,
        body: schema.issues.body,
        type: schema.issues.type,
        riskLevel: schema.issues.riskLevel,
        status: schema.issues.status,
        githubOwner: schema.projects.githubOwner,
        githubRepo: schema.projects.githubRepo,
      })
      .from(schema.issues)
      .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
      .where(eq(schema.issues.id, issueId))
      .limit(1);

    if (rows.length === 0) return;
    const issue = rows[0];

    const octokit = await getInstallationOctokit(githubApp, issue.githubOwner, issue.githubRepo);
    const labels = dbToGitHubLabels({ type: issue.type, riskLevel: issue.riskLevel, status: issue.status });

    const { data } = await createGitHubIssue(octokit, {
      owner: issue.githubOwner,
      repo: issue.githubRepo,
      title: issue.title,
      body: issue.body,
      labels,
    });

    // Update DB with real GitHub issue number
    await db
      .update(schema.issues)
      .set({ githubIssueNumber: data.number, updatedAt: new Date() })
      .where(eq(schema.issues.id, issueId));
  } catch (error) {
    console.error('Failed to sync new issue to GitHub:', error);
  }
}

/**
 * After triaging an issue in DB, sync labels back to GitHub.
 * Returns silently on failure (graceful degradation).
 */
export async function syncLabelsToGitHub(issueId: string) {
  const githubApp = getGitHubApp();
  if (!githubApp) return;

  try {
    const rows = await db
      .select({
        githubIssueNumber: schema.issues.githubIssueNumber,
        type: schema.issues.type,
        riskLevel: schema.issues.riskLevel,
        status: schema.issues.status,
        githubOwner: schema.projects.githubOwner,
        githubRepo: schema.projects.githubRepo,
      })
      .from(schema.issues)
      .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
      .where(eq(schema.issues.id, issueId))
      .limit(1);

    if (rows.length === 0) return;
    const issue = rows[0];

    const octokit = await getInstallationOctokit(githubApp, issue.githubOwner, issue.githubRepo);
    const labels = dbToGitHubLabels({ type: issue.type, riskLevel: issue.riskLevel, status: issue.status });

    await updateGitHubIssueLabels(octokit, {
      owner: issue.githubOwner,
      repo: issue.githubRepo,
      issueNumber: issue.githubIssueNumber,
      labels,
    });
  } catch (error) {
    console.error('Failed to sync labels to GitHub:', error);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * After approving an intent, commit its content to the GitHub repo.
 * Returns { filePath, commitSha } or null on failure.
 */
export async function syncIntentToGitHub(
  intentId: string,
): Promise<{ filePath: string; commitSha: string } | null> {
  const githubApp = getGitHubApp();
  if (!githubApp) return null;

  try {
    const rows = await db
      .select({
        content: schema.intents.content,
        issueNumber: schema.issues.githubIssueNumber,
        issueTitle: schema.issues.title,
        githubOwner: schema.projects.githubOwner,
        githubRepo: schema.projects.githubRepo,
      })
      .from(schema.intents)
      .innerJoin(schema.issues, eq(schema.intents.issueId, schema.issues.id))
      .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
      .where(eq(schema.intents.id, intentId))
      .limit(1);

    if (rows.length === 0 || !rows[0].content) return null;
    const row = rows[0];
    const content = row.content!;

    const year = new Date().getFullYear();
    const slug = slugify(row.issueTitle);
    const filePath = `docs/intents/${year}-${row.issueNumber}-${slug}/intent.md`;

    const octokit = await getInstallationOctokit(githubApp, row.githubOwner, row.githubRepo);
    const { sha } = await commitFileToRepo(octokit, {
      owner: row.githubOwner,
      repo: row.githubRepo,
      path: filePath,
      content,
      message: `docs: add intent for #${row.issueNumber}`,
    });

    await db
      .update(schema.intents)
      .set({ filePath, commitSha: sha, updatedAt: new Date() })
      .where(eq(schema.intents.id, intentId));

    return { filePath, commitSha: sha };
  } catch (error) {
    console.error('Failed to sync intent to GitHub:', error);
    return null;
  }
}

/**
 * After approving a spec, commit its content to the GitHub repo.
 * Returns { filePath, commitSha } or null on failure.
 */
export async function syncSpecToGitHub(
  specId: string,
): Promise<{ filePath: string; commitSha: string } | null> {
  const githubApp = getGitHubApp();
  if (!githubApp) return null;

  try {
    const rows = await db
      .select({
        content: schema.specs.content,
        issueNumber: schema.issues.githubIssueNumber,
        issueTitle: schema.issues.title,
        githubOwner: schema.projects.githubOwner,
        githubRepo: schema.projects.githubRepo,
      })
      .from(schema.specs)
      .innerJoin(schema.intents, eq(schema.specs.intentId, schema.intents.id))
      .innerJoin(schema.issues, eq(schema.intents.issueId, schema.issues.id))
      .innerJoin(schema.projects, eq(schema.issues.projectId, schema.projects.id))
      .where(eq(schema.specs.id, specId))
      .limit(1);

    if (rows.length === 0 || !rows[0].content) return null;
    const row = rows[0];
    const content = row.content!;

    const year = new Date().getFullYear();
    const slug = slugify(row.issueTitle);
    const filePath = `docs/intents/${year}-${row.issueNumber}-${slug}/spec.md`;

    const octokit = await getInstallationOctokit(githubApp, row.githubOwner, row.githubRepo);
    const { sha } = await commitFileToRepo(octokit, {
      owner: row.githubOwner,
      repo: row.githubRepo,
      path: filePath,
      content,
      message: `docs: add spec for #${row.issueNumber}`,
    });

    await db
      .update(schema.specs)
      .set({ filePath, commitSha: sha, updatedAt: new Date() })
      .where(eq(schema.specs.id, specId));

    return { filePath, commitSha: sha };
  } catch (error) {
    console.error('Failed to sync spec to GitHub:', error);
    return null;
  }
}
