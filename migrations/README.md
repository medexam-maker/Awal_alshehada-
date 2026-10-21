# Database Migrations

This directory contains the PostgreSQL schema migrations for the Sudan Secondary Certificate Exam Platform.
They act as the single source of truth for the database schema, strictly matching `docs/contracts/DATABASE_CONTRACT.md` (v1.1.0).

## Rules
- **Migration-first**: Schema changes are ONLY made by creating new `.sql` files here. Do NOT rely on ORMs.
- **Ordered Execution**: Files must be executed in numerical order (001 -> 002 -> 003 -> 004).
- **No Destructive Operations**: `DROP` or `TRUNCATE` operations are strictly forbidden on production structures.
- **Pure SQL**: We use raw PostgreSQL commands, leveraging features like JSONB and Constraints natively.
