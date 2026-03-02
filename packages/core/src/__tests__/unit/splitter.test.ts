// --------------------------------------------------------------------------
// Unit tests — Statement Splitter
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { splitStatements } from '../../lint/splitter.js';

describe('splitStatements', () => {
  it('splits simple statements on semicolons', () => {
    const result = splitStatements('SELECT 1; SELECT 2;');
    expect(result).toEqual(['SELECT 1;', 'SELECT 2;']);
  });

  it('handles trailing content without semicolon', () => {
    const result = splitStatements('SELECT 1; SELECT 2');
    expect(result).toEqual(['SELECT 1;', 'SELECT 2']);
  });

  it('ignores single-line comments', () => {
    const sql = `
-- This is a comment
SELECT 1;
-- Another comment
SELECT 2;
    `.trim();
    const result = splitStatements(sql);
    expect(result.length).toBe(2);
    expect(result[0]).toContain('SELECT 1');
    expect(result[1]).toContain('SELECT 2');
  });

  it('ignores block comments', () => {
    const sql = `/* block comment */ SELECT 1; /* another
    multiline
    comment */ SELECT 2;`;
    const result = splitStatements(sql);
    expect(result.length).toBe(2);
  });

  it('preserves single-quoted strings with semicolons', () => {
    const sql = `INSERT INTO t (a) VALUES ('hello; world');`;
    const result = splitStatements(sql);
    expect(result.length).toBe(1);
    expect(result[0]).toContain("'hello; world'");
  });

  it('handles escaped single quotes', () => {
    const sql = `INSERT INTO t (a) VALUES ('it''s; here');`;
    const result = splitStatements(sql);
    expect(result.length).toBe(1);
  });

  it('handles dollar-quoted strings', () => {
    const sql = `
CREATE FUNCTION foo() RETURNS void AS $$
BEGIN
  RAISE NOTICE 'hello; world';
END;
$$ LANGUAGE plpgsql;
SELECT 1;
    `.trim();
    const result = splitStatements(sql);
    expect(result.length).toBe(2);
    expect(result[0]).toContain('$$');
    expect(result[1]).toContain('SELECT 1');
  });

  it('handles tagged dollar quotes', () => {
    const sql = `
CREATE FUNCTION bar() RETURNS void AS $body$
BEGIN
  RAISE NOTICE 'test;';
END;
$body$ LANGUAGE plpgsql;
    `.trim();
    const result = splitStatements(sql);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('$body$');
  });

  it('handles empty input', () => {
    expect(splitStatements('')).toEqual([]);
    expect(splitStatements('   ')).toEqual([]);
    expect(splitStatements(';')).toEqual([]);
  });

  it('handles multiline statements', () => {
    const sql = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);
    `.trim();
    const result = splitStatements(sql);
    expect(result.length).toBe(1);
    expect(result[0]).toContain('CREATE TABLE');
  });
});
