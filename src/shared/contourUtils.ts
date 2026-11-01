/**
 * Shared utility functions for Pattern 11: CONTOUR_MAP (Contour Map Reading)
 */

export const EIGHT_DIRECTIONS = [
  'شمال شرقي',
  'شمال غربي',
  'جنوب شرقي',
  'جنوب غربي',
  'شمال',
  'جنوب',
  'شرق',
  'غرب'
];

/**
 * Normalizes Arabic text for contour map question grading
 */
export function normalizeArabicContourText(text: any): string {
  if (text === undefined || text === null) return '';
  let norm = String(text).trim();
  // Strip tashkeel
  norm = norm.replace(/[\u064B-\u065F]/g, '');
  // Unify Arabic letters: أ/إ/آ -> ا, ة -> ه, ى -> ي, ؤ -> و, ئ -> ي
  norm = norm
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
  // Strip common directional prefix filler
  norm = norm.replace(/(^|\s+)(من|الي|إلي|نحو|باتجاه|اتجاه)(\s+|$)/g, ' ');
  // Strip leading definite article 'ال' at word boundaries
  norm = norm.replace(/(^|\s+)ال/g, '$1');
  // Compress whitespace
  norm = norm.replace(/\s+/g, ' ').trim().toLowerCase();
  return norm;
}

/**
 * Checks if a 2D point [x, y] is inside a polygon [[x,y], [x,y], ...]
 */
export function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  if (!Array.isArray(vs) || vs.length < 3) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates Intersection over Union (IoU) of two polygons via bounding grid sampling.
 */
export function calculatePolygonIoU(polyA: [number, number][], polyB: [number, number][]): number {
  if (!Array.isArray(polyA) || polyA.length < 3 || !Array.isArray(polyB) || polyB.length < 3) {
    return 0;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of [...polyA, ...polyB]) {
    if (Array.isArray(pt) && pt.length >= 2) {
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[1] > maxY) maxY = pt[1];
    }
  }

  if (minX >= maxX || minY >= maxY) return 0;

  const steps = 30; // 30x30 = 900 points sampling
  const stepX = (maxX - minX) / steps;
  const stepY = (maxY - minY) / steps;

  let inA = 0;
  let inB = 0;
  let inBoth = 0;

  for (let i = 0; i <= steps; i++) {
    const px = minX + i * stepX;
    for (let j = 0; j <= steps; j++) {
      const py = minY + j * stepY;
      const pt: [number, number] = [px, py];
      const insideA = isPointInPolygon(pt, polyA);
      const insideB = isPointInPolygon(pt, polyB);

      if (insideA) inA++;
      if (insideB) inB++;
      if (insideA && insideB) inBoth++;
    }
  }

  const union = inA + inB - inBoth;
  if (union <= 0) return 0;
  return inBoth / union;
}

/**
 * Extracts polygon points from arbitrary format
 */
export function extractPolygonPoints(raw: any): [number, number][] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    if (raw.length >= 3 && Array.isArray(raw[0])) {
      return raw as [number, number][];
    }
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw.polygon) && raw.polygon.length >= 3) {
      return raw.polygon as [number, number][];
    }
    if (Array.isArray(raw.points) && raw.points.length >= 3) {
      return raw.points as [number, number][];
    }
    if (Array.isArray(raw.regions) && raw.regions.length > 0) {
      const first = raw.regions[0];
      if (Array.isArray(first?.polygon) && first.polygon.length >= 3) {
        return first.polygon as [number, number][];
      }
    }
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return extractPolygonPoints(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Checks a single branch answer against the correct answer
 */
export function checkContourBranch(
  rawStudent: any,
  rawCorrect: any,
  sq: {
    inputType?: 'numeric' | 'direction8' | 'mapOverlay' | 'text';
    numericTolerance?: number;
    overlayMatchThreshold?: number;
  }
): { isCorrect: boolean; fraction: number } {
  if (rawStudent === undefined || rawStudent === null || rawStudent === '') {
    return { isCorrect: false, fraction: 0 };
  }

  const inputType = sq.inputType || (typeof rawCorrect === 'number' || (!isNaN(Number(rawCorrect)) && rawCorrect !== '') ? 'numeric' : 'text');

  if (inputType === 'numeric') {
    const numStudent = parseFloat(String(rawStudent).replace(/[^0-9.-]/g, ''));
    const numCorrect = parseFloat(String(rawCorrect).replace(/[^0-9.-]/g, ''));
    const tolerance = typeof sq.numericTolerance === 'number' ? sq.numericTolerance : 0;

    if (!isNaN(numStudent) && !isNaN(numCorrect)) {
      if (Math.abs(numStudent - numCorrect) <= tolerance) {
        return { isCorrect: true, fraction: 1 };
      }
    }
    return { isCorrect: false, fraction: 0 };
  }

  if (inputType === 'direction8') {
    const normS = normalizeArabicContourText(rawStudent);
    const normC = normalizeArabicContourText(rawCorrect);

    if (normS && normC && normS === normC) {
      return { isCorrect: true, fraction: 1 };
    }
    const foundS = EIGHT_DIRECTIONS.find(d => normS.includes(normalizeArabicContourText(d)));
    const foundC = EIGHT_DIRECTIONS.find(d => normC.includes(normalizeArabicContourText(d)));
    if (foundS && foundC && foundS === foundC) {
      return { isCorrect: true, fraction: 1 };
    }
    return { isCorrect: false, fraction: 0 };
  }

  if (inputType === 'mapOverlay') {
    const polyStudent = extractPolygonPoints(rawStudent);
    const polyCorrect = extractPolygonPoints(rawCorrect);
    const threshold = typeof sq.overlayMatchThreshold === 'number' ? sq.overlayMatchThreshold : 0.7;

    if (polyStudent && polyCorrect) {
      const iou = calculatePolygonIoU(polyStudent, polyCorrect);
      if (iou >= threshold) {
        return { isCorrect: true, fraction: 1 };
      }
      if (iou >= threshold * 0.75) {
        return { isCorrect: false, fraction: Math.round((iou / threshold) * 50) / 100 };
      }
    }
    return { isCorrect: false, fraction: 0 };
  }

  // Fallback text
  const normS = normalizeArabicContourText(rawStudent);
  const normC = normalizeArabicContourText(rawCorrect);
  if (normS && normC && (normS === normC || normS.includes(normC) || normC.includes(normS))) {
    return { isCorrect: true, fraction: 1 };
  }
  return { isCorrect: false, fraction: 0 };
}

/**
 * Authentic, high-resolution SVG Topographic Contour Map Data URL for Jebel Marra (جبل مرة - دارفور)
 */
export const JEBEL_MARRA_CONTOUR_MAP_SVG_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffdfa"/>
      <stop offset="100%" stop-color="#f5efe0"/>
    </linearGradient>
  </defs>

  <!-- Background Paper -->
  <rect width="800" height="500" fill="url(#bgGrad)" rx="16" stroke="#d97706" stroke-width="3"/>
  <rect x="12" y="12" width="776" height="476" fill="none" stroke="#78350f" stroke-width="1.5" stroke-dasharray="6,4" rx="10"/>

  <!-- Grid lines -->
  <path d="M 100 12 V 488 M 200 12 V 488 M 300 12 V 488 M 400 12 V 488 M 500 12 V 488 M 600 12 V 488 M 700 12 V 488" stroke="#e5deca" stroke-width="1"/>
  <path d="M 12 100 H 788 M 12 200 H 788 M 12 300 H 788 M 12 400 H 788" stroke="#e5deca" stroke-width="1"/>

  <!-- Contour Lines (1000m to 1500m) -->
  <!-- 1000m outer contour -->
  <path d="M 80 400 Q 200 450 400 420 T 720 380 Q 750 200 680 100 T 350 80 Q 150 100 80 250 Z" fill="#fef3c7" fill-opacity="0.4" stroke="#d97706" stroke-width="2.5"/>
  <text x="120" y="420" font-family="sans-serif" font-size="12" font-weight="900" fill="#92400e">1000م</text>
  <text x="650" y="120" font-family="sans-serif" font-size="12" font-weight="900" fill="#92400e">1000م</text>

  <!-- 1100m contour -->
  <path d="M 140 360 Q 240 400 400 370 T 660 340 Q 680 220 620 130 T 360 110 Q 200 130 140 250 Z" fill="#fde68a" fill-opacity="0.3" stroke="#b45309" stroke-width="2"/>
  <text x="180" y="380" font-family="sans-serif" font-size="12" font-weight="900" fill="#78350f">1100م</text>

  <!-- 1200m contour -->
  <path d="M 200 320 Q 280 350 410 330 T 600 290 Q 620 220 560 160 T 370 140 Q 240 160 200 240 Z" fill="#fcd34d" fill-opacity="0.35" stroke="#92400e" stroke-width="2.5"/>
  <text x="240" y="335" font-family="sans-serif" font-size="12" font-weight="900" fill="#78350f">1200م</text>

  <!-- 1300m contour -->
  <path d="M 260 280 Q 320 300 410 285 T 530 250 Q 550 200 500 180 T 380 170 Q 290 180 260 230 Z" fill="#fbbf24" fill-opacity="0.4" stroke="#78350f" stroke-width="2"/>
  <text x="290" y="295" font-family="sans-serif" font-size="12" font-weight="900" fill="#451a03">1300م</text>

  <!-- 1400m contour -->
  <path d="M 310 250 Q 350 265 420 255 T 480 230 Q 490 200 450 190 T 380 185 Q 330 190 310 220 Z" fill="#f59e0b" fill-opacity="0.45" stroke="#78350f" stroke-width="2"/>
  <text x="330" y="260" font-family="sans-serif" font-size="12" font-weight="900" fill="#451a03">1400م</text>

  <!-- 1500m Peak Contour (Volcanic Hill Cone - التل المخروطي) -->
  <path d="M 350 230 Q 380 240 430 230 Q 460 215 440 200 Q 410 195 370 200 Q 340 210 350 230 Z" fill="#d97706" fill-opacity="0.55" stroke="#451a03" stroke-width="3"/>
  <text x="380" y="218" font-family="sans-serif" font-size="13" font-weight="900" fill="#ffffff">1500م▲</text>
  <text x="355" y="248" font-family="sans-serif" font-size="11" font-weight="900" fill="#78350f">قمة التل البركاني</text>

  <!-- Stream / Wadi El-Muluk in vibrant blue -->
  <path d="M 600 80 Q 520 140 460 170 T 340 280 Q 250 350 120 440" fill="none" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 600 80 Q 520 140 460 170 T 340 280 Q 250 350 120 440" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="8,4" stroke-linecap="round"/>
  
  <!-- Flow arrows along river -->
  <path d="M 450 175 L 435 185 L 442 168 Z" fill="#0284c7"/>
  <path d="M 240 360 L 225 370 L 232 353 Z" fill="#0284c7"/>
  <text x="475" y="160" font-family="sans-serif" font-size="11" font-weight="900" fill="#0369a1" transform="rotate(-25 475 160)">← وادي الملوك (خور موسمي)</text>

  <!-- Location Pin A and B -->
  <g transform="translate(560, 110)">
    <circle cx="0" cy="0" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
    <text x="0" y="4" font-family="sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">أ</text>
    <text x="14" y="4" font-family="sans-serif" font-size="11" font-weight="900" fill="#991b1b">النقطة (أ)</text>
  </g>

  <g transform="translate(280, 310)">
    <circle cx="0" cy="0" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
    <text x="0" y="4" font-family="sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">ب</text>
    <text x="14" y="4" font-family="sans-serif" font-size="11" font-weight="900" fill="#1e40af">الموقع (ب)</text>
  </g>

  <!-- Compass Rose / North Arrow -->
  <g transform="translate(720, 65)">
    <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#78350f" stroke-width="2"/>
    <polygon points="0,-22 6,0 0,-4 -6,0" fill="#dc2626"/>
    <polygon points="0,22 6,0 0,4 -6,0" fill="#475569"/>
    <polygon points="-22,0 0,6 -4,0 0,-6" fill="#94a3b8"/>
    <polygon points="22,0 0,6 4,0 0,-6" fill="#94a3b8"/>
    <text x="0" y="-25" font-family="sans-serif" font-size="11" font-weight="900" fill="#dc2626" text-anchor="middle">ش</text>
  </g>

  <!-- Scale Bar -->
  <g transform="translate(40, 455)">
    <rect x="0" y="0" width="180" height="28" fill="#ffffff" fill-opacity="0.9" rx="6" stroke="#92400e"/>
    <text x="10" y="14" font-family="sans-serif" font-size="10" font-weight="900" fill="#78350f">مقياس رسم خطي:</text>
    <line x1="80" y1="18" x2="160" y2="18" stroke="#1e293b" stroke-width="3"/>
    <line x1="80" y1="14" x2="80" y2="22" stroke="#1e293b" stroke-width="2"/>
    <line x1="120" y1="14" x2="120" y2="22" stroke="#1e293b" stroke-width="2"/>
    <line x1="160" y1="14" x2="160" y2="22" stroke="#1e293b" stroke-width="2"/>
    <text x="80" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#1e293b" text-anchor="middle">0</text>
    <text x="120" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#1e293b" text-anchor="middle">1 كم</text>
    <text x="160" y="10" font-family="sans-serif" font-size="8" font-weight="900" fill="#1e293b" text-anchor="middle">2 كم</text>
  </g>

  <!-- Contour Interval Note Badge -->
  <g transform="translate(550, 455)">
    <rect x="0" y="0" width="220" height="28" fill="#78350f" rx="8"/>
    <text x="110" y="18" font-family="sans-serif" font-size="11" font-weight="900" fill="#fef3c7" text-anchor="middle">الفاصل الكنتوري الرأسي = 20 متراً</text>
  </g>

  <!-- Map Header Banner -->
  <g transform="translate(30, 25)">
    <rect x="0" y="0" width="410" height="32" fill="#ffffff" fill-opacity="0.95" rx="8" stroke="#b45309" stroke-width="1.5"/>
    <text x="15" y="21" font-family="sans-serif" font-size="12" font-weight="900" fill="#78350f">🏔️ خريطة جبل مرة الكنتورية الطوبوغرافية (رمز: MAP_SUDAN_CONTOUR_GEO_2024)</text>
  </g>
</svg>
`)}`;
