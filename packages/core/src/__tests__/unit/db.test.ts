// --------------------------------------------------------------------------
// Unit tests — SQL Execution Layer (mocked client)
// --------------------------------------------------------------------------
import { describe, it, expect, vi } from 'vitest';
import { executeMigrationSql } from '../../db.js';
import type { PgClientLike } from '../../types.js';

function createMockClient(): PgClientLike & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    query: vi.fn(async (text: string) => {
      calls.push(text);
      return { rows: [] };
    }),
  };
}

describe('executeMigrationSql', () => {
  it('wraps in BEGIN/COMMIT when inTransaction=true', async () => {
    const client = createMockClient();
    const ms = await executeMigrationSql(client, 'SELECT 1;', true);
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(client.calls).toEqual(['BEGIN', 'SELECT 1;', 'COMMIT']);
  });

  it('executes directly when inTransaction=false', async () => {
    const client = createMockClient();
    const ms = await executeMigrationSql(client, 'CREATE INDEX CONCURRENTLY idx ON t(c);', false);
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(client.calls).toEqual(['CREATE INDEX CONCURRENTLY idx ON t(c);']);
  });

  it('issues ROLLBACK on error when inTransaction=true', async () => {
    const calls: string[] = [];
    const client: PgClientLike = {
      query: vi.fn(async (text: string) => {
        calls.push(text);
        if (text !== 'BEGIN' && text !== 'ROLLBACK' && text !== 'COMMIT') {
          throw new Error('syntax error');
        }
        return { rows: [] };
      }),
    };

    await expect(executeMigrationSql(client, 'BAD SQL;', true)).rejects.toThrow('syntax error');
    expect(calls).toEqual(['BEGIN', 'BAD SQL;', 'ROLLBACK']);
  });

  it('propagates errors when inTransaction=false', async () => {
    const client: PgClientLike = {
      query: vi.fn(async () => {
        throw new Error('connection lost');
      }),
    };

    await expect(executeMigrationSql(client, 'SELECT 1;', false)).rejects.toThrow('connection lost');
  });

  it('returns execution time in milliseconds', async () => {
    const client = createMockClient();
    const ms = await executeMigrationSql(client, 'SELECT pg_sleep(0.01);', true);
    expect(typeof ms).toBe('number');
    expect(ms).toBeGreaterThanOrEqual(0);
  });
});
