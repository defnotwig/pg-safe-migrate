// --------------------------------------------------------------------------
// Unit tests — Checksum
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { computeChecksum } from '../../checksum.js';

describe('computeChecksum', () => {
  it('returns a SHA-256 hex string', () => {
    const hash = computeChecksum('SELECT 1;');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent results', () => {
    const a = computeChecksum('CREATE TABLE foo (id INT);');
    const b = computeChecksum('CREATE TABLE foo (id INT);');
    expect(a).toBe(b);
  });

  it('normalizes CRLF to LF', () => {
    const lf = computeChecksum('SELECT 1;\nSELECT 2;\n');
    const crlf = computeChecksum('SELECT 1;\r\nSELECT 2;\r\n');
    expect(lf).toBe(crlf);
  });

  it('normalizes bare CR to LF', () => {
    const lf = computeChecksum('SELECT 1;\n');
    const cr = computeChecksum('SELECT 1;\r');
    expect(lf).toBe(cr);
  });

  it('different content produces different checksums', () => {
    const a = computeChecksum('SELECT 1;');
    const b = computeChecksum('SELECT 2;');
    expect(a).not.toBe(b);
  });
});
