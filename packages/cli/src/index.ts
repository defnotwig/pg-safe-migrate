// --------------------------------------------------------------------------
// pg-safe-migrate CLI — Main program
// --------------------------------------------------------------------------
import { Command } from 'commander';
import { resolveConfig } from './config.js';
import { initCommand } from './commands/init.js';
import { createCommand } from './commands/create.js';
import { upCommand } from './commands/up.js';
import { downCommand } from './commands/down.js';
import { statusCommand } from './commands/status.js';
import { lintCommand } from './commands/lint.js';
import { checkCommand } from './commands/check.js';
import { doctorCommand } from './commands/doctor.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('pg-safe-migrate')
    .description('Safety-first PostgreSQL migration engine')
    .version('0.1.0');

  // Shared options
  const addSharedOptions = (cmd: Command) =>
    cmd
      .option('-d, --database <url>', 'PostgreSQL connection URL (or DATABASE_URL)')
      .option('--dir <path>', 'Migrations directory', './migrations')
      .option('--schema <name>', 'Database schema', 'public')
      .option('--table <name>', 'History table name', '_pg_safe_migrate')
      .option('--transaction <policy>', 'Transaction policy: auto|always|never', 'auto')
      .option('--lock-id <id>', 'Advisory lock ID')
      .option('--require-down', 'Require down migrations')
      .option('--allow-unsafe <rules...>', 'Allow specific lint rules')
      .option('--config <path>', 'Path to config file');

  // init
  program
    .command('init')
    .description('Initialize pg-safe-migrate in your project')
    .option('--dir <path>', 'Migrations directory', './migrations')
    .action(async (opts) => {
      await initCommand(opts);
    });

  // create
  program
    .command('create <name>')
    .description('Create a new migration file')
    .option('--dir <path>', 'Migrations directory', './migrations')
    .option('--with-down', 'Also create a down migration file')
    .option('--sql', 'Create SQL migration (default)')
    .action(async (name: string, opts) => {
      await createCommand(name, opts);
    });

  // up
  addSharedOptions(
    program
      .command('up')
      .description('Apply pending migrations')
      .option('--to <id>', 'Run up to and including this migration')
      .option('--steps <n>', 'Number of migrations to apply')
      .option('--dry-run', 'Show plan without executing'),
  ).action(async (opts) => {
    const config = await resolveConfig(opts);
    await upCommand(config, {
      to: opts.to,
      steps: opts.steps ? Number.parseInt(opts.steps, 10) : undefined,
      dryRun: opts.dryRun,
    });
  });

  // down
  addSharedOptions(
    program
      .command('down')
      .description('Roll back migrations')
      .option('--to <id>', 'Roll back to this migration (exclusive)')
      .option('--steps <n>', 'Number of migrations to roll back', '1')
      .option('--dry-run', 'Show plan without executing'),
  ).action(async (opts) => {
    const config = await resolveConfig(opts);
    await downCommand(config, {
      to: opts.to,
      steps: opts.steps ? Number.parseInt(opts.steps, 10) : undefined,
      dryRun: opts.dryRun,
    });
  });

  // status
  addSharedOptions(
    program.command('status').description('Show migration status'),
  ).action(async (opts) => {
    const config = await resolveConfig(opts);
    await statusCommand(config);
  });

  // lint
  addSharedOptions(
    program
      .command('lint')
      .description('Lint migration files for safety issues')
      .option('--format <format>', 'Output format: pretty|json', 'pretty'),
  ).action(async (opts) => {
    const config = await resolveConfig(opts);
    await lintCommand(config, { format: opts.format });
  });

  // check
  addSharedOptions(
    program.command('check').description('CI gate: verify config, drift, and lint'),
  ).action(async (opts) => {
    const config = await resolveConfig(opts);
    await checkCommand(config);
  });

  // doctor
  addSharedOptions(
    program
      .command('doctor')
      .description('Verify DB permissions, lock, table creation, directory'),
  ).action(async (opts) => {
    const config = await resolveConfig(opts);
    await doctorCommand(config);
  });

  // Error handling
  program.exitOverride();

  return program;
}
