// --------------------------------------------------------------------------
// pg-safe-migrate CLI — init command
// --------------------------------------------------------------------------
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { printSuccess, printInfo, printWarning } from '../output.js';

const DEFAULT_CONFIG = {
  databaseUrl: '${DATABASE_URL}',
  migrationsDir: './migrations',
  schema: 'public',
  tableName: '_pg_safe_migrate',
  transactionPolicy: 'auto',
  requireDown: false,
  allowRules: [],
};

export async function initCommand(opts: { dir?: string }) {
  const migrationsDir = resolve(opts.dir ?? './migrations');
  const configPath = join(process.cwd(), 'pgsm.config.json');

  // Create migrations directory
  if (existsSync(migrationsDir)) {
    printInfo(`Migrations directory already exists: ${migrationsDir}`);
  } else {
    await mkdir(migrationsDir, { recursive: true });
    printSuccess(`Created migrations directory: ${migrationsDir}`);
  }

  // Create config file
  if (existsSync(configPath)) {
    printWarning(`Config file already exists: ${configPath}`);
  } else {
    await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf-8');
    printSuccess(`Created config file: ${configPath}`);
  }

  printInfo('Next steps:');
  console.log('  1. Set DATABASE_URL environment variable');
  console.log('  2. Run: pg-safe-migrate create my_first_migration');
  console.log('  3. Edit the generated SQL file');
  console.log('  4. Run: pg-safe-migrate up');
}
