// --------------------------------------------------------------------------
// Unit tests — Lint Rules
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { lintSql } from '../../lint/sqlLint.js';

describe('lintSql', () => {
  const file = 'test.sql';

  // --- PGSM001: Drop table ---
  it('PGSM001: detects DROP TABLE', () => {
    const issues = lintSql('DROP TABLE users;', file);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('PGSM001');
  });

  // --- PGSM002: Drop column ---
  it('PGSM002: detects ALTER TABLE ... DROP COLUMN', () => {
    const issues = lintSql('ALTER TABLE users DROP COLUMN email;', file);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.ruleId).toBe('PGSM002');
  });

  // --- PGSM003: NOT NULL without DEFAULT ---
  it('PGSM003: detects ADD COLUMN NOT NULL without DEFAULT', () => {
    const issues = lintSql(
      'ALTER TABLE users ADD COLUMN name TEXT NOT NULL;',
      file,
    );
    const pgsm003 = issues.filter((i) => i.ruleId === 'PGSM003');
    expect(pgsm003).toHaveLength(1);
  });

  it('PGSM003: allows ADD COLUMN NOT NULL with DEFAULT', () => {
    const issues = lintSql(
      "ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';",
      file,
    );
    const pgsm003 = issues.filter((i) => i.ruleId === 'PGSM003');
    expect(pgsm003).toHaveLength(0);
  });

  // --- PGSM004: Rename table ---
  it('PGSM004: detects ALTER TABLE ... RENAME TO', () => {
    const issues = lintSql('ALTER TABLE users RENAME TO people;', file);
    expect(issues.some((i) => i.ruleId === 'PGSM004')).toBe(true);
  });

  // --- PGSM005: Rename column ---
  it('PGSM005: detects ALTER TABLE ... RENAME COLUMN', () => {
    const issues = lintSql(
      'ALTER TABLE users RENAME COLUMN name TO full_name;',
      file,
    );
    expect(issues.some((i) => i.ruleId === 'PGSM005')).toBe(true);
  });

  // --- PGSM006: Change column type ---
  it('PGSM006: detects ALTER COLUMN ... TYPE', () => {
    const issues = lintSql(
      'ALTER TABLE users ALTER COLUMN age TYPE BIGINT;',
      file,
    );
    expect(issues.some((i) => i.ruleId === 'PGSM006')).toBe(true);
  });

  // --- PGSM007: CREATE INDEX without CONCURRENTLY ---
  it('PGSM007: detects CREATE INDEX without CONCURRENTLY', () => {
    const issues = lintSql('CREATE INDEX idx_name ON users(name);', file);
    expect(issues.some((i) => i.ruleId === 'PGSM007')).toBe(true);
  });

  it('PGSM007: allows CREATE INDEX CONCURRENTLY', () => {
    const issues = lintSql(
      'CREATE INDEX CONCURRENTLY idx_name ON users(name);',
      file,
    );
    const pgsm007 = issues.filter((i) => i.ruleId === 'PGSM007');
    expect(pgsm007).toHaveLength(0);
  });

  // --- PGSM008: DROP INDEX without CONCURRENTLY ---
  it('PGSM008: detects DROP INDEX without CONCURRENTLY', () => {
    const issues = lintSql('DROP INDEX idx_name;', file);
    expect(issues.some((i) => i.ruleId === 'PGSM008')).toBe(true);
  });

  it('PGSM008: allows DROP INDEX CONCURRENTLY', () => {
    const issues = lintSql('DROP INDEX CONCURRENTLY idx_name;', file);
    const pgsm008 = issues.filter((i) => i.ruleId === 'PGSM008');
    expect(pgsm008).toHaveLength(0);
  });

  // --- PGSM009: FK without NOT VALID ---
  it('PGSM009: detects ADD CONSTRAINT FOREIGN KEY without NOT VALID', () => {
    const issues = lintSql(
      'ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);',
      file,
    );
    expect(issues.some((i) => i.ruleId === 'PGSM009')).toBe(true);
  });

  it('PGSM009: allows FOREIGN KEY with NOT VALID', () => {
    const issues = lintSql(
      'ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;',
      file,
    );
    const pgsm009 = issues.filter((i) => i.ruleId === 'PGSM009');
    expect(pgsm009).toHaveLength(0);
  });

  // --- PGSM010: CHECK without NOT VALID ---
  it('PGSM010: detects ADD CONSTRAINT CHECK without NOT VALID', () => {
    const issues = lintSql(
      'ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age > 0);',
      file,
    );
    expect(issues.some((i) => i.ruleId === 'PGSM010')).toBe(true);
  });

  it('PGSM010: allows CHECK with NOT VALID', () => {
    const issues = lintSql(
      'ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age > 0) NOT VALID;',
      file,
    );
    const pgsm010 = issues.filter((i) => i.ruleId === 'PGSM010');
    expect(pgsm010).toHaveLength(0);
  });

  // --- Overrides ---
  it('file-level override suppresses rule', () => {
    const sql = `
-- pgsm:allow PGSM001 reason="Intentional cleanup"
DROP TABLE old_data;
    `.trim();
    const issues = lintSql(sql, file);
    const pgsm001 = issues.filter((i) => i.ruleId === 'PGSM001');
    expect(pgsm001).toHaveLength(0);
  });

  it('statement-level override suppresses only next statement', () => {
    const sql = `
-- pgsm:allow-next PGSM001 reason="Cleaning up legacy table"
DROP TABLE legacy_data;
DROP TABLE other_table;
    `.trim();
    const issues = lintSql(sql, file);
    const pgsm001 = issues.filter((i) => i.ruleId === 'PGSM001');
    // The second DROP TABLE should still be flagged
    expect(pgsm001).toHaveLength(1);
    expect(pgsm001[0]!.snippet).toContain('other_table');
  });

  it('config-level allowRules suppresses rule globally', () => {
    const sql = 'DROP TABLE users;';
    const issues = lintSql(sql, file, ['PGSM001']);
    expect(issues.filter((i) => i.ruleId === 'PGSM001')).toHaveLength(0);
  });

  // --- Clean migration ---
  it('clean SQL produces no issues', () => {
    const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT
);
    `.trim();
    const issues = lintSql(sql, file);
    expect(issues).toHaveLength(0);
  });
});
