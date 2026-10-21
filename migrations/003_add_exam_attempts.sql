-- exam_attempts
CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  bank_type TEXT NOT NULL CHECK (bank_type IN ('comprehensive', 'training')),
  training_set_id UUID REFERENCES training_exam_sets(id) ON DELETE SET NULL,
  exam_mode TEXT NOT NULL CHECK (exam_mode IN ('training', 'simulator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'expired', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_marks NUMERIC(10,2),
  obtained_marks NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_training_set_requires_training_bank CHECK (
    (bank_type = 'training' AND training_set_id IS NOT NULL) OR
    (bank_type = 'comprehensive' AND training_set_id IS NULL)
  )
);

CREATE INDEX idx_attempts_user ON exam_attempts(user_id);
CREATE INDEX idx_attempts_subject ON exam_attempts(subject_id);
CREATE INDEX idx_attempts_status ON exam_attempts(status);
CREATE INDEX idx_attempts_started ON exam_attempts(started_at);
CREATE INDEX idx_attempts_training_set ON exam_attempts(training_set_id);

-- exam_attempt_questions
CREATE TABLE exam_attempt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE RESTRICT,
  position INT NOT NULL,
  marks NUMERIC(8,2) NOT NULL,
  question_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id),
  UNIQUE(attempt_id, position)
);

CREATE INDEX idx_eaq_attempt ON exam_attempt_questions(attempt_id);
CREATE INDEX idx_eaq_question ON exam_attempt_questions(question_id);

-- exam_answers
CREATE TABLE exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  attempt_question_id UUID NOT NULL REFERENCES exam_attempt_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL,
  grading_status TEXT NOT NULL DEFAULT 'pending' CHECK (grading_status IN ('pending', 'auto_graded', 'manual_pending', 'manually_graded', 'mixed')),
  obtained_marks NUMERIC(8,2),
  grader_type TEXT CHECK (grader_type IN ('system', 'teacher', 'admin', 'ai')),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, attempt_question_id)
);

CREATE INDEX idx_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX idx_answers_question ON exam_answers(attempt_question_id);
CREATE INDEX idx_answers_status ON exam_answers(grading_status);

-- exam_question_history
CREATE TABLE exam_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE RESTRICT,
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user ON exam_question_history(user_id);
CREATE INDEX idx_history_user_question ON exam_question_history(user_id, question_id);
CREATE INDEX idx_history_user_seen ON exam_question_history(user_id, seen_at);

-- Partial unique index enforcing exactly one active attempt per user and subject (C3/C5)
CREATE UNIQUE INDEX idx_attempts_active_unique ON exam_attempts(user_id, subject_id) WHERE status = 'active';
