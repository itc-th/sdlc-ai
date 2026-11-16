import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { approvalTargetTypeEnum, approvalDecisionEnum } from './enums';
import { users } from './users';

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  targetType: approvalTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  approverId: uuid('approver_id')
    .notNull()
    .references(() => users.id),
  decision: approvalDecisionEnum('decision').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
