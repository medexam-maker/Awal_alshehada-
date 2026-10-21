import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://awalshehada.netlify.app';

const SUBJECT_SLUGS = [
  'islamic-studies',
  'christian-studies',
  'arabic-language',
  'english-language',
  'basic-mathematics',
  'specialized-mathematics',
  'chemistry',
  'physics',
  'geography',
  'history',
  'biology',
  'computer-science',
];

const YEARS: number[] = [];
for (let y = 2026; y >= 2000; y--) {
  YEARS.push(y);
}

const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

// Add Subject landing URLs
for (const slug of SUBJECT_SLUGS) {
  xml += `  <url>
    <loc>${BASE_URL}/exams/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
}

// Add Subject + Year Exam URLs (324 URLs)
for (const slug of SUBJECT_SLUGS) {
  for (const year of YEARS) {
    const priority = year >= 2020 ? '0.85' : '0.75';
    xml += `  <url>
    <loc>${BASE_URL}/exams/${slug}/${year}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>
`;
  }
}

xml += `</urlset>\n`;

const targetPath = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(targetPath, xml, 'utf-8');
console.log(`Generated sitemap with ${1 + SUBJECT_SLUGS.length + (SUBJECT_SLUGS.length * YEARS.length)} URLs at ${targetPath}`);
