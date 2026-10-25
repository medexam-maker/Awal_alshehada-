import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import { playWaterDrop } from '../utils/soundEffects';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface ResultsProps {
  onBackToSubjects: () => void;
  onOpenReview?: () => void;
}

export const Results: React.FC<ResultsProps> = ({
  onBackToSubjects,
  onOpenReview,
}) => {
  const { lastResult } = useExam();
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  if (!lastResult) {
    return (
      <div className="max-w-md mx-auto my-auto p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-md space-y-4">
        <Award className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">لا توجد نتيجة لعرضها حالياً</h2>
        <p className="text-xs text-slate-500">لم يتم استلام تقرير الدرجات بعد.</p>
        <button
          type="button"
          onClick={onBackToSubjects}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer"
        >
          العودة لقائمة المواد
        </button>
      </div>
    );
  }

  const { score, maxScore, percentage, passed, timeTakenSeconds, answers = [] } = lastResult;

  const getGradeTitle = (pct: number) => {
    if (pct >= 85) return { title: 'ممتاز مرتفع (مرتبة الشرف)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pct >= 80) return { title: 'ممتاز', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pct >= 70) return { title: 'جيد جداً', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (pct >= 60) return { title: 'جيد', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (pct >= 50) return { title: 'مقبول', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { title: 'رسوب (يحتاج إلى تكثيف المذاكرة)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const gradeInfo = getGradeTitle(percentage);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'غير محدد';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} دقيقة و ${secs} ثانية`;
  };

  const formatAnswerDisplay = (answer: any): string => {
    if (answer === undefined || answer === null || answer === '') {
      return 'لم تتم الإجابة';
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
      const parts = Object.entries(blanks).map(([id, val]) => {
        const evalTag = selfEvals[id] !== undefined ? (selfEvals[id] ? ' (تقييمك: صحيحة ✓)' : ' (تقييمك: غير صحيحة ✗)') : '';
        return `فراغ (${id}): «${val}»${evalTag}`;
      });
      return parts.join(' | ');
    }
    if (typeof answer === 'object') {
      return JSON.stringify(answer);
    }
    return String(answer);
  };

  const toggleExpand = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAnswers = answers.filter((a: any) => {
    if (filter === 'correct') return a.isCorrect;
    if (filter === 'incorrect') return !a.isCorrect;
    return true;
  });

  const handleBack = () => {
    playWaterDrop();
    onBackToSubjects();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 w-full">
      {/* Top Header Return Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          title="العودة لقائمة المواد"
        >
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <span>رجوع للمواد</span>
        </button>
        <span className="text-xs font-extrabold text-slate-500">
          تقرير النتيجة
        </span>
      </div>

      {/* Top Result Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 text-center sm:text-right">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 shadow-md ${
                passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <Award className="w-9 h-9" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                كشف تقرير الدرجات والتقييم النهائي
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {passed ? 'تهانينا، لقد اجتزت الاختبار بنجاح!' : 'انتهى الاختبار'}
              </h1>
              <div className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold border ${gradeInfo.color}">
                {gradeInfo.title}
              </div>
            </div>
          </div>

          {/* Large Percentage Badge */}
          <div className="text-center sm:text-left bg-slate-50 border border-slate-200 rounded-3xl p-5 min-w-36">
            <div className={`text-4xl font-black ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
              %{percentage}
            </div>
            <div className="text-xs font-extrabold text-slate-600 mt-1">
              {score} من أصل {maxScore} درجة
            </div>
          </div>
        </div>

        {/* Quick Exam Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
            <div className="text-xs text-slate-500 font-medium">النتيجة النهائية</div>
            <div className={`text-base font-extrabold ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
              {passed ? 'ناجح' : 'راسب'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
            <div className="text-xs text-slate-500 font-medium">الزمن المستغرق</div>
            <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDuration(timeTakenSeconds)}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
            <div className="text-xs text-slate-500 font-medium">إجمالي الأسئلة</div>
            <div className="text-base font-extrabold text-slate-800">
              {answers.length || '—'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
            <div className="text-xs text-slate-500 font-medium">جهة الاعتماد</div>
            {lastResult.isAuthoritative || lastResult.gradingAuthority === 'server' ? (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-100/60 py-1 px-2 rounded-md">
                الخادم المعتمد (C5 Server Grader)
              </div>
            ) : (
              <div className="text-xs font-bold text-amber-800 bg-amber-100/80 py-1 px-2 rounded-md">
                نتيجة تدريب ذاتية
              </div>
            )}
          </div>
        </div>

        {!(lastResult.isAuthoritative || lastResult.gradingAuthority === 'server') && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>تنبيه: هذه النتيجة تدريبية محلية فورية ولم تُسجل كدرجة اختبار معتمدة على الخادم.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToSubjects}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>اختبار جديد في مادة أخرى</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenReview && (
              <button
                type="button"
                onClick={onOpenReview}
                className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>مراجعة الإجابات</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف النتيجة والدرجات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Question Review Section */}
      {answers.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">مراجعة الأسئلة والإجابات النموذجية</h2>
              <p className="text-xs text-slate-500 font-medium">قارن إجاباتك مع الحلول النموذجية المعتمدة</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-white text-emerald-900 shadow-xs' : ''
                }`}
              >
                الكل ({answers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('correct')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'correct' ? 'bg-white text-emerald-900 shadow-xs' : ''
                }`}
              >
                الصحيحة ({answers.filter((a: any) => a.isCorrect).length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('incorrect')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === 'incorrect' ? 'bg-white text-emerald-900 shadow-xs' : ''
                }`}
              >
                الخاطئة ({answers.filter((a: any) => !a.isCorrect).length})
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {filteredAnswers.map((item: any, idx: number) => {
              const isExpanded = expandedQuestions[item.questionId] !== false;
              return (
                <div
                  key={item.questionId || idx}
                  className={`bg-white rounded-3xl border p-5 md:p-6 shadow-xs space-y-4 transition-all ${
                    item.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                  }`}
                >
                  <div
                    className="flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpand(item.questionId)}
                  >
                    <div className="flex items-center gap-3">
                      {item.isCorrect ? (
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
                              item.isCorrect
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {item.awardedPoints ?? item.obtainedMarks ?? 0} / {item.maxPoints ?? item.maxMarks} درجة
                          </span>
                          {Boolean(item.selfEvaluated || item.isSelfAssessed || item.studentAnswer?.selfEvaluations || (item.selfEvaluations && Object.keys(item.selfEvaluations).length > 0)) && (
                            <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-extrabold">
                              تقييم ذاتي
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 font-medium line-clamp-1 mt-0.5">
                          {item.prompt || item.text || item.statement || 'نص السؤال'}
                        </p>
                      </div>
                    </div>

                    <button type="button" className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-100 space-y-4 text-xs md:text-sm">
                      <div className="p-4 bg-slate-50 rounded-2xl text-slate-900 font-semibold leading-relaxed">
                        {item.prompt || item.text || item.statement || 'نص السؤال'}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="text-xs font-bold text-slate-500">إجابتك المسجلة:</div>
                          <div className="font-semibold text-slate-800">
                            {formatAnswerDisplay(item.studentAnswer)}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                          <div className="text-xs font-bold text-emerald-800">الإجابة المعتمدة:</div>
                          <div className="font-semibold text-emerald-950">
                            {formatAnswerDisplay(item.correctAnswer)}
                          </div>
                        </div>
                      </div>

                      {(item.explanationAr || item.explanation) && (
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
      )}
    </div>
  );
};
