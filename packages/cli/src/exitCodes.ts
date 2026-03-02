// --------------------------------------------------------------------------
// pg-safe-migrate CLI — Exit codes
// --------------------------------------------------------------------------
export const EXIT = {
  SUCCESS: 0,
  DRIFT_UNSAFE_LINT: 1,
  CONFIG_USAGE: 2,
  DB_CONNECTIVITY: 3,
} as const;
