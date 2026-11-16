import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { documentStatusEnum } from './enums';
import { intents } from './intents';
import { users } from './users';

export const specs = pgTable('specs', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .notNull()
    .references(() => intents.id),
  authorId: uuid('author_id').references(() => users.id),
  filePath: text('file_path').notNull(),
  commitSha: text('commit_sha'),
  status: documentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
