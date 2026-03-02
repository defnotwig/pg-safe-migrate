// --------------------------------------------------------------------------
// Unit tests — Public API Exports
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import * as api from '../../index.js';

describe('Public API exports', () => {
  it('exports createMigrator factory', () => {
    expect(typeof api.createMigrator).toBe('function');
  });

  it('exports lintSql', () => {
    expect(typeof api.lintSql).toBe('function');
  });

  it('exports lintFile', () => {
    expect(typeof api.lintFile).toBe('function');
  });

  it('exports computeChecksum', () => {
    expect(typeof api.computeChecksum).toBe('function');
  });

  it('exports all error classes', () => {
    const errorNames = [
      'PgsmError',
      'ConfigError',
      'DriftError',
      'UnsafeMigrationError',
      'MigrationOrderError',
      'MissingDownError',
      'LockAcquireError',
      'TransactionPolicyError',
    ];
    for (const name of errorNames) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('exports TOOL_VERSION', () => {
    expect(typeof api.TOOL_VERSION).toBe('string');
  });

  it('exports RULES array', () => {
    expect(Array.isArray(api.RULES)).toBe(true);
    expect(api.RULES.length).toBe(10);
  });

  it('exports splitStatements', () => {
    expect(typeof api.splitStatements).toBe('function');
  });

  it('exports loadMigrations', () => {
    expect(typeof api.loadMigrations).toBe('function');
  });
});
