import { pgTable, text, timestamp, uuid, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { issueTypeEnum, riskLevelEnum, issueStatusEnum } from './enums';
import { projects } from './projects';
import { users } from './users';

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    issueNumber: integer('github_issue_number').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    type: issueTypeEnum('type'),
    riskLevel: riskLevelEnum('risk_level'),
    status: issueStatusEnum('status').notNull().default('triage'),
    githubIssueId: integer('github_issue_id'),
    githubIssueUrl: text('github_issue_url'),
    reporterGithubLogin: text('reporter_github_login'),
    assigneeId: uuid('assignee_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('issues_project_number_idx').on(table.projectId, table.issueNumber)],
);
