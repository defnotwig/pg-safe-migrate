// --------------------------------------------------------------------------
// pg-safe-migrate CLI — up command
// --------------------------------------------------------------------------
import { createMigrator } from 'pg-safe-migrate-core';
import type { MigratorConfig } from 'pg-safe-migrate-core';
import { printSuccess, printError, printInfo, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

export async function upCommand(
  config: MigratorConfig,
  opts: { to?: string; steps?: number; dryRun?: boolean },
) {
  try {
    const migrator = createMigrator(config);
    const plan = await migrator.plan({
      direction: 'up',
      to: opts.to,
      steps: opts.steps,
      dryRun: opts.dryRun,
    });

    if (plan.steps.length === 0) {
      printInfo('No pending migrations.');
      process.exit(EXIT.SUCCESS);
    }

    if (opts.dryRun) {
      printHeader('Dry Run — migrations that WOULD be applied');
      for (const step of plan.steps) {
        console.log(`  ${fmt.cyan('→')} ${step.id}${step.needsNonTransactional ? fmt.yellow(' (non-transactional)') : ''}`);
      }
      process.exit(EXIT.SUCCESS);
    }

    printHeader(`Applying ${plan.steps.length} migration(s)`);

    const steps = await migrator.run({
      direction: 'up',
      to: opts.to,
      steps: opts.steps,
    });

    for (const step of steps) {
      printSuccess(`Applied: ${step.id}`);
    }

    printSuccess(`Done. ${steps.length} migration(s) applied.`);
    process.exit(EXIT.SUCCESS);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    if (err && typeof err === 'object' && 'remediation' in err) {
      printInfo((err as { remediation: string }).remediation);
    }
    process.exit(EXIT.DRIFT_UNSAFE_LINT);
  }
}
