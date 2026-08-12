// Canonical organization roles + access-control, defined ONCE with Better Auth's
// access-control system so there is a single source of truth for authorization.
// Better Auth's built-in owner/admin/member statements are extended (not
// replaced), so the platform's owner-can't-be-removed / owner-only-delete and
// admin member-management semantics are preserved.
//
// Phase 2 establishes and attaches these roles. Phase 3 builds the server-action
// authorization spine that consumes them; the business permission model stays
// intentionally coarse for now.

import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";

/** Org-management actions (from Better Auth) + our coarse business resources. */
export const statement = {
  ...defaultStatements,
  client: ["read", "write", "delete"],
  project: ["read", "write", "accept", "archive", "delete"],
  invoice: ["read", "create", "update", "cancel", "delete"],
  payment: ["read", "record", "delete"],
  pricing: ["read", "edit", "activate"],
  settings: ["read", "edit"],
} as const;

export const ac = createAccessControl(statement);

// Full business control (used by owner/admin).
const ALL_BUSINESS = {
  client: ["read", "write", "delete"],
  project: ["read", "write", "accept", "archive", "delete"],
  invoice: ["read", "create", "update", "cancel", "delete"],
  payment: ["read", "record", "delete"],
  pricing: ["read", "edit", "activate"],
  settings: ["read", "edit"],
} as const;

export const owner = ac.newRole({ ...ownerAc.statements, ...ALL_BUSINESS });
export const admin = ac.newRole({ ...adminAc.statements, ...ALL_BUSINESS });

// sales/operator build offers in the configurator, which must read the active
// pricing to compute prices — so they need pricing:read (edit/activate stay with
// owner/admin). Phase 5 added this; before, only owner/admin/accounting could
// read pricing, which would have starved the configurator for these roles.
export const sales = ac.newRole({
  ...memberAc.statements,
  client: ["read", "write"],
  project: ["read", "write", "accept", "archive"],
  invoice: ["read"],
  payment: ["read"],
  pricing: ["read"],
  settings: ["read"],
});

export const operator = ac.newRole({
  ...memberAc.statements,
  client: ["read", "write"],
  project: ["read", "write", "archive"],
  invoice: ["read"],
  payment: ["read"],
  pricing: ["read"],
  settings: ["read"],
});

export const accounting = ac.newRole({
  ...memberAc.statements,
  client: ["read"],
  project: ["read"],
  invoice: ["read", "create", "update", "cancel", "delete"],
  payment: ["read", "record", "delete"],
  pricing: ["read"],
  settings: ["read"],
});

export const roles = { owner, admin, sales, operator, accounting };
export type AppRole = keyof typeof roles;
export const APP_ROLES = Object.keys(roles) as AppRole[];
