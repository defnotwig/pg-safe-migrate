// --------------------------------------------------------------------------
// CLI tests — Config resolution edge cases
// --------------------------------------------------------------------------
import { describe, it, expect, afterEach } from 'vitest';
import { resolveConfig } from '../config.js';

describe('resolveConfig — edge cases', () => {
  const origEnv: Record<string, string | undefined> = {};

  afterEach(() => {
    // Restore env vars
    for (const [key, val] of Object.entries(origEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  function setEnv(key: string, value: string | undefined) {
    origEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  it('CLI flags override everything', async () => {
    setEnv('DATABASE_URL', 'postgres://from-env/db');
    const config = await resolveConfig({
      database: 'postgres://from-cli/db',
      dir: '/custom/dir',
      schema: 'custom_schema',
      table: 'custom_table',
      transaction: 'always',
    });
    expect(config.databaseUrl).toBe('postgres://from-cli/db');
    expect(config.schema).toBe('custom_schema');
    expect(config.tableName).toBe('custom_table');
    expect(config.transactionPolicy).toBe('always');
  });

  it('env var PGSM_MIGRATIONS_DIR is used when no config file', async () => {
    setEnv('PGSM_MIGRATIONS_DIR', '/env/migrations');
    // Point to a non-existent config file to skip file-based config
    const config = await resolveConfig({ database: 'postgres://x', config: '/nonexistent/pgsm.config.json' });
    expect(config.migrationsDir).toContain('env');
  });

  it('defaults are applied when nothing specified', async () => {
    const config = await resolveConfig({ database: 'postgres://x' });
    expect(config.schema).toBe('public');
    expect(config.tableName).toBe('_pg_safe_migrate');
    expect(config.transactionPolicy).toBe('auto');
    expect(config.requireDown).toBe(false);
  });

  it('allowUnsafe flag maps to allowRules', async () => {
    const config = await resolveConfig({
      database: 'postgres://x',
      allowUnsafe: ['PGSM001', 'PGSM002'],
    });
    expect(config.allowRules).toEqual(['PGSM001', 'PGSM002']);
  });

  it('requireDown flag is respected', async () => {
    const config = await resolveConfig({
      database: 'postgres://x',
      requireDown: true,
    });
    expect(config.requireDown).toBe(true);
  });
});
