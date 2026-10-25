import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ContractSubject } from '../data/contractSubjects';
import { ArrowRight, Check } from 'lucide-react';

export interface SimulatorPageProps {
  subject: ContractSubject;
  onBack: () => void;
  onStartExam: () => void;
  isLoading?: boolean;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  subject,
  onBack,
  onStartExam,
  isLoading = false,
}) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `محاكاة امتحان الشهادة السودانية الكاملة - ${subject.name_ar}`,
    educationalLevel: 'Secondary',
  };

  const durationMinutes = subject.defaultDurationMinutes || 150;

  return (
    <div className="max-w-2xl w-full mx-auto py-6 px-4 md:px-6 space-y-8" dir="rtl">
      {/* Helmet SEO */}
      <Helmet>
        <title>محاكاة امتحان الشهادة السودانية الكاملة | أول الشهادة</title>
        <meta
          name="description"
          content="اختبر مستواك في ظروف شبيهة بالامتحان الحقيقي. نفس المدة، الأسئلة، الصعوبة."
        />
        <meta property="og:title" content="محاكاة امتحان الشهادة السودانية الكاملة | أول الشهادة" />
        <meta
          property="og:description"
          content="اختبر مستواك في ظروف شبيهة بالامتحان الحقيقي. نفس المدة، الأسئلة، الصعوبة."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E0E0E0]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          {subject.name_ar} — محاكاة رسمية
        </span>
      </div>

      {/* Headline, Shata & Intro */}
      <div className="space-y-3">
        <h1 className="text-[28px] font-bold text-[#1A1A2E] leading-tight">
          🎯 محاكاة كاملة لامتحان الشهادة
        </h1>
        <p className="italic text-[18px] text-[#E07A3D] font-medium">
          &quot;الامتحان... قبل الامتحان&quot;
        </p>
        <p className="text-[16px] text-[#1A1A2E] leading-relaxed">
          هذه ليست مجرد تدريب. هذه تجربة كاملة تحاكي امتحان الشهادة السودانية الرسمي بنسبة 100%.
        </p>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Section 1 */}
      <div className="space-y-4">
        <h2 className="text-[20px] font-semibold text-[#1A1A2E]">
          ماذا تحاكي؟
        </h2>
        <ul className="space-y-3 text-[15px] text-[#1A1A2E]">
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">⏱️</span>
            <span>نفس المدة الزمنية الرسمية ({durationMinutes} دقيقة)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">📝</span>
            <span>نفس عدد الأسئلة والدرجات المعتمدة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🎯</span>
            <span>نفس مستوى الصعوبة وتوزيع الأبواب</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🔒</span>
            <span>بدون اتصال بالإنترنت (Zero-Request) أثناء الجلسة لضمان التركيز</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">📄</span>
            <span>نفس نموذج ورقة الامتحان الرسمية الموزعة في المراكز</span>
          </li>
        </ul>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Section 2 */}
      <div className="space-y-4">
        <h2 className="text-[20px] font-semibold text-[#1A1A2E]">
          لماذا تجربها؟
        </h2>
        <ul className="space-y-3 text-[15px] text-[#1A1A2E]">
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#4CAF50] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>تقيس مستواك الحقيقي في المادة بدقة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#4CAF50] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>تكتشف نقاط ضعفك قبل يوم الامتحان بوقت كافٍ</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#4CAF50] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>تتعوّد على ضغط الوقت وإدارة ساعات الامتحان</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#4CAF50] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>تبني ثقة حقيقية ورهبة منزوعة في قاعة الامتحان</span>
          </li>
        </ul>
      </div>

      {/* Motivational callout */}
      <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-[15px] text-[#1A1A2E] space-y-1">
        <div className="font-bold text-[#4CAF50]">⚡ محاكاة واحدة = خطوة كبيرة نحو النجاح.</div>
      </div>

      {/* CTA Button */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={onStartExam}
          className="w-full h-[64px] bg-[#4CAF50] hover:bg-[#43a047] active:scale-[0.99] text-white text-[20px] font-bold rounded-[16px] shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>🚀 ابدأ المحاكاة</span>
        </button>

        {/* Note Box */}
        <div className="bg-[#FFF8E1] border-r-4 border-[#FF9800] p-4 text-[14px] text-[#6B6B80] rounded-l-xl">
          ⚠️ المدة: {durationMinutes} دقيقة • لا يمكن التوقف بعد البدء • محاكاة واحدة أسبوعياً
        </div>
      </div>
    </div>
  );
};
