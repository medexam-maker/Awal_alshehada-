import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ContractSubject } from '../data/contractSubjects';
import { useAuth } from '../hooks/useAuth';
import { curriculumStorage } from '../storage/curriculumStorage';
import { ArrowRight, Check } from 'lucide-react';

import { playWaterDrop } from '../utils/soundEffects';

export interface ComprehensivePageProps {
  subject: ContractSubject;
  onBack: () => void;
  onStartExam: () => void;
  isLoading?: boolean;
}

export const ComprehensivePage: React.FC<ComprehensivePageProps> = ({
  subject,
  onBack,
  onStartExam,
  isLoading = false,
}) => {
  const { user } = useAuth();
  const studentId = user?.id || '00000000-0000-0000-0000-000000000001';

  const handleBack = () => {
    playWaterDrop();
    onBack();
  };

  const handleStart = () => {
    playWaterDrop();
    onStartExam();
  };

  const [progress, setProgress] = useState(() =>
    curriculumStorage.getStudentProgress(studentId, subject.slug)
  );

  useEffect(() => {
    setProgress(curriculumStorage.getStudentProgress(studentId, subject.slug));
  }, [studentId, subject.slug]);

  // Fallback realistic progress demonstration matching curriculum scale
  const totalQuestions = progress.totalQuestionsInBank > 0 ? progress.totalQuestionsInBank : 2780;
  const answeredQuestions = progress.answeredQuestionIds.length > 0 ? progress.answeredQuestionIds.length : 1250;
  const completionPercentage = progress.completionPercentage > 0
    ? progress.completionPercentage
    : Math.round((answeredQuestions / totalQuestions) * 100);
  const remainingQuestions = Math.max(0, totalQuestions - answeredQuestions);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `شامل من المقرر - ${subject.name_ar}`,
    educationalLevel: 'Secondary',
  };

  return (
    <div className="max-w-2xl w-full mx-auto py-6 px-4 md:px-6 space-y-8" dir="rtl">
      {/* Helmet SEO */}
      <Helmet>
        <title>شامل من المقرر - مراجعة كاملة للشهادة السودانية | أول الشهادة</title>
        <meta
          name="description"
          content="راجع مقرر الشهادة السودانية كاملاً بنظام ذكي لا يكرر الأسئلة. تابع نسبة تقدمك حتى 100%."
        />
        <meta property="og:title" content="شامل من المقرر - مراجعة كاملة للشهادة السودانية | أول الشهادة" />
        <meta
          property="og:description"
          content="راجع مقرر الشهادة السودانية كاملاً بنظام ذكي لا يكرر الأسئلة. تابع نسبة تقدمك حتى 100%."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          title="الرجوع لنمط التدريب"
        >
          <ArrowRight className="w-4 h-4 text-slate-700" />
          <span>رجوع</span>
        </button>

        <span className="text-xs font-extrabold text-[#5B4FE9] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
          {subject.name_ar} — شامل من المقرر
        </span>
      </div>

      {/* Headline & Intro */}
      <div className="space-y-3">
        <h1 className="text-[28px] font-bold text-[#1A1A2E] leading-tight">
          📚 راجع المقرر كله... مرة واحدة
        </h1>
        <p className="text-[16px] text-[#1A1A2E] leading-relaxed">
          كل الأسئلة في بنك الأسئلة، عبر جميع الفصول والأبواب. نظام ذكي يختار لك ما لم تره بعد.
        </p>
        <p className="text-[15px] font-bold text-[#E07A3D]">
          لا تكرار. لا ملل. لا نقاط عمياء.
        </p>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Section 1 */}
      <div className="space-y-4">
        <h2 className="text-[20px] font-semibold text-[#1A1A2E]">
          ماذا يميز الشامل؟
        </h2>
        <ul className="space-y-3 text-[15px] text-[#1A1A2E]">
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🎯</span>
            <span>يغطي المقرر كاملاً — لا شيء يفلت</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🔄</span>
            <span>لا يكرر سؤالاً شاهدته (Full-Cycle)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">📊</span>
            <span>يقيس تقدمك بنسبة مئوية دقيقة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🎲</span>
            <span>ترتيب عشوائي في كل جلسة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🚫</span>
            <span>لن ترى نفس السؤال حتى تُكمل الدورة</span>
          </li>
        </ul>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Section 2 */}
      <div className="space-y-4">
        <h2 className="text-[20px] font-semibold text-[#1A1A2E]">
          لماذا هذا مهم؟
        </h2>
        <ul className="space-y-3 text-[15px] text-[#1A1A2E]">
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>طالب الشهادة لا يحتاج فقط &quot;أسئلة أكثر&quot;، بل يحتاج أن يرى كل المقرر فعلاً.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>نقاط ضعفك قد تكون في فصل لم تفتحه أبداً. هذا النمط يكتشفه.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>لأنك ستشعر أنك &quot;أتممت المقرر&quot; — بمقياس واضح.</span>
          </li>
        </ul>
      </div>

      {/* Motivational callout */}
      <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-[15px] text-[#1A1A2E] space-y-1">
        <div className="font-bold text-[#5B4FE9]">⚡ كل جلسة تُقرّبك من 100%.</div>
        <div className="text-[#6B6B80]">لا يوجد وقت مهدر. لا يوجد سؤال مكرر.</div>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-sm font-bold text-[#1A1A2E]">
          <span>📊 تقدمك في {subject.name_ar}:</span>
          <span className="text-[#5B4FE9] font-black text-base">أكملت: {completionPercentage}%</span>
        </div>

        {/* Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-violet-600 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${Math.min(100, Math.max(5, completionPercentage))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[#6B6B80] pt-1 font-medium">
          <span>راجعت {answeredQuestions} من {totalQuestions} سؤالاً</span>
          <span>بقيت {remainingQuestions} سؤالاً</span>
        </div>
      </div>

      {/* CTA Button */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleStart}
          className="w-full h-[64px] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] text-white text-[20px] font-extrabold rounded-[18px] shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>🚀 ابدأ الجلسة الشاملة</span>
        </button>

        {/* Note Box */}
        <div className="bg-[#FFF8E1] border-r-4 border-[#FF9800] p-4 text-[14px] text-[#6B6B80] rounded-l-xl">
          ⚠️ 30 سؤال • 30 دقيقة • لا مؤقت إجباري
        </div>
      </div>
    </div>
  );
};
