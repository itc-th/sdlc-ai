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

export interface BatchFile {
  path: string;
  content: string;
}

/**
 * Commit multiple files in a single commit using the Git Tree API.
 * Returns the commit SHA.
 */
export async function commitFilesToRepo(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    files: BatchFile[];
    message: string;
    branch?: string;
  },
): Promise<{ sha: string }> {
  const { owner, repo, files, message, branch } = params;
  const ref = branch ?? 'main';

  // Get current commit SHA of the branch
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${ref}`,
  });
  const baseSha = refData.object.sha;

  // Create blobs for each file
  const tree = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content, 'utf-8').toString('base64'),
        encoding: 'base64',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    }),
  );

  // Create tree
  const { data: treeData } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseSha,
    tree,
  });

  // Create commit
  const { data: commitData } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: treeData.sha,
    parents: [baseSha],
  });

  // Update branch ref
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${ref}`,
    sha: commitData.sha,
  });

  return { sha: commitData.sha };
}
