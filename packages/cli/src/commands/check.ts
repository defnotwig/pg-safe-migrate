// --------------------------------------------------------------------------
// pg-safe-migrate CLI — check command (CI gate)
// --------------------------------------------------------------------------
import { createMigrator } from 'pg-safe-migrate-core';
import type { MigratorConfig, LintIssue } from 'pg-safe-migrate-core';
import { printSuccess, printError, printWarning, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

interface DriftEntry {
  id: string;
  expectedChecksum: string;
  actualChecksum: string;
}

function reportDrift(drift: DriftEntry[]): void {
  if (drift.length > 0) {
    for (const d of drift) {
      printError(`Drift: ${d.id} (expected ${d.expectedChecksum.slice(0, 12)}..., got ${d.actualChecksum.slice(0, 12)}...)`);
    }
  } else {
    printSuccess('No drift detected.');
  }
}

function reportLintIssues(issues: LintIssue[]): void {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  for (const issue of errors) {
    printError(`${issue.ruleId}: ${issue.message} (${issue.file})`);
  }
  for (const issue of warnings) {
    printWarning(`${issue.ruleId}: ${issue.message} (${issue.file})`);
  }
  if (errors.length === 0 && warnings.length === 0) {
    printSuccess('All lint rules pass.');
  }
}

export async function checkCommand(config: MigratorConfig) {
  try {
    const migrator = createMigrator(config);
    const result = await migrator.check();

    printHeader('Check Results');
    reportDrift(result.drift);
    reportLintIssues(result.issues);

    if (result.ok) {
      printSuccess(fmt.bold('All checks passed.'));
      process.exit(EXIT.SUCCESS);
    } else {
      printError(fmt.bold('Checks failed.'));
      process.exit(EXIT.DRIFT_UNSAFE_LINT);
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'CONFIG_ERROR') process.exit(EXIT.CONFIG_USAGE);
      if (code === 'LOCK_ERROR') process.exit(EXIT.DB_CONNECTIVITY);
    }
    process.exit(EXIT.DB_CONNECTIVITY);
  }
}
