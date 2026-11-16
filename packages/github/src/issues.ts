import type { Octokit } from 'octokit';

export interface CreateIssueParams {
  owner: string;
  repo: string;
  title: string;
  body?: string | null;
  labels?: string[];
}

export interface UpdateLabelsParams {
  owner: string;
  repo: string;
  issueNumber: number;
  labels: string[];
}

export async function createGitHubIssue(octokit: Octokit, params: CreateIssueParams) {
  return octokit.rest.issues.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body ?? undefined,
    labels: params.labels,
  });
}

export async function updateGitHubIssueLabels(octokit: Octokit, params: UpdateLabelsParams) {
  return octokit.rest.issues.setLabels({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    labels: params.labels,
  });
}
