-- Migration 009: Add Pattern 7 Schema (Multi-Step Calculation, Canonical Hashes, Step Answers with Composite Foreign Key)

-- 1. Ensure composite unique constraint on exam_attempt_questions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_attempt_question_pair'
    ) THEN
        ALTER TABLE exam_attempt_questions 
        ADD CONSTRAINT uq_attempt_question_pair UNIQUE (id, attempt_id);
    END IF;
END $$;

-- 2. Add canonical assessment hash and human approval hash columns to question_bank
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_bank' AND column_name = 'canonical_content_hash'
    ) THEN
        ALTER TABLE question_bank ADD COLUMN canonical_content_hash VARCHAR(64) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_bank' AND column_name = 'approved_content_hash'
    ) THEN
        ALTER TABLE question_bank ADD COLUMN approved_content_hash VARCHAR(64) DEFAULT NULL;
    END IF;
END $$;

-- 3. Create exam_step_answers table with composite foreign key and step uniqueness
CREATE TABLE IF NOT EXISTS exam_step_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL,
    attempt_question_id UUID NOT NULL,
    step_id TEXT NOT NULL,
    selected_option_id TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    awarded_marks NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_step_attempt_question_pair 
        FOREIGN KEY (attempt_question_id, attempt_id) 
        REFERENCES exam_attempt_questions(id, attempt_id) 
        ON DELETE CASCADE,
    CONSTRAINT uq_step_attempt_answer UNIQUE (attempt_question_id, step_id)
);

-- 4. Indexes for efficient lookup and join
CREATE INDEX IF NOT EXISTS idx_step_answers_attempt_id ON exam_step_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_step_answers_attempt_question ON exam_step_answers(attempt_question_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_hashes ON question_bank(canonical_content_hash, approved_content_hash);
