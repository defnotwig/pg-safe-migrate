// --------------------------------------------------------------------------
// pg-safe-migrate-core — Typed Errors
// --------------------------------------------------------------------------

/** Base class for all pg-safe-migrate errors. */
export class PgsmError extends Error {
  public readonly code: string;
  public readonly remediation: string;

  constructor(code: string, message: string, remediation: string) {
    super(message);
    this.name = 'PgsmError';
    this.code = code;
    this.remediation = remediation;
  }
}

export class ConfigError extends PgsmError {
  constructor(message: string, remediation?: string) {
    super(
      'CONFIG_ERROR',
      message,
      remediation ?? 'Check your pgsm.config.json or CLI flags.',
    );
    this.name = 'ConfigError';
  }
}

export class DriftError extends PgsmError {
  constructor(
    public readonly migrationId: string,
    public readonly expectedChecksum: string,
    public readonly actualChecksum: string,
  ) {
    super(
      'DRIFT_ERROR',
      `Drift detected for migration "${migrationId}": expected checksum ${expectedChecksum}, got ${actualChecksum}.`,
      `Do not modify already-applied migrations. If intentional, create a new migration to make your changes.`,
    );
    this.name = 'DriftError';
  }
}

export class UnsafeMigrationError extends PgsmError {
  constructor(
    public readonly ruleId: string,
    public readonly file: string,
    detail: string,
  ) {
    super(
      'UNSAFE_MIGRATION',
      `Safety rule ${ruleId} violated in "${file}": ${detail}`,
      `Add an override comment with a reason, or adjust your migration. See docs on overrides.`,
    );
    this.name = 'UnsafeMigrationError';
  }
}

export class MigrationOrderError extends PgsmError {
  constructor(message: string) {
    super(
      'ORDER_ERROR',
      message,
      'Migrations must be applied in strict lexicographical order. Do not reorder or insert earlier migrations.',
    );
    this.name = 'MigrationOrderError';
  }
}

export class MissingDownError extends PgsmError {
  constructor(public readonly migrationId: string) {
    super(
      'MISSING_DOWN',
      `Down migration missing for "${migrationId}" and not marked as irreversible.`,
      'Create a .down.sql file or add "-- pgsm:irreversible reason=..." to the up migration.',
    );
    this.name = 'MissingDownError';
  }
}

export class LockAcquireError extends PgsmError {
  constructor(detail?: string) {
    super(
      'LOCK_ERROR',
      `Could not acquire advisory lock.${detail ? ' ' + detail : ''}`,
      'Another migration runner may be holding the lock. Wait or check for stuck sessions with: SELECT * FROM pg_locks WHERE locktype = \'advisory\';',
    );
    this.name = 'LockAcquireError';
  }
}

export class TransactionPolicyError extends PgsmError {
  constructor(
    public readonly migrationId: string,
    public readonly statement: string,
  ) {
    super(
      'TRANSACTION_POLICY',
      `Migration "${migrationId}" contains non-transactional statement ("${statement.slice(0, 60)}...") but transaction policy is "always".`,
      'Switch transaction policy to "auto" or "never", or split the migration so the non-transactional statement is in its own file.',
    );
    this.name = 'TransactionPolicyError';
  }
}
