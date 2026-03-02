// --------------------------------------------------------------------------
// pg-safe-migrate-core — Migration History Table
// --------------------------------------------------------------------------
import type { PgClientLike, MigrationRecord, Direction } from './types.js';
import { TOOL_VERSION } from './version.js';
import { MigrationOrderError } from './errors.js';

export interface HistoryOptions {
  schema: string;
  tableName: string;
}

function fqn(opts: HistoryOptions): string {
  return `"${opts.schema}"."${opts.tableName}"`;
}

/**
 * Ensure the migration history table exists. Creates it if missing.
 */
export async function ensureHistoryTable(
  client: PgClientLike,
  opts: HistoryOptions,
): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${fqn(opts)} (
      id              TEXT        PRIMARY KEY,
      checksum        TEXT        NOT NULL,
      applied_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      execution_ms    INTEGER     NOT NULL,
      direction       TEXT        NOT NULL,
      tool_version    TEXT        NOT NULL,
      notes           JSONB       NULL
    );
  `);
}

/**
 * Fetch all applied migration records, ordered by id.
 */
export async function getAppliedMigrations(
  client: PgClientLike,
  opts: HistoryOptions,
): Promise<MigrationRecord[]> {
  const result = await client.query(
    `SELECT id, checksum, applied_at, execution_ms, direction, tool_version, notes
     FROM ${fqn(opts)}
     WHERE direction = 'up'
     ORDER BY id ASC`,
  );

  return result.rows.map((row) => ({
    id: String(row['id']),
    checksum: String(row['checksum']),
    appliedAt: new Date(row['applied_at'] as string),
    executionMs: Number(row['execution_ms']),
    direction: String(row['direction']) as Direction,
    toolVersion: String(row['tool_version']),
    notes: (row['notes'] as Record<string, unknown>) ?? null,
  }));
}

/**
 * Record a migration application in the history table.
 */
export async function recordMigration(
  client: PgClientLike,
  opts: HistoryOptions,
  record: {
    id: string;
    checksum: string;
    executionMs: number;
    direction: Direction;
    notes?: Record<string, unknown> | null;
  },
): Promise<void> {
  if (record.direction === 'up') {
    await client.query(
      `INSERT INTO ${fqn(opts)} (id, checksum, execution_ms, direction, tool_version, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        record.id,
        record.checksum,
        record.executionMs,
        record.direction,
        TOOL_VERSION,
        record.notes ? JSON.stringify(record.notes) : null,
      ],
    );
  } else {
    // For "down", remove the up record
    await client.query(
      `DELETE FROM ${fqn(opts)} WHERE id = $1`,
      [record.id],
    );
  }
}

/**
 * Validate that applied migrations match on-disk checksums (drift detection).
 * Also validates ordering constraints.
 */
export function detectDrift(
  applied: MigrationRecord[],
  onDisk: { id: string; checksum: string }[],
): { id: string; expectedChecksum: string; actualChecksum: string }[] {
  const diskMap = new Map(onDisk.map((f) => [f.id, f.checksum]));
  const drifts: { id: string; expectedChecksum: string; actualChecksum: string }[] = [];

  for (const rec of applied) {
    const diskChecksum = diskMap.get(rec.id);
    if (diskChecksum === undefined) {
      // Applied migration no longer on disk — also a drift
      drifts.push({
        id: rec.id,
        expectedChecksum: rec.checksum,
        actualChecksum: '<missing>',
      });
    } else if (diskChecksum !== rec.checksum) {
      drifts.push({
        id: rec.id,
        expectedChecksum: rec.checksum,
        actualChecksum: diskChecksum,
      });
    }
  }

  return drifts;
}

/**
 * Validate ordering: no on-disk migration should have an ID earlier than
 * the last applied migration (unless it is already applied).
 */
export function validateOrdering(
  applied: MigrationRecord[],
  onDisk: { id: string }[],
): void {
  if (applied.length === 0) return;

  const appliedIds = new Set(applied.map((a) => a.id));
  const lastAppliedId = applied.at(-1)!.id;

  for (const file of onDisk) {
    if (!appliedIds.has(file.id) && file.id < lastAppliedId) {
      throw new MigrationOrderError(
        `Migration "${file.id}" is not applied but sorts before the last applied migration "${lastAppliedId}". ` +
        `This likely means a migration was added out of order.`,
      );
    }
  }
}
