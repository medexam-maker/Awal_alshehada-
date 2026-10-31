-- Migration 010: Pattern 8 Short Structured Essay Support
-- Ensures question_bank supports Pattern 8 metadata, grading_mode, and teacher grade overrides

ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS grading_mode TEXT DEFAULT 'auto';
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS partial_threshold NUMERIC(3,2) DEFAULT 0.50;

CREATE TABLE IF NOT EXISTS essay_manual_grades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  grader_user_id TEXT NOT NULL,
  assigned_score NUMERIC(8,2) NOT NULL,
  max_score NUMERIC(8,2) NOT NULL,
  feedback_note TEXT,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_essay_manual_grades_attempt ON essay_manual_grades(attempt_id);
