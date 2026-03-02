# Roadmap

## v0.1.0 — Initial Release (Current)

- [x] Core migration engine with `createMigrator()` factory
- [x] 10 built-in safety rules (PGSM001–PGSM010)
- [x] SHA-256 checksum drift detection
- [x] PostgreSQL advisory locks
- [x] Transaction policy: `auto` | `always` | `never`
- [x] Override system with required reasons
- [x] CLI with 8 commands
- [x] GitHub Action (composite)
- [x] Full documentation and examples

## v0.2.0 — Splitter & Rules Improvements

- [ ] Improved SQL splitter for complex PL/pgSQL bodies
- [ ] PGSM011: Warn on `ALTER TYPE ... ADD VALUE` (requires special handling)
- [ ] PGSM012: Detect `SET NOT NULL` on existing columns (full table scan risk)
- [ ] PGSM013: Warn on `LOCK TABLE` statements
- [ ] Rule severity configuration (override default severity per rule)
- [ ] `--format json` output for all commands (machine-parseable)
- [ ] Migration dry-run preview with SQL diff

## v0.3.0 — Adapters & Integrations

- [ ] `client` injection for serverless environments (Neon, Supabase, etc.)
- [ ] Connection pooling support (external pool injection)
- [ ] Prisma integration guide + adapter
- [ ] TypeORM integration guide
- [ ] Knex.js integration guide
- [ ] `pg-safe-migrate/eslint` plugin for static analysis of migration files

## v0.4.0 — Advanced Features

- [ ] Migration groups (apply related migrations atomically)
- [ ] Seed data framework (`pg-safe-migrate seed`)
- [ ] Migration snapshots for fast dev environment setup
- [ ] Baseline command (mark existing schema as "already applied")
- [ ] Squash command (collapse applied migrations into a single file)

## v1.0.0 — Stable Release

- [ ] Config format stability guarantee
- [ ] History table schema stability guarantee
- [ ] Semver compliance with breaking change policy
- [ ] Full Node.js 18/20/22 test matrix
- [ ] PostgreSQL 14/15/16/17 test matrix
- [ ] Performance benchmarks (1000+ migration files)
- [ ] Security audit

## Future Ideas

- [ ] Visual migration timeline (web UI)
- [ ] Slack / Discord notifications on migration events
- [ ] Roll-forward only mode (disable down migrations entirely)
- [ ] Multi-database support (run migrations across shards)
- [ ] pg-safe-migrate LSP (VS Code extension with inline diagnostics)
