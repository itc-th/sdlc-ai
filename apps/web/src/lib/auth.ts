import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { schema } from '@sdlc-ai/db';
import { db } from './db';
import { authConfig } from './auth.config';

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
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        const dbUser = await db
          .select({ role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, user.id!))
          .limit(1);
        if (dbUser[0]) {
          token.role = dbUser[0].role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as unknown as Record<string, unknown>).role = token.role;
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
