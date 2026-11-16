import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'sa',
  'programmer',
  'tech_lead',
  'helpdesk',
  'admin',
]);

export const oauthProviderEnum = pgEnum('oauth_provider', ['github', 'google']);

export const issueTypeEnum = pgEnum('issue_type', ['feature', 'bug', 'data_fix']);

export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high']);

export const issueStatusEnum = pgEnum('issue_status', [
  'triage',
  'intent_draft',
  'intent_approved',
  'spec_draft',
  'spec_approved',
  'in_progress',
  'review',
  'done',
  'cancelled',
]);

export const documentStatusEnum = pgEnum('document_status', ['draft', 'approved', 'rejected']);

export const approvalTargetTypeEnum = pgEnum('approval_target_type', [
  'intent',
  'spec',
  'plan',
  'pr',
]);

export const approvalDecisionEnum = pgEnum('approval_decision', [
  'approved',
  'rejected',
  'revision_requested',
]);
