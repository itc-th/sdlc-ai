import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sdlc-ai/db', '@sdlc-ai/github', '@sdlc-ai/agents'],
};

export default nextConfig;
