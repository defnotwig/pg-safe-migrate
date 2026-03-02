// --------------------------------------------------------------------------
// pg-safe-migrate-core — Main Migrator (entry point)
// --------------------------------------------------------------------------
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type {
  Migrator,
  MigratorConfig,
  MigrationStatus,
  MigrationPlan,
  MigrationStep,
  PlanOptions,
  LintIssue,
  DriftInfo,
  DoctorResult,
  DoctorCheck,
  TransactionPolicy,
} from './types.js';
import { ConfigError, DriftError, TransactionPolicyError } from './errors.js';
import { loadMigrations } from './loader.js';
import { createConnection, executeMigrationSql } from './db.js';
import { acquireLock, deriveLockId, tryLock } from './lock.js';
import {
  ensureHistoryTable,
  getAppliedMigrations,
  recordMigration,
  detectDrift,
  validateOrdering,
} from './history.js';
import { computePlan } from './planner.js';
import { lintSql } from './lint/sqlLint.js';

// ---- Defaults ------------------------------------------------------------

const DEFAULTS = {
  migrationsDir: './migrations',
  schema: 'public',
  tableName: '_pg_safe_migrate',
  transactionPolicy: 'auto' as TransactionPolicy,
  requireDown: false,
} as const;

// ---- Factory -------------------------------------------------------------

/**
 * Create a migrator instance from config.
 */
export function createMigrator(userConfig: MigratorConfig): Migrator {
  const config: Required<
    Pick<MigratorConfig, 'schema' | 'tableName' | 'transactionPolicy' | 'requireDown' | 'migrationsDir'>
  > &
    MigratorConfig = {
    ...DEFAULTS,
    ...userConfig,
    migrationsDir: resolve(userConfig.migrationsDir ?? DEFAULTS.migrationsDir),
  };

  // Validate config
  if (!config.databaseUrl && !config.client) {
    throw new ConfigError(
      'Either "databaseUrl" or "client" must be provided.',
      'Set DATABASE_URL environment variable or pass a pg client.',
    );
  }

  const historyOpts = { schema: config.schema, tableName: config.tableName };

  // ---- check() -----------------------------------------------------------

  async function check(): Promise<{ ok: boolean; issues: LintIssue[]; drift: DriftInfo[] }> {
    const issues = await lint();
    const { driftDetected } = await status();
    const errors = issues.filter((i) => i.severity === 'error');
    return {
      ok: errors.length === 0 && driftDetected.length === 0,
      issues,
      drift: driftDetected,
    };
  }

  // ---- status() ----------------------------------------------------------

  async function status(): Promise<MigrationStatus> {
    const conn = await createConnection(config);
    try {
      await ensureHistoryTable(conn.client, historyOpts);
      const applied = await getAppliedMigrations(conn.client, historyOpts);
      const onDisk = await loadMigrations(config.migrationsDir);
      const driftDetected = detectDrift(
        applied,
        onDisk.map((f) => ({ id: f.id, checksum: f.checksum })),
      );
      const appliedIds = new Set(applied.map((a) => a.id));
      const pending = onDisk.filter((f) => !appliedIds.has(f.id));
      return { applied, pending, driftDetected };
    } finally {
      await conn.release();
    }
  }

  // ---- plan() ------------------------------------------------------------

  async function plan(options: PlanOptions = {}): Promise<MigrationPlan> {
    const conn = await createConnection(config);
    try {
      await ensureHistoryTable(conn.client, historyOpts);
      const applied = await getAppliedMigrations(conn.client, historyOpts);
      const onDisk = await loadMigrations(config.migrationsDir);

      validateOrdering(applied, onDisk);

      return computePlan({
        applied,
        onDisk,
        options,
        transactionPolicy: config.transactionPolicy,
        requireDown: config.requireDown,
      });
    } finally {
      await conn.release();
    }
  }

  // ---- run() -------------------------------------------------------------

  async function run(options: PlanOptions = {}): Promise<MigrationStep[]> {
    const conn = await createConnection(config);
    const lockId =
      config.lockId ?? deriveLockId([config.schema, config.tableName]);
    let releaseLock: (() => Promise<void>) | null = null;

    try {
      await ensureHistoryTable(conn.client, historyOpts);
      releaseLock = await acquireLock(conn.client, lockId);

      const applied = await getAppliedMigrations(conn.client, historyOpts);
      const onDisk = await loadMigrations(config.migrationsDir);

      // Drift check
      const drift = detectDrift(
        applied,
        onDisk.map((f) => ({ id: f.id, checksum: f.checksum })),
      );
      if (drift.length > 0) {
        const first = drift[0]!;
        throw new DriftError(first.id, first.expectedChecksum, first.actualChecksum);
      }

      validateOrdering(applied, onDisk);

      const migrationPlan = await computePlan({
        applied,
        onDisk,
        options,
        transactionPolicy: config.transactionPolicy,
        requireDown: config.requireDown,
      });

      if (migrationPlan.dryRun) {
        return migrationPlan.steps;
      }

      // Execute steps
      for (const step of migrationPlan.steps) {
        const sql = await readFile(step.filePath, 'utf-8');

        // Transaction policy enforcement
        const useTransaction = resolveTransactionMode(
          config.transactionPolicy,
          step,
          sql,
        );

        const executionMs = await executeMigrationSql(
          conn.client,
          sql,
          useTransaction,
        );

        await recordMigration(conn.client, historyOpts, {
          id: step.id,
          checksum: step.checksum,
          executionMs,
          direction: step.direction,
        });
      }

      return migrationPlan.steps;
    } finally {
      if (releaseLock) await releaseLock();
      await conn.release();
    }
  }

  // ---- lint() ------------------------------------------------------------

  async function lint(): Promise<LintIssue[]> {
    const onDisk = await loadMigrations(config.migrationsDir);
    const allIssues: LintIssue[] = [];

    for (const file of onDisk) {
      const content = await readFile(file.upPath, 'utf-8');
      const issues = lintSql(content, file.upPath, config.allowRules);
      allIssues.push(...issues);
    }

    return allIssues;
  }

  // ---- doctor() helper checks --------------------------------------------

  function checkMigrationsDir(): DoctorCheck {
    const dirExists = existsSync(config.migrationsDir);
    return {
      name: 'Migrations directory',
      ok: dirExists,
      message: dirExists
        ? `Found: ${config.migrationsDir}`
        : `Not found: ${config.migrationsDir}`,
    };
  }

  async function checkConnectivity(): Promise<DoctorCheck> {
    try {
      const conn = await createConnection(config);
      try {
        await conn.client.query('SELECT 1');
      } finally {
        await conn.release();
      }
      return { name: 'Database connectivity', ok: true, message: 'Connected successfully.' };
    } catch (err) {
      return {
        name: 'Database connectivity',
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function checkHistoryTable(): Promise<DoctorCheck> {
    try {
      const conn = await createConnection(config);
      try {
        await ensureHistoryTable(conn.client, historyOpts);
      } finally {
        await conn.release();
      }
      return {
        name: 'History table',
        ok: true,
        message: `Table "${config.schema}"."${config.tableName}" ready.`,
      };
    } catch (err) {
      return {
        name: 'History table',
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function checkAdvisoryLock(): Promise<DoctorCheck> {
    const lockId = config.lockId ?? deriveLockId([config.schema, config.tableName]);
    try {
      const conn = await createConnection(config);
      try {
        const acquired = await tryLock(conn.client, lockId);
        return {
          name: 'Advisory lock',
          ok: acquired,
          message: acquired
            ? `Lock ${lockId} acquirable.`
            : `Lock ${lockId} is held by another session.`,
        };
      } finally {
        await conn.release();
      }
    } catch (err) {
      return {
        name: 'Advisory lock',
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ---- doctor() ----------------------------------------------------------

  async function doctor(): Promise<DoctorResult> {
    const checks: DoctorCheck[] = [checkMigrationsDir()];

    const connCheck = await checkConnectivity();
    checks.push(connCheck);

    if (connCheck.ok) {
      const [historyCheck, lockCheck] = await Promise.all([
        checkHistoryTable(),
        checkAdvisoryLock(),
      ]);
      checks.push(historyCheck, lockCheck);
    }

    return {
      ok: checks.every((c) => c.ok),
      checks,
    };
  }

  return { check, status, plan, run, lint, doctor };
}

// ---- Helpers -------------------------------------------------------------

function resolveTransactionMode(
  policy: TransactionPolicy,
  step: MigrationStep,
  _sql: string,
): boolean {
  switch (policy) {
    case 'always':
      if (step.needsNonTransactional) {
        throw new TransactionPolicyError(step.id, '(auto-detected non-transactional statement)');
      }
      return true;
    case 'never':
      return false;
    case 'auto':
    default:
      return !step.needsNonTransactional;
  }
}
