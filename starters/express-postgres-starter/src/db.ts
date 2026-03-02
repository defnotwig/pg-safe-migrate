import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected PG pool error:', err);
  process.exit(1);
});

export default pool;
