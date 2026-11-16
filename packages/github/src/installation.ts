import type { App } from 'octokit';

export async function getInstallationOctokit(app: App, owner: string, repo: string) {
  const { data: installation } = await app.octokit.rest.apps.getRepoInstallation({
    owner,
    repo,
  });
  return app.getInstallationOctokit(installation.id);
}
