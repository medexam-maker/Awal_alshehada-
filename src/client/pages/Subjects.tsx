import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useExam } from '../context/ExamContext';
import { apiClient } from '../api/apiClient';
import { TWELVE_CONTRACT_SUBJECTS, ContractSubject } from '../data/contractSubjects';
import { curriculumStorage } from '../storage/curriculumStorage';
import {
  BookOpen,
  Cross,
  Feather,
  Globe,
  Divide,
  Calculator,
  FlaskConical,
  Zap,
  Compass,
  Landmark,
  Dna,
  Cpu,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Timer,
  Sliders,
  Award,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface SubjectsProps {
  onSelectSubject: (subject: ContractSubject, dbId?: string) => void;
  onResumeExam: () => void;
  onOpenAdmin?: () => void;
}

export const Subjects: React.FC<SubjectsProps> = ({
  onSelectSubject,
  onResumeExam,
  onOpenAdmin,
}) => {
  const { user } = useAuth();
  const { activeAttempt, abandonExam } = useExam();
  const [dbSubjects, setDbSubjects] = useState<Array<{ id: string; name_ar: string; slug: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'common' | 'scientific' | 'literary'>('all');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  const studentId = user?.id || '00000000-0000-0000-0000-000000000001';
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    setSubjectsError(null);
    try {
      const res = await apiClient.request<Array<{ id: string; name_ar: string; slug: string }>>('/api/subjects');
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setDbSubjects(res.data);
      } else {
        setDbSubjects([]);
      }
    } catch {
      setSubjectsError('تعذر جلب المواد من الخادم؛ يرجى التحقق من الاتصال وإعادة المحاولة.');
      setDbSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  useEffect(() => {
    setProgressMap(curriculumStorage.getAllSubjectsProgress(studentId));
    fetchSubjects();
  }, [studentId]);

  const renderSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen':
        return <BookOpen className="w-6 h-6 text-emerald-600" />;
      case 'Cross':
        return <Cross className="w-6 h-6 text-purple-600" />;
      case 'Feather':
        return <Feather className="w-6 h-6 text-amber-600" />;
      case 'Globe':
        return <Globe className="w-6 h-6 text-sky-600" />;
      case 'Divide':
        return <Divide className="w-6 h-6 text-indigo-600" />;
      case 'Calculator':
        return <Calculator className="w-6 h-6 text-blue-600" />;
      case 'FlaskConical':
        return <FlaskConical className="w-6 h-6 text-teal-600" />;
      case 'Zap':
        return <Zap className="w-6 h-6 text-yellow-600" />;
      case 'Compass':
        return <Compass className="w-6 h-6 text-orange-600" />;
      case 'Landmark':
        return <Landmark className="w-6 h-6 text-rose-600" />;
      case 'Dna':
        return <Dna className="w-6 h-6 text-emerald-600" />;
      case 'Cpu':
        return <Cpu className="w-6 h-6 text-violet-600" />;
      default:
        return <BookOpen className="w-6 h-6 text-emerald-600" />;
    }
  };

  // Only render subjects that exist in the authoritative database response from the server
  const activeSubjects = TWELVE_CONTRACT_SUBJECTS.filter((subject) =>
    dbSubjects.some((db) => db.slug === subject.slug || db.name_ar === subject.name_ar)
  );

  const filteredSubjects = activeSubjects.filter((subject) => {
    if (selectedCategory === 'all') return true;
    return subject.category === selectedCategory;
  });

  return (
    <div className="space-y-8 py-2 max-w-6xl w-full mx-auto">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>منصة أول الشهادة المعتمدة لطلاب الشهادة السودانية</span>
            </span>

            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white transition-all border border-white/20 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-300" />
                <span>لوحة التحكم والإدخال (Admin)</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            مرحباً بك، {user?.fullName || 'عزيزي الطالب'} 👋
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
            اختر إحدى مواد الشهادة الثانوية الاثنتي عشرة لبدء التدريب على امتحانات السنوات (2000 - 2026)، أو مراجعة المقرر وحفظ تقدمك، أو محاكاة تجربة الامتحان الحقيقي.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-emerald-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 12 مادة مقررة وفق المنهج القومي المعتمد
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-300" /> امتحانات الدورات السابقة (2000 - 2026)
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-300" /> حفظ نسبة تقدم المقرر تلقائياً
            </span>
          </div>
        </div>
      </div>

      {/* Active Attempt In-Progress Banner */}
      {activeAttempt && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-amber-950 text-base">
                لديك جلسة امتحان قيد التنفيذ!
              </div>
              <div className="text-xs text-amber-800">
                وضع: {activeAttempt.examMode === 'simulator' ? 'محاكاة الامتحان' : 'تدريب'} | عدد الأسئلة: {activeAttempt.totalQuestions} سؤال
                {activeAttempt.examYear ? ` | دورة عام ${activeAttempt.examYear}م` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={onResumeExam}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>استئناف الامتحان</span>
            </button>
            <button
              type="button"
              onClick={abandonExam}
              className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء وبدء جديد</span>
            </button>
          </div>
        </div>
      )}

      {/* Subject Selection Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">مواد الشهادة الثانوية (12 مادة)</h2>
            <p className="text-xs text-slate-500 font-medium">
              حدد المادة لاختيار نوع الامتحان (محاكاة، سنوات 2000-2026، مراجعة المقرر)
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'all' ? 'bg-white text-emerald-900 shadow-xs' : ''
              }`}
            >
              الكل (12)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('common')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'common' ? 'bg-white text-emerald-900 shadow-xs' : ''
              }`}
            >
              المواد المشتركة
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('scientific')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'scientific' ? 'bg-white text-emerald-900 shadow-xs' : ''
              }`}
            >
              القسم العلمي
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('literary')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'literary' ? 'bg-white text-emerald-900 shadow-xs' : ''
              }`}
            >
              القسم الأدبي
            </button>
          </div>
        </div>

        {/* Error Banner with Retry */}
        {subjectsError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{subjectsError}</span>
            </div>
            <button
              type="button"
              onClick={fetchSubjects}
              disabled={isLoadingSubjects}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubjects ? 'animate-spin' : ''}`} />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isLoadingSubjects && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 h-52">
                <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                <div className="h-8 bg-slate-100 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingSubjects && !subjectsError && filteredSubjects.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-800">
              {dbSubjects.length === 0 ? 'لا توجد مواد مسجلة حالياً في قاعدة البيانات' : 'لا توجد مواد مسجلة لهذا القسم'}
            </h3>
            <p className="text-xs text-slate-500">
              {dbSubjects.length === 0 ? 'يرجى تسجيل المواد في الخادم أو النقر على إعادة المحاولة.' : 'اختر تصنيفاً آخر لاستعراض المواد المتاحة'}
            </p>
            {dbSubjects.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                عرض كافة المواد
              </button>
            )}
          </div>
        )}

        {/* Subjects Grid */}
        {!isLoadingSubjects && !subjectsError && filteredSubjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => {
            const matchedDb = dbSubjects.find((s) => s.slug === subject.slug || s.name_ar === subject.name_ar);
            const prog = progressMap[subject.slug] || { completionPercentage: 0, answeredQuestionIds: [] };
            const availableYears = curriculumStorage.getAvailableYears(subject.slug);

            return (
              <div
                key={subject.slug}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {renderSubjectIcon(subject.iconName)}
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        subject.category === 'common'
                          ? 'bg-slate-100 text-slate-700'
                          : subject.category === 'scientific'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {subject.category === 'common'
                        ? 'مادة مشتركة'
                        : subject.category === 'scientific'
                        ? 'مساق علمي'
                        : 'مساق أدبي'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {subject.name_ar}
                    </h3>
                    <div className="text-xs text-slate-400 font-medium">{subject.name_en}</div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {subject.description_ar}
                  </p>

                  {/* Student Curriculum Progress Bar & Stats */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>نسبة إنجاز المقرر:</span>
                      </span>
                      <span className="text-emerald-800">{prog.completionPercentage}%</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(prog.completionPercentage, 3)}%` }}
                      />
                    </div>

                    {availableYears.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-teal-800 font-semibold pt-0.5">
                        <Calendar className="w-3 h-3 text-teal-600" />
                        <span>متوفر امتحانات دورات: {availableYears.slice(0, 3).join('، ')}م</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span>{subject.defaultDurationMinutes} دقيقة</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectSubject(subject, matchedDb?.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>اختيار المادة</span>
                    <Play className="w-3 h-3 fill-white" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
