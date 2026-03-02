// --------------------------------------------------------------------------
// pg-safe-migrate CLI — down command
// --------------------------------------------------------------------------
import { createMigrator } from 'pg-safe-migrate-core';
import type { MigratorConfig } from 'pg-safe-migrate-core';
import { printSuccess, printError, printInfo, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

export async function downCommand(
  config: MigratorConfig,
  opts: { to?: string; steps?: number; dryRun?: boolean },
) {
  try {
    const migrator = createMigrator(config);
    const plan = await migrator.plan({
      direction: 'down',
      to: opts.to,
      steps: opts.steps ?? 1, // Default to rolling back 1 step
      dryRun: opts.dryRun,
    });

    if (plan.steps.length === 0) {
      printInfo('No migrations to roll back.');
      process.exit(EXIT.SUCCESS);
    }

    if (opts.dryRun) {
      printHeader('Dry Run — migrations that WOULD be rolled back');
      for (const step of plan.steps) {
        console.log(`  ${fmt.cyan('←')} ${step.id}`);
      }
      process.exit(EXIT.SUCCESS);
    }

    printHeader(`Rolling back ${plan.steps.length} migration(s)`);

    const steps = await migrator.run({
      direction: 'down',
      to: opts.to,
      steps: opts.steps ?? 1,
    });

    for (const step of steps) {
      printSuccess(`Rolled back: ${step.id}`);
    }

    printSuccess(`Done. ${steps.length} migration(s) rolled back.`);
    process.exit(EXIT.SUCCESS);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    if (err && typeof err === 'object' && 'remediation' in err) {
      printInfo((err as { remediation: string }).remediation);
    }
    process.exit(EXIT.DRIFT_UNSAFE_LINT);
  }
}
