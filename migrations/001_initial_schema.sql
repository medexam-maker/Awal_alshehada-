-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'content_partner', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subjects_active ON subjects(is_active);

-- question_bank
CREATE TABLE question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  content JSONB NOT NULL,
  correct_answer JSONB NOT NULL,
  primary_interaction_mode TEXT NOT NULL,
  secondary_interaction_mode TEXT,
  marks NUMERIC(8,2) NOT NULL DEFAULT 1,
  bank_type TEXT NOT NULL DEFAULT 'comprehensive' CHECK (bank_type IN ('comprehensive', 'training')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  difficulty INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  explanation TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_subject ON question_bank(subject_id);
CREATE INDEX idx_question_type ON question_bank(question_type);
CREATE INDEX idx_question_status ON question_bank(status);
CREATE INDEX idx_question_bank_type ON question_bank(bank_type);
CREATE INDEX idx_question_subject_status ON question_bank(subject_id, status);
CREATE INDEX idx_question_content ON question_bank USING GIN(content);
CREATE INDEX idx_question_correct_answer ON question_bank USING GIN(correct_answer);
