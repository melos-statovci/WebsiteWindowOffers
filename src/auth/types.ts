// Pure auth context types — safe to import from client components (no server
// dependencies). The concrete resolution lives in session.ts (server-only).

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
}

export interface AuthContext {
  user: { id: string; name: string; email: string };
  activeOrg: OrgSummary;
  role: string;
  memberships: OrgSummary[];
}
