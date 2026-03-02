// --------------------------------------------------------------------------
// Unit tests — Lint overrides & edge cases
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import {
  lintSql,
  parseFileOverrides,
  parseStatementOverrides,
} from '../../lint/sqlLint.js';

const file = 'test.sql';

describe('parseFileOverrides', () => {
  it('parses single override', () => {
    const sql = '-- pgsm:allow PGSM001 reason="Legacy cleanup"';
    const overrides = parseFileOverrides(sql);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]!.ruleId).toBe('PGSM001');
    expect(overrides[0]!.scope).toBe('file');
    expect(overrides[0]!.reason).toBe('Legacy cleanup');
  });

  it('parses override with ticket', () => {
    const sql = '-- pgsm:allow PGSM003 reason="Backfill" ticket="JIRA-123"';
    const overrides = parseFileOverrides(sql);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]!.ticket).toBe('JIRA-123');
  });

  it('parses multiple overrides', () => {
    const sql = `
-- pgsm:allow PGSM001 reason="drop ok"
-- pgsm:allow PGSM002 reason="column drop ok"
DROP TABLE old;
DROP TABLE old2;
    `.trim();
    const overrides = parseFileOverrides(sql);
    expect(overrides).toHaveLength(2);
    expect(overrides.map((o) => o.ruleId)).toEqual(['PGSM001', 'PGSM002']);
  });

  it('does not match allow-next as file override', () => {
    const sql = '-- pgsm:allow-next PGSM001 reason="only next"';
    const overrides = parseFileOverrides(sql);
    expect(overrides).toHaveLength(0);
  });

  it('returns empty for no overrides', () => {
    const sql = 'SELECT 1;';
    expect(parseFileOverrides(sql)).toHaveLength(0);
  });
});

describe('parseStatementOverrides', () => {
  it('finds override in comment block before position', () => {
    const sql = '-- pgsm:allow-next PGSM001 reason="ok"\nDROP TABLE foo;';
    // Position of "DROP TABLE"
    const pos = sql.indexOf('DROP TABLE');
    const overrides = parseStatementOverrides(sql, pos);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]!.ruleId).toBe('PGSM001');
    expect(overrides[0]!.scope).toBe('statement');
  });

  it('returns empty when no comments before position', () => {
    const sql = 'DROP TABLE foo;';
    const overrides = parseStatementOverrides(sql, 0);
    expect(overrides).toHaveLength(0);
  });
});

describe('lintSql — override edge cases', () => {
  it('file override suppresses across all statements', () => {
    const sql = `
-- pgsm:allow PGSM001 reason="Batch cleanup"
DROP TABLE a;
DROP TABLE b;
DROP TABLE c;
    `.trim();
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM001')).toHaveLength(0);
  });

  it('statement override only suppresses the immediate next statement', () => {
    const sql = `
-- pgsm:allow-next PGSM002 reason="Planned column removal"
ALTER TABLE users DROP COLUMN old_field;
ALTER TABLE users DROP COLUMN other_field;
    `.trim();
    const issues = lintSql(sql, file);
    const pgsm002 = issues.filter((i) => i.ruleId === 'PGSM002');
    // First DROP COLUMN suppressed, second should still be flagged
    expect(pgsm002).toHaveLength(1);
    expect(pgsm002[0]!.snippet).toContain('other_field');
  });

  it('config-level allowRules suppresses multiple rules', () => {
    const sql = `
DROP TABLE users;
ALTER TABLE posts DROP COLUMN old;
    `.trim();
    const issues = lintSql(sql, file, ['PGSM001', 'PGSM002']);
    expect(issues.filter((i) => i.ruleId === 'PGSM001')).toHaveLength(0);
    expect(issues.filter((i) => i.ruleId === 'PGSM002')).toHaveLength(0);
  });

  it('override without reason does not match', () => {
    const sql = `
-- pgsm:allow PGSM001
DROP TABLE users;
    `.trim();
    // The regex requires reason="..." so this should NOT suppress
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM001')).toHaveLength(1);
  });

  it('truncates long snippets in issues', () => {
    // Create a very long DROP statement
    const longName = 'a'.repeat(200);
    const sql = `DROP TABLE ${longName};`;
    const issues = lintSql(sql, file);
    const issue = issues.find((i) => i.ruleId === 'PGSM001');
    expect(issue).toBeDefined();
    expect(issue!.snippet.length).toBeLessThanOrEqual(124); // 120 + "..."
  });
});

describe('lintSql — rule-specific edge cases', () => {
  it('PGSM003: NOT NULL with DEFAULT is safe', () => {
    const sql = "ALTER TABLE t ADD COLUMN x TEXT NOT NULL DEFAULT '';";
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM003')).toHaveLength(0);
  });

  it('PGSM003: NOT NULL without DEFAULT is unsafe', () => {
    const sql = 'ALTER TABLE t ADD COLUMN x TEXT NOT NULL;';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM003')).toHaveLength(1);
  });

  it('PGSM007: CREATE INDEX without CONCURRENTLY is flagged', () => {
    const sql = 'CREATE INDEX idx_test ON users(email);';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM007')).toHaveLength(1);
  });

  it('PGSM007: CREATE INDEX CONCURRENTLY is safe', () => {
    const sql = 'CREATE INDEX CONCURRENTLY idx_test ON users(email);';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM007')).toHaveLength(0);
  });

  it('PGSM008: DROP INDEX without CONCURRENTLY is flagged', () => {
    const sql = 'DROP INDEX idx_test;';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM008')).toHaveLength(1);
  });

  it('PGSM008: DROP INDEX CONCURRENTLY is safe', () => {
    const sql = 'DROP INDEX CONCURRENTLY idx_test;';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM008')).toHaveLength(0);
  });

  it('PGSM009: ADD CONSTRAINT without NOT VALID is flagged', () => {
    const sql = 'ALTER TABLE t ADD CONSTRAINT fk FOREIGN KEY (x) REFERENCES y(id);';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM009')).toHaveLength(1);
  });

  it('PGSM009: ADD CONSTRAINT with NOT VALID is safe', () => {
    const sql = 'ALTER TABLE t ADD CONSTRAINT fk FOREIGN KEY (x) REFERENCES y(id) NOT VALID;';
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM009')).toHaveLength(0);
  });

  it('PGSM010: CHECK constraint without NOT VALID is flagged', () => {
    const sql = "ALTER TABLE t ADD CONSTRAINT chk CHECK (status IN ('a','b'));";
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM010')).toHaveLength(1);
  });

  it('PGSM010: CHECK constraint with NOT VALID is safe', () => {
    const sql = "ALTER TABLE t ADD CONSTRAINT chk CHECK (status IN ('a','b')) NOT VALID;";
    const issues = lintSql(sql, file);
    expect(issues.filter((i) => i.ruleId === 'PGSM010')).toHaveLength(0);
  });

  it('clean migration returns no issues', () => {
    const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE
);
    `.trim();
    const issues = lintSql(sql, file);
    expect(issues).toHaveLength(0);
  });
});
