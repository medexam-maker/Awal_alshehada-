import React, { useState, useEffect } from 'react';
import { ContractSubject } from '../data/contractSubjects';
import { useExam } from '../context/ExamContext';
import { useAuth } from '../hooks/useAuth';
import { curriculumStorage } from '../storage/curriculumStorage';
import { ExamSubMode } from '../types/curriculum';
import {
  Timer,
  Play,
  ArrowRight,
  Sparkles,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface ExamSetupProps {
  subject: ContractSubject;
  dbSubjectId?: string;
  onBackToSubjects: () => void;
  onExamStarted: () => void;
}

export const ExamSetup: React.FC<ExamSetupProps> = ({
  subject,
  dbSubjectId,
  onBackToSubjects,
  onExamStarted,
}) => {
  const { startNewExam, isLoading } = useExam();
  const { user } = useAuth();

  const [examMode, setExamMode] = useState<'simulator' | 'training'>('simulator');
  const [trainingSubMode, setTrainingSubMode] = useState<ExamSubMode>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student progress in this specific subject
  const studentId = user?.id || '00000000-0000-0000-0000-000000000001';
  const [progress, setProgress] = useState(curriculumStorage.getStudentProgress(studentId, subject.slug));
  const availableYears = curriculumStorage.getAvailableYears(subject.slug);
  const allSupportedYears = curriculumStorage.getAllSupportedYears(); // 2000 - 2026

  useEffect(() => {
    setProgress(curriculumStorage.getStudentProgress(studentId, subject.slug));
  }, [studentId, subject.slug]);

  const handleStart = async () => {
    setErrorMessage(null);

    const res = await startNewExam(
      dbSubjectId || subject.slug,
      'comprehensive',
      examMode,
      examMode === 'training' ? trainingSubMode : undefined,
      examMode === 'training' && trainingSubMode === 'yearly' ? selectedYear : undefined,
      subject.slug,
      studentId
    );

    if (res.success) {
      onExamStarted();
    } else {
      setErrorMessage(res.error || 'تعذر بدء الامتحان.');
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto py-4 space-y-6">
      {/* Top Bar with Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToSubjects}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة المواد</span>
        </button>
        <span className="text-xs font-semibold text-slate-500">
          إعداد جلسة الاختبار والتقييم الأكاديمي
        </span>
      </div>

      {/* Subject Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {subject.category === 'common'
              ? 'مادة مشتركة لكافة المساقات'
              : subject.category === 'scientific'
              ? 'المساق العلمي'
              : 'المساق الأدبي'}
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">{subject.name_ar}</h1>
          <p className="text-xs text-slate-400 font-medium">{subject.name_en}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[120px]">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>الزمن المحدد</span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {subject.defaultDurationMinutes} دقيقة
            </div>
          </div>

          <div className="text-center bg-emerald-50 border border-emerald-200 rounded-2xl p-4 min-w-[140px]">
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-medium">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>إنجاز المقرر</span>
            </div>
            <div className="text-lg font-black text-emerald-950 mt-0.5">
              {progress.completionPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl text-xs flex items-start gap-3 border bg-rose-50 border-rose-200 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-1">
            <div className="font-bold">تعذر بدء الجلسة</div>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Mode Selection Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">1. تحديد نوع الامتحان</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            اختر بين المحاكاة الواقعية الكاملة الصارمة أو نمط التدريب الذاتي المرن
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Full Simulation Option */}
            <div
              onClick={() => setExamMode('simulator')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                examMode === 'simulator'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  examMode === 'simulator' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Timer className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>محاكاة امتحان كاملة</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    معايير الامتحان الحقيقي
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  جلسة محاكاة امتحان بمؤقت زمني دقيق ({subject.defaultDurationMinutes} دقيقة)، مع التزام صارم بضابط عدم الطلب Zero-Request، ونموذج ورقة كامل يطابق تجربة الامتحان الحقيقي.
                </p>
              </div>
            </div>

            {/* Training Mode Option */}
            <div
              onClick={() => setExamMode('training')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                examMode === 'training'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  examMode === 'training' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>تدريبي (نمط التعلم المرن)</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                    سنوات ومراجعة
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  مذاكرة بلا قيود زمنية، تتيح التدرب على امتحانات دورات سابقة من 2000 إلى 2026 أو حل بنك مراجعة المقرر مع حفظ تقدمك التراكمي.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* When Training Mode is selected: Offer the TWO sub-options requested by user */}
        {examMode === 'training' && (
          <div className="pt-5 border-t border-slate-100 space-y-4 animate-in fade-in duration-300">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                2. مسار التدريب: اختر أحد الخيارين
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                حدد ما إذا كنت تريد امتحان دورة سنة محددة أو متابعة مراجعة المقرر
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sub-option 1: Specific Year (2000 - 2026) */}
              <div
                onClick={() => setTrainingSubMode('yearly')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  trainingSubMode === 'yearly'
                    ? 'border-teal-600 bg-teal-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      trainingSubMode === 'yearly' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      الخيار الأول: امتحان سنة محددة (2000 - 2026)
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      يظهر لك امتحان نفس السنة المدخل خصيصاً لهذه الدورة بأسئلتها ونمطها القياسي المعتمد.
                    </p>
                  </div>
                </div>

                {/* Year Selector */}
                {trainingSubMode === 'yearly' && (
                  <div className="mt-4 pt-3 border-t border-teal-200/60 space-y-2">
                    <label className="text-xs font-bold text-teal-950 block">
                      اختر سنة الامتحان المحددة:
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
                      >
                        {allSupportedYears.map((year) => {
                          const hasDedicated = availableYears.includes(year);
                          return (
                            <option key={year} value={year}>
                              دورة عام {year}م {hasDedicated ? '⭐ (أسئلة معتمدة)' : '📄 (هيكل ورقة الدورة)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-teal-800 font-semibold pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        سيتم تجهيز ورقة امتحان دورة عام {selectedYear}م لمادة {subject.name_ar}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-option 2: Curriculum Review with Full Progress Tracking */}
              <div
                onClick={() => setTrainingSubMode('curriculum_review')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  trainingSubMode === 'curriculum_review'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      trainingSubMode === 'curriculum_review' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      الخيار الثاني: مراجعة شاملة للمقرر
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      حل أسئلة بنك المقرر مع احتساب نسبة تقدم كاملة للمقرر حتى إكماله وتُحفظ تلقائياً في سجلك.
                    </p>
                  </div>
                </div>

                {/* Curriculum Progress Display Card */}
                {trainingSubMode === 'curriculum_review' && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>نسبة تقدمك في مقرر {subject.name_ar}:</span>
                      <span className="text-emerald-800 font-black">{progress.completionPercentage}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-emerald-200/60 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, progress.completionPercentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                      <span>تم حل: {progress.answeredQuestionIds.length} سؤال</span>
                      <span>الإجمالي: {progress.totalQuestionsInBank} سؤال</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Start Button & Guarantees */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {examMode === 'simulator'
                ? 'جلسة محاكاة واقعية - مؤقت زمني دقيق'
                : trainingSubMode === 'yearly'
                ? `امتحان دورة عام ${selectedYear}م مخصص للمادة`
                : 'مراجعة المنهج - يتم حفظ نسبة التقدم في ملفك الأكاديمي'}
            </span>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>جاري تحضير ورقة الامتحان...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {examMode === 'simulator'
                    ? 'بدء محاكاة الامتحان الآن'
                    : trainingSubMode === 'yearly'
                    ? `بدء امتحان دورة ${selectedYear}م`
                    : 'متابعة مراجعة المقرر'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
