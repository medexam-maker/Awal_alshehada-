import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { TWELVE_CONTRACT_SUBJECTS, ContractSubject } from '../data/contractSubjects';
import {
  BookOpen,
  Calendar,
  Clock,
  Award,
  Play,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  GraduationCap,
  Share2,
  AlertOctagon,
  Home,
} from 'lucide-react';

interface ExamLandingPageProps {
  subjectSlug: string;
  year: number;
  onStartExam: (subject: ContractSubject, year: number) => void;
  onNavigateYear: (subjectSlug: string, year: number) => void;
  onBackToSubjects: () => void;
}

// Question count mapping per subject curriculum standard
const SUBJECT_QUESTION_COUNTS: Record<string, number> = {
  'islamic-studies': 40,
  'christian-studies': 40,
  'arabic-language': 45,
  'english-language': 40,
  'basic-mathematics': 30,
  'specialized-mathematics': 35,
  'chemistry': 35,
  'physics': 35,
  'geography': 40,
  'history': 40,
  'biology': 35,
  'computer-science': 35,
};

export const ExamLandingPage: React.FC<ExamLandingPageProps> = ({
  subjectSlug,
  year,
  onStartExam,
  onNavigateYear,
  onBackToSubjects,
}) => {
  const isYearValid = Number.isInteger(year) && year >= 2000 && year <= 2026;
  const subject = TWELVE_CONTRACT_SUBJECTS.find((s) => s.slug === subjectSlug);

  // Handle 404 condition for invalid year or unknown subject
  if (!isYearValid || !subject) {
    return (
      <div className="max-w-2xl w-full mx-auto py-16 px-4 text-center space-y-6" dir="rtl">
        <Helmet>
          <title>404 - صفحة الامتحان غير موجودة | أول الشهادة</title>
          <meta name="robots" content="noindex, follow" />
          <meta name="description" content="عذراً، الامتحان المطلوب غير موجود أو دورة العام خارج النطاق المعتمد (2000 - 2026)." />
        </Helmet>

        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <AlertOctagon className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs font-black tracking-widest uppercase bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
            خطأ 404 (Not Found)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            عذراً، صفحة الامتحان هذه غير متوفرة
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            امتحانات الشهادة السودانية المعتمدة في منصة أول الشهادة تغطي الأعوام من 2000 حتى 2026 فقط. لم نقم بإعادة توجيهك صامتاً لتجنب تضليل نتائج البحث.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onBackToSubjects}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>العودة لقائمة المواد المعتمدة</span>
          </button>
        </div>
      </div>
    );
  }

  // Available years from 2026 down to 2000 (27 sessions)
  const allYears: number[] = [];
  for (let y = 2026; y >= 2000; y--) {
    allYears.push(y);
  }

  const questionCount = SUBJECT_QUESTION_COUNTS[subject.slug] || 35;
  const durationMinutes = subject.defaultDurationMinutes || 150;

  const pageTitle = `امتحان ${subject.name_ar} ${year} - محاكي امتحان الشهادة السودانية | أول الشهادة`;
  const pageDescription = `خش جرب امتحان ${subject.name_ar} ${year} محاكي تجربة الامتحان الحقيقي، بتصحيح فوري وإجابة نموذجية بعد كل سؤال وشرح منهجي بدون تحميل PDF.`;
  const canonicalUrl = `https://awalalshehada.netlify.app/exams/${subject.slug}/${year}`;
  const ogImageUrl = `https://awalalshehada.netlify.app/og-image.png`;

  // WhatsApp and Telegram share links
  const whatsappText = `لقيت محاكي امتحان ${subject.name_ar} ${year} بتصحيح فوري وإجابات نموذجية بدون تحميل PDF: ${canonicalUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const telegramText = `محاكي امتحان ${subject.name_ar} ${year} - الشهادة السودانية بتصحيح فوري وشرح منهجي:`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(telegramText)}`;

  // Structured Data (JSON-LD)
  const quizSchema = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `امتحان ${subject.name_ar} دورة ${year}م — الشهادة السودانية`,
    description: pageDescription,
    learningResourceType: 'Exam Simulator',
    educationalLevel: 'Sudanese Secondary Certificate',
    isAccessibleForFree: true,
    timeRequired: `PT${durationMinutes}M`,
    about: {
      '@type': 'Thing',
      name: subject.name_ar,
    },
    provider: {
      '@type': 'EducationalOrganization',
      name: 'أول الشهادة',
      url: 'https://awalalshehada.netlify.app',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: 'https://awalalshehada.netlify.app/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: subject.name_ar,
        item: `https://awalalshehada.netlify.app/exams/${subject.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${year}`,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <div className="max-w-5xl w-full mx-auto py-4 space-y-8" dir="rtl">
      {/* Dynamic SEO Meta via react-helmet-async */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* OpenGraph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card */}
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* JSON-LD Schemas */}
        <script type="application/ld+json">{JSON.stringify(quizSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Breadcrumb Navigation Bar */}
      <nav aria-label="مسار التصفح" className="flex items-center gap-2 text-xs font-bold text-slate-500 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={onBackToSubjects}
          className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Home className="w-3.5 h-3.5 text-emerald-600" />
          <span>الرئيسية</span>
        </button>
        <span className="text-slate-300">/</span>
        <button
          type="button"
          onClick={onBackToSubjects}
          className="hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
        >
          {subject.name_ar}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-extrabold shrink-0">
          دورة عام {year}م
        </span>
      </nav>

      {/* Main Hero Card for Subject + Year */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 md:p-10 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-blue-300 border border-blue-400/30">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>دورة عام {year}م</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>محاكي امتحانات الشهادة السودانية</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-amber-300 border border-amber-400/30">
              <span>تصحيح فوري وشرح منهجي</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            امتحان {subject.name_ar} {year} - محاكي امتحان الشهادة السودانية | أول الشهادة
          </h1>

          <p className="text-sm sm:text-base text-slate-200/95 leading-relaxed font-medium">
            خش جرب امتحان {subject.name_ar} لدورة عام {year}م في بيئة محاكاة مطابقة لظروف الامتحان، بتصحيح فوري لكل سؤال مع الإجابات النموذجية المعتمدة والتوجيه المنهجي خطوة بخطوة، دون الحاجة لتحميل ملفات PDF أو طباعة أوراق.
          </p>

          {/* Mandatory Crawlable Static Overview Paragraph for Google and Students */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 text-xs sm:text-sm leading-relaxed font-semibold">
            {`امتحان ${subject.name_ar} سنة ${year} - محاكي تفاعلي يحاكي تجربة الامتحان الحقيقي. عدد الأسئلة ${questionCount} سؤالاً، الزمن ${durationMinutes} دقيقة، بتصحيح فوري وإجابة نموذجية بعد كل سؤال، بدون تحميل PDF.`}
          </div>

          {/* Quick Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>الزمن المحدد</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                {durationMinutes} دقيقة
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                <span>طبيعة الحل</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                محاكي تفاعلي
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>التصحيح</span>
              </div>
              <div className="text-base font-black text-emerald-300 mt-0.5">
                فوري وشامل
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>الدرجة العظمى</span>
              </div>
              <div className="text-base font-black text-white mt-0.5">
                100 درجة
              </div>
            </div>
          </div>

          {/* Primary CTA Button and Social Share Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => onStartExam(subject, year)}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-base transition-all shadow-lg hover:shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 group shrink-0"
            >
              <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
              <span>ابدأ حل امتحان {subject.name_ar} {year} الآن</span>
            </button>

            <button
              type="button"
              onClick={onBackToSubjects}
              className="px-5 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all border border-white/15 cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع إلى قائمة المواد الـ 12</span>
            </button>
          </div>

          {/* Social Share Buttons: WhatsApp and Telegram */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>شارك الامتحان مع زملائك:</span>
            </span>

            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors border border-emerald-400/40"
            >
              <span>واتساب</span>
            </a>

            <a
              href={telegramShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-bold transition-colors border border-sky-400/40"
            >
              <span>تلغرام</span>
            </a>
          </div>
        </div>
      </div>

      {/* Educational Value Proposition & Non-PDF Explanation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            لماذا تتدرب عبر محاكي «أول الشهادة» بدلاً من تنزيل ملفات PDF؟
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            مقارنة تجربة المحاكاة التفاعلية الذكية مع أوراق الامتحانات التقليدية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-emerald-950">تصحيح فوري وإجابة معتمدة</h3>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              بمجرد الإجابة على السؤال، يوضح لك النظام هل حلك صحيح أم خاطئ مع عرض الحل النموذجي المعتمد لضمان الفهم.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-blue-950">ضبط الوقت والرهبة</h3>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              مؤقت الامتحان يساعدك على إدارة وقتك واعتياد وتيرة الحل السريعة والدقيقة قبل دخول قاعة الامتحان.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-amber-950">شرح وتوجيه بعد كل سؤال</h3>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              ليس فقط معرفة الحل، بل فهم أسباب الخطأ والقواعد المنهجية التي بنيت عليها الأسئلة.
            </p>
          </div>
        </div>
      </div>

      {/* Other Years Selector for this Subject */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900">
              امتحانات مادة {subject.name_ar} للأعوام السابقة (2000 - 2026)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              اختر دورة أي عام لبدء حل امتحانها في المحاكي التفاعلي
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            27 دورة امتحانية متاحة
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2 pt-2">
          {allYears.map((y) => {
            const isCurrentYear = y === year;
            return (
              <button
                key={y}
                type="button"
                onClick={() => onNavigateYear(subject.slug, y)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                  isCurrentYear
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {y}م
              </button>
            );
          })}
        </div>
      </div>

      {/* Explore Other Subjects Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-900">
            استكشف امتحانات باقي مواد الشهادة الثانوية (12 مادة)
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            جميع المواد المقررة علمي وأدبي ومشترك جاهزة للمحاكاة
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {TWELVE_CONTRACT_SUBJECTS.map((sub) => {
            const isCurrentSubject = sub.slug === subject.slug;
            return (
              <button
                key={sub.slug}
                type="button"
                onClick={() => onNavigateYear(sub.slug, year)}
                className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer group ${
                  isCurrentSubject
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <span className="font-extrabold text-xs group-hover:text-emerald-700">
                  {sub.name_ar}
                </span>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
