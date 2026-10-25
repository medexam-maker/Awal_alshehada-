import React from 'react';
import { ContractSubject } from '../data/contractSubjects';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowRight,
  ChevronLeft,
  Target,
  Timer,
  Sliders,
  User as UserIcon,
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

  return (
    <div className="max-w-xl w-full mx-auto py-6 px-4 space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          title="العودة لقائمة المواد"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        {/* Center: Subject Identity */}
        <div className="text-center">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
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
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">اختر نوع الامتحان</h1>
        <p className="text-sm text-[#6B6B80] mt-1">
          حدد طريقة اختبار معلوماتك في مادة {subject.name_ar}
        </p>
      </div>

      {/* 2 Options Cards */}
      <div className="space-y-4 pt-2">
        {/* Option 1: امتحان تدريبي */}
        <button
          type="button"
          onClick={onSelectTraining}
          className="w-full h-[80px] bg-white rounded-[12px] border border-[#E0E0E0] p-4 flex items-center justify-between gap-4 hover:shadow-md hover:border-emerald-300 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5B4FE9] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[18px] font-bold text-[#1A1A2E]">امتحان تدريبي</div>
              <div className="text-xs text-[#6B6B80]">مراجعة شاملة للمقرر أو امتحانات السنوات السابقة</div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#5B4FE9] group-hover:bg-indigo-50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>

        {/* Option 2: محاكاة كاملة */}
        <button
          type="button"
          onClick={onSelectSimulator}
          className="w-full h-[80px] bg-white rounded-[12px] border border-[#E0E0E0] p-4 flex items-center justify-between gap-4 hover:shadow-md hover:border-emerald-300 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#4CAF50] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[18px] font-bold text-[#1A1A2E]">محاكاة كاملة</div>
              <div className="text-xs text-[#6B6B80]">تجربة مطابقة للظروف الرسمية لامتحان الشهادة</div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#4CAF50] group-hover:bg-emerald-50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
};
