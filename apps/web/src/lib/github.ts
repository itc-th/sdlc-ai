import { createGitHubApp } from '@sdlc-ai/github';

export const githubApp = process.env.GITHUB_APP_ID
  ? createGitHubApp({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET!,
    })
  : null;
