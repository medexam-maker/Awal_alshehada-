-- training_exam_sets
CREATE TABLE training_exam_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  exam_category TEXT NOT NULL DEFAULT 'general' CHECK (exam_category IN ('general', 'year', 'weekly')),
  exam_year INT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_exam_year CHECK (
    ((exam_category IN ('general', 'weekly')) AND exam_year IS NULL) OR
    (exam_category = 'year' AND exam_year IS NOT NULL)
  )
);

CREATE INDEX idx_training_sets_subject ON training_exam_sets(subject_id);

-- training_set_questions
CREATE TABLE training_set_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_set_id UUID NOT NULL REFERENCES training_exam_sets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE RESTRICT,
  position INT NOT NULL DEFAULT 0,
  marks_override NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(training_set_id, question_id),
  UNIQUE(training_set_id, position)
);

CREATE INDEX idx_tsq_set ON training_set_questions(training_set_id);
CREATE INDEX idx_tsq_question ON training_set_questions(question_id);
CREATE INDEX idx_tsq_position ON training_set_questions(position);
