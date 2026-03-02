// --------------------------------------------------------------------------
// Unit tests — History (drift detection + ordering)
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { detectDrift, validateOrdering } from '../../history.js';
import { MigrationOrderError } from '../../errors.js';
import type { MigrationRecord } from '../../types.js';

function makeRecord(id: string, checksum: string): MigrationRecord {
  return {
    id,
    checksum,
    appliedAt: new Date(),
    executionMs: 10,
    direction: 'up',
    toolVersion: '0.1.0',
    notes: null,
  };
}

describe('detectDrift', () => {
  it('returns empty when no drift', () => {
    const applied = [makeRecord('001', 'aaa')];
    const onDisk = [{ id: '001', checksum: 'aaa' }];
    expect(detectDrift(applied, onDisk)).toEqual([]);
  });

  it('detects checksum mismatch', () => {
    const applied = [makeRecord('001', 'aaa')];
    const onDisk = [{ id: '001', checksum: 'bbb' }];
    const drift = detectDrift(applied, onDisk);
    expect(drift).toHaveLength(1);
    expect(drift[0]!.id).toBe('001');
    expect(drift[0]!.expectedChecksum).toBe('aaa');
    expect(drift[0]!.actualChecksum).toBe('bbb');
  });

  it('detects missing file on disk', () => {
    const applied = [makeRecord('001', 'aaa')];
    const drift = detectDrift(applied, []);
    expect(drift).toHaveLength(1);
    expect(drift[0]!.actualChecksum).toBe('<missing>');
  });
});

describe('validateOrdering', () => {
  it('passes when all is well', () => {
    const applied = [makeRecord('001', 'a'), makeRecord('002', 'b')];
    const onDisk = [{ id: '001' }, { id: '002' }, { id: '003' }];
    expect(() => validateOrdering(applied, onDisk)).not.toThrow();
  });

  it('throws when out-of-order migration found', () => {
    const applied = [makeRecord('002', 'a')];
    const onDisk = [{ id: '001' }, { id: '002' }];
    expect(() => validateOrdering(applied, onDisk)).toThrow(MigrationOrderError);
  });

  it('passes with no applied migrations', () => {
    const onDisk = [{ id: '001' }, { id: '002' }];
    expect(() => validateOrdering([], onDisk)).not.toThrow();
  });
});
