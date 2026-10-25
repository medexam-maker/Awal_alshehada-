import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/apiClient';
import { examStorage, StoredAttempt } from '../storage/examStorage';
import { curriculumStorage } from '../storage/curriculumStorage';
import { ExamSubMode } from '../types/curriculum';
import { QuestionType } from '../../shared/constants';

export interface ExamResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  gradedAt: string;
  timeTakenSeconds?: number;
  isAuthoritative?: boolean;
  gradingAuthority?: 'server' | 'local_unconfirmed';
  answers: any[];
  details?: any[];
  gradingStatus?: string;
}

export interface PendingSubmissionState {
  attemptId: string;
  failedAt: string;
  errorMessage: string;
}

interface ExamContextType {
  activeAttempt: StoredAttempt | null;
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  flaggedIndices: Set<number>;
  toggleFlagIndex: (idx: number) => void;
  answers: Record<string, any>;
  setQuestionAnswer: (questionId: string, answer: any) => void;
  startNewExam: (
    subjectId: string,
    bankType: string,
    examMode: string,
    trainingSubMode?: ExamSubMode,
    examYear?: number,
    subjectSlug?: string,
    userId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  submitExam: (userId?: string) => Promise<{ success: boolean; result?: ExamResult; error?: string; isPending?: boolean }>;
  retryPendingSubmission: (userId?: string) => Promise<{ success: boolean; result?: ExamResult; error?: string }>;
  abandonExam: () => Promise<void>;
  lastResult: ExamResult | null;
  pendingSubmission: PendingSubmissionState | null;
  isLoading: boolean;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAttempt, setActiveAttempt] = useState<StoredAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [flaggedIndices, setFlaggedIndices] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmissionState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore active attempt from IndexedDB on initial mount
  useEffect(() => {
    async function restoreActive() {
      try {
        const activeId = await examStorage.getActiveAttemptId();
        if (activeId) {
          const stored = await examStorage.getLocalAttempt(activeId);
          if (stored) {
            setActiveAttempt(stored);
            setAnswers(stored.answers || {});
          }
        }
      } catch (err) {
        console.warn('Storage restore error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    restoreActive();
  }, []);

  const toggleFlagIndex = useCallback((idx: number) => {
    setFlaggedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const setQuestionAnswer = useCallback(
    (questionId: string, answer: any) => {
      setAnswers((prev) => {
        const updated = { ...prev, [questionId]: answer };
        if (activeAttempt) {
          examStorage.saveAnswer(activeAttempt.attemptId, questionId, answer).catch(console.error);
        }
        return updated;
      });
    },
    [activeAttempt]
  );

  const startNewExam = useCallback(
    async (
      subjectId: string,
      bankType: string,
      examMode: string,
      trainingSubMode?: ExamSubMode,
      examYear?: number,
      subjectSlug?: string,
      userId?: string
    ) => {
      setIsLoading(true);
      setPendingSubmission(null);
      setLastResult(null);

      const targetSlug = subjectSlug || 'islamic-studies';

      try {
        // Attempt server start first if server is available
        const serverRes = await apiClient.request<any>('/api/exam/start', {
          method: 'POST',
          body: JSON.stringify({
            subjectId,
            bankType: bankType === 'training' ? 'training' : 'comprehensive',
            examMode,
            trainingSubMode,
            examYear,
          }),
        }).catch(() => null);

        if (serverRes?.success && serverRes.data && serverRes.data.questions && serverRes.data.questions.length > 0) {
          const snapshot = serverRes.data;
          const newStoredAttempt: StoredAttempt = {
            attemptId: snapshot.attemptId,
            subjectId: snapshot.subjectId,
            subjectSlug: targetSlug,
            examMode: snapshot.examMode,
            bankType: snapshot.bankType,
            trainingSubMode,
            examYear,
            questions: snapshot.questions || [],
            expiresAt: snapshot.expiresAt || null,
            startedAt: new Date().toISOString(),
            totalQuestions: snapshot.totalQuestions || snapshot.questions.length,
            totalPoints: snapshot.totalPoints || 100,
            answers: {},
            lastSavedAt: new Date().toISOString(),
          };
          await examStorage.saveLocalAttempt(newStoredAttempt);
          setActiveAttempt(newStoredAttempt);
          setAnswers({});
          setCurrentIndex(0);
          setFlaggedIndices(new Set());
          return { success: true };
        }

        // Autonomous / Offline Curriculum Bank Generation
        // Fetch questions from curriculum storage according to the selected mode
        let questionsToUse: any[] = [];
        const blueprint = curriculumStorage.getSubjectBlueprint(targetSlug);

        if (examMode === 'simulator') {
          // Full Exam Simulation: matches the blueprint layout
          const bankQuestions = curriculumStorage.getQuestionsBySubject(targetSlug);
          if (bankQuestions.length === 0) {
            throw new Error('بنك الأسئلة لهذا الجزء قيد الإنشاء والمراجعة وسيتوفر قريباً.');
          }
          questionsToUse = bankQuestions.map((q, idx) => ({
            id: q.id,
            position: idx + 1,
            questionNumber: q.questionNumber || (idx + 1),
            partLabel: q.partLabel || '',
            questionType: q.questionType,
            prompt: q.prompt,
            content: q.content,
            marks: q.allocatedMarks || 5,
            correctAnswer: q.correctAnswer,
            explanationAr: q.explanationAr,
          }));
        } else if (trainingSubMode === 'yearly' && examYear) {
          // Specific Year Exam (2000 - 2026)
          const yearlyQuestions = curriculumStorage.getQuestionsBySubject(targetSlug, { examYear });
          if (yearlyQuestions.length === 0) {
            throw new Error('بنك الأسئلة لهذا الجزء قيد الإنشاء والمراجعة وسيتوفر قريباً.');
          }
          questionsToUse = yearlyQuestions.map((q, idx) => ({
            id: q.id,
            position: idx + 1,
            questionNumber: q.questionNumber || (idx + 1),
            partLabel: q.partLabel || '',
            questionType: q.questionType,
            prompt: q.prompt,
            content: q.content,
            marks: q.allocatedMarks || 5,
            correctAnswer: q.correctAnswer,
            explanationAr: q.explanationAr,
          }));
        } else {
          // Comprehensive Curriculum Review (مراجعة شاملة للمقرر مع حفظ التقدم)
          const curriculumQuestions = curriculumStorage.getQuestionsBySubject(targetSlug, { examScope: 'curriculum_review' });
          const allSubjectQuestions = curriculumQuestions.length > 0 ? curriculumQuestions : curriculumStorage.getQuestionsBySubject(targetSlug);

          if (allSubjectQuestions.length === 0) {
            throw new Error('بنك الأسئلة لهذا الجزء قيد الإنشاء والمراجعة وسيتوفر قريباً.');
          }
          questionsToUse = allSubjectQuestions.map((q, idx) => ({
            id: q.id,
            position: idx + 1,
            questionNumber: q.questionNumber || (idx + 1),
            partLabel: q.partLabel || '',
            questionType: q.questionType,
            prompt: q.prompt,
            content: q.content,
            marks: q.allocatedMarks || 5,
            correctAnswer: q.correctAnswer,
            explanationAr: q.explanationAr,
          }));
        }

        const totalPoints = questionsToUse.reduce((sum, q) => sum + (Number(q.marks) || 5), 0);
        const durationMinutes = blueprint.defaultDurationMinutes || 150;
        const expiresAt = examMode === 'simulator'
          ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
          : null;

        const localAttempt: StoredAttempt = {
          attemptId: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          subjectId: subjectId || targetSlug,
          subjectSlug: targetSlug,
          subjectNameAr: blueprint.name_ar,
          examMode: examMode as 'training' | 'simulator',
          bankType: bankType as 'comprehensive' | 'training',
          trainingSubMode,
          examYear,
          questions: questionsToUse,
          expiresAt,
          startedAt: new Date().toISOString(),
          totalQuestions: questionsToUse.length,
          totalPoints,
          answers: {},
          lastSavedAt: new Date().toISOString(),
        };

        await examStorage.saveLocalAttempt(localAttempt);
        setActiveAttempt(localAttempt);
        setAnswers({});
        setCurrentIndex(0);
        setFlaggedIndices(new Set());
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'تعذر إعداد جلسة الاختبار.',
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitExam = useCallback(
    async (userId?: string) => {
      if (!activeAttempt) {
        return { success: false, error: 'لا يوجد امتحان نشط للتسليم' };
      }

      setIsLoading(true);
      const timeTakenSeconds = Math.max(
        1,
        Math.round((Date.now() - new Date(activeAttempt.startedAt).getTime()) / 1000)
      );

      const finishPayload = {
        attemptId: activeAttempt.attemptId,
        answers,
        timeTakenSeconds,
      };

      const isServerAttempt = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeAttempt.attemptId);

      try {
        // Try server grading if server is online and attempt is an authoritative server attempt
        let serverRes = isServerAttempt
          ? await apiClient.request<ExamResult>(
              '/api/exam/finish',
              {
                method: 'POST',
                body: JSON.stringify(finishPayload),
              },
              true
            ).catch(() => null)
          : null;

        if (serverRes?.success && serverRes.data) {
          const sData = serverRes.data as any;
          const score = sData.score ?? sData.result?.obtainedMarks ?? 0;
          const maxScore = sData.maxScore ?? sData.result?.totalMarks ?? activeAttempt.totalPoints ?? 100;
          const percentage = sData.percentage ?? (sData.result?.percentage ? Math.round(sData.result.percentage) : Math.round((score / (maxScore || 1)) * 100));
          const detailsList = Array.isArray(sData.details) ? sData.details : (Array.isArray(sData.answers) ? sData.answers : []);

          const mappedAnswers = detailsList.map((d: any) => {
            const originalQ = activeAttempt.questions.find((q) => q.id === d.questionId);
            const studentAns = answers[d.questionId] ?? d.studentAnswer;
            const isPending = d.gradingStatus === 'pending_review' || sData.gradingStatus === 'pending_review';
            return {
              questionId: d.questionId,
              prompt: originalQ?.prompt || d.prompt || `السؤال (${d.questionId})`,
              studentAnswer: studentAns,
              correctAnswer: isPending ? undefined : (originalQ?.correctAnswer ?? d.correctAnswer),
              isCorrect: Boolean(d.isCorrect),
              obtainedMarks: d.obtainedMarks ?? (d.isCorrect ? (d.maxMarks || 5) : 0),
              maxMarks: d.maxMarks ?? originalQ?.marks ?? 5,
              awardedPoints: d.obtainedMarks ?? (d.isCorrect ? (d.maxMarks || 5) : 0),
              maxPoints: d.maxMarks ?? originalQ?.marks ?? 5,
              gradingStatus: d.gradingStatus ?? sData.gradingStatus ?? 'auto_complete',
              explanationAr: isPending ? undefined : (originalQ?.explanationAr ?? d.explanationAr),
            };
          });

          const authResult: ExamResult = {
            attemptId: activeAttempt.attemptId,
            score,
            maxScore,
            percentage,
            passed: percentage >= 50,
            gradedAt: new Date().toISOString(),
            timeTakenSeconds,
            isAuthoritative: true,
            gradingAuthority: 'server',
            answers: mappedAnswers,
            details: sData.details || mappedAnswers,
            gradingStatus: sData.gradingStatus,
          };
          setLastResult(authResult);
          setPendingSubmission(null);
          await examStorage.clearActiveAttempt(activeAttempt.attemptId);
          setActiveAttempt(null);

          // Update student curriculum progress
          if (userId && activeAttempt.subjectSlug) {
            const gradedItems = mappedAnswers.map((a: any) => ({
              questionId: a.questionId,
              isCorrect: Boolean(a.isCorrect),
            }));
            curriculumStorage.recordStudentAttempt(
              userId,
              activeAttempt.subjectSlug,
              gradedItems,
              activeAttempt.examYear,
              score,
              maxScore
            );
          }

          return { success: true, result: authResult };
        }

        // If in Simulator Mode and server is unavailable:
        // Respect frozen contract: DO NOT fabricate official server score without server verification.
        // Keep in pending submission state.
        if (activeAttempt.examMode === 'simulator') {
          const errorMsg = 'التسليم لم يكتمل: تعذر الاتصال بخادم التصحيح المعتمد. تم حفظ كامل إجاباتك وموقعك بأمان في المتصفح، ويمكنك إعادة المحاولة لاحقاً دون فقدان أي بيانات.';
          setPendingSubmission({
            attemptId: activeAttempt.attemptId,
            failedAt: new Date().toISOString(),
            errorMessage: errorMsg,
          });
          return {
            success: false,
            isPending: true,
            error: errorMsg,
          };
        }

        // In Training Mode (تدريبي):
        // Self-paced grading to provide educational feedback and record curriculum progress
        let totalScore = 0;
        const gradedAnswers = activeAttempt.questions.map((q) => {
          const studentAns = answers[q.id];
          const isCorrect = evaluateAnswer(studentAns, q.correctAnswer, q.questionType);
          const awardedPoints = isCorrect ? (q.marks || 5) : 0;
          totalScore += awardedPoints;

          return {
            questionId: q.id,
            prompt: q.prompt,
            studentAnswer: studentAns,
            correctAnswer: q.correctAnswer,
            isCorrect,
            awardedPoints,
            maxPoints: q.marks || 5,
            explanationAr: q.explanationAr || 'راجع الشرح والتوجيه المنهجي لهذا السؤال.',
          };
        });

        const percentage = Math.round((totalScore / (activeAttempt.totalPoints || 1)) * 100);
        const resultObj: ExamResult = {
          attemptId: activeAttempt.attemptId,
          score: totalScore,
          maxScore: activeAttempt.totalPoints,
          percentage,
          passed: percentage >= 50,
          gradedAt: new Date().toISOString(),
          timeTakenSeconds,
          isAuthoritative: false,
          gradingAuthority: 'local_unconfirmed',
          answers: gradedAnswers,
        };

        // Record progress in curriculum storage
        const currentUserId = userId || '00000000-0000-0000-0000-000000000001';
        if (activeAttempt.subjectSlug) {
          curriculumStorage.recordStudentAttempt(
            currentUserId,
            activeAttempt.subjectSlug,
            gradedAnswers.map((a) => ({ questionId: a.questionId, isCorrect: a.isCorrect })),
            activeAttempt.examYear,
            totalScore,
            activeAttempt.totalPoints
          );
        }

        setLastResult(resultObj);
        setPendingSubmission(null);
        await examStorage.clearActiveAttempt(activeAttempt.attemptId);
        setActiveAttempt(null);

        return { success: true, result: resultObj };
      } catch (err: any) {
        const errorMsg = 'التسليم لم يكتمل: حدث خطأ غير متوقع أثناء المعالجة. إجاباتك محفوظة محلياً بأمان.';
        setPendingSubmission({
          attemptId: activeAttempt.attemptId,
          failedAt: new Date().toISOString(),
          errorMessage: errorMsg,
        });
        return {
          success: false,
          isPending: true,
          error: errorMsg,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [activeAttempt, answers]
  );

  const retryPendingSubmission = useCallback(
    async (userId?: string) => {
      return submitExam(userId);
    },
    [submitExam]
  );

  const abandonExam = useCallback(async () => {
    if (activeAttempt) {
      try {
        await examStorage.clearActiveAttempt(activeAttempt.attemptId);
      } catch {
        // ignore
      }
      setActiveAttempt(null);
      setAnswers({});
      setCurrentIndex(0);
      setFlaggedIndices(new Set());
      setPendingSubmission(null);
    }
  }, [activeAttempt]);

  return (
    <ExamContext.Provider
      value={{
        activeAttempt,
        currentIndex,
        setCurrentIndex,
        flaggedIndices,
        toggleFlagIndex,
        answers,
        setQuestionAnswer,
        startNewExam,
        submitExam,
        retryPendingSubmission,
        abandonExam,
        lastResult,
        pendingSubmission,
        isLoading,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export function useExam(): ExamContextType {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
}

/**
 * Flexible Answer Evaluation helper for local training sessions
 */
function evaluateAnswer(studentAnswer: any, correctAnswer: any, questionType: string): boolean {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
    return false;
  }

  // Approved Decision 3: Deterministic exact ID matching for Multiple Choice
  if (questionType === 'multiple_choice') {
    const correctId =
      typeof correctAnswer === 'object' && correctAnswer !== null
        ? correctAnswer.selectedOptionId
        : typeof correctAnswer === 'string'
          ? correctAnswer
          : undefined;
    const studentId =
      typeof studentAnswer === 'object' && studentAnswer !== null && typeof studentAnswer.selectedOptionId === 'string'
        ? studentAnswer.selectedOptionId
        : undefined;

    return Boolean(
      correctId &&
      studentId &&
      typeof correctId === 'string' &&
      typeof studentId === 'string' &&
      correctId.length > 0 &&
      correctId === studentId
    );
  }

  // Pattern 02: Deterministic exact boolean matching for True/False
  if (questionType === 'true_false' || questionType === QuestionType.TRUE_FALSE) {
    const correctVal =
      typeof correctAnswer === 'object' && correctAnswer !== null && typeof correctAnswer.value === 'boolean'
        ? correctAnswer.value
        : typeof correctAnswer === 'boolean'
          ? correctAnswer
          : undefined;

    const studentVal =
      typeof studentAnswer === 'object' && studentAnswer !== null && typeof studentAnswer.value === 'boolean'
        ? studentAnswer.value
        : typeof studentAnswer === 'boolean'
          ? studentAnswer
          : undefined;

    return typeof correctVal === 'boolean' && typeof studentVal === 'boolean' && correctVal === studentVal;
  }

  if (typeof correctAnswer === 'boolean') {
    return studentAnswer === correctAnswer;
  }

  if (typeof correctAnswer === 'string') {
    const normStudent = String(studentAnswer).trim().toLowerCase();
    const normCorrect = String(correctAnswer).trim().toLowerCase();
    return normStudent === normCorrect || normStudent.includes(normCorrect);
  }

  if (Array.isArray(correctAnswer)) {
    if (!Array.isArray(studentAnswer)) return false;
    return JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer);
  }

  if (typeof correctAnswer === 'object') {
    if (typeof studentAnswer !== 'object' || studentAnswer === null) return false;
    const correctKeys = Object.keys(correctAnswer);
    if (correctKeys.length === 0) return true;
    let matchCount = 0;
    for (const key of correctKeys) {
      if (String(studentAnswer[key]).trim().toLowerCase() === String(correctAnswer[key]).trim().toLowerCase()) {
        matchCount++;
      }
    }
    return matchCount >= Math.ceil(correctKeys.length / 2);
  }

  return false;
}
