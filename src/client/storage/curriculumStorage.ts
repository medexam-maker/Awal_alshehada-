import { SubjectExamBlueprint, AuthoredQuestion, StudentCurriculumProgress, QuestionPattern } from '../types/curriculum';
import { generateDefaultBlueprints, generateInitialQuestions } from './defaultCurriculumData';
import { TWELVE_CONTRACT_SUBJECTS } from '../data/contractSubjects';

const STORAGE_KEYS = {
  BLUEPRINTS: 'fc_curriculum_blueprints_v1',
  QUESTIONS: 'fc_curriculum_questions_v1',
  STUDENT_PROGRESS: 'fc_student_progress_v1',
};

class CurriculumStorageService {
  private blueprints: Record<string, SubjectExamBlueprint> = {};
  private questions: AuthoredQuestion[] = [];
  private progress: Record<string, Record<string, StudentCurriculumProgress>> = {}; // userId -> { subjectSlug: progress }

  constructor() {
    this.init();
  }

  private init() {
    try {
      // 1. Load blueprints
      const storedBp = localStorage.getItem(STORAGE_KEYS.BLUEPRINTS);
      if (storedBp) {
        this.blueprints = JSON.parse(storedBp);
      } else {
        this.blueprints = generateDefaultBlueprints();
        this.persistBlueprints();
      }

      // 2. Load questions
      const storedQ = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (storedQ) {
        this.questions = JSON.parse(storedQ);
      } else {
        this.questions = generateInitialQuestions();
        this.persistQuestions();
      }

      // 3. Load progress
      const storedProgress = localStorage.getItem(STORAGE_KEYS.STUDENT_PROGRESS);
      if (storedProgress) {
        this.progress = JSON.parse(storedProgress);
      }
    } catch (err) {
      console.warn('Failed to initialize curriculum storage, using memory fallback:', err);
      this.blueprints = generateDefaultBlueprints();
      this.questions = generateInitialQuestions();
    }
  }

  private persistBlueprints() {
    try {
      localStorage.setItem(STORAGE_KEYS.BLUEPRINTS, JSON.stringify(this.blueprints));
    } catch (e) {
      console.warn('Could not persist blueprints to localStorage', e);
    }
  }

  private persistQuestions() {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(this.questions));
    } catch (e) {
      console.warn('Could not persist questions to localStorage', e);
    }
  }

  private persistProgress() {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT_PROGRESS, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Could not persist progress to localStorage', e);
    }
  }

  // ==========================================
  // 1. BLUEPRINT MANAGEMENT (Admin Paper Setup)
  // ==========================================

  public getSubjectBlueprint(subjectSlug: string): SubjectExamBlueprint {
    if (!this.blueprints[subjectSlug]) {
      const defaults = generateDefaultBlueprints();
      if (defaults[subjectSlug]) {
        this.blueprints[subjectSlug] = defaults[subjectSlug];
        this.persistBlueprints();
      } else {
        const sub = TWELVE_CONTRACT_SUBJECTS.find((s) => s.slug === subjectSlug);
        this.blueprints[subjectSlug] = {
          subjectSlug,
          name_ar: sub?.name_ar || subjectSlug,
          name_en: sub?.name_en || subjectSlug,
          totalQuestions: 0,
          totalMarks: 100,
          defaultDurationMinutes: sub?.defaultDurationMinutes || 150,
          patterns: [],
          isCustomized: false,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    return this.blueprints[subjectSlug];
  }

  public saveSubjectBlueprint(blueprint: SubjectExamBlueprint): void {
    blueprint.totalQuestions = blueprint.patterns.length;
    blueprint.totalMarks = blueprint.patterns.reduce((sum, p) => sum + (Number(p.allocatedMarks) || 0), 0);
    blueprint.isCustomized = true;
    blueprint.updatedAt = new Date().toISOString();
    this.blueprints[blueprint.subjectSlug] = blueprint;
    this.persistBlueprints();
  }

  public resetSubjectBlueprint(subjectSlug: string): SubjectExamBlueprint {
    const defaults = generateDefaultBlueprints();
    if (defaults[subjectSlug]) {
      this.blueprints[subjectSlug] = defaults[subjectSlug];
      this.persistBlueprints();
      return this.blueprints[subjectSlug];
    }
    return this.getSubjectBlueprint(subjectSlug);
  }

  public getAllBlueprints(): Record<string, SubjectExamBlueprint> {
    return { ...this.blueprints };
  }

  // ==========================================
  // 2. QUESTION BANK & AUTHORING
  // ==========================================

  public getAllQuestions(): AuthoredQuestion[] {
    return [...this.questions];
  }

  public getQuestionsBySubject(
    subjectSlug: string,
    filter?: {
      examScope?: 'curriculum_review' | 'yearly_exam' | 'both';
      examYear?: number;
      patternId?: string;
    }
  ): AuthoredQuestion[] {
    return this.questions.filter((q) => {
      if (q.subjectSlug !== subjectSlug) return false;
      if (filter?.examScope && q.examScope !== 'both' && q.examScope !== filter.examScope) return false;
      if (filter?.examYear !== undefined && q.examYear !== filter.examYear) return false;
      if (filter?.patternId && q.patternId !== filter.patternId) return false;
      return true;
    });
  }

  public saveQuestion(question: AuthoredQuestion): void {
    const existingIndex = this.questions.findIndex((q) => q.id === question.id);
    if (existingIndex >= 0) {
      this.questions[existingIndex] = question;
    } else {
      this.questions.push(question);
    }
    this.persistQuestions();
  }

  public deleteQuestion(questionId: string): void {
    this.questions = this.questions.filter((q) => q.id !== questionId);
    this.persistQuestions();
  }

  /**
   * Reconciles a local draft question ID (e.g. q_auth_...) with the server-generated UUID.
   */
  public reconcileQuestionId(oldId: string, newId: string): boolean {
    const index = this.questions.findIndex((q) => q.id === oldId);
    if (index >= 0) {
      this.questions[index] = { ...this.questions[index], id: newId };
      this.persistQuestions();
      return true;
    }
    return false;
  }

  /**
   * Returns list of years (2000 - 2026) that currently have questions in this subject
   */
  public getAvailableYears(subjectSlug: string): number[] {
    const yearsSet = new Set<number>();
    this.questions
      .filter((q) => q.subjectSlug === subjectSlug && q.examYear)
      .forEach((q) => yearsSet.add(q.examYear!));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }

  /**
   * Returns full range of years supported in Sudanese Secondary Certificate (2000 - 2026)
   */
  public getAllSupportedYears(): number[] {
    const years: number[] = [];
    for (let y = 2026; y >= 2000; y--) {
      years.push(y);
    }
    return years;
  }

  // ==========================================
  // 3. STUDENT PROGRESS & RECORD KEEPING
  // ==========================================

  public getStudentProgress(userId: string, subjectSlug: string): StudentCurriculumProgress {
    const userProg = this.progress[userId] || {};
    const existing = userProg[subjectSlug];

    const totalQuestionsInBank = this.questions.filter(
      (q) => q.subjectSlug === subjectSlug && (q.examScope === 'curriculum_review' || q.examScope === 'both')
    ).length;

    if (existing) {
      // Re-compute percentage with latest total count
      const answeredCount = existing.answeredQuestionIds.length;
      const percentage = totalQuestionsInBank > 0 ? Math.min(100, Math.round((answeredCount / totalQuestionsInBank) * 100)) : 0;
      existing.totalQuestionsInBank = totalQuestionsInBank;
      existing.completionPercentage = percentage;
      return existing;
    }

    const newProg: StudentCurriculumProgress = {
      userId,
      subjectSlug,
      totalQuestionsInBank,
      answeredQuestionIds: [],
      correctQuestionIds: [],
      completionPercentage: 0,
      lastActivityAt: new Date().toISOString(),
      yearlyExamsCompleted: {},
    };

    if (!this.progress[userId]) {
      this.progress[userId] = {};
    }
    this.progress[userId][subjectSlug] = newProg;
    return newProg;
  }

  public recordStudentAttempt(
    userId: string,
    subjectSlug: string,
    results: { questionId: string; isCorrect: boolean }[],
    examYear?: number,
    score?: number,
    maxScore?: number
  ): StudentCurriculumProgress {
    const current = this.getStudentProgress(userId, subjectSlug);

    const answeredSet = new Set(current.answeredQuestionIds);
    const correctSet = new Set(current.correctQuestionIds);

    results.forEach((r) => {
      answeredSet.add(r.questionId);
      if (r.isCorrect) {
        correctSet.add(r.questionId);
      }
    });

    current.answeredQuestionIds = Array.from(answeredSet);
    current.correctQuestionIds = Array.from(correctSet);
    current.lastActivityAt = new Date().toISOString();

    const totalInBank = current.totalQuestionsInBank || 1;
    current.completionPercentage = Math.min(100, Math.round((current.answeredQuestionIds.length / totalInBank) * 100));

    if (examYear !== undefined && score !== undefined && maxScore !== undefined) {
      current.yearlyExamsCompleted[examYear] = {
        completedAt: new Date().toISOString(),
        score,
        maxScore,
        percentage: Math.round((score / (maxScore || 1)) * 100),
      };
    }

    if (!this.progress[userId]) {
      this.progress[userId] = {};
    }
    this.progress[userId][subjectSlug] = current;
    this.persistProgress();

    return current;
  }

  public getAllSubjectsProgress(userId: string): Record<string, StudentCurriculumProgress> {
    const result: Record<string, StudentCurriculumProgress> = {};
    TWELVE_CONTRACT_SUBJECTS.forEach((sub) => {
      result[sub.slug] = this.getStudentProgress(userId, sub.slug);
    });
    return result;
  }
}

export const curriculumStorage = new CurriculumStorageService();
