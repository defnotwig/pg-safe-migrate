// --------------------------------------------------------------------------
// Unit tests — SQL Splitter (edge cases)
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { splitStatements } from '../../lint/splitter.js';

describe('splitStatements — edge cases', () => {
  it('handles empty string', () => {
    expect(splitStatements('')).toEqual([]);
  });

  it('handles whitespace-only string', () => {
    expect(splitStatements('   \n\n\t  ')).toEqual([]);
  });

  it('handles single semicolon', () => {
    expect(splitStatements(';')).toEqual([]);
  });

  it('handles multiple semicolons', () => {
    expect(splitStatements(';;;')).toEqual([]);
  });

  it('preserves dollar-quoted function bodies', () => {
    const sql = `
CREATE FUNCTION test() RETURNS void AS $$
BEGIN
  RAISE NOTICE 'hello; world';
END;
$$ LANGUAGE plpgsql;
    `.trim();
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toContain('$$');
    expect(stmts[0]).toContain("RAISE NOTICE 'hello; world'");
  });

  it('handles tagged dollar-quotes', () => {
    const sql = `
CREATE FUNCTION test() RETURNS void AS $body$
BEGIN
  NULL;
END;
$body$ LANGUAGE plpgsql;
    `.trim();
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toContain('$body$');
  });

  it('handles escaped single quotes', () => {
    const sql = "INSERT INTO t(name) VALUES ('it''s a test;');";
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toContain("it''s a test;");
  });

  it('handles block comments with semicolons', () => {
    const sql = `
/* This is a comment; with a semicolon */
SELECT 1;
    `.trim();
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toContain('SELECT 1');
  });

  it('handles nested-looking block comments', () => {
    const sql = `
/* comment /* not really nested */ SELECT 1;
SELECT 2;
    `.trim();
    const stmts = splitStatements(sql);
    // After the first */, the rest is SQL
    expect(stmts.length).toBeGreaterThanOrEqual(1);
  });

  it('handles line comments at end of statements', () => {
    const sql = `
SELECT 1; -- first
SELECT 2; -- second
    `.trim();
    const stmts = splitStatements(sql);
    // Comments after semicolons become part of the next segment
    // The trailing comment becomes its own segment
    expect(stmts.length).toBeGreaterThanOrEqual(2);
    expect(stmts.some((s) => s.includes('SELECT 1'))).toBe(true);
    expect(stmts.some((s) => s.includes('SELECT 2'))).toBe(true);
  });

  it('handles statement without trailing semicolon', () => {
    const sql = 'SELECT 1';
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(1);
    expect(stmts[0]).toBe('SELECT 1');
  });

  it('handles CR+LF line endings', () => {
    const sql = 'SELECT 1;\r\nSELECT 2;\r\n';
    const stmts = splitStatements(sql);
    // Splitter treats \r as part of the text, so statements include it
    expect(stmts.length).toBeGreaterThanOrEqual(2);
    expect(stmts.some((s) => s.includes('SELECT 1'))).toBe(true);
    expect(stmts.some((s) => s.includes('SELECT 2'))).toBe(true);
  });

  it('handles complex migration with mixed features', () => {
    const sql = `
-- Create the lookup type
CREATE TYPE status_enum AS ENUM ('active', 'inactive');

-- Create the table
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  status status_enum NOT NULL DEFAULT 'active',
  data JSONB
);

-- Add an index
CREATE INDEX idx_items_status ON items(status);
    `.trim();
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(3);
    expect(stmts[0]).toContain('CREATE TYPE');
    expect(stmts[1]).toContain('CREATE TABLE');
    expect(stmts[2]).toContain('CREATE INDEX');
  });

  it('handles dollar sign in regular SQL (not a dollar-quote)', () => {
    const sql = "SELECT $1, $2;";
    const stmts = splitStatements(sql);
    expect(stmts).toHaveLength(1);
  });
});
