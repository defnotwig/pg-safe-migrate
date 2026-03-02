// --------------------------------------------------------------------------
// Unit tests — Planner
// --------------------------------------------------------------------------
import { describe, it, expect, afterAll } from 'vitest';
import { computePlan } from '../../planner.js';
import type { MigrationRecord, MigrationFile } from '../../types.js';
import { join } from 'node:path';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const TMP_DIR = join(tmpdir(), 'pgsm-planner-test');

async function setup(files: Record<string, string>): Promise<string> {
  const dir = join(TMP_DIR, String(Date.now()));
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf-8');
  }
  return dir;
}

function makeFile(id: string, dir: string, checksum = 'abc'): MigrationFile {
  return {
    id,
    upPath: join(dir, `${id}.sql`),
    downPath: null,
    checksum,
    irreversible: false,
  };
}

function makeApplied(id: string, checksum = 'abc'): MigrationRecord {
  return {
    id,
    checksum,
    appliedAt: new Date(),
    executionMs: 10,
    direction: 'up',
    toolVersion: '0.1.0',
    notes: null,
  };
}

describe('computePlan', () => {
  afterAll(async () => {
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('includes all pending migrations for up', async () => {
    const dir = await setup({
      '001_init.sql': 'CREATE TABLE a (id INT);',
      '002_add.sql': 'CREATE TABLE b (id INT);',
    });

    const plan = await computePlan({
      applied: [],
      onDisk: [
        makeFile('001_init', dir),
        makeFile('002_add', dir),
      ],
      options: {},
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]!.id).toBe('001_init');
    expect(plan.steps[1]!.id).toBe('002_add');
    expect(plan.direction).toBe('up');
  });

  it('skips already applied migrations', async () => {
    const dir = await setup({
      '001_init.sql': 'CREATE TABLE a (id INT);',
      '002_add.sql': 'CREATE TABLE b (id INT);',
    });

    const plan = await computePlan({
      applied: [makeApplied('001_init')],
      onDisk: [
        makeFile('001_init', dir),
        makeFile('002_add', dir),
      ],
      options: {},
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.id).toBe('002_add');
  });

  it('respects "to" option', async () => {
    const dir = await setup({
      '001_init.sql': 'SELECT 1;',
      '002_add.sql': 'SELECT 2;',
      '003_more.sql': 'SELECT 3;',
    });

    const plan = await computePlan({
      applied: [],
      onDisk: [
        makeFile('001_init', dir),
        makeFile('002_add', dir),
        makeFile('003_more', dir),
      ],
      options: { to: '002_add' },
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[1]!.id).toBe('002_add');
  });

  it('respects "steps" option', async () => {
    const dir = await setup({
      '001_init.sql': 'SELECT 1;',
      '002_add.sql': 'SELECT 2;',
      '003_more.sql': 'SELECT 3;',
    });

    const plan = await computePlan({
      applied: [],
      onDisk: [
        makeFile('001_init', dir),
        makeFile('002_add', dir),
        makeFile('003_more', dir),
      ],
      options: { steps: 1 },
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.id).toBe('001_init');
  });

  it('detects non-transactional statements (CONCURRENTLY)', async () => {
    const dir = await setup({
      '001_idx.sql': 'CREATE INDEX CONCURRENTLY idx_name ON users(name);',
    });

    const plan = await computePlan({
      applied: [],
      onDisk: [makeFile('001_idx', dir)],
      options: {},
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps[0]!.needsNonTransactional).toBe(true);
  });

  it('marks transactional statements correctly', async () => {
    const dir = await setup({
      '001_safe.sql': 'CREATE TABLE t (id INT);',
    });

    const plan = await computePlan({
      applied: [],
      onDisk: [makeFile('001_safe', dir)],
      options: {},
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps[0]!.needsNonTransactional).toBe(false);
  });

  it('returns empty plan when all applied', async () => {
    const dir = await setup({
      '001_init.sql': 'SELECT 1;',
    });

    const plan = await computePlan({
      applied: [makeApplied('001_init')],
      onDisk: [makeFile('001_init', dir)],
      options: {},
      transactionPolicy: 'auto',
      requireDown: false,
    });

    expect(plan.steps).toHaveLength(0);
  });
});
