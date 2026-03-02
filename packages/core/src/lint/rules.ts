// --------------------------------------------------------------------------
// pg-safe-migrate-core — Safety Lint Rules
// --------------------------------------------------------------------------
import type { LintRuleId, Severity } from '../types.js';

export interface LintRule {
  id: LintRuleId;
  severity: Severity;
  title: string;
  message: string;
  /** Regex applied to each statement (case-insensitive). */
  pattern: RegExp;
}

/**
 * The first 10 safety rules for PostgreSQL migrations.
 *
 * Each pattern is tested against individual SQL statements.
 */
export const RULES: LintRule[] = [
  {
    id: 'PGSM001',
    severity: 'error',
    title: 'Drop table',
    message: 'Dropping a table will permanently delete all data. Use a multi-step expand/contract pattern instead.',
    pattern: /\bDROP\s+TABLE\b/i,
  },
  {
    id: 'PGSM002',
    severity: 'error',
    title: 'Drop column',
    message: 'Dropping a column will permanently delete data and may break running applications. Remove code references first, then drop in a later migration.',
    pattern: /\bALTER\s+TABLE\b[^;]*\bDROP\s+COLUMN\b/i,
  },
  {
    id: 'PGSM003',
    severity: 'error',
    title: 'Add column with NOT NULL (no default)',
    message: 'Adding a NOT NULL column without a DEFAULT will lock the table and fail if rows exist. Add with a DEFAULT or make it nullable first.',
    pattern: /\bADD\s+COLUMN\b[^;]*\bNOT\s+NULL\b(?![^;]*\bDEFAULT\b)/i,
  },
  {
    id: 'PGSM004',
    severity: 'error',
    title: 'Rename table',
    message: 'Renaming a table will break all queries referencing the old name. Use a view for backward compatibility.',
    pattern: /\bALTER\s+TABLE\b[^;]*\bRENAME\s+TO\b/i,
  },
  {
    id: 'PGSM005',
    severity: 'error',
    title: 'Rename column',
    message: 'Renaming a column will break queries referencing the old name. Add a new column, backfill, then drop the old one.',
    pattern: /\bALTER\s+TABLE\b[^;]*\bRENAME\s+COLUMN\b/i,
  },
  {
    id: 'PGSM006',
    severity: 'warning',
    title: 'Change column type',
    message: 'Changing a column type may lock the table and rewrite all rows. Consider adding a new column, backfilling, and swapping.',
    pattern: /\bALTER\s+TABLE\b[^;]*\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i,
  },
  {
    id: 'PGSM007',
    severity: 'error',
    title: 'Create index without CONCURRENTLY',
    message: 'CREATE INDEX without CONCURRENTLY will lock the table for writes. Use CREATE INDEX CONCURRENTLY instead.',
    pattern: /\bCREATE\s+(UNIQUE\s+)?INDEX\b(?!\s+CONCURRENTLY)/i,
  },
  {
    id: 'PGSM008',
    severity: 'error',
    title: 'Drop index without CONCURRENTLY',
    message: 'DROP INDEX without CONCURRENTLY will lock the table. Use DROP INDEX CONCURRENTLY instead.',
    pattern: /\bDROP\s+INDEX\b(?!\s+CONCURRENTLY)/i,
  },
  {
    id: 'PGSM009',
    severity: 'warning',
    title: 'Add foreign key without NOT VALID',
    message: 'Adding a foreign key constraint will lock both tables while validating all rows. Add with NOT VALID then VALIDATE CONSTRAINT separately.',
    pattern: /\bADD\s+CONSTRAINT\b[^;]*\bFOREIGN\s+KEY\b(?![^;]*\bNOT\s+VALID\b)/i,
  },
  {
    id: 'PGSM010',
    severity: 'warning',
    title: 'Add check constraint without NOT VALID',
    message: 'Adding a CHECK constraint will lock the table while validating all rows. Add with NOT VALID then VALIDATE CONSTRAINT separately.',
    pattern: /\bADD\s+CONSTRAINT\b[^;]*\bCHECK\b(?![^;]*\bNOT\s+VALID\b)/i,
  },
];

/**
 * Detect statements that cannot run inside a transaction.
 * Used by the "auto" transaction policy.
 */
export const NON_TRANSACTIONAL_PATTERNS: RegExp[] = [
  /\bCREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/i,
  /\bDROP\s+INDEX\s+CONCURRENTLY\b/i,
  /\bREINDEX\s+(DATABASE|SYSTEM)\b/i,
  /\bVACUUM\b/i,
  /\bCLUSTER\b(?!\s+ON)/i,
];

/**
 * Returns true if a SQL statement cannot run inside a transaction.
 */
export function isNonTransactionalStatement(statement: string): boolean {
  return NON_TRANSACTIONAL_PATTERNS.some((p) => p.test(statement));
}

/**
 * Returns true if a SQL file contains any non-transactional statements.
 */
export function hasNonTransactionalStatements(statements: string[]): boolean {
  return statements.some(isNonTransactionalStatement);
}
