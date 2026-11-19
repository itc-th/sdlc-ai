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

export interface CloseIssueParams {
  owner: string;
  repo: string;
  issueNumber: number;
  comment?: string;
}

export async function closeGitHubIssue(octokit: Octokit, params: CloseIssueParams) {
  if (params.comment) {
    await octokit.rest.issues.createComment({
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,
      body: params.comment,
    });
  }
  return octokit.rest.issues.update({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.issueNumber,
    state: 'closed',
    state_reason: 'completed',
  });
}

export interface CreateTagParams {
  owner: string;
  repo: string;
  tag: string;
  message: string;
  sha: string;
}

export async function createGitTag(octokit: Octokit, params: CreateTagParams) {
  const { data: tagObj } = await octokit.rest.git.createTag({
    owner: params.owner,
    repo: params.repo,
    tag: params.tag,
    message: params.message,
    object: params.sha,
    type: 'commit',
  });
  await octokit.rest.git.createRef({
    owner: params.owner,
    repo: params.repo,
    ref: `refs/tags/${params.tag}`,
    sha: tagObj.sha,
  });
  return { sha: tagObj.sha };
}
