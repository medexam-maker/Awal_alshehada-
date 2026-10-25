import React from 'react';
import { ContractSubject } from '../data/contractSubjects';
import { useAuth } from '../hooks/useAuth';
import { playWaterDrop } from '../utils/soundEffects';
import {
  ArrowRight,
  ChevronLeft,
  Target,
  Timer,
  Sliders,
  User as UserIcon,
  Sparkles,
  Flame,
} from 'lucide-react';

export interface ExamSetupPageProps {
  subject: ContractSubject;
  dbSubjectId?: string;
  onBack: () => void;
  onSelectTraining: () => void;
  onSelectSimulator: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
}

export const ExamSetupPage: React.FC<ExamSetupPageProps> = ({
  subject,
  onBack,
  onSelectTraining,
  onSelectSimulator,
  onOpenAdmin,
  onOpenProfile,
}) => {
  const { user } = useAuth();

  const handleBack = () => {
    playWaterDrop();
    onBack();
  };

  const handleTraining = () => {
    playWaterDrop();
    onSelectTraining();
  };

  const handleSimulator = () => {
    playWaterDrop();
    onSelectSimulator();
  };

  return (
    <div className="max-w-xl w-full mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          title="العودة لقائمة المواد"
        >
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <span>رجوع للمواد</span>
        </button>

        {/* Center: Subject Identity */}
        <div className="text-center">
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
            {subject.name_ar}
          </span>
        </div>

        {/* Left Actions: Profile & Admin (Admin only) */}
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-slate-200"
              title="لوحة تحكم المسؤول"
            >
              <Sliders className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200"
              title="الملف الشخصي"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-center pt-1 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          اختر نوع الامتحان
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          حدد طريقة اختبار معلوماتك في مادة <span className="font-bold text-emerald-700">{subject.name_ar}</span>
        </p>
      </div>

      {/* 2 Options Cards - Vibrant High-Energy Design for 18yo Youth */}
      <div className="space-y-4 pt-2">
        {/* Option 1: امتحان تدريبي - Electric Violet & Indigo */}
        <button
          type="button"
          onClick={handleTraining}
          className="relative overflow-hidden w-full min-h-[92px] bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl shadow-indigo-600/25 hover:shadow-2xl hover:shadow-indigo-600/40 border border-white/20 transition-all text-right cursor-pointer group active:scale-[0.99] hover:-translate-y-0.5"
        >
          {/* Subtle Top Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-inner border border-white/30 group-hover:scale-110 group-hover:bg-white/25 transition-transform">
              <Target className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[19px] sm:text-xl font-extrabold tracking-tight">امتحان تدريبي</span>
                <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" /> مرن وبدون ضغط
                </span>
              </div>
              <div className="text-xs sm:text-sm text-indigo-100 font-medium mt-1 leading-snug">
                مراجعة شاملة للمقرر كاملاً أو حل امتحانات السنوات السابقة
              </div>
            </div>
          </div>

          <div className="relative z-10 w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:translate-x-[-4px] group-hover:bg-white/25 transition-all border border-white/20">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>

        {/* Option 2: محاكاة كاملة - High-Voltage Sunset Orange & Rose */}
        <button
          type="button"
          onClick={handleSimulator}
          className="relative overflow-hidden w-full min-h-[92px] bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl shadow-orange-600/25 hover:shadow-2xl hover:shadow-orange-600/40 border border-white/20 transition-all text-right cursor-pointer group active:scale-[0.99] hover:-translate-y-0.5"
        >
          {/* Subtle Top Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-inner border border-white/30 group-hover:scale-110 group-hover:bg-white/25 transition-transform">
              <Timer className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[19px] sm:text-xl font-extrabold tracking-tight">محاكاة كاملة</span>
                <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-amber-200 fill-amber-300" /> أجواء الامتحان الحقيقي
                </span>
              </div>
              <div className="text-xs sm:text-sm text-orange-100 font-medium mt-1 leading-snug">
                تجربة رسمية مطابقة لشروط وظروف امتحان الشهادة السودانية
              </div>
            </div>
          </div>

          <div className="relative z-10 w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:translate-x-[-4px] group-hover:bg-white/25 transition-all border border-white/20">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
};
