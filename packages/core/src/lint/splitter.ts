// --------------------------------------------------------------------------
// pg-safe-migrate-core — SQL Statement Splitter
// --------------------------------------------------------------------------

/**
 * Pragmatically split a SQL string into individual statements.
 *
 * Handles:
 * - Single-line comments (-- ...)
 * - Block comments (/* ... * /)
 * - Single-quoted strings ('...')
 * - Dollar-quoted strings ($$...$$ or $tag$...$tag$)
 * - Semicolons as statement terminators
 *
 * Does NOT attempt full SQL parsing — this is intentionally pragmatic.
 */

interface SkipResult {
  text: string;
  nextIndex: number;
}

/** Skip a `-- ...` line comment, returning the consumed text and new index. */
function skipLineComment(sql: string, start: number): SkipResult {
  const end = sql.indexOf('\n', start);
  if (end === -1) {
    return { text: sql.slice(start), nextIndex: sql.length };
  }
  return { text: sql.slice(start, end + 1), nextIndex: end + 1 };
}

/** Skip a `/* ... * /` block comment, returning the consumed text and new index. */
function skipBlockComment(sql: string, start: number): SkipResult {
  const end = sql.indexOf('*/', start + 2);
  if (end === -1) {
    return { text: sql.slice(start), nextIndex: sql.length };
  }
  return { text: sql.slice(start, end + 2), nextIndex: end + 2 };
}

/** Skip a single-quoted string (`'...'`), handling `''` escapes. */
function skipSingleQuotedString(sql: string, start: number): SkipResult {
  const len = sql.length;
  let j = start + 1;
  while (j < len) {
    if (sql[j] === "'" && sql[j + 1] === "'") {
      j += 2; // escaped quote
    } else if (sql[j] === "'") {
      j += 1;
      break;
    } else {
      j += 1;
    }
  }
  return { text: sql.slice(start, j), nextIndex: j };
}

/** Skip a dollar-quoted string (`$$...$$` or `$tag$...$tag$`). */
function skipDollarQuotedString(sql: string, start: number): SkipResult | null {
  const tagMatch = /^\$(\w*)\$/.exec(sql.slice(start));
  if (!tagMatch) return null;

  const tag = tagMatch[0]; // e.g., $$ or $body$
  const endIdx = sql.indexOf(tag, start + tag.length);
  if (endIdx === -1) {
    return { text: sql.slice(start), nextIndex: sql.length };
  }
  return { text: sql.slice(start, endIdx + tag.length), nextIndex: endIdx + tag.length };
}

/** Flush a completed statement into the output array if non-empty. */
function pushStatement(statements: string[], raw: string): void {
  const trimmed = raw.trim();
  if (trimmed && trimmed !== ';') {
    statements.push(trimmed);
  }
}

/** Handle a `$` character — either a dollar-quoted string or a literal `$`. */
function handleDollar(sql: string, start: number): SkipResult {
  const r = skipDollarQuotedString(sql, start);
  if (r) return r;
  return { text: sql[start]!, nextIndex: start + 1 };
}

export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i]!;
    const next = i + 1 < len ? sql[i + 1] : '';

    if (ch === '-' && next === '-') {
      const r = skipLineComment(sql, i);
      current += r.text;
      i = r.nextIndex;
    } else if (ch === '/' && next === '*') {
      const r = skipBlockComment(sql, i);
      current += r.text;
      i = r.nextIndex;
    } else if (ch === "'") {
      const r = skipSingleQuotedString(sql, i);
      current += r.text;
      i = r.nextIndex;
    } else if (ch === '$') {
      const r = handleDollar(sql, i);
      current += r.text;
      i = r.nextIndex;
    } else if (ch === ';') {
      current += ';';
      pushStatement(statements, current);
      current = '';
      i += 1;
    } else {
      current += ch;
      i += 1;
    }
  }

  // Remaining content (no trailing semicolon)
  pushStatement(statements, current);
  return statements;
}
