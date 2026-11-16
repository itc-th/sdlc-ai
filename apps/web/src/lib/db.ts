import { createDb } from '@sdlc-ai/db';

export const db = createDb(process.env.DATABASE_URL!);
