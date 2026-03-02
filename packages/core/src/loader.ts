// --------------------------------------------------------------------------
// pg-safe-migrate-core — Migration Loader
// --------------------------------------------------------------------------
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MigrationFile } from './types.js';
import { computeChecksum } from './checksum.js';

/**
 * Regex to match migration files:  <id>_<name>.sql  or  <id>_<name>.down.sql
 *
 * ID is expected to be a timestamp prefix like 20240101_120000_slug
 * but we accept any characters before the first `.` as the full filename stem.
 */
const UP_PATTERN = /^(.+)\.sql$/;
const DOWN_SUFFIX = '.down.sql';
const IRREVERSIBLE_PATTERN = /--\s*pgsm:irreversible/;

/**
 * Load migration files from a directory. Returns sorted by ID (lexicographic).
 */
export async function loadMigrations(
  migrationsDir: string,
): Promise<MigrationFile[]> {
  let entries: string[];
  try {
    entries = await readdir(migrationsDir);
  } catch {
    return [];
  }

  // Separate up and down files
  const downFiles = new Set<string>();
  const upFiles: string[] = [];

  for (const entry of entries) {
    if (entry.endsWith(DOWN_SUFFIX)) {
      // Remove .down.sql → the id
      const id = entry.slice(0, -DOWN_SUFFIX.length);
      downFiles.add(id);
    } else {
      const match = UP_PATTERN.exec(entry);
      if (match) {
        upFiles.push(entry);
      }
    }
  }

  const migrations: MigrationFile[] = [];

  for (const filename of upFiles) {
    const id = filename.replace(/\.sql$/, '');
    const upPath = join(migrationsDir, filename);
    const hasDown = downFiles.has(id);
    const downPath = hasDown ? join(migrationsDir, `${id}.down.sql`) : null;

    const content = await readFile(upPath, 'utf-8');
    const checksum = computeChecksum(content);
    const irreversible = IRREVERSIBLE_PATTERN.test(content);

    migrations.push({
      id,
      upPath,
      downPath,
      checksum,
      irreversible,
    });
  }

  // Sort lexicographically by ID (timestamp-prefixed filenames sort naturally)
  migrations.sort((a, b) => a.id.localeCompare(b.id));

  return migrations;
}
