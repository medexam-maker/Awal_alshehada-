import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import { QuestionNavigator } from '../components/exam/QuestionNavigator';
import { Timer } from '../components/exam/Timer';
import { ProgressBar } from '../components/exam/ProgressBar';
import { QuestionDispatcher } from '../components/questions';
import { useTimer } from '../hooks/useTimer';
import { DEMO_SUBJECTS } from '../data/demoCurriculum';
import { QuestionType } from '../../shared/constants';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Bookmark,
  Send,
  HelpCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Info,
} from 'lucide-react';

interface ExamViewProps {
  onFinishExam: () => void;
  onExitExam: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({ onFinishExam, onExitExam }) => {
  const {
    activeAttempt,
    currentIndex,
    setCurrentIndex,
    flaggedIndices,
    toggleFlagIndex,
    answers,
    setQuestionAnswer,
    submitExam,
    abandonExam,
    isLoading,
  } = useExam();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showTrainingHint, setShowTrainingHint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        <p className="text-sm text-slate-500">يرجى العودة إلى لوحة التحكم واختيار مادة لبدء جلسة جديدة.</p>
        <button
          type="button"
          onClick={onExitExam}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
        >
          العودة للرئيسية
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
    console.warn(`[ExamView] Missing question prompt text for question ID: ${currentQuestion?.id}, index: ${currentIndex}`);
  }

  const rawPoints = currentQuestion?.points ?? currentQuestion?.marks;
  const pointsNum = Number(rawPoints);
  const points = Number.isFinite(pointsNum) ? pointsNum : null;

  // In Simulator Mode: NEVER show explanation or explanationAr. Explanations only in Training.
  const explanation = activeAttempt.examMode === 'training'
    ? (currentQuestion?.explanationAr ?? currentQuestion?.explanation ?? null)
    : null;

  const subjectMeta = DEMO_SUBJECTS.find((s) => s.id === activeAttempt.subjectId);
  const subjectNameAr = subjectMeta?.name_ar || 'امتحان الشهادة الثانوية';

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
      setCurrentIndex(currentIndex + 1);
      setShowTrainingHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowTrainingHint(false);
    }
  };

  const handleClearAnswer = () => {
    setQuestionAnswer(currentQuestion.id, undefined);
  };

  const handleConfirmSubmit = async () => {
    setSubmissionError(null);
    setIsSubmitting(true);
    const res = await submitExam();
    setIsSubmitting(false);

    if (res.success) {
      setIsSubmitModalOpen(false);
      onFinishExam();
    } else {
      setSubmissionError(res.error || 'حدث خطأ أثناء تسليم الامتحان. تم حفظ إجاباتك محلياً، يرجى إعادة المحاولة.');
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
      {/* Sticky Exam Execution Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm sticky top-2 z-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Subject & Mode Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {currentIndex + 1}
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900 leading-tight">
                {subjectNameAr}
              </h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span
                  className={`px-2 py-0.5 rounded-md ${
                    activeAttempt.examMode === 'simulator'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {activeAttempt.examMode === 'simulator' ? 'محاكاة الامتحان' : 'تدريب ذاتي'}
                </span>
                <span>• السؤال {currentIndex + 1} من {totalQuestions}</span>
              </div>
            </div>
          </div>

          {/* Zero-Request / Offline Pill & Timer */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200"
              title="يعمل دون اتصال أثناء الإجابة لضمان الصمود أمام انقطاع الإنترنت (Zero-Request Invariant)"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>محلي متين (Zero-Request)</span>
            </div>

            <Timer
              remainingSeconds={remainingSeconds}
              isSimulator={activeAttempt.examMode === 'simulator'}
            />

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

        {/* Progress Bar */}
        <ProgressBar
          current={currentIndex + 1}
          total={totalQuestions}
          answeredCount={answeredCount}
        />
      </div>

      {/* Main Layout: Question Card + Navigator Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column (Desktop) / Sidebar: Question Navigator */}
        <div className="lg:col-span-1 space-y-4">
          <QuestionNavigator
            totalQuestions={totalQuestions}
            currentIndex={currentIndex}
            answeredIndices={answeredIndices}
            flaggedIndices={flaggedIndices}
            onSelectIndex={(idx) => {
              setCurrentIndex(idx);
              setShowTrainingHint(false);
            }}
            onToggleFlag={toggleFlagIndex}
          />

          {/* Educational Note in Training Mode */}
          {activeAttempt.examMode === 'training' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>ملاحظة تعليمية</span>
              </div>
              <p className="leading-relaxed text-blue-800">
                أنت في وضع التدريب؛ يمكنك استعراض التوضيحات النموذجية لكل سؤال بحرية دون التأثير على تقييمك.
              </p>
            </div>
          )}

          {/* Abandon Exam Button */}
          <button
            type="button"
            onClick={onExitExam}
            className="w-full py-2.5 px-3 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>حفظ والعودة للرئيسية</span>
          </button>
        </div>

        {/* Right / Main Column: Active Question Workspace */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
            {/* Question Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200">
                  {getQuestionTypeLabel(currentQuestion.questionType || currentQuestion.type)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  درجة السؤال: {points !== null ? `${points} درجات` : '—'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFlagIndex(currentIndex)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrentFlagged
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{isCurrentFlagged ? 'إلغاء التمييز' : 'تمييز للمراجعة'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAnswer}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  مسح الإجابة
                </button>
              </div>
            </div>

            {/* Question Prompt */}
            <div className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
              {questionText}
            </div>

            {/* Specialized Question Component Renderer */}
            <div className="pt-2">
              <QuestionDispatcher
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onChange={(newAns) => setQuestionAnswer(currentQuestion.id, newAns)}
                isReadonly={false}
                examMode={activeAttempt.examMode as any}
                trainingSubMode={activeAttempt.trainingSubMode}
                attemptId={activeAttempt.attemptId || (activeAttempt as any).id}
              />
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
                  <span>{showTrainingHint ? 'إخفاء الإجابة النموذجية والتوضيح' : 'عرض الإجابة النموذجية والتوضيح المنهجي'}</span>
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
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
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
                    <span>جاري التسليم والتقييم...</span>
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
    </div>
  );
};
