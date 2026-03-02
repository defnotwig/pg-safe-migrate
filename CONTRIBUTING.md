# Contributing to pg-safe-migrate

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14 (for integration tests)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/defnotwig/pg-safe-migrate.git
cd pg-safe-migrate

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run unit tests
pnpm test

# Run integration tests (requires running PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres \
  pnpm --filter pg-safe-migrate-core test:integration
```

## Project Structure

```
pg-safe-migrate/
├── packages/
│   ├── core/          # Migration engine, linter, planner
│   │   └── src/
│   │       ├── lint/  # SQL safety rules + splitter
│   │       └── __tests__/
│   └── cli/           # CLI commands + config resolution
│       └── src/
│           ├── commands/
│           └── __tests__/
├── action/            # GitHub Action (composite)
├── docs/              # Documentation
├── examples/          # Example projects
└── .github/           # CI/CD workflows
```

## Development Workflow

### Making Changes

1. **Fork** the repository and create a feature branch
2. Make your changes
3. Add or update tests as needed
4. Run the full test suite: `pnpm test`
5. Run the build: `pnpm build`
6. Submit a pull request

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for version management.

After making changes, create a changeset:

```bash
pnpm changeset
```

- Select the packages affected
- Choose the semver bump type (patch/minor/major)
- Write a concise summary of the change

### Code Style

- TypeScript strict mode — no `any`, no implicit returns
- Use `node:` prefix for Node.js built-in imports
- Prefer `const` over `let`
- Functions should be pure where possible
- Test files mirror source structure

### Testing Guidelines

- **Unit tests**: Mock external dependencies (DB, file system)
- **Integration tests**: Test against real PostgreSQL
- Aim for tests that document behavior, not just cover lines
- Name tests descriptively: `it('detects drift when file changes after applied')`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add PGSM011 rule for large table locks
fix(cli): resolve config file path on Windows
docs: add zero-downtime deployment guide
test(core): add drift detection edge cases
```

## Adding a New Lint Rule

1. Add the rule to `packages/core/src/lint/rules.ts`:
   - Choose the next available PGSM ID
   - Define the regex pattern
   - Set severity (`error` or `warning`)
   - Write a clear message and safe alternative

2. Add the rule ID to `LintRuleId` type in `packages/core/src/types.ts`

3. Add tests in `packages/core/src/__tests__/unit/lint-rules.test.ts`

4. Document the rule in `docs/safety-rules.md`

5. Create a changeset

## Reporting Issues

- Use the **Bug Report** template for bugs
- Use the **Feature Request** template for new features
- Include reproduction steps and your environment details

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
