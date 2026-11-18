import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { documentStatusEnum } from './enums';
import { issues } from './issues';
import { users } from './users';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id),
  authorId: uuid('author_id').references(() => users.id),
  content: text('content'),
  filePath: text('file_path'),
  commitSha: text('commit_sha'),
  status: documentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
