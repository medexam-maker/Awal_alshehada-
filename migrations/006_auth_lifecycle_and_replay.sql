-- Migration 006: Auth Lifecycle, Token Versioning, Replay Buffer, and Operation Recovery
-- Aligned with PD-003 and C7 requirements.

-- 1. Add token_version to users table for immediate server-side session invalidation (D4)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

-- 2. Add nullable session tracking columns to refresh_tokens for bounded lifecycle (D1)
ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS session_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session
  ON refresh_tokens(session_id);

-- 3. Create encrypted refresh replay buffer for lost-response recovery (D3)
CREATE TABLE IF NOT EXISTS refresh_replay_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_token_id UUID NOT NULL REFERENCES refresh_tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_raw_replacement TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_tag TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rrb_old_token UNIQUE (old_token_id)
);

CREATE INDEX IF NOT EXISTS idx_rrb_old_token
  ON refresh_replay_buffer(old_token_id);
CREATE INDEX IF NOT EXISTS idx_rrb_expires
  ON refresh_replay_buffer(expires_at);

-- 4. Create durable operation log for uncertain COMMIT recovery in password changes (D5)
CREATE TABLE IF NOT EXISTS auth_operation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  recovery_secret_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_auth_op_user_operation UNIQUE (user_id, operation_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_op_lookup
  ON auth_operation_log(user_id, operation_id);
CREATE INDEX IF NOT EXISTS idx_auth_op_expires
  ON auth_operation_log(expires_at);
