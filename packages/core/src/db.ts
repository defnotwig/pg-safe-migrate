// --------------------------------------------------------------------------
// pg-safe-migrate-core — SQL Execution Layer
// --------------------------------------------------------------------------
import pg from 'pg';
import type { PgClientLike, MigratorConfig } from './types.js';

const { Pool } = pg;

export interface DbConnection {
  /** The underlying pg Client (single connection). */
  client: PgClientLike & {
    query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
  /** Release / close the connection. */
  release(): Promise<void>;
}

/**
 * Create a single database connection from config.  We use a Pool with max=1
 * so we get a single connection that holds the advisory lock for the entire
 * run.
 */
export async function createConnection(
  config: MigratorConfig,
): Promise<DbConnection> {
  if (config.client) {
    // User-provided client — don't manage its lifecycle.
    return {
      client: config.client as DbConnection['client'],
      release: async () => { /* no-op */ },
    };
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 1,
  });

  const client = await pool.connect();

  // Apply timeouts if configured
  if (config.statementTimeout) {
    await client.query(`SET statement_timeout = '${config.statementTimeout}'`);
  }
  if (config.lockTimeout) {
    await client.query(`SET lock_timeout = '${config.lockTimeout}'`);
  }

  return {
    client: client as unknown as DbConnection['client'],
    release: async () => {
      try {
        client.release();
      } catch {
        // ignore
      }
      await pool.end();
    },
  };
}

/**
 * Execute a single SQL migration file's content.
 *
 * If `inTransaction` is true, wraps in BEGIN/COMMIT with ROLLBACK on error.
 * If false, executes statements sequentially without transaction.
 */
export async function executeMigrationSql(
  client: PgClientLike,
  sql: string,
  inTransaction: boolean,
): Promise<number> {
  const start = Date.now();

  if (inTransaction) {
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } else {
    // Execute the full SQL as-is (statements run sequentially by pg)
    await client.query(sql);
  }

  return Date.now() - start;
}
