// --------------------------------------------------------------------------
// Unit tests — Advisory Lock helpers (pure functions)
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { deriveLockId } from '../../lock.js';

describe('deriveLockId', () => {
  it('returns a positive integer', () => {
    const id = deriveLockId(['public', '_pg_safe_migrate']);
    expect(id).toBeGreaterThan(0);
    expect(Number.isInteger(id)).toBe(true);
  });

  it('is deterministic', () => {
    const a = deriveLockId(['public', '_pg_safe_migrate']);
    const b = deriveLockId(['public', '_pg_safe_migrate']);
    expect(a).toBe(b);
  });

  it('produces different IDs for different inputs', () => {
    const a = deriveLockId(['public', 'migrations']);
    const b = deriveLockId(['custom', 'migrations']);
    const c = deriveLockId(['public', 'other_table']);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('returns a finite number', () => {
    const id = deriveLockId(['some', 'long', 'inputs', 'here']);
    expect(Number.isFinite(id)).toBe(true);
    // 15 hex chars → up to 60 bits, may exceed MAX_SAFE_INTEGER
    // but pg advisory_lock accepts bigint so this is fine
    expect(id).toBeGreaterThan(0);
  });

  it('handles empty parts array', () => {
    const id = deriveLockId([]);
    expect(id).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(id)).toBe(true);
  });

  it('handles single part', () => {
    const id = deriveLockId(['only-one']);
    expect(id).toBeGreaterThan(0);
  });

  it('order of parts matters', () => {
    const a = deriveLockId(['a', 'b']);
    const b = deriveLockId(['b', 'a']);
    expect(a).not.toBe(b);
  });
});
