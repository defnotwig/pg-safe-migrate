// --------------------------------------------------------------------------
// pg-safe-migrate CLI — lint command
// --------------------------------------------------------------------------
import { createMigrator } from 'pg-safe-migrate-core';
import type { MigratorConfig, LintIssue } from 'pg-safe-migrate-core';
import { printSuccess, printError, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

export async function lintCommand(
  config: MigratorConfig,
  opts: { format?: string },
) {
  try {
    const migrator = createMigrator(config);
    const issues = await migrator.lint();

    if (opts.format === 'json') {
      console.log(JSON.stringify(issues, null, 2));
    } else {
      printLintResults(issues);
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    process.exit(hasErrors ? EXIT.DRIFT_UNSAFE_LINT : EXIT.SUCCESS);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(EXIT.CONFIG_USAGE);
  }
}

function printLintResults(issues: LintIssue[]) {
  if (issues.length === 0) {
    printSuccess('No lint issues found.');
    return;
  }

  printHeader(`Lint Results (${issues.length} issue(s))`);

  for (const issue of issues) {
    const icon = issue.severity === 'error' ? fmt.red('✗') : fmt.yellow('⚠');
    const sev = issue.severity === 'error' ? fmt.red(issue.severity) : fmt.yellow(issue.severity);
    console.log(`\n  ${icon} ${fmt.bold(issue.ruleId)} [${sev}]`);
    console.log(`    ${issue.message}`);
    console.log(`    ${fmt.dim('File:')} ${issue.file}`);
    console.log(`    ${fmt.dim('Statement:')} ${issue.snippet}`);
  }
}
