// --------------------------------------------------------------------------
// Unit tests — Transaction policy auto-detection
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import {
  isNonTransactionalStatement,
  hasNonTransactionalStatements,
} from '../../lint/rules.js';

describe('isNonTransactionalStatement', () => {
  it('detects CREATE INDEX CONCURRENTLY', () => {
    expect(isNonTransactionalStatement('CREATE INDEX CONCURRENTLY idx ON t(c)')).toBe(true);
  });

  it('detects CREATE UNIQUE INDEX CONCURRENTLY', () => {
    expect(isNonTransactionalStatement('CREATE UNIQUE INDEX CONCURRENTLY idx ON t(c)')).toBe(true);
  });

  it('detects DROP INDEX CONCURRENTLY', () => {
    expect(isNonTransactionalStatement('DROP INDEX CONCURRENTLY idx')).toBe(true);
  });

  it('detects VACUUM', () => {
    expect(isNonTransactionalStatement('VACUUM ANALYZE users')).toBe(true);
  });

  it('does not flag normal CREATE TABLE', () => {
    expect(isNonTransactionalStatement('CREATE TABLE t (id INT)')).toBe(false);
  });

  it('does not flag normal CREATE INDEX (non-concurrent)', () => {
    expect(isNonTransactionalStatement('CREATE INDEX idx ON t(c)')).toBe(false);
  });
});

describe('hasNonTransactionalStatements', () => {
  it('returns true if any statement is non-transactional', () => {
    expect(
      hasNonTransactionalStatements([
        'CREATE TABLE t (id INT);',
        'CREATE INDEX CONCURRENTLY idx ON t(id);',
      ]),
    ).toBe(true);
  });

  it('returns false if all statements are transactional', () => {
    expect(
      hasNonTransactionalStatements([
        'CREATE TABLE t (id INT);',
        'ALTER TABLE t ADD COLUMN name TEXT;',
      ]),
    ).toBe(false);
  });
});
