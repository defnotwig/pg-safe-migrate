// --------------------------------------------------------------------------
// Integration tests — Down migrations, dry run, lint, edge cases
//
// Requires a running PostgreSQL instance.
// Set DATABASE_URL or use the CI service container.
// --------------------------------------------------------------------------
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { join } from 'node:path';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createMigrator } from '../../migrator.js';

const { Pool } = pg;

const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/postgres';
const SCHEMA = 'public';
const TABLE = '_pgsm_integration_edge';
const TMP_DIR = join(tmpdir(), 'pgsm-edge-integration');

let pool: InstanceType<typeof Pool>;

async function cleanupTable() {
  try {
    await pool.query(`DROP TABLE IF EXISTS "${SCHEMA}"."${TABLE}"`);
  } catch { /* ignore */ }
}

async function cleanupTestTables() {
  await cleanupTable();
  try {
    await pool.query('DROP TABLE IF EXISTS edge_items');
    await pool.query('DROP TABLE IF EXISTS edge_posts');
  } catch { /* ignore */ }
}

async function createTempMigrations(files: Record<string, string>): Promise<string> {
  const dir = join(TMP_DIR, String(Date.now()) + Math.random().toString(36).slice(2));
  await mkdir(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf-8');
  }
  return dir;
}

describe('Integration: Edge cases', () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await cleanupTestTables();
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    await pool.end();
  });

  beforeEach(async () => {
    await cleanupTestTables();
  });

  it('applies multiple migrations in order', async () => {
    const dir = await createTempMigrations({
      '001_create_items.sql':
        "CREATE TABLE IF NOT EXISTS edge_items (id SERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT '');",
      '002_add_email.sql':
        "ALTER TABLE edge_items ADD COLUMN email TEXT;",
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const steps = await migrator.run();
    expect(steps).toHaveLength(2);
    expect(steps[0]!.id).toBe('001_create_items');
    expect(steps[1]!.id).toBe('002_add_email');

    // Verify both applied
    const status = await migrator.status();
    expect(status.applied).toHaveLength(2);
    expect(status.pending).toHaveLength(0);
  });

  it('second run is a no-op when all applied', async () => {
    const dir = await createTempMigrations({
      '001_init.sql': 'SELECT 1;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    await migrator.run();
    const steps2 = await migrator.run();
    expect(steps2).toHaveLength(0);
  });

  it('dry run does not apply migrations', async () => {
    const dir = await createTempMigrations({
      '001_init.sql': 'SELECT 1;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const plan = await migrator.plan({ dryRun: true });
    expect(plan.steps).toHaveLength(1);
    expect(plan.dryRun).toBe(true);

    // Should still be pending
    const status = await migrator.status();
    expect(status.pending).toHaveLength(1);
    expect(status.applied).toHaveLength(0);
  });

  it('plan with "to" option limits scope', async () => {
    const dir = await createTempMigrations({
      '001_a.sql': 'SELECT 1;',
      '002_b.sql': 'SELECT 2;',
      '003_c.sql': 'SELECT 3;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const plan = await migrator.plan({ to: '002_b' });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps.map((s) => s.id)).toEqual(['001_a', '002_b']);
  });

  it('plan with "steps" option limits count', async () => {
    const dir = await createTempMigrations({
      '001_a.sql': 'SELECT 1;',
      '002_b.sql': 'SELECT 2;',
      '003_c.sql': 'SELECT 3;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const plan = await migrator.plan({ steps: 1 });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.id).toBe('001_a');
  });

  it('lint detects unsafe operations', async () => {
    const dir = await createTempMigrations({
      '001_bad.sql': 'DROP TABLE users;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const issues = await migrator.lint();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.ruleId === 'PGSM001')).toBe(true);
  });

  it('lint returns empty for safe migrations', async () => {
    const dir = await createTempMigrations({
      '001_safe.sql':
        "CREATE TABLE IF NOT EXISTS safe_items (id SERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT '');",
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const issues = await migrator.lint();
    expect(issues).toHaveLength(0);
  });

  it('check returns not ok when lint issues exist', async () => {
    const dir = await createTempMigrations({
      '001_bad.sql': 'DROP TABLE users;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const result = await migrator.check();
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('status shows pending count correctly', async () => {
    const dir = await createTempMigrations({
      '001_a.sql': 'SELECT 1;',
      '002_b.sql': 'SELECT 2;',
      '003_c.sql': 'SELECT 3;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    // Initially all pending
    const before = await migrator.status();
    expect(before.pending).toHaveLength(3);
    expect(before.applied).toHaveLength(0);

    // Apply first two
    await migrator.run({ steps: 2 });

    const after = await migrator.status();
    expect(after.applied).toHaveLength(2);
    expect(after.pending).toHaveLength(1);
    expect(after.pending[0]!.id).toBe('003_c');
  });

  it('throws ConfigError when no databaseUrl or client', () => {
    expect(() => {
      createMigrator({ migrationsDir: '/tmp' });
    }).toThrow(/databaseUrl/i);
  });
});
