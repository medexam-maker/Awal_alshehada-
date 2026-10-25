import React from 'react';
import { ContractSubject } from '../data/contractSubjects';
import { playWaterDrop } from '../utils/soundEffects';
import {
  ArrowRight,
  ChevronLeft,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react';

export interface TrainingSetupPageProps {
  subject: ContractSubject;
  onBack: () => void;
  onSelectComprehensive: () => void;
  onSelectYears: () => void;
}

export const TrainingSetupPage: React.FC<TrainingSetupPageProps> = ({
  subject,
  onBack,
  onSelectComprehensive,
  onSelectYears,
}) => {
  const handleBack = () => {
    playWaterDrop();
    onBack();
  };

  const handleComprehensive = () => {
    playWaterDrop();
    onSelectComprehensive();
  };

  const handleYears = () => {
    playWaterDrop();
    onSelectYears();
  };

  return (
    <div className="max-w-xl w-full mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          title="الرجوع للخطوة السابقة"
        >
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            امتحان تدريبي — {subject.name_ar}
          </span>
        </div>

        <div className="w-14" />
      </div>

      {/* Title */}
      <div className="text-center pt-1 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          اختر نمط التدريب
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          حدد المنهجية التي ترغب بالتدرب عليها اليوم في <span className="font-bold text-emerald-700">{subject.name_ar}</span>
        </p>
      </div>

      {/* 2 Options Cards - Vibrant High-Energy Colors */}
      <div className="space-y-4 pt-2">
        {/* Option 1: شامل من المقرر - Electric Indigo & Violet */}
        <button
          type="button"
          onClick={handleComprehensive}
          className="relative overflow-hidden w-full min-h-[92px] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl shadow-indigo-600/25 hover:shadow-2xl hover:shadow-indigo-600/40 border border-white/20 transition-all text-right cursor-pointer group active:scale-[0.99] hover:-translate-y-0.5"
        >
          {/* Subtle Top Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-inner border border-white/30 group-hover:scale-110 group-hover:bg-white/25 transition-transform">
              <BookOpen className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[19px] sm:text-xl font-extrabold tracking-tight">شامل من المقرر</span>
                <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-200" /> بدون أي تكرار
                </span>
              </div>
              <div className="text-xs sm:text-sm text-indigo-100 font-medium mt-1 leading-snug">
                أسئلة تغطي كافة الفصول والأبواب مع قياس نسبة الإنجاز حتى 100%
              </div>
            </div>
          </div>

          <div className="relative z-10 w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:translate-x-[-4px] group-hover:bg-white/25 transition-all border border-white/20">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>

        {/* Option 2: سنوات سابقة - Electric Emerald & Mint Teal */}
        <button
          type="button"
          onClick={handleYears}
          className="relative overflow-hidden w-full min-h-[92px] bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-700 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl shadow-teal-600/25 hover:shadow-2xl hover:shadow-teal-600/40 border border-white/20 transition-all text-right cursor-pointer group active:scale-[0.99] hover:-translate-y-0.5"
        >
          {/* Subtle Top Sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-inner border border-white/30 group-hover:scale-110 group-hover:bg-white/25 transition-transform">
              <Calendar className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[19px] sm:text-xl font-extrabold tracking-tight">سنوات سابقة</span>
                <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5 text-amber-300" /> دورات 2000 - 2026
                </span>
              </div>
              <div className="text-xs sm:text-sm text-teal-100 font-medium mt-1 leading-snug">
                أرشيف امتحانات الشهادة السودانية الرسمية مع الإجابات النموذجية المعتمدة
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
