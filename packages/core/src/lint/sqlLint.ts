// --------------------------------------------------------------------------
// pg-safe-migrate-core — SQL Linter
// --------------------------------------------------------------------------
import { readFile } from 'node:fs/promises';
import type { LintIssue, LintOverride, LintRuleId } from '../types.js';
import { splitStatements } from './splitter.js';
import { RULES } from './rules.js';

// ---- Override parsing ----------------------------------------------------

/**
 * Parse `-- pgsm:allow <RULE_ID> reason="..." ticket="..."`
 * across the entire file to collect file-level overrides.
 */
const FILE_OVERRIDE_RE =
  /--\s*pgsm:allow\s+(PGSM\d+)\s+reason="([^"]+)"(?:\s+ticket="([^"]*)")?/g;

/**
 * Parse `-- pgsm:allow-next <RULE_ID> reason="..." ticket="..."`
 * These override the next statement only.
 */
const STMT_OVERRIDE_RE =
  /--\s*pgsm:allow-next\s+(PGSM\d+)\s+reason="([^"]+)"(?:\s+ticket="([^"]*)")?/g;

export function parseFileOverrides(sql: string): LintOverride[] {
  const overrides: LintOverride[] = [];
  let match: RegExpExecArray | null;

  FILE_OVERRIDE_RE.lastIndex = 0;
  while ((match = FILE_OVERRIDE_RE.exec(sql)) !== null) {
    overrides.push({
      ruleId: match[1]! as LintRuleId,
      scope: 'file',
      reason: match[2]!,
      ticket: match[3] || undefined,
    });
  }

  return overrides;
}

/**
 * Parse statement-level overrides. We look at the block of comments/whitespace
 * **before** a given statement in the original SQL.
 */
export function parseStatementOverrides(
  sql: string,
  statementStartPos: number,
): LintOverride[] {
  // Walk backwards from statementStartPos to find preceding comment lines
  const before = sql.slice(0, statementStartPos);
  const trailingLines = before.split('\n').reverse();
  const commentBlock: string[] = [];

  for (const line of trailingLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') {
      commentBlock.push(trimmed);
    } else {
      break;
    }
  }

  const block = [...commentBlock].reverse().join('\n');
  const overrides: LintOverride[] = [];
  let match: RegExpExecArray | null;

  STMT_OVERRIDE_RE.lastIndex = 0;
  while ((match = STMT_OVERRIDE_RE.exec(block)) !== null) {
    overrides.push({
      ruleId: match[1]! as LintRuleId,
      scope: 'statement',
      reason: match[2]!,
      ticket: match[3] || undefined,
    });
  }

  return overrides;
}

/**
 * Parse `allow-next` overrides found inside a statement's own text.
 * The splitter includes preceding comments in the statement, so
 * allow-next directives end up within the statement content itself.
 */
export function parseInlineStatementOverrides(stmt: string): LintOverride[] {
  const overrides: LintOverride[] = [];
  let match: RegExpExecArray | null;

  STMT_OVERRIDE_RE.lastIndex = 0;
  while ((match = STMT_OVERRIDE_RE.exec(stmt)) !== null) {
    overrides.push({
      ruleId: match[1]! as LintRuleId,
      scope: 'statement',
      reason: match[2]!,
      ticket: match[3] || undefined,
    });
  }

  return overrides;
}

// ---- Main lint function --------------------------------------------------

export interface LintFileOptions {
  filePath: string;
  /** Optional config-level rule allowlist. */
  allowRules?: string[];
}

/**
 * Lint a single SQL migration file.
 */
export async function lintFile(opts: LintFileOptions): Promise<LintIssue[]> {
  const content = await readFile(opts.filePath, 'utf-8');
  return lintSql(content, opts.filePath, opts.allowRules);
}

/** Lint a single statement against all rules, respecting overrides. */
function lintStatement(
  stmt: string,
  idx: number,
  sql: string,
  pos: number,
  fileAllowed: Set<string>,
  filePath: string,
): LintIssue[] {
  const stmtOverrides = [
    ...parseStatementOverrides(sql, pos),
    ...parseInlineStatementOverrides(stmt),
  ];
  const stmtAllowed = new Set(stmtOverrides.map((o) => o.ruleId));
  const issues: LintIssue[] = [];

  for (const rule of RULES) {
    if (fileAllowed.has(rule.id)) continue;
    if (stmtAllowed.has(rule.id)) continue;

    if (rule.pattern.test(stmt)) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        file: filePath,
        statementIndex: idx,
        snippet: stmt.length > 120 ? stmt.slice(0, 120) + '...' : stmt,
      });
    }
  }

  return issues;
}

/**
 * Lint raw SQL content. Pure function for testability.
 */
export function lintSql(
  sql: string,
  filePath: string,
  allowRules?: string[],
): LintIssue[] {
  const fileOverrides = parseFileOverrides(sql);
  const fileAllowed = new Set([
    ...fileOverrides.map((o) => o.ruleId),
    ...(allowRules ?? []),
  ]);

  const statements = splitStatements(sql);
  const issues: LintIssue[] = [];

  let searchFrom = 0;
  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx]!;
    const stmtPos = sql.indexOf(stmt.slice(0, Math.min(stmt.length, 40)), searchFrom);
    const pos = stmtPos >= 0 ? stmtPos : searchFrom;
    searchFrom = pos + stmt.length;

    issues.push(...lintStatement(stmt, idx, sql, pos, fileAllowed, filePath));
  }

  return issues;
}
