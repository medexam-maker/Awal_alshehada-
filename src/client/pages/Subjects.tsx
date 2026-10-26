import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useExam } from '../context/ExamContext';
import { apiClient } from '../api/apiClient';
import { TWELVE_CONTRACT_SUBJECTS, ContractSubject } from '../data/contractSubjects';
import { curriculumStorage } from '../storage/curriculumStorage';
import { playWaterDrop, soundEffects } from '../utils/soundEffects';
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
  Sliders,
  Calendar,
  RefreshCw,
  Volume2,
  VolumeX,
  Droplets,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

interface SubjectsProps {
  onSelectSubject: (subject: ContractSubject, dbId?: string) => void;
  onResumeExam: () => void;
  onOpenAdmin?: () => void;
}

// Vibrant youthful glossy gradient themes per subject (inspired by Bankak 3D app icon design)
const SUBJECT_VISUAL_THEMES: Record<
  string,
  {
    gradient: string;
    shadowColor: string;
    badgeBg: string;
    badgeText: string;
    tagAr: string;
  }
> = {
  'islamic-studies': {
    gradient: 'from-emerald-400 via-emerald-600 to-teal-800',
    shadowColor: 'shadow-emerald-600/30',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    tagAr: 'مادة أساسية',
  },
  'military-science': {
    gradient: 'from-amber-600 via-amber-700 to-slate-900',
    shadowColor: 'shadow-amber-700/30',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    tagAr: 'القسم الأدبي',
  },
  'arabic-language': {
    gradient: 'from-rose-500 via-red-600 to-amber-900',
    shadowColor: 'shadow-rose-600/30',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    tagAr: 'مادة أساسية',
  },
  'english-language': {
    gradient: 'from-sky-400 via-blue-600 to-indigo-900',
    shadowColor: 'shadow-blue-600/30',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    tagAr: 'مادة أساسية',
  },
  'basic-mathematics': {
    gradient: 'from-amber-400 via-orange-500 to-rose-700',
    shadowColor: 'shadow-orange-600/30',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    tagAr: 'مادة أساسية',
  },
  'specialized-mathematics': {
    gradient: 'from-fuchsia-500 via-purple-600 to-slate-900',
    shadowColor: 'shadow-purple-600/30',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    tagAr: 'القسم العلمي',
  },
  'chemistry': {
    gradient: 'from-teal-300 via-teal-500 to-emerald-900',
    shadowColor: 'shadow-teal-600/30',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    tagAr: 'القسم العلمي',
  },
  'physics': {
    gradient: 'from-cyan-400 via-sky-600 to-blue-900',
    shadowColor: 'shadow-cyan-600/30',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    tagAr: 'القسم العلمي',
  },
  'geography': {
    gradient: 'from-orange-400 via-amber-600 to-stone-800',
    shadowColor: 'shadow-amber-600/30',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    tagAr: 'القسم الأدبي',
  },
  'history': {
    gradient: 'from-yellow-400 via-amber-600 to-amber-950',
    shadowColor: 'shadow-yellow-600/30',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    tagAr: 'القسم الأدبي',
  },
  'biology': {
    gradient: 'from-lime-400 via-emerald-600 to-green-950',
    shadowColor: 'shadow-lime-600/30',
    badgeBg: 'bg-lime-50',
    badgeText: 'text-emerald-800',
    tagAr: 'القسم العلمي',
  },
  'computer-science': {
    gradient: 'from-cyan-400 via-indigo-600 to-slate-950',
    shadowColor: 'shadow-indigo-600/30',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    tagAr: 'القسم الأدبي',
  },
};

export const Subjects: React.FC<SubjectsProps> = ({
  onSelectSubject,
  onResumeExam,
  onOpenAdmin,
}) => {
  const { user } = useAuth();
  const { activeAttempt, abandonExam } = useExam();
  const [dbSubjects, setDbSubjects] = useState<Array<{ id: string; name_ar: string; slug: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'scientific' | 'literary'>('all');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.isMuted);

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

  const toggleSound = () => {
    const nextState = soundEffects.toggleMute();
    setIsMuted(nextState);
    if (!nextState) {
      playWaterDrop();
    }
  };

  const handleSubjectClick = (subject: ContractSubject, dbId?: string) => {
    playWaterDrop();
    onSelectSubject(subject, dbId);
  };

  const renderSubjectIcon = (iconName: string) => {
    const iconClass = 'w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow';
    switch (iconName) {
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Cross':
        return <Cross className={iconClass} />;
      case 'Shield':
      case 'ShieldCheck':
        return <ShieldCheck className={iconClass} />;
      case 'Feather':
        return <Feather className={iconClass} />;
      case 'Globe':
        return <Globe className={iconClass} />;
      case 'Divide':
        return <Divide className={iconClass} />;
      case 'Calculator':
        return <Calculator className={iconClass} />;
      case 'FlaskConical':
        return <FlaskConical className={iconClass} />;
      case 'Zap':
        return <Zap className={iconClass} />;
      case 'Compass':
        return <Compass className={iconClass} />;
      case 'Landmark':
        return <Landmark className={iconClass} />;
      case 'Dna':
        return <Dna className={iconClass} />;
      case 'Cpu':
        return <Cpu className={iconClass} />;
      default:
        return <BookOpen className={iconClass} />;
    }
  };

  // Always offer full 12 contract subjects for smooth UX even during brief fetch
  const filteredSubjects = TWELVE_CONTRACT_SUBJECTS.filter((subject) => {
    if (selectedCategory === 'all') return true;
    return subject.category === selectedCategory;
  });

  return (
    <div className="space-y-6 py-2 max-w-5xl w-full mx-auto px-2 sm:px-4">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>منصة أول الشهادة المعتمدة</span>
            </span>

            <div className="flex items-center gap-2">
              {/* Sound Toggle Button (Discreet Icon Only) */}
              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center justify-center p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 cursor-pointer"
                title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
                aria-label={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-teal-300" />
                )}
              </button>

              {user?.role === 'admin' && onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-xs font-bold text-white transition-all border border-white/20 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-300" />
                  <span>لوحة الأدمن</span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            مرحباً بك، {user?.fullName || 'عزيزي الطالب'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
            اضغط على أي مادة للانتقال إلى امتحانات السنوات السابقة، التدريب الشامل، أو محاكاة الامتحان النهائي الحقيقي.
          </p>
        </div>
      </div>

      {/* Active Attempt In-Progress Banner */}
      {activeAttempt && (
        <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-amber-950 text-sm sm:text-base">
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
              className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
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

      {/* Subject Selection Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>مواد الشهادة الثانوية (12 مادة)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              اختر المادة للدخول المباشر إلى امتحانات الدورات أو التدريب الشامل
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              جميع المواد (12)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('scientific')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'scientific' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              القسم العلمي (4)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('literary')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === 'literary' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              القسم الأدبي (4)
            </button>
          </div>
        </div>

        {/* Server Fetch Error Banner with Retry */}
        {subjectsError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
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

        {/* 
          Bankak-Style Interactive App Icons Grid:
          - Strictly 2 per row on mobile ("كل اثنين في سطر يعرض صفحة الهاتف") -> grid-cols-2
          - 3 per row on tablet -> sm:grid-cols-3
          - 4 per row on desktop -> md:grid-cols-4
        */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-7 gap-x-4 sm:gap-x-6 pt-3 pb-8">
          {filteredSubjects.map((subject) => {
            const matchedDb = dbSubjects.find((s) => s.slug === subject.slug || s.name_ar === subject.name_ar);
            const prog = progressMap[subject.slug] || { completionPercentage: 0, answeredQuestionIds: [] };
            const visual = SUBJECT_VISUAL_THEMES[subject.slug] || {
              gradient: 'from-emerald-400 via-emerald-600 to-teal-800',
              shadowColor: 'shadow-emerald-600/30',
              badgeBg: 'bg-emerald-50',
              badgeText: 'text-emerald-700',
              tagAr: 'مقرر الشهادة',
            };

            return (
              <div
                key={subject.slug}
                onClick={() => handleSubjectClick(subject, matchedDb?.id)}
                className="group flex flex-col items-center cursor-pointer select-none transition-transform hover:-translate-y-1 active:scale-95 duration-200"
              >
                {/* 3D Glossy Squircle App Icon (Bankak style) */}
                <div
                  className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-[26px] sm:rounded-[30px] p-1.5 flex items-center justify-center bg-gradient-to-br ${visual.gradient} shadow-xl ${visual.shadowColor} transition-all duration-200 overflow-hidden border border-white/25 hover:shadow-2xl`}
                  style={{
                    boxShadow:
                      '0 12px 24px -6px rgba(0,0,0,0.22), 0 4px 8px -2px rgba(0,0,0,0.1), inset 0 2px 2px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Top Gloss Curved Sheen Reflection */}
                  <div className="absolute inset-x-1.5 top-1 h-[46%] rounded-t-[22px] sm:rounded-t-[26px] bg-gradient-to-b from-white/45 via-white/15 to-transparent pointer-events-none" />

                  {/* Subtle Corner Ambient Glow */}
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/15 rounded-full blur-md pointer-events-none" />

                  {/* Centered White Symbol */}
                  <div className="relative z-10 transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                    {renderSubjectIcon(subject.iconName)}
                  </div>

                  {/* Progress Indicator Pip */}
                  {prog.completionPercentage > 0 && (
                    <div className="absolute top-2 left-2 z-20 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[9px] font-extrabold text-white border border-white/20">
                      {prog.completionPercentage}%
                    </div>
                  )}

                  {/* Interactive Water Ripple Glow on hover */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none rounded-[26px] sm:rounded-[30px]" />
                </div>

                {/* Subject Name Label Directly Underneath */}
                <h3 className="font-extrabold text-[15px] sm:text-base text-slate-800 text-center leading-snug mt-3 px-1 group-hover:text-emerald-700 transition-colors">
                  {subject.name_ar}
                </h3>

                {/* Subtitle / Department Pill */}
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${visual.badgeBg} ${visual.badgeText}`}
                  >
                    {visual.tagAr}
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

