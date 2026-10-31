import React, { useState, useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { QuestionNavigator } from '../components/exam/QuestionNavigator';
import { Timer } from '../components/exam/Timer';
import { ProgressBar } from '../components/exam/ProgressBar';
import { QuestionDispatcher } from '../components/questions';
import { useTimer } from '../hooks/useTimer';
import { TWELVE_CONTRACT_SUBJECTS } from '../data/contractSubjects';
import { QuestionType } from '../../shared/constants';
import { SoundSettingsModal } from '../components/SoundSettingsModal';
import {
  playClick,
  playSwoosh,
  playBookmark,
  playClear,
  playModal,
  playSubmit,
} from '../utils/soundEffects';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Bookmark,
  Send,
  HelpCircle,
  Wifi,
  RefreshCw,
  LogOut,
  Info,
  Clock,
  Volume2,
} from 'lucide-react';

interface ExamAttemptProps {
  onFinishExam: () => void;
  onExitExam: () => void;
}

export const ExamAttempt: React.FC<ExamAttemptProps> = ({ onFinishExam, onExitExam }) => {
  const {
    activeAttempt,
    currentIndex,
    setCurrentIndex,
    flaggedIndices,
    toggleFlagIndex,
    answers,
    setQuestionAnswer,
    submitExam,
    retryPendingSubmission,
    pendingSubmission,
    isLoading,
  } = useExam();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showTrainingHint, setShowTrainingHint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Automatically scroll to the top of the page when changing questions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [currentIndex]);

  // Non-authoritative client timer (C6 §17)
  const { remainingSeconds } = useTimer({
    expiresAt: activeAttempt?.expiresAt || null,
    isEnabled: activeAttempt?.examMode === 'simulator',
    onExpire: () => {
      // Auto-open submit modal upon timer reaching 0
      setIsSubmitModalOpen(true);
    },
  });

  if (!activeAttempt || !activeAttempt.questions || activeAttempt.questions.length === 0) {
    return (
      <div className="max-w-md mx-auto my-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">لا يوجد امتحان نشط حالياً</h2>
        <p className="text-sm text-slate-500">يرجى العودة واختيار مادة لبدء جلسة جديدة.</p>
        <button
          type="button"
          onClick={onExitExam}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
        >
          العودة لقائمة المواد
        </button>
      </div>
    );
  }

  const questions = activeAttempt.questions;
  const currentQuestion = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;

  const questionText =
    currentQuestion?.prompt
    ?? currentQuestion?.content?.prompt
    ?? currentQuestion?.content?.statement
    ?? currentQuestion?.content?.textWithBlanks
    ?? '— تحميل السؤال —';

  if (questionText === '— تحميل السؤال —') {
    console.warn(`[ExamAttempt] Missing question prompt text for question ID: ${currentQuestion?.id}, index: ${currentIndex}`);
  }

  const rawPoints = currentQuestion?.points ?? currentQuestion?.marks;
  const pointsNum = Number(rawPoints);
  const points = Number.isFinite(pointsNum) ? pointsNum : null;

  // In Simulator Mode: NEVER show explanation or explanationAr. Explanations only in Training.
  const explanation = activeAttempt.examMode === 'training'
    ? (currentQuestion?.explanationAr ?? currentQuestion?.explanation ?? null)
    : null;

  const matchedSubject = TWELVE_CONTRACT_SUBJECTS.find((s) => s.slug === activeAttempt.subjectId);
  const subjectNameAr = matchedSubject?.name_ar || 'امتحان الشهادة الثانوية';

  // Calculate answered questions indices
  const answeredIndices = new Set<number>();
  questions.forEach((q, idx) => {
    const val = answers[q.id];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'object') {
        if (Object.keys(val).length > 0) answeredIndices.add(idx);
      } else {
        answeredIndices.add(idx);
      }
    }
  });

  const isCurrentFlagged = flaggedIndices.has(currentIndex);
  const answeredCount = answeredIndices.size;
  const unansweredCount = totalQuestions - answeredCount;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      playSwoosh();
      setCurrentIndex(currentIndex + 1);
      setShowTrainingHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      playSwoosh();
      setCurrentIndex(currentIndex - 1);
      setShowTrainingHint(false);
    }
  };

  const handleClearAnswer = () => {
    playClear();
    setQuestionAnswer(currentQuestion.id, undefined);
  };

  const handleConfirmSubmit = async () => {
    setSubmissionError(null);
    setIsSubmitting(true);
    const res = await submitExam();
    setIsSubmitting(false);

    if (res.success) {
      playSubmit();
      setIsSubmitModalOpen(false);
      onFinishExam();
    } else {
      setSubmissionError(res.error || 'التسليم لم يكتمل: تعذر الاتصال بالخادم. تم حفظ إجاباتك محلياً بأمان.');
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case QuestionType.TRUE_FALSE:
        return 'صح أو خطأ';
      case QuestionType.MULTIPLE_CHOICE:
        return 'اختيار من متعدد';
      case QuestionType.FILL_BLANK:
        return 'إكمال الفراغ';
      case QuestionType.MATCHING:
        return 'مزاوجة ومطابقة';
      case QuestionType.SHORT_ESSAY:
        return 'سؤال مقالي قصير';
      case QuestionType.LONG_ESSAY:
        return 'سؤال مقالي مطول';
      case QuestionType.EXPLAIN:
        return 'علل / وضّح السبب';
      case QuestionType.COMPARISON_TABLE:
        return 'إكمال جدول مقارنة';
      case QuestionType.ODD_ONE_OUT:
        return 'استخراج الشاذ';
      case QuestionType.DIAGRAM_LABELING:
        return 'تسمية رسم بياني';
      case QuestionType.CONTOUR_MAP:
        return 'قراءة خريطة كنتورية';
      case QuestionType.CALCULATION:
        return 'مسألة حسابية';
      case QuestionType.ORDERING:
        return 'ترتيب وتسلسل';
      case QuestionType.ARABIC_GRAMMAR:
        return 'إعراب وتشكيل';
      case QuestionType.READING_COMPREHENSION:
        return 'استيعاب قرائي وتلخيص';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl w-full mx-auto pb-12">
      {/* Simplified Header - Only basic navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm sticky top-2 z-20 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExitExam}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSoundSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="إعدادات الأصوات والتعليق الرياضي"
          >
            <Volume2 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">الأصوات ⚽</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>تسليم الامتحان</span>
          </button>
        </div>
      </div>


        {/* Main Workspace */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
          {/* Question Heading & Prompt */}
          <div className="space-y-4">
            <div className="text-base sm:text-lg font-black text-slate-900 bg-slate-100/90 px-4 py-2.5 rounded-2xl border border-slate-200 inline-flex items-center gap-2">
              <span>{(() => {
                const arabicNumbers = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
                const numStr = arabicNumbers[currentIndex + 1] || `${currentIndex + 1}`;
                const part = currentQuestion.partLabel ? ` (${currentQuestion.partLabel})` : ' (أ)';
                return `السؤال ${numStr} :${part}`;
              })()}</span>
            </div>

            {/* Question Prompt */}
            <div className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
              {questionText}
            </div>
          </div>

          {/* Question Component Renderer */}
          <div className="pt-2">
            <QuestionDispatcher
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              onChange={(newAns) => setQuestionAnswer(currentQuestion.id, newAns)}
              isReadonly={false}
              examMode={activeAttempt.examMode as any}
              trainingSubMode={activeAttempt.trainingSubMode}
              isWeeklySimulation={Boolean(activeAttempt.isWeeklySimulation || activeAttempt.trainingSubMode === 'weekly')}
              attemptId={activeAttempt.attemptId || (activeAttempt as any).id}
            />
          </div>

            {/* Action Buttons for Question (Bookmark) */}
            <div className="pt-3 flex items-center justify-between text-xs border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  playBookmark();
                  toggleFlagIndex(currentIndex);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isCurrentFlagged
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>{isCurrentFlagged ? 'إلغاء التمييز' : 'تمييز للمراجعة'}</span>
              </button>
            </div>

            {/* Training Mode Explanations Accordion */}
            {activeAttempt.examMode === 'training' && explanation && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTrainingHint(!showTrainingHint)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{showTrainingHint ? 'إخفاء التوضيح المنهجي' : 'عرض التوضيح المنهجي'}</span>
                </button>

                {showTrainingHint && (
                  <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs leading-relaxed text-emerald-950 space-y-1.5">
                    <div className="font-extrabold text-emerald-900">توضيح المعلم / المنهج المقرر:</div>
                    <p>{explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السؤال السابق</span>
              </button>

              {isLastQuestion ? (
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>مراجعة وتسليم الامتحان</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>السؤال التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>



      {/* Submission Review Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
                <Send className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">تسليم ورقة الامتحان</h2>
              <p className="text-xs text-slate-500 font-medium">
                يرجى مراجعة حالة الإجابات قبل اعتماد التسليم النهائي
              </p>
            </div>

            {/* Answer Statistics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="text-2xl font-black text-emerald-800">{answeredCount}</div>
                <div className="text-xs font-semibold text-emerald-600">أسئلة مُجابة</div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border ${
                  unansweredCount > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="text-2xl font-black">{unansweredCount}</div>
                <div className="text-xs font-semibold">أسئلة فارغة</div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="text-2xl font-black text-amber-800">{flaggedIndices.size}</div>
                <div className="text-xs font-semibold text-amber-600">مُميزة للمراجعة</div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  تنبيه: لا يزال لديك <strong>{unansweredCount}</strong> سؤالاً دون إجابة. سيتم احتساب الدرجة صفراً للأسئلة المتروكة.
                </p>
              </div>
            )}

            {submissionError && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{submissionError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الإرسال للخادم...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>تأكيد التسليم النهائي</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                العودة للامتحان
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sound Settings Modal */}
      <SoundSettingsModal
        isOpen={isSoundSettingsOpen}
        onClose={() => setIsSoundSettingsOpen(false)}
      />
    </div>
  );
};
