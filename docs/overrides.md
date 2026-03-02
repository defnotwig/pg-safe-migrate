# Overrides

When you intentionally want to bypass a safety rule, pg-safe-migrate requires an **explicit override** with a reason. This ensures risky operations are auditable.

## Override Types

### File-Level Override

Applies to all statements in the file:

```sql
-- pgsm:allow PGSM001 reason="Removing deprecated table per JIRA-1234" ticket="JIRA-1234"
DROP TABLE deprecated_data;
```

### Statement-Level Override

Applies only to the next statement:

```sql
-- pgsm:allow-next PGSM007 reason="Small table, concurrent not needed" ticket="JIRA-5678"
CREATE INDEX idx_status ON small_lookup(status);

-- This will still be flagged:
CREATE INDEX idx_name ON large_table(name);
```

### Irreversible Migration

Mark a migration as intentionally irreversible (no down file needed):

```sql
-- pgsm:irreversible reason="Data migration cannot be reversed" ticket="JIRA-9999"
INSERT INTO new_table SELECT * FROM old_table;
```

## Override Format

```
-- pgsm:allow <RULE_ID> reason="<description>" [ticket="<reference>"]
-- pgsm:allow-next <RULE_ID> reason="<description>" [ticket="<reference>"]
-- pgsm:irreversible reason="<description>" [ticket="<reference>"]
```

### Requirements

- **`reason` is mandatory** — overrides without a reason are rejected
- **`ticket` is recommended** — link to your issue tracker for auditability

## Config-Level Overrides

Globally allow specific rules in `pgsm.config.json`:

```json
{
  "allowRules": ["PGSM006"]
}
```

Or via CLI:

```bash
pg-safe-migrate lint --allow-unsafe PGSM006
```

**Use config-level overrides sparingly** — they bypass safety checks for all migrations.

## Override Hierarchy

1. **Statement-level** (`allow-next`) — most specific, highest priority
2. **File-level** (`allow`) — applies to whole file
3. **Config-level** (`allowRules`) — applies globally

## Best Practices

- Use **statement-level** overrides whenever possible for maximum precision
- Always include a **ticket reference** for team visibility
- Review overrides in code review — they should be as scrutinized as the SQL itself
- Prefer config-level overrides only for rules your team has intentionally disabled
