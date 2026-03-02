// --------------------------------------------------------------------------
// pg-safe-migrate-core — Advisory Lock
// --------------------------------------------------------------------------
import { createHash } from 'node:crypto';
import type { PgClientLike } from './types.js';
import { LockAcquireError } from './errors.js';

/**
 * Derive a stable 64-bit advisory lock ID from a set of strings.
 * We hash them into a BigInt and take the lower 63 bits (pg advisory locks
 * accept a signed bigint, so we keep it positive).
 */
export function deriveLockId(parts: string[]): number {
  const hash = createHash('sha256').update(parts.join('::'), 'utf8').digest('hex');
  // Take the first 15 hex chars (60 bits) → fits in a JS safe integer.
  const n = Number.parseInt(hash.slice(0, 15), 16);
  return n;
}

/**
 * Acquire a PostgreSQL advisory lock using pg_advisory_lock.
 * This is a session-level lock that blocks until acquired.
 * Returns a release function.
 */
export async function acquireLock(
  client: PgClientLike,
  lockId: number,
): Promise<() => Promise<void>> {
  try {
    await client.query(`SELECT pg_advisory_lock($1)`, [lockId]);
  } catch (err) {
    throw new LockAcquireError(
      err instanceof Error ? err.message : String(err),
    );
  }

  let released = false;

  return async () => {
    if (released) return;
    released = true;
    try {
      await client.query(`SELECT pg_advisory_unlock($1)`, [lockId]);
    } catch {
      // Best-effort unlock; session termination will release it anyway.
    }
  };
}

/**
 * Try to acquire the lock without blocking (for doctor check).
 * Returns true if acquired (and immediately releases), false otherwise.
 */
export async function tryLock(
  client: PgClientLike,
  lockId: number,
): Promise<boolean> {
  const result = await client.query(
    `SELECT pg_try_advisory_lock($1) AS acquired`,
    [lockId],
  );
  const acquired = (result.rows[0] as { acquired: boolean } | undefined)?.acquired === true;
  if (acquired) {
    await client.query(`SELECT pg_advisory_unlock($1)`, [lockId]);
  }
  return acquired;
}
