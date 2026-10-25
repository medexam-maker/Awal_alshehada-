import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Clock,
  Award,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface ExamReviewProps {
  onBackToResults: () => void;
  onBackToSubjects: () => void;
}

export const ExamReview: React.FC<ExamReviewProps> = ({
  onBackToResults,
  onBackToSubjects,
}) => {
  const { lastResult } = useExam();
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const reviewItems: any[] = (lastResult?.answers && lastResult.answers.length > 0)
    ? lastResult.answers
    : (lastResult?.details && lastResult.details.length > 0)
    ? lastResult.details
    : [];

  if (!lastResult || reviewItems.length === 0) {
    return (
      <div className="max-w-md mx-auto my-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">لا توجد تفاصيل لمراجعة الامتحان</h2>
        <p className="text-xs text-slate-500">
          لم يتم العثور على ورقة إجابة مسجلة في الذاكرة الحالية.
        </p>
        <button
          type="button"
          onClick={onBackToSubjects}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer text-xs"
        >
          العودة لقائمة المواد
        </button>
      </div>
    );
  }

  const { score, maxScore, percentage, passed } = lastResult;

  const toggleExpand = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatAnswerDisplay = (answer: any): string => {
    if (answer === undefined || answer === null || answer === '') {
      return 'لم تتم الإجابة (متروك فارغاً)';
    }
    // True / False
    if (typeof answer === 'object' && answer !== null && 'value' in answer && typeof answer.value === 'boolean') {
      return answer.value ? 'صواب (✓)' : 'خطأ (✗)';
    }
    if (typeof answer === 'boolean') {
      return answer ? 'صواب (✓)' : 'خطأ (✗)';
    }
    // Multiple Choice
    if (typeof answer === 'object' && answer !== null && typeof answer.selectedOptionId === 'string') {
      return `الخيار المختار (${answer.selectedOptionId})`;
    }
    // Fill Blank with selfEvaluations
    if (typeof answer === 'object' && answer !== null && (answer.answers || answer.blanks)) {
      const blanks = answer.answers || answer.blanks;
      const selfEvals = answer.selfEvaluations || {};
      const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const parts = Object.entries(blanks).map(([id, val]) => {
        const cleaned = String(id).replace(/blank/gi, '').replace(/_/g, '').trim();
        const num = parseInt(cleaned, 10);
        const displayNum = !isNaN(num)
          ? String(num).replace(/\d/g, (d) => easternDigits[parseInt(d, 10)])
          : String(id).replace(/blank/gi, '').replace(/\d/g, (d) => easternDigits[parseInt(d, 10)]);
        const evalTag = selfEvals[id] !== undefined ? (selfEvals[id] ? ' (تقييمك: صحيحة ✓)' : ' (تقييمك: غير صحيحة ✗)') : '';
        return `الفراغ (${displayNum}): «${val}»${evalTag}`;
      });
      return parts.join(' | ');
    }
    if (typeof answer === 'object') {
      return JSON.stringify(answer);
    }
    return String(answer);
  };

  const isGradingPending = (item: any): boolean => {
    const status = item.gradingStatus || lastResult?.gradingStatus;
    return status === 'pending_review' || status === 'manual_pending' || status === 'pending';
  };

  const filteredAnswers = reviewItems.filter((a: any) => {
    if (filter === 'correct') return a.isCorrect;
    if (filter === 'incorrect') return !a.isCorrect;
    return true;
  });

  const correctCount = reviewItems.filter((a: any) => a.isCorrect).length;
  const incorrectCount = reviewItems.length - correctCount;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 w-full">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">مراجعة إجابات ورقة الامتحان</h1>
            <p className="text-xs text-slate-500 font-medium">
              الاطلاع على إجاباتك المسجلة ودرجة كل سؤال والتوجيهات المنهجية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToResults}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>كشف الدرجات</span>
          </button>
          <button
            type="button"
            onClick={onBackToSubjects}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span>قائمة المواد</span>
          </button>
        </div>
      </div>

      {/* Summary Score Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">الدرجة الكلية</div>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {score} / {maxScore}
          </div>
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="text-xs text-slate-500 font-medium">النسبة المئوية</div>
          <div className={`text-lg font-black mt-0.5 ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
            %{percentage}
          </div>
        </div>
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
          <div className="text-xs text-emerald-700 font-medium">إجابات صحيحة</div>
          <div className="text-lg font-black text-emerald-800 mt-0.5">
            {correctCount}
          </div>
        </div>
        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
          <div className="text-xs text-rose-700 font-medium">إجابات خاطئة</div>
          <div className="text-lg font-black text-rose-800 mt-0.5">
            {incorrectCount}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <span>تفاصيل الأسئلة</span>
          <span className="text-xs text-slate-400 font-medium">({filteredAnswers.length} سؤال معروض)</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'all' ? 'bg-white text-emerald-900 shadow-xs' : ''
            }`}
          >
            الكل ({reviewItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('correct')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'correct' ? 'bg-white text-emerald-900 shadow-xs' : ''
            }`}
          >
            الصحيحة ({correctCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('incorrect')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filter === 'incorrect' ? 'bg-white text-emerald-900 shadow-xs' : ''
            }`}
          >
            الخاطئة ({incorrectCount})
          </button>
        </div>
      </div>

      {/* Questions Review List */}
      <div className="space-y-4">
        {filteredAnswers.map((item: any, idx: number) => {
          const isExpanded = expandedQuestions[item.questionId] !== false;
          const pending = isGradingPending(item);
          const obtainedMarks = item.obtainedMarks ?? item.awardedPoints ?? 0;
          const maxMarks = item.maxMarks ?? item.maxPoints ?? 5;

          return (
            <div
              key={item.questionId || idx}
              className={`bg-white rounded-3xl border p-5 md:p-6 shadow-xs space-y-4 transition-all ${
                pending
                  ? 'border-amber-200'
                  : item.isCorrect
                  ? 'border-emerald-200'
                  : 'border-rose-200'
              }`}
            >
              <div
                className="flex items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => toggleExpand(item.questionId)}
              >
                <div className="flex items-center gap-3">
                  {pending ? (
                    <Clock className="w-6 h-6 text-amber-500 shrink-0" />
                  ) : item.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        السؤال {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          pending
                            ? 'bg-amber-50 text-amber-800'
                            : item.isCorrect
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {obtainedMarks} / {maxMarks} درجة
                      </span>
                      {Boolean(item.selfEvaluated || item.isSelfAssessed || item.studentAnswer?.selfEvaluations || (item.selfEvaluations && Object.keys(item.selfEvaluations).length > 0)) && (
                        <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-extrabold">
                          تقييم ذاتي
                        </span>
                      )}
                      {pending && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                          بانتظار التقييم
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 font-medium line-clamp-1 mt-0.5">
                      {item.prompt || item.text || `نص السؤال رقم ${idx + 1}`}
                    </p>
                  </div>
                </div>

                <button type="button" className="text-slate-400 p-1">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {isExpanded && (
                <div className="pt-4 border-t border-slate-100 space-y-4 text-xs md:text-sm">
                  {/* Full Prompt Text */}
                  <div className="p-4 bg-slate-50 rounded-2xl text-slate-900 font-semibold leading-relaxed">
                    {item.prompt || item.text || `نص السؤال رقم ${idx + 1} وفق نموذج الامتحان`}
                  </div>

                  {/* Student Answer & Correct Answer Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-xs font-bold text-slate-500">إجابتك المسجلة:</div>
                      <div className="font-semibold text-slate-800">
                        {formatAnswerDisplay(item.studentAnswer)}
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-2xl border space-y-1 ${
                        pending
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <div
                        className={`text-xs font-bold ${
                          pending ? 'text-amber-800' : 'text-emerald-800'
                        }`}
                      >
                        الإجابة النموذجية المعتمدة:
                      </div>
                      <div
                        className={`font-semibold ${
                          pending ? 'text-amber-950 text-xs italic' : 'text-emerald-950'
                        }`}
                      >
                        {pending ? (
                          'الإجابة النموذجية معلقة بانتظار اكتمال التقييم المنهجي (Grading Pending)'
                        ) : (
                          formatAnswerDisplay(item.correctAnswer)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pedagogical Explanation - only show if grading is finalized */}
                  {!pending && (item.explanationAr || item.explanation) && (
                    <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl text-teal-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-teal-900 text-xs">
                        <HelpCircle className="w-4 h-4 text-teal-700" />
                        <span>الشرح والتوجيه المنهجي:</span>
                      </div>
                      <p className="leading-relaxed text-xs md:text-sm">{item.explanationAr || item.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
