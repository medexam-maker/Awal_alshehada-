-- Migration: Add prompt_hash generated column and index for deduplication in question_bank
BEGIN;

ALTER TABLE question_bank 
  ADD COLUMN IF NOT EXISTS prompt_hash TEXT 
  GENERATED ALWAYS AS (
    md5(lower(trim(content->>'prompt')))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_question_prompt_hash 
  ON question_bank(subject_id, prompt_hash);

COMMIT;
