// --------------------------------------------------------------------------
// Unit tests — Migration Loader
// --------------------------------------------------------------------------
import { describe, it, expect, afterAll } from 'vitest';
import { loadMigrations } from '../../loader.js';
import { join } from 'node:path';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const TMP_DIR = join(tmpdir(), 'pgsm-loader-test');

async function setup(files: Record<string, string>): Promise<string> {
  const dir = join(TMP_DIR, String(Date.now()) + Math.random().toString(36).slice(2));
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf-8');
  }
  return dir;
}

describe('loadMigrations', () => {
  afterAll(async () => {
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('loads and sorts migrations', async () => {
    const dir = await setup({
      '20240102_120000_second.sql': 'SELECT 2;',
      '20240101_120000_first.sql': 'SELECT 1;',
    });

    const migrations = await loadMigrations(dir);
    expect(migrations).toHaveLength(2);
    expect(migrations[0]!.id).toBe('20240101_120000_first');
    expect(migrations[1]!.id).toBe('20240102_120000_second');
  });

  it('detects down files', async () => {
    const dir = await setup({
      '001_init.sql': 'CREATE TABLE t (id INT);',
      '001_init.down.sql': 'DROP TABLE t;',
    });

    const migrations = await loadMigrations(dir);
    expect(migrations).toHaveLength(1);
    expect(migrations[0]!.downPath).not.toBeNull();
  });

  it('marks irreversible migrations', async () => {
    const dir = await setup({
      '001_init.sql': '-- pgsm:irreversible\nCREATE TABLE t (id INT);',
    });

    const migrations = await loadMigrations(dir);
    expect(migrations[0]!.irreversible).toBe(true);
  });

  it('returns empty for missing directory', async () => {
    const migrations = await loadMigrations('/nonexistent/path');
    expect(migrations).toEqual([]);
  });

  it('computes checksums', async () => {
    const dir = await setup({
      '001_init.sql': 'SELECT 1;',
    });

    const migrations = await loadMigrations(dir);
    expect(migrations[0]!.checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});
