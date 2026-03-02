// --------------------------------------------------------------------------
// pg-safe-migrate CLI — Config loader
// --------------------------------------------------------------------------
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import type { MigratorConfig, TransactionPolicy } from 'pg-safe-migrate-core';

const CONFIG_FILENAMES = ['pgsm.config.json', '.pgsmrc.json'];

export interface CliFlags {
  dir?: string;
  database?: string;
  schema?: string;
  table?: string;
  transaction?: string;
  lockId?: string;
  requireDown?: boolean;
  allowUnsafe?: string[];
  config?: string;
}

/**
 * Resolve configuration from (in priority order):
 * 1. CLI flags
 * 2. Config file
 * 3. Environment variables
 * 4. Defaults
 */
export async function resolveConfig(flags: CliFlags): Promise<MigratorConfig> {
  // Load config file
  let fileConfig: Record<string, unknown> = {};
  const configPath = flags.config
    ? resolve(flags.config)
    : findConfigFile();

  if (configPath && existsSync(configPath)) {
    try {
      const raw = await readFile(configPath, 'utf-8');
      fileConfig = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Ignore parse errors
    }
  }

  const databaseUrl =
    flags.database ??
    resolveEnvTemplate(fileConfig['databaseUrl'] as string | undefined) ??
    process.env['DATABASE_URL'];

  const migrationsDir =
    flags.dir ??
    (fileConfig['migrationsDir'] as string | undefined) ??
    process.env['PGSM_MIGRATIONS_DIR'] ??
    './migrations';

  const schema =
    flags.schema ??
    (fileConfig['schema'] as string | undefined) ??
    'public';

  const tableName =
    flags.table ??
    (fileConfig['tableName'] as string | undefined) ??
    '_pg_safe_migrate';

  const transactionPolicy = (
    flags.transaction ??
    (fileConfig['transactionPolicy'] as string | undefined) ??
    'auto'
  ) as TransactionPolicy;

  const lockId = flags.lockId
    ? Number.parseInt(flags.lockId, 10)
    : (fileConfig['lockId'] as number | undefined);

  const requireDown =
    flags.requireDown ??
    (fileConfig['requireDown'] as boolean | undefined) ??
    false;

  const allowRules =
    flags.allowUnsafe ??
    (fileConfig['allowRules'] as string[] | undefined) ??
    [];

  return {
    databaseUrl,
    migrationsDir: resolve(migrationsDir),
    schema,
    tableName,
    transactionPolicy,
    lockId,
    requireDown,
    allowRules,
    statementTimeout: (fileConfig['statementTimeout'] as string | undefined),
    lockTimeout: (fileConfig['lockTimeout'] as string | undefined),
  };
}

function findConfigFile(): string | null {
  for (const name of CONFIG_FILENAMES) {
    const p = join(process.cwd(), name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * If a config value is a `${ENV_VAR}` template, resolve it from the
 * environment. Returns undefined if the referenced env var is unset
 * or if the value itself is undefined.
 */
function resolveEnvTemplate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = /^\$\{(\w+)\}$/.exec(value);
  if (m) {
    return process.env[m[1]!] ?? undefined;
  }
  return value;
}
