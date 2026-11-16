import type { Octokit } from 'octokit';

export interface CommitFileParams {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}

/**
 * Create or update a file in a GitHub repo via the Contents API.
 * If the file already exists, fetches its current SHA first.
 * Returns the commit SHA.
 */
export async function commitFileToRepo(
  octokit: Octokit,
  params: CommitFileParams,
): Promise<{ sha: string }> {
  const { owner, repo, path, content, message, branch } = params;

  // Check if file exists to get current SHA (required for updates)
  let existingSha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ...(branch ? { ref: branch } : {}),
    });
    if (!Array.isArray(data) && 'sha' in data) {
      existingSha = data.sha;
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status !== 404) {
      throw err;
    }
    // 404 = file doesn't exist yet, that's fine
  }

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    ...(existingSha ? { sha: existingSha } : {}),
    ...(branch ? { branch } : {}),
  });

  return { sha: data.commit.sha ?? '' };
}
