import type pg from "pg";

/** Wait for actual Postgres contention instead of guessing race timing. */
export async function waitForBlocked(pool: pg.Pool, blockerPid: number, count = 1): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ n: number }>(`
      with recursive blocked(pid) as (
        select pid from pg_stat_activity where $1 = any(pg_blocking_pids(pid))
        union
        select a.pid from pg_stat_activity a join blocked b on b.pid = any(pg_blocking_pids(a.pid))
      ) select count(*)::int n from blocked`, [blockerPid]);
    if (result.rows[0].n >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("PostgreSQL lock barrier was not reached");
}
