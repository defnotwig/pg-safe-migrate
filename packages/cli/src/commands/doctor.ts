// --------------------------------------------------------------------------
// pg-safe-migrate CLI — doctor command
// --------------------------------------------------------------------------
import { createMigrator } from 'pg-safe-migrate-core';
import type { MigratorConfig } from 'pg-safe-migrate-core';
import { printSuccess, printError, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

export async function doctorCommand(config: MigratorConfig) {
  try {
    const migrator = createMigrator(config);
    const result = await migrator.doctor();

    printHeader('Doctor');

    for (const check of result.checks) {
      const icon = check.ok ? fmt.green('✓') : fmt.red('✗');
      console.log(`  ${icon} ${fmt.bold(check.name)}: ${check.message}`);
    }

    if (result.ok) {
      printSuccess('\nAll checks passed.');
      process.exit(EXIT.SUCCESS);
    } else {
      printError('\nSome checks failed.');
      process.exit(EXIT.DB_CONNECTIVITY);
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(EXIT.DB_CONNECTIVITY);
  }
}
