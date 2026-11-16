import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { documentStatusEnum } from './enums';
import { issues } from './issues';
import { users } from './users';

export const intents = pgTable('intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id),
  authorId: uuid('author_id').references(() => users.id),
  filePath: text('file_path').notNull(),
  status: documentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
