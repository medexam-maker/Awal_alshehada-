import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { ExamLandingPage } from '../src/client/pages/ExamLandingPage';
import { TWELVE_CONTRACT_SUBJECTS } from '../src/client/data/contractSubjects';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.error('Error: dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const templateHtml = fs.readFileSync(templatePath, 'utf-8');

const YEARS: number[] = [];
for (let y = 2026; y >= 2000; y--) {
  YEARS.push(y);
}

const BASE_URL = 'https://awalalshehada.netlify.app';
const OG_IMAGE_URL = `${BASE_URL}/og-image.png`;

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

function renderExamPageHtml(slug: string, year: number, isSubjectLanding = false): string {
  const subject = TWELVE_CONTRACT_SUBJECTS.find((s) => s.slug === slug) || TWELVE_CONTRACT_SUBJECTS[6];
  const questionCount = SUBJECT_QUESTION_COUNTS[subject.slug] || 35;
  const durationMinutes = subject.defaultDurationMinutes || 150;

  const pageTitle = `امتحان ${subject.name_ar} ${year} - محاكي امتحان الشهادة السودانية | أول الشهادة`;
  const pageDescription = `خش جرب امتحان ${subject.name_ar} ${year} محاكي تجربة الامتحان الحقيقي، بتصحيح فوري وإجابة نموذجية بعد كل سؤال وشرح منهجي بدون تحميل PDF.`;
  const canonicalUrl = isSubjectLanding
    ? `${BASE_URL}/exams/${subject.slug}`
    : `${BASE_URL}/exams/${subject.slug}/${year}`;

  // Pre-render the component body
  const renderedApp = ReactDOMServer.renderToString(
    React.createElement(
      HelmetProvider,
      {},
      React.createElement(ExamLandingPage, {
        subjectSlug: slug,
        year,
        onStartExam: () => {},
        onNavigateYear: () => {},
        onBackToSubjects: () => {},
      })
    )
  );

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
      url: BASE_URL,
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
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: subject.name_ar,
        item: `${BASE_URL}/exams/${subject.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${year}`,
        item: `${BASE_URL}/exams/${subject.slug}/${year}`,
      },
    ],
  };

  let pageHtml = templateHtml;

  // 1. Replace Title
  pageHtml = pageHtml.replace(
    /<title>.*?<\/title>/i,
    `<title>${pageTitle}</title>`
  );

  // 2. Replace Description
  pageHtml = pageHtml.replace(
    /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
    `<meta name="description" content="${pageDescription}" />`
  );

  // 3. Replace Canonical
  pageHtml = pageHtml.replace(
    /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // 4. Replace OpenGraph Tags
  pageHtml = pageHtml.replace(
    /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:title" content="${pageTitle}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:description" content="${pageDescription}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image" content="${OG_IMAGE_URL}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+property="og:image:secure_url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image:secure_url" content="${OG_IMAGE_URL}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+property="og:image:type"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image:type" content="image/png" />`
  );

  // 5. Replace Twitter Tags
  pageHtml = pageHtml.replace(
    /<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:url" content="${canonicalUrl}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${pageTitle}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${pageDescription}" />`
  );
  pageHtml = pageHtml.replace(
    /<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:image" content="${OG_IMAGE_URL}" />`
  );

  // 6. Inject Structured Data JSON-LD inside <head>
  const schemaInjection = `
    <!-- Per-Page Structured Data (Breadcrumbs & Exam Simulator) -->
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbSchema)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify(quizSchema)}
    </script>
  </head>`;
  pageHtml = pageHtml.replace('</head>', schemaInjection);

  // 7. Inject Pre-rendered App Markup into <div id="root">
  pageHtml = pageHtml.replace(
    '<div id="root"></div>',
    `<div id="root">${renderedApp}</div>`
  );

  return pageHtml;
}

console.log('🚀 Starting Pre-rendering for all 337 routes...');

let generatedCount = 0;

// 1. Generate Subject + Year Exam Pages (12 * 27 = 324 pages)
for (const sub of TWELVE_CONTRACT_SUBJECTS) {
  for (const year of YEARS) {
    const targetDir = path.join(distDir, 'exams', sub.slug, `${year}`);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'index.html');
    const html = renderExamPageHtml(sub.slug, year, false);
    fs.writeFileSync(targetFile, html, 'utf-8');
    generatedCount++;
  }
}

// 2. Generate Subject Landing Pages (12 pages, defaults to 2023 session)
for (const sub of TWELVE_CONTRACT_SUBJECTS) {
  const targetDir = path.join(distDir, 'exams', sub.slug);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, 'index.html');
  const html = renderExamPageHtml(sub.slug, 2023, true);
  fs.writeFileSync(targetFile, html, 'utf-8');
  generatedCount++;
}

// 3. Generate explicit 404 page in dist/404.html
const notFoundDir = path.join(distDir);
const notFoundHtml = templateHtml
  .replace(/<title>.*?<\/title>/i, '<title>404 - صفحة غير موجودة | أول الشهادة</title>')
  .replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, '<meta name="description" content="عذراً، الصفحة المطلوبة غير متوفرة." />')
  .replace('<div id="root"></div>', `<div id="root"><div style="text-align:center;padding:80px 20px;font-family:system-ui,sans-serif;" dir="rtl"><h1>404 - صفحة غير موجودة</h1><p>عذراً، الامتحان المطلوب غير متوفر أو سنة الامتحان خارج النطاق (2000-2026).</p><p><a href="/" style="color:#059669;font-weight:bold;">العودة للرئيسية</a></p></div></div>`);
fs.writeFileSync(path.join(notFoundDir, '404.html'), notFoundHtml, 'utf-8');

// 4. Ensure dist/_redirects exists as an additional safety layer
const redirectsContent = `/api/*  /.netlify/functions/api/:splat  200\n/exams/*  /exams/:splat  200\n/*  /index.html  200\n`;
fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent, 'utf-8');

console.log(`✅ Pre-rendered ${generatedCount} static HTML exam landing pages in dist/exams/`);
console.log(`✅ Generated 404.html and _redirects in dist/`);
