// --------------------------------------------------------------------------
// pg-safe-migrate-core — Checksum
// --------------------------------------------------------------------------
import { createHash } from 'node:crypto';

/**
 * Normalize line endings to LF before hashing so checksums are stable
 * across operating systems.
 */
function normalizeContent(content: string): string {
  return content.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

/**
 * Compute a SHA-256 hex digest for a migration file's content.
 */
export function computeChecksum(content: string): string {
  const normalized = normalizeContent(content);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
