// --------------------------------------------------------------------------
// pg-safe-migrate-core — Public API
// --------------------------------------------------------------------------
export { createMigrator } from './migrator.js';
export { computeChecksum } from './checksum.js';
export { splitStatements } from './lint/splitter.js';
export { lintSql, lintFile, parseFileOverrides, parseStatementOverrides } from './lint/sqlLint.js';
export { RULES, isNonTransactionalStatement, hasNonTransactionalStatements } from './lint/rules.js';
export { loadMigrations } from './loader.js';
export { deriveLockId } from './lock.js';
export { detectDrift, validateOrdering } from './history.js';
export { computePlan } from './planner.js';
export { TOOL_VERSION } from './version.js';

// Errors
export {
  PgsmError,
  ConfigError,
  DriftError,
  UnsafeMigrationError,
  MigrationOrderError,
  MissingDownError,
  LockAcquireError,
  TransactionPolicyError,
} from './errors.js';

// Types
export type {
  Direction,
  TransactionPolicy,
  LintRuleId,
  Severity,
  LintIssue,
  LintOverride,
  MigrationFile,
  MigrationRecord,
  MigrationStep,
  MigrationPlan,
  PlanOptions,
  MigratorConfig,
  MigrationStatus,
  DriftInfo,
  DoctorResult,
  DoctorCheck,
  PgClientLike,
  Migrator,
} from './types.js';
