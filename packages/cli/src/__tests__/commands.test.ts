// --------------------------------------------------------------------------
// CLI tests — init + create commands (file I/O)
// --------------------------------------------------------------------------
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { join } from 'node:path';
import { readdir, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { initCommand } from '../commands/init.js';
import { createCommand } from '../commands/create.js';

const TMP_DIR = join(tmpdir(), 'pgsm-cli-cmd-test');

describe('CLI commands', () => {
  beforeEach(async () => {
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* */ }
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterAll(async () => {
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* */ }
  });

  describe('initCommand', () => {
    it('creates migrations directory', async () => {
      const dir = join(TMP_DIR, 'migrations');
      await initCommand({ dir });
      expect(existsSync(dir)).toBe(true);
      // Config file is written to cwd which we can't change in workers,
      // so we only verify the directory creation here.
    });
  });

  describe('createCommand', () => {
    it('creates a migration file with timestamp', async () => {
      const dir = join(TMP_DIR, 'migrations2');
      await mkdir(dir, { recursive: true });
      await createCommand('add_users', { dir, sql: true });
      const files = await readdir(dir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^\d{8}_\d{6}_add_users\.sql$/);
    });

    it('creates down file when --with-down', async () => {
      const dir = join(TMP_DIR, 'migrations3');
      await mkdir(dir, { recursive: true });
      await createCommand('add_posts', { dir, withDown: true, sql: true });
      const files = await readdir(dir);
      expect(files.length).toBe(2);
      expect(files.some((f) => f.endsWith('.down.sql'))).toBe(true);
    });
  });
});
