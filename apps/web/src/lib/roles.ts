type Role = 'sa' | 'programmer' | 'tech_lead' | 'helpdesk' | 'admin';

const PERMISSIONS: Record<string, Role[]> = {
  'issue.create':    ['helpdesk', 'sa', 'admin'],
  'issue.triage':    ['sa', 'admin'],
  'intent.create':   ['sa', 'admin'],
  'intent.update':   ['sa', 'admin'],
  'intent.review':   ['sa', 'tech_lead', 'admin'],
  'spec.create':     ['sa', 'admin'],
  'spec.update':     ['sa', 'admin'],
  'spec.review':     ['sa', 'tech_lead', 'admin'],
  'plan.create':     ['programmer', 'tech_lead', 'sa', 'admin'],
  'plan.update':     ['programmer', 'tech_lead', 'sa', 'admin'],
  'plan.review':     ['programmer', 'tech_lead', 'sa', 'admin'],
  'release.deploy':  ['sa', 'tech_lead', 'admin'],
};

export function hasPermission(role: string | undefined, action: string): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role as Role);
}

export function getUserRole(session: { user?: { id?: string } } | null): string | undefined {
  if (!session?.user) return undefined;
  return (session.user as unknown as { role?: string }).role;
}
