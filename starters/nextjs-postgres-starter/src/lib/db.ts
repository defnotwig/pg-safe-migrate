import pg from 'pg';

const globalForDb = globalThis as unknown as { pool: pg.Pool | undefined };

export const pool =
  globalForDb.pool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

// In development, preserve the pool across hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export default pool;
