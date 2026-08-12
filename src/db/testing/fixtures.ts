// Test-only DB fixture helpers. NOT imported by application code — it lives under
// `testing/` and is referenced only from *.dbtest.ts files.
//
// Why this exists: deleting a `user` does NOT delete the organizations that user
// created (Better Auth organization rows are independent of the user, with no
// user->organization ownership FK). Phase 4 surfaced that integration tests were
// therefore leaving memberless test organizations behind. This helper makes each
// test clean up exactly the rows it created:
//
//   - Organizations are tracked by id and deleted by primary key. Organization
//     deletion CASCADES (FK ON DELETE CASCADE) to member, invitation,
//     organization_profiles, clients, and price_lists, so removing the org row
//     removes every tenant-owned row the test produced.
//   - Users are tracked by email and deleted by email.
//
// Deletion is scoped strictly to the ids/emails a test registered, so it can
// never touch normal development organizations or data. No broad/prefix DELETEs.

import type pg from "pg";

/** A short, collision-resistant token to namespace a single test run's fixtures. */
export function testRunId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Accumulates the ids/emails a test creates and deletes exactly those in
 * teardown. Register ids as you create them (the register methods return their
 * argument so they compose inline), then call `run()` once in `afterAll`.
 */
export class TestCleanup {
  private readonly orgIds = new Set<string>();
  private readonly userEmails = new Set<string>();

  constructor(private readonly ownerPool: pg.Pool) {}

  /** Track an organization id for teardown; returns the id for inline use. */
  org<T extends string>(id: T): T {
    if (id) this.orgIds.add(id);
    return id;
  }

  /** Track a user email for teardown; returns the email for inline use. */
  userEmail<T extends string>(email: T): T {
    if (email) this.userEmails.add(email);
    return email;
  }

  /**
   * Delete only the tracked organizations (cascades to all tenant data) and the
   * tracked users. Ordered orgs-first so cascades run before the users vanish.
   * Runs as the privileged migration/owner pool passed to the constructor.
   */
  async run(): Promise<void> {
    if (this.orgIds.size > 0) {
      await this.ownerPool.query(`delete from organization where id = any($1::uuid[])`, [
        [...this.orgIds],
      ]);
    }
    if (this.userEmails.size > 0) {
      await this.ownerPool.query(`delete from "user" where email = any($1::text[])`, [
        [...this.userEmails],
      ]);
    }
  }
}
