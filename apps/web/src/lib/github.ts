import { createGitHubApp } from '@sdlc-ai/github';

let _app: ReturnType<typeof createGitHubApp> | null | undefined;

export function getGitHubApp(): ReturnType<typeof createGitHubApp> | null {
  if (_app !== undefined) return _app;
  _app = process.env.GITHUB_APP_ID
    ? createGitHubApp({
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
        webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
      })
    : null;
  return _app;
}
