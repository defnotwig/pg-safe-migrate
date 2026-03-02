// --------------------------------------------------------------------------
// Unit tests — Typed Errors
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import {
  PgsmError,
  ConfigError,
  DriftError,
  UnsafeMigrationError,
  MigrationOrderError,
  MissingDownError,
  LockAcquireError,
  TransactionPolicyError,
} from '../../errors.js';

describe('Typed Errors', () => {
  it('PgsmError has code, message, and remediation', () => {
    const err = new PgsmError('TEST', 'test message', 'fix it');
    expect(err.code).toBe('TEST');
    expect(err.message).toBe('test message');
    expect(err.remediation).toBe('fix it');
    expect(err.name).toBe('PgsmError');
    expect(err).toBeInstanceOf(Error);
  });

  it('ConfigError sets code and default remediation', () => {
    const err = new ConfigError('bad config');
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.name).toBe('ConfigError');
    expect(err.remediation).toContain('pgsm.config.json');
    expect(err).toBeInstanceOf(PgsmError);
  });

  it('ConfigError accepts custom remediation', () => {
    const err = new ConfigError('missing url', 'Set DATABASE_URL');
    expect(err.remediation).toBe('Set DATABASE_URL');
  });

  it('DriftError includes migration details', () => {
    const err = new DriftError('001_init', 'abc123', 'def456');
    expect(err.code).toBe('DRIFT_ERROR');
    expect(err.name).toBe('DriftError');
    expect(err.migrationId).toBe('001_init');
    expect(err.expectedChecksum).toBe('abc123');
    expect(err.actualChecksum).toBe('def456');
    expect(err.message).toContain('001_init');
    expect(err.message).toContain('abc123');
    expect(err.remediation).toContain('Do not modify');
  });

  it('UnsafeMigrationError includes rule and file', () => {
    const err = new UnsafeMigrationError('PGSM001', 'test.sql', 'DROP TABLE detected');
    expect(err.code).toBe('UNSAFE_MIGRATION');
    expect(err.name).toBe('UnsafeMigrationError');
    expect(err.ruleId).toBe('PGSM001');
    expect(err.file).toBe('test.sql');
    expect(err.message).toContain('PGSM001');
    expect(err.message).toContain('test.sql');
    expect(err.remediation).toContain('override');
  });

  it('MigrationOrderError has correct code', () => {
    const err = new MigrationOrderError('out of order');
    expect(err.code).toBe('ORDER_ERROR');
    expect(err.name).toBe('MigrationOrderError');
    expect(err.remediation).toContain('lexicographical');
  });

  it('MissingDownError includes migration id', () => {
    const err = new MissingDownError('002_add_column');
    expect(err.code).toBe('MISSING_DOWN');
    expect(err.name).toBe('MissingDownError');
    expect(err.migrationId).toBe('002_add_column');
    expect(err.message).toContain('002_add_column');
    expect(err.remediation).toContain('.down.sql');
  });

  it('LockAcquireError with detail', () => {
    const err = new LockAcquireError('connection refused');
    expect(err.code).toBe('LOCK_ERROR');
    expect(err.name).toBe('LockAcquireError');
    expect(err.message).toContain('connection refused');
    expect(err.remediation).toContain('advisory');
  });

  it('LockAcquireError without detail', () => {
    const err = new LockAcquireError();
    expect(err.code).toBe('LOCK_ERROR');
    expect(err.message).toContain('advisory lock');
  });

  it('TransactionPolicyError includes migration and statement', () => {
    const err = new TransactionPolicyError('003_idx', 'CREATE INDEX CONCURRENTLY ...');
    expect(err.code).toBe('TRANSACTION_POLICY');
    expect(err.name).toBe('TransactionPolicyError');
    expect(err.migrationId).toBe('003_idx');
    expect(err.statement).toBe('CREATE INDEX CONCURRENTLY ...');
    expect(err.message).toContain('003_idx');
    expect(err.remediation).toContain('auto');
  });

  it('all errors are catchable as PgsmError', () => {
    const errors = [
      new ConfigError('x'),
      new DriftError('a', 'b', 'c'),
      new UnsafeMigrationError('PGSM001', 'f', 'd'),
      new MigrationOrderError('o'),
      new MissingDownError('m'),
      new LockAcquireError(),
      new TransactionPolicyError('t', 's'),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(PgsmError);
      expect(err).toBeInstanceOf(Error);
      expect(typeof err.code).toBe('string');
      expect(typeof err.remediation).toBe('string');
    }
  });
});
