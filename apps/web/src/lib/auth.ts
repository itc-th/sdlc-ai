import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { createDb, schema } from '@sdlc-ai/db';
import { authConfig } from './auth.config';

const db = createDb(process.env.DATABASE_URL!);

const adapter = DrizzleAdapter(db, {
  usersTable: schema.users,
  accountsTable: schema.accounts,
  sessionsTable: schema.sessions,
  verificationTokensTable: schema.verificationTokens,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        const dbUser = await db
          .select({ role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .limit(1);

        if (dbUser[0]) {
          (session.user as unknown as Record<string, unknown>).role = dbUser[0].role;
        }
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;

      const userAccounts = await db
        .select({ provider: schema.accounts.provider })
        .from(schema.accounts)
        .where(eq(schema.accounts.userId, user.id))
        .limit(1);

      const provider = userAccounts[0]?.provider;
      const role = provider === 'github' ? 'programmer' : 'sa';

      await db
        .update(schema.users)
        .set({ role })
        .where(eq(schema.users.id, user.id));
    },
  },
});
