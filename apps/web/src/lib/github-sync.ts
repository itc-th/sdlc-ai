import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import {
  getInstallationOctokit,
  createGitHubIssue,
  updateGitHubIssueLabels,
  dbToGitHubLabels,
} from '@sdlc-ai/github';
import { db } from './db';
import { githubApp } from './github';

/**
 * After creating an issue in DB, sync it to GitHub.
 * Updates githubIssueNumber with the real GitHub issue number.
 * Returns silently on failure (graceful degradation).
 */
export async function syncNewIssueToGitHub(issueId: string) {
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
