import React from 'react';
import { ContractSubject } from '../data/contractSubjects';
import { ArrowRight, ChevronLeft, BookOpen, Calendar } from 'lucide-react';

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
  return (
    <div className="max-w-xl w-full mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          title="الرجوع"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center">
          <span className="text-[13px] font-extrabold text-slate-800">
            امتحان تدريبي — {subject.name_ar}
          </span>
        </div>

        <div className="w-14" />
      </div>

      {/* Title */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">اختر نمط التدريب</h1>
        <p className="text-sm text-[#6B6B80] mt-1">
          حدد المنهجية التي ترغب بالتدرب عليها اليوم
        </p>
      </div>

      {/* 2 Options Cards */}
      <div className="space-y-4 pt-2">
        {/* Option 1: شامل من المقرر */}
        <button
          type="button"
          onClick={onSelectComprehensive}
          className="w-full h-[80px] bg-white rounded-[12px] border border-[#E0E0E0] p-4 flex items-center justify-between gap-4 hover:shadow-md hover:border-indigo-300 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5B4FE9] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[18px] font-bold text-[#1A1A2E]">شامل من المقرر</div>
              <div className="text-xs text-[#6B6B80]">أسئلة تغطي كافة الفصول والأبواب مع قياس التقدم</div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#5B4FE9] group-hover:bg-indigo-50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>

        {/* Option 2: سنوات سابقة */}
        <button
          type="button"
          onClick={onSelectYears}
          className="w-full h-[80px] bg-white rounded-[12px] border border-[#E0E0E0] p-4 flex items-center justify-between gap-4 hover:shadow-md hover:border-blue-300 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2196F3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[18px] font-bold text-[#1A1A2E]">سنوات سابقة</div>
              <div className="text-xs text-[#6B6B80]">أرشيف امتحانات الشهادة السودانية من عام 2000 إلى 2026</div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#2196F3] group-hover:bg-blue-50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
};
