// --------------------------------------------------------------------------
// pg-safe-migrate-core — Migration Planner
// --------------------------------------------------------------------------
import { readFile } from 'node:fs/promises';
import type {
  MigrationFile,
  MigrationRecord,
  MigrationPlan,
  MigrationStep,
  PlanOptions,
  TransactionPolicy,
  Direction,
} from './types.js';
import { MissingDownError } from './errors.js';
import { splitStatements } from './lint/splitter.js';
import { hasNonTransactionalStatements } from './lint/rules.js';

export interface PlannerInput {
  applied: MigrationRecord[];
  onDisk: MigrationFile[];
  options: PlanOptions;
  transactionPolicy: TransactionPolicy;
  requireDown: boolean;
}

/**
 * Compute a migration plan (pure function).
 */
export async function computePlan(input: PlannerInput): Promise<MigrationPlan> {
  const { applied, onDisk, options, transactionPolicy, requireDown } = input;
  const direction: Direction = options.direction ?? 'up';
  const dryRun = options.dryRun ?? false;

  const appliedIds = new Set(applied.map((r) => r.id));
  let steps: MigrationStep[];

  if (direction === 'up') {
    steps = await planUp(onDisk, appliedIds, options, requireDown);
  } else {
    steps = await planDown(onDisk, applied, options);
  }

  return {
    steps,
    direction,
    dryRun,
    transactionPolicy,
  };
}

async function planUp(
  onDisk: MigrationFile[],
  appliedIds: Set<string>,
  options: PlanOptions,
  requireDown: boolean,
): Promise<MigrationStep[]> {
  // Pending migrations: on disk but not applied
  const pending = onDisk.filter((f) => !appliedIds.has(f.id));

  let target = pending;

  // Apply "to" filter
  if (options.to) {
    const idx = target.findIndex((f) => f.id === options.to);
    if (idx === -1) {
      // If "to" is already applied or not found in pending, return empty
      return [];
    }
    target = target.slice(0, idx + 1);
  }

  // Apply "steps" filter
  if (options.steps !== undefined) {
    target = target.slice(0, options.steps);
  }

  const steps: MigrationStep[] = [];
  for (const file of target) {
    // Check down requirement
    if (requireDown && !file.downPath && !file.irreversible) {
      throw new MissingDownError(file.id);
    }

    const content = await readFile(file.upPath, 'utf-8');
    const stmts = splitStatements(content);
    const needsNonTransactional = hasNonTransactionalStatements(stmts);

    steps.push({
      id: file.id,
      direction: 'up',
      filePath: file.upPath,
      checksum: file.checksum,
      needsNonTransactional,
    });
  }

  return steps;
}

async function planDown(
  onDisk: MigrationFile[],
  applied: MigrationRecord[],
  options: PlanOptions,
): Promise<MigrationStep[]> {
  // For down, we reverse the applied order
  const onDiskMap = new Map(onDisk.map((f) => [f.id, f]));
  const reversedApplied = [...applied].reverse();

  let target = reversedApplied;

  // Apply "to" filter — run down until we reach the target (exclusive)
  if (options.to) {
    const idx = target.findIndex((r) => r.id === options.to);
    if (idx === -1) {
      return [];
    }
    // Don't include "to" itself — we stop before it
    target = target.slice(0, idx);
  }

  // Apply "steps" filter
  if (options.steps !== undefined) {
    target = target.slice(0, options.steps);
  }

  const steps: MigrationStep[] = [];
  for (const rec of target) {
    const file = onDiskMap.get(rec.id);
    if (!file) {
      throw new MissingDownError(rec.id);
    }
    if (!file.downPath) {
      if (file.irreversible) {
        throw new MissingDownError(
          `${rec.id} is marked irreversible and cannot be rolled back.`,
        );
      }
      throw new MissingDownError(rec.id);
    }

    const content = await readFile(file.downPath, 'utf-8');
    const stmts = splitStatements(content);
    const needsNonTransactional = hasNonTransactionalStatements(stmts);

    steps.push({
      id: rec.id,
      direction: 'down',
      filePath: file.downPath,
      checksum: file.checksum,
      needsNonTransactional,
    });
  }

  return steps;
}
