# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in **pg-safe-migrate**, please report it responsibly.

### How to Report

1. **Do not** open a public issue.
2. Email **security@pg-safe-migrate.com** (replace with your actual email) with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Any suggested fix (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix release**: Within 30 days for critical issues

### Scope

The following are in scope:

- SQL injection via migration file parsing
- Advisory lock bypass or escalation
- Checksum collision or tampering
- Credential exposure in logs or error messages
- Dependency vulnerabilities (critical/high severity)

### Out of Scope

- Issues in user-written migration SQL files
- PostgreSQL server vulnerabilities
- Social engineering attacks

### Disclosure Policy

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We will:

1. Confirm the vulnerability
2. Develop and test a fix
3. Release the fix with a security advisory
4. Credit the reporter (unless they prefer anonymity)

## Security Best Practices

When using pg-safe-migrate:

- **Never** commit `DATABASE_URL` or credentials to version control
- Use environment variables or secret managers for database URLs
- Run `pg-safe-migrate check` in CI to catch unsafe migrations before deploy
- Enable `requireDown: true` for reversible deployment pipelines
- Review all `-- pgsm:allow` overrides in code review
- Use the minimum required database privileges for running migrations
- Regularly update pg-safe-migrate to receive the latest security patches