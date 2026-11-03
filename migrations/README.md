# Database Migrations

This directory contains the PostgreSQL schema migrations for the Sudan Secondary Certificate Exam Platform.
They act as the single source of truth for the database schema, strictly matching `docs/contracts/DATABASE_CONTRACT.md` (v1.1.0).

## Rules
- **Migration-first**: Schema changes are ONLY made by creating new `.sql` files here. Do NOT rely on ORMs.
- **Ordered Execution**: Files must be executed in numerical order (001 -> ... -> 011).
- **No Destructive Operations**: `DROP` or `TRUNCATE` operations are strictly forbidden on production structures.
- **Pure SQL**: We use raw PostgreSQL commands, leveraging features like JSONB and Constraints natively.

## Migration History
- `001_initial_schema.sql`: Core users, subjects, questions, exams.
- `002_add_training_sets.sql`: Training mode sets.
- `003_add_exam_attempts.sql`: Exam attempts and results.
- `004_add_media_assets.sql`: Initial media assets and audit logs.
- `005_auth_refresh_tokens.sql`: Refresh token rotation.
- `006_auth_lifecycle_and_replay.sql`: Auth security and replay protection.
- `007_add_weekly_exam_category.sql`: Weekly simulation exam category.
- `008_add_prompt_hash.sql`: Unique prompt hashing.
- `009_add_pattern7_schema.sql`: Multi-step calculation step tracking.
- `010_add_pattern8_short_essay.sql`: Keyword matching configurations.
- `011_media_library.sql`: C2 Visual Mastery Lab diagram media library (BYTEA storage, content-addressed sha256).

