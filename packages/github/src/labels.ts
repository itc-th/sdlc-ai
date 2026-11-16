export const TYPE_LABEL_PREFIX = 'type:';
export const RISK_LABEL_PREFIX = 'risk:';
export const STATUS_LABEL_PREFIX = 'status:';

export function dbToGitHubLabels(issue: {
  type?: string | null;
  riskLevel?: string | null;
  status?: string | null;
}): string[] {
  const labels: string[] = [];
  if (issue.type) labels.push(`${TYPE_LABEL_PREFIX}${issue.type}`);
  if (issue.riskLevel) labels.push(`${RISK_LABEL_PREFIX}${issue.riskLevel}`);
  if (issue.status) labels.push(`${STATUS_LABEL_PREFIX}${issue.status}`);
  return labels;
}

export function gitHubLabelsToDb(labels: string[]): {
  type?: string;
  riskLevel?: string;
  status?: string;
} {
  const result: { type?: string; riskLevel?: string; status?: string } = {};
  for (const label of labels) {
    if (label.startsWith(TYPE_LABEL_PREFIX)) result.type = label.slice(TYPE_LABEL_PREFIX.length);
    if (label.startsWith(RISK_LABEL_PREFIX)) result.riskLevel = label.slice(RISK_LABEL_PREFIX.length);
    if (label.startsWith(STATUS_LABEL_PREFIX)) result.status = label.slice(STATUS_LABEL_PREFIX.length);
  }
  return result;
}
