// --------------------------------------------------------------------------
// pg-safe-migrate CLI — status command
// --------------------------------------------------------------------------
import { createMigrator } from 'pg-safe-migrate-core';
import type { MigratorConfig } from 'pg-safe-migrate-core';
import { printError, printWarning, printInfo, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

export async function statusCommand(config: MigratorConfig) {
  try {
    const migrator = createMigrator(config);
    const result = await migrator.status();

    printHeader('Migration Status');

    // Applied
    if (result.applied.length > 0) {
      console.log(`\n${fmt.bold('Applied')} (${result.applied.length}):`);
      for (const rec of result.applied) {
        const date = rec.appliedAt.toISOString().slice(0, 19);
        console.log(`  ${fmt.green('✓')} ${rec.id}  ${fmt.dim(date)}  ${fmt.dim(rec.executionMs + 'ms')}`);
      }
    } else {
      printInfo('No applied migrations.');
    }

    // Pending
    if (result.pending.length > 0) {
      console.log(`\n${fmt.bold('Pending')} (${result.pending.length}):`);
      for (const file of result.pending) {
        console.log(`  ${fmt.yellow('○')} ${file.id}`);
      }
    } else {
      printInfo('No pending migrations.');
    }

    // Drift
    if (result.driftDetected.length > 0) {
      console.log(`\n${fmt.bold(fmt.red('Drift Detected'))}:`);
      for (const drift of result.driftDetected) {
        printWarning(
          `${drift.id}: expected ${drift.expectedChecksum.slice(0, 12)}... got ${drift.actualChecksum.slice(0, 12)}...`,
        );
      }
      process.exit(EXIT.DRIFT_UNSAFE_LINT);
    }

    process.exit(EXIT.SUCCESS);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(EXIT.DB_CONNECTIVITY);
  }
}
