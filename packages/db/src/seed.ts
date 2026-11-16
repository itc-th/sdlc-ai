import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { projects } from './schema/projects';

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const client = postgres(url);
  const db = drizzle(client);

  await db
    .insert(projects)
    .values({
      name: 'SDLC-AI',
      githubOwner: 'itc-th',
      githubRepo: 'sdlc-ai',
    })
    .onConflictDoNothing();

  console.log('Seed completed: default project created');
  await client.end();
}

seed();
