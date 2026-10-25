import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ContractSubject } from '../data/contractSubjects';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';

export interface YearsPageProps {
  subject: ContractSubject;
  onBack: () => void;
  onStartExam: (year: number) => void;
  isLoading?: boolean;
}

export const YearsPage: React.FC<YearsPageProps> = ({
  subject,
  onBack,
  onStartExam,
  isLoading = false,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // Years range 2026 down to 2000
  const years: number[] = [];
  for (let y = 2026; y >= 2000; y--) {
    years.push(y);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `امتحانات الشهادة السودانية السابقة 2000-2026 - ${subject.name_ar}`,
    educationalLevel: 'Secondary',
  };

  return (
    <div className="max-w-2xl w-full mx-auto py-6 px-4 md:px-6 space-y-8" dir="rtl">
      {/* Helmet SEO */}
      <Helmet>
        <title>امتحانات الشهادة السودانية السابقة 2000-2026 | أول الشهادة</title>
        <meta
          name="description"
          content="حمّل امتحانات الشهادة السودانية الرسمية مع إجابات نموذجية. حلّ سنة بعد سنة بمعيار الوزارة."
        />
        <meta property="og:title" content="امتحانات الشهادة السودانية السابقة 2000-2026 | أول الشهادة" />
        <meta
          property="og:description"
          content="حمّل امتحانات الشهادة السودانية الرسمية مع إجابات نموذجية. حلّ سنة بعد سنة بمعيار الوزارة."
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

        <span className="text-xs font-bold text-[#2196F3] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          {subject.name_ar} — سنوات سابقة
        </span>
      </div>

      {/* Headline, Shata & Intro */}
      <div className="space-y-3">
        <h1 className="text-[28px] font-bold text-[#1A1A2E] leading-tight">
          📅 امتحانات الشهادة السودانية السابقة
        </h1>
        <p className="italic text-[18px] text-[#E07A3D] font-medium">
          اعرف سؤال اليوم... قبل أن يكون سؤال الغد
        </p>
        <p className="text-[16px] text-[#1A1A2E] leading-relaxed">
          بين يديك أرشيف كامل من امتحانات الشهادة السودانية الرسمية من عام 2000 إلى 2026.
        </p>
        <p className="text-[15px] font-bold text-[#2196F3]">
          كل امتحان... فرصة ذهبية.
        </p>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Section 1 */}
      <div className="space-y-4">
        <h2 className="text-[20px] font-semibold text-[#1A1A2E]">
          ماذا تجد هنا؟
        </h2>
        <ul className="space-y-3 text-[15px] text-[#1A1A2E]">
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">📚</span>
            <span>امتحانات رسمية سابقة (2000-2026)</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">✅</span>
            <span>إجابات نموذجية معتمدة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">🎯</span>
            <span>ترتيب أصلي كما ورد في الامتحان</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="shrink-0 text-base">📄</span>
            <span>تجربة كاملة لكل سنة</span>
          </li>
        </ul>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Section 2 */}
      <div className="space-y-4">
        <h2 className="text-[20px] font-semibold text-[#1A1A2E]">
          لماذا تذاكر الامتحانات السابقة؟
        </h2>
        <ul className="space-y-3 text-[15px] text-[#1A1A2E]">
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-[#2196F3] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>لأن السؤال يعيد نفسه بأشكال مختلفة</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-[#2196F3] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>لتتعرف على نمط الأسئلة الرسمي</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-[#2196F3] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>لتقيس مستواك بمعيار الوزارة الحقيقي</span>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-[#2196F3] flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span>لأن الطالب الذي حلّ 10 امتحانات سابقة ليس كغيره</span>
          </li>
        </ul>
      </div>

      {/* Motivational callout */}
      <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-[15px] text-[#1A1A2E] space-y-1">
        <div className="font-bold text-[#2196F3]">⚡ خطوة التميز:</div>
        <p className="leading-relaxed text-[#6B6B80]">
          لا تحلّ امتحاناً واحداً فقط. حلّ سنة بعد سنة، وستدخل قاعة الامتحان وقد رأيت كل شيء قبلاً.
        </p>
      </div>

      <div className="border-t border-[#E0E0E0]" />

      {/* Dropdown Selection */}
      <div className="space-y-3">
        <label htmlFor="exam-year-select" className="block text-[16px] font-bold text-[#1A1A2E]">
          📅 اختر السنة:
        </label>
        <div className="relative">
          <select
            id="exam-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full h-[64px] bg-white border border-[#E0E0E0] rounded-[16px] px-5 text-[18px] font-bold text-[#1A1A2E] appearance-none focus:outline-none focus:border-[#2196F3] focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-xs"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                امتحان دورة عام {y}م
              </option>
            ))}
          </select>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className="bg-blue-50/50 rounded-2xl border border-blue-200 p-4 space-y-1.5">
        <div className="text-[16px] font-bold text-[#1A1A2E]">
          📄 امتحان {subject.name_ar} — دورة {selectedYear}م
        </div>
        <div className="text-[14px] text-[#6B6B80]">
          • 📝 50 سؤال • ⏱️ 3 ساعات • ✅ إجابات نموذجية معتمدة
        </div>
      </div>

      {/* CTA Button */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onStartExam(selectedYear)}
          className="w-full h-[64px] bg-[#2196F3] hover:bg-[#1e88e5] active:scale-[0.99] text-white text-[20px] font-bold rounded-[16px] shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>🚀 ابدأ الامتحان</span>
        </button>

        {/* Note Box */}
        <div className="bg-[#FFF8E1] border-r-4 border-[#FF9800] p-4 text-[14px] text-[#6B6B80] rounded-l-xl">
          ⚠️ امتحان تدريبي — يمكنك التوقف والعودة
        </div>
      </div>
    </div>
  );
};
