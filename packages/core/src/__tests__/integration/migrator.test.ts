// --------------------------------------------------------------------------
// Integration tests — Full migration lifecycle
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
import { TOOL_VERSION } from '../../version.js';

const { Pool } = pg;

const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/postgres';
const SCHEMA = 'public';
const TABLE = '_pgsm_integration_test';
const TMP_DIR = join(tmpdir(), 'pgsm-integration');

let pool: InstanceType<typeof Pool>;

async function cleanupTable() {
  try {
    await pool.query(`DROP TABLE IF EXISTS "${SCHEMA}"."${TABLE}"`);
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

describe('Integration: Migration lifecycle', () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
    await pool.query('SELECT 1'); // verify connection
  });

  afterAll(async () => {
    await cleanupTable();
    try { await rm(TMP_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
    await pool.end();
  });

  beforeEach(async () => {
    await cleanupTable();
  });

  it('creates history table on first run', async () => {
    const dir = await createTempMigrations({
      '001_init.sql': 'SELECT 1;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const statusResult = await migrator.status();
    expect(statusResult.applied).toHaveLength(0);
    expect(statusResult.pending).toHaveLength(1);

    // The table should now exist
    const result = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
      [SCHEMA, TABLE],
    );
    expect(result.rows[0]!['exists']).toBe(true);
  });

  it('applies migrations and records history', async () => {
    const dir = await createTempMigrations({
      '001_create_widgets.sql':
        "CREATE TABLE IF NOT EXISTS widgets (id SERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT '');",
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const steps = await migrator.run();
    expect(steps).toHaveLength(1);
    expect(steps[0]!.id).toBe('001_create_widgets');

    // Verify history
    const statusResult = await migrator.status();
    expect(statusResult.applied).toHaveLength(1);
    expect(statusResult.applied[0]!.id).toBe('001_create_widgets');
    expect(statusResult.applied[0]!.toolVersion).toBe(TOOL_VERSION);
    expect(statusResult.pending).toHaveLength(0);

    // Clean up created table
    await pool.query('DROP TABLE IF EXISTS widgets');
  });

  it('detects drift when file changes after applied', async () => {
    const dir = await createTempMigrations({
      '001_init.sql': 'SELECT 1;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    // Apply
    await migrator.run();

    // Modify the file
    await writeFile(join(dir, '001_init.sql'), 'SELECT 2;', 'utf-8');

    // Status should show drift
    const statusResult = await migrator.status();
    expect(statusResult.driftDetected).toHaveLength(1);
    expect(statusResult.driftDetected[0]!.id).toBe('001_init');

    // Run should fail with DriftError
    const migrator2 = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });
    await expect(migrator2.run()).rejects.toThrow(/drift/i);
  });

  it('advisory lock prevents concurrent runs', async () => {
    const dir = await createTempMigrations({
      '001_init.sql': 'SELECT pg_sleep(0.5);',
    });

    const config = {
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    };

    // Start two concurrent runs
    const m1 = createMigrator(config);
    const m2 = createMigrator(config);

    // Both should succeed because advisory lock serializes them
    const [r1, r2] = await Promise.all([m1.run(), m2.run()]);
    // First run applies, second finds nothing pending
    expect(r1.length + r2.length).toBe(1);
  });

  it('check() returns ok when clean', async () => {
    const dir = await createTempMigrations({
      '001_safe.sql':
        "CREATE TABLE IF NOT EXISTS safe_check (id SERIAL PRIMARY KEY, name TEXT NOT NULL DEFAULT '');",
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const result = await migrator.check();
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.drift).toHaveLength(0);
  });

  it('doctor() returns all-ok on healthy DB', async () => {
    const dir = await createTempMigrations({
      '001_init.sql': 'SELECT 1;',
    });

    const migrator = createMigrator({
      databaseUrl: DATABASE_URL,
      migrationsDir: dir,
      schema: SCHEMA,
      tableName: TABLE,
    });

    const result = await migrator.doctor();
    expect(result.ok).toBe(true);
    expect(result.checks.every((c) => c.ok)).toBe(true);
  });
});
