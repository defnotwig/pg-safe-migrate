// --------------------------------------------------------------------------
// pg-safe-migrate-core — Public Types
// --------------------------------------------------------------------------

/** Direction a migration runs in. */
export type Direction = 'up' | 'down';

/** How to wrap migrations in transactions. */
export type TransactionPolicy = 'auto' | 'always' | 'never';

// ---- Lint ----------------------------------------------------------------

/** Well-known safety rule IDs. */
export type LintRuleId =
  | 'PGSM001'
  | 'PGSM002'
  | 'PGSM003'
  | 'PGSM004'
  | 'PGSM005'
  | 'PGSM006'
  | 'PGSM007'
  | 'PGSM008'
  | 'PGSM009'
  | 'PGSM010'
  | (string & Record<never, never>); // allow future custom rules

export type Severity = 'error' | 'warning' | 'info';

export interface LintIssue {
  ruleId: LintRuleId;
  severity: Severity;
  message: string;
  file: string;
  statementIndex: number;
  snippet: string;
}

export interface LintOverride {
  ruleId: LintRuleId;
  scope: 'file' | 'statement';
  reason: string;
  ticket?: string;
}

// ---- Migration files -----------------------------------------------------

export interface MigrationFile {
  /** Unique ID derived from filename (without extension). */
  id: string;
  /** Absolute path to the up migration SQL file. */
  upPath: string;
  /** Absolute path to the down migration SQL file (may not exist). */
  downPath: string | null;
  /** SHA-256 checksum of the up migration content. */
  checksum: string;
  /** Whether the down migration is marked as irreversible. */
  irreversible: boolean;
}

// ---- History -------------------------------------------------------------

export interface MigrationRecord {
  id: string;
  checksum: string;
  appliedAt: Date;
  executionMs: number;
  direction: Direction;
  toolVersion: string;
  notes: Record<string, unknown> | null;
}

// ---- Plan ----------------------------------------------------------------

export interface MigrationStep {
  id: string;
  direction: Direction;
  filePath: string;
  checksum: string;
  needsNonTransactional: boolean;
}

export interface MigrationPlan {
  steps: MigrationStep[];
  direction: Direction;
  dryRun: boolean;
  transactionPolicy: TransactionPolicy;
}

export interface PlanOptions {
  direction?: Direction;
  /** Target migration ID to run to. */
  to?: string;
  /** Number of steps to run. */
  steps?: number;
  /** If true, compute plan but do not execute. */
  dryRun?: boolean;
}

// ---- Config --------------------------------------------------------------

export interface MigratorConfig {
  /** PostgreSQL connection string. */
  databaseUrl?: string;
  /** Existing pg Pool or Client-like object. */
  client?: PgClientLike;
  /** Path to migrations directory (default: ./migrations). */
  migrationsDir?: string;
  /** Schema for the history table (default: public). */
  schema?: string;
  /** History table name (default: _pg_safe_migrate). */
  tableName?: string;
  /** Transaction policy (default: auto). */
  transactionPolicy?: TransactionPolicy;
  /** Advisory lock ID. If not provided, derived from (database, schema, table). */
  lockId?: number;
  /** SQL statement_timeout (e.g., '30s'). */
  statementTimeout?: string;
  /** SQL lock_timeout (e.g., '10s'). */
  lockTimeout?: string;
  /** Whether down migrations are required. */
  requireDown?: boolean;
  /** Rules to allow globally via config. */
  allowRules?: string[];
}

// ---- Status + Doctor -----------------------------------------------------

export interface MigrationStatus {
  applied: MigrationRecord[];
  pending: MigrationFile[];
  driftDetected: DriftInfo[];
}

export interface DriftInfo {
  id: string;
  expectedChecksum: string;
  actualChecksum: string;
}

export interface DoctorResult {
  ok: boolean;
  checks: DoctorCheck[];
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
}

// ---- Utility types -------------------------------------------------------

/** Minimal pg client interface we depend on. */
export interface PgClientLike {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/** The public migrator API returned by createMigrator. */
export interface Migrator {
  check(): Promise<{ ok: boolean; issues: LintIssue[]; drift: DriftInfo[] }>;
  status(): Promise<MigrationStatus>;
  plan(options?: PlanOptions): Promise<MigrationPlan>;
  run(options?: PlanOptions): Promise<MigrationStep[]>;
  lint(): Promise<LintIssue[]>;
  doctor(): Promise<DoctorResult>;
}
