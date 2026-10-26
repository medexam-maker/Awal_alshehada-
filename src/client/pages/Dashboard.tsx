import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useExam } from '../context/ExamContext';
import { DEMO_SUBJECTS, SubjectMeta } from '../data/demoCurriculum';
import {
  BookOpen,
  Feather,
  Globe,
  Divide,
  Zap,
  FlaskConical,
  Dna,
  Landmark,
  Compass,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  AlertCircle,
  CheckCircle2,
  Filter,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface DashboardProps {
  onStartExam: () => void;
  onResumeExam: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartExam, onResumeExam }) => {
  const { user } = useAuth();
  const { activeAttempt, startNewExam, abandonExam, isLoading } = useExam();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'common' | 'scientific' | 'literary'>('all');
  const [examMode, setExamMode] = useState<'simulator' | 'training'>('simulator');
  const [bankType, setBankType] = useState<'comprehensive' | 'training'>('comprehensive');
  const [startingSubjectId, setStartingSubjectId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Icon mapping
  const renderSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen':
        return <BookOpen className="w-6 h-6 text-emerald-600" />;
      case 'Feather':
        return <Feather className="w-6 h-6 text-amber-600" />;
      case 'Globe':
        return <Globe className="w-6 h-6 text-sky-600" />;
      case 'Divide':
        return <Divide className="w-6 h-6 text-indigo-600" />;
      case 'Zap':
        return <Zap className="w-6 h-6 text-yellow-600" />;
      case 'FlaskConical':
        return <FlaskConical className="w-6 h-6 text-teal-600" />;
      case 'Dna':
        return <Dna className="w-6 h-6 text-rose-600" />;
      case 'Landmark':
        return <Landmark className="w-6 h-6 text-purple-600" />;
      case 'Compass':
        return <Compass className="w-6 h-6 text-orange-600" />;
      default:
        return <BookOpen className="w-6 h-6 text-emerald-600" />;
    }
  };

  const filteredSubjects = DEMO_SUBJECTS.filter((subject) => {
    if (selectedCategory === 'all') return true;
    return subject.category === selectedCategory;
  });

  const handleStartExam = async (subject: SubjectMeta) => {
    setErrorMsg(null);
    setStartingSubjectId(subject.id);
    const res = await startNewExam(subject.id, bankType, examMode);
    setStartingSubjectId(null);
    if (res.success) {
      onStartExam();
    } else {
      setErrorMsg(res.error || 'تعذر بدء الامتحان، يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="space-y-8 py-2">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>منصة أول الشهادة المعتمدة لطلاب السودان</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            مرحباً بك، {user?.fullName || 'عزيزي الطالب'} 👋
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
            استعد لامتحانات الشهادة الثانوية السودانية باختبارات قياسية تحاكي أوراق الامتحانات السابقة،
            مع خاصية الصمود التام والعمل دون انقطاع حتى في ظل ضعف أو انقطاع شبكة الإنترنت.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-emerald-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 15 نمط أسئلة معتمد
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ضابط عدم الطلب (Zero-Request)
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> تصحيح آلي فوري معتمد
            </span>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
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
                {activeAttempt.expiresAt && ' | خاضع للمؤقت'}
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
              <span>استئناف الامتحان الآن</span>
            </button>
            <button
              type="button"
              onClick={abandonExam}
              className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء والبدء من جديد</span>
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Exam Mode & Configuration Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">إعدادات جلسة الاختبار</h2>
            <p className="text-xs text-slate-500 font-medium">اختر طريقة الاختبار التي تناسب خطتك الدراسية</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">طبيعة البنك:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBankType('comprehensive')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  bankType === 'comprehensive' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                شامل المنهج (Full Cycle)
              </button>
              <button
                type="button"
                onClick={() => setBankType('training')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  bankType === 'training' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                مجموعات امتحانات سابقة
              </button>
            </div>
          </div>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setExamMode('simulator')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
              examMode === 'simulator'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                examMode === 'simulator' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Timer className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">وضع محاكاة الامتحان (Simulator)</span>
                {examMode === 'simulator' && (
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    محدد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                مؤقت امتحاني صارم (ساعتان ونصف إلى ثلاث ساعات) مطابق للشهادة السودانية، ضابط عدم الطلب Zero-Request أثناء الحل،
                ولا تظهر النتيجة إلا بعد التسليم النهائي.
              </p>
            </div>
          </div>

          <div
            onClick={() => setExamMode('training')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
              examMode === 'training'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                examMode === 'training' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">وضع التدريب الذاتي (Training)</span>
                {examMode === 'training' && (
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    محدد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                مذاكرة مرنة بدون قيود زمنية، تتيح لك استعراض الإجابات النموذجية والشروحات التفصيلية والتصحيح المرحلي
                لتعزيز الفهم والاستيعاب.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Subjects Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">مواد الشهادة الثانوية السودانية</h2>
            <p className="text-xs text-slate-500 font-medium">اختر المادة للبدء في الاختبار مباشرة</p>
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
              جميع المواد
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

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => {
            const isStarting = startingSubjectId === subject.id;
            return (
              <div
                key={subject.id}
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
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span>{subject.durationMinutes} دقيقة</span>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || isStarting}
                    onClick={() => handleStartExam(subject)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isStarting ? (
                      <span>جاري البدء...</span>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>بدء الامتحان</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
