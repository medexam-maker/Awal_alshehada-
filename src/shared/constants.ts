export const UserRole = {
  STUDENT: 'student',
  CONTENT_PARTNER: 'content_partner',
  ADMIN: 'admin',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DISABLED: 'disabled',
} as const;
export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const BankType = {
  COMPREHENSIVE: 'comprehensive',
  TRAINING: 'training',
} as const;
export type BankType = typeof BankType[keyof typeof BankType];

export const ExamMode = {
  TRAINING: 'training',
  SIMULATOR: 'simulator',
} as const;
export type ExamMode = typeof ExamMode[keyof typeof ExamMode];

export const QuestionStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  ARCHIVED: 'archived',
} as const;
export type QuestionStatus = typeof QuestionStatus[keyof typeof QuestionStatus];

export const GradingStrategy = {
  AUTO: 'auto',
  MANUAL: 'manual',
  MIXED: 'mixed',
  AI_ASSISTED: 'ai-assisted',
} as const;
export type GradingStrategy = typeof GradingStrategy[keyof typeof GradingStrategy];

export const GradingStatus = {
  PENDING: 'pending',
  AUTO_GRADED: 'auto_graded',
  MANUAL_PENDING: 'manual_pending',
  MANUALLY_GRADED: 'manually_graded',
  MIXED: 'mixed',
} as const;
export type GradingStatus = typeof GradingStatus[keyof typeof GradingStatus];

export const GraderType = {
  SYSTEM: 'system',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  AI: 'ai', // Reserved for future
} as const;
export type GraderType = typeof GraderType[keyof typeof GraderType];

export const QuestionType = {
  TRUE_FALSE: 'true_false',
  FILL_BLANK: 'fill_blank',
  MULTIPLE_CHOICE: 'multiple_choice',
  MATCHING: 'matching',
  SHORT_ESSAY: 'short_essay',
  LONG_ESSAY: 'long_essay',
  EXPLAIN: 'explain',
  COMPARISON_TABLE: 'comparison_table',
  ODD_ONE_OUT: 'odd_one_out',
  DIAGRAM_LABELING: 'diagram_labeling',
  CONTOUR_MAP: 'contour_map',
  CALCULATION: 'calculation',
  ORDERING: 'ordering',
  ARABIC_GRAMMAR: 'arabic_grammar',
  READING_COMPREHENSION: 'reading_comprehension',
} as const;
export type QuestionType = typeof QuestionType[keyof typeof QuestionType];
