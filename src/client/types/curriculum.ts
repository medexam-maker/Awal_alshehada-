import { QuestionType } from '../../shared/constants';

/**
 * Represents a defined position or branch in an exam paper blueprint.
 * Example: Question 1 (a) - True/False, 5 Marks.
 */
export interface QuestionPattern {
  id: string;
  subjectSlug: string;
  questionNumber: number; // 1, 2, 3, etc.
  partLabel: string; // '', 'أ', 'ب', 'ج', 'د', etc.
  questionType: QuestionType;
  title: string;
  allocatedMarks: number;
  instructions: string;
}

/**
 * Fixed Exam Blueprint for a Subject
 * Defined by Admin and applied to all exams for that subject.
 */
export interface SubjectExamBlueprint {
  subjectSlug: string;
  name_ar: string;
  name_en: string;
  totalQuestions: number;
  totalMarks: number;
  defaultDurationMinutes: number;
  patterns: QuestionPattern[];
  isCustomized: boolean;
  updatedAt: string;
}

/**
 * Question authored in the Admin Panel
 */
export interface AuthoredQuestion {
  id: string;
  subjectSlug: string;
  patternId?: string;
  questionNumber: number;
  partLabel: string;
  questionType: QuestionType;
  prompt: string;
  content: Record<string, any>;
  correctAnswer: any;
  allocatedMarks: number;
  explanationAr?: string;
  examScope: 'curriculum_review' | 'yearly_exam' | 'both';
  examYear?: number; // 2000 - 2026
  status: 'approved' | 'draft';
  createdAt: string;
}

/**
 * Student's permanent progress in a subject
 */
export interface StudentCurriculumProgress {
  userId: string;
  subjectSlug: string;
  totalQuestionsInBank: number;
  answeredQuestionIds: string[];
  correctQuestionIds: string[];
  completionPercentage: number;
  lastActivityAt: string;
  yearlyExamsCompleted: Record<number, {
    completedAt: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
}

export type ExamSubMode = 'yearly' | 'curriculum_review' | 'weekly';
