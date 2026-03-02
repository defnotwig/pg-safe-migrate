// --------------------------------------------------------------------------
// CLI tests — Config resolution
// --------------------------------------------------------------------------
import { describe, it, expect, afterAll } from 'vitest';
import { resolveConfig } from '../config.js';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const TMP_DIR = join(tmpdir(), 'pgsm-cli-test');

describe('resolveConfig', () => {
  afterAll(async () => {
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* */ }
  });

  it('uses CLI flags over defaults', async () => {
    const config = await resolveConfig({
      database: 'postgres://localhost/test',
      dir: '/custom/migrations',
      schema: 'custom',
      table: 'my_table',
      transaction: 'always',
    });

    expect(config.databaseUrl).toBe('postgres://localhost/test');
    expect(config.schema).toBe('custom');
    expect(config.tableName).toBe('my_table');
    expect(config.transactionPolicy).toBe('always');
  });

  it('falls back to DATABASE_URL env', async () => {
    const prev = process.env['DATABASE_URL'];
    process.env['DATABASE_URL'] = 'postgres://env-url/db';
    try {
      const config = await resolveConfig({});
      expect(config.databaseUrl).toBe('postgres://env-url/db');
    } finally {
      if (prev) {
        process.env['DATABASE_URL'] = prev;
      } else {
        delete process.env['DATABASE_URL'];
      }
    }
  });

  it('applies defaults for missing values', async () => {
    const config = await resolveConfig({ database: 'postgres://x' });
    expect(config.schema).toBe('public');
    expect(config.tableName).toBe('_pg_safe_migrate');
    expect(config.transactionPolicy).toBe('auto');
    expect(config.requireDown).toBe(false);
  });
});
