import { QuestionType, GradingStatus } from './constants';

export interface AutoGradingResult {
  isCorrect: boolean;
  obtainedMarks: number;
  feedback?: string;
}

export interface ManualGradingResult {
  gradingStatus: typeof GradingStatus.MANUALLY_GRADED;
  obtainedMarks: number;
}

export interface QuestionResult {
  questionId: string;
  isCorrect?: boolean;
  obtainedMarks: number;
}

export interface ExamResult {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  gradingStatus: 'auto_complete' | 'pending_review' | 'graded';
  details: QuestionResult[];
}

/**
 * Signature for the auto-grader engine.
 * Full implementation is deferred to Exam Engine Phase.
 */
export type AutoGradeFunction = (
  questionType: QuestionType,
  correctAnswer: unknown,
  studentAnswer: unknown,
  totalMarks: number
) => AutoGradingResult;

/**
 * Signature for the manual grader.
 * Full implementation is deferred to Exam Engine Phase.
 */
export type ManualGradeFunction = (
  answerId: string,
  obtainedMarks: number,
  feedback: string | undefined,
  graderId: string
) => ManualGradingResult;
