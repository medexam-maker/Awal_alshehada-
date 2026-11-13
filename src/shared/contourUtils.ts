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
 * Explicit pixel width/height (800x500) prevents 0-width collapse inside flex containers on mobile browsers.
 */
export const JEBEL_MARRA_CONTOUR_MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="paperBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fcf9f1"/>
      <stop offset="100%" stop-color="#f2ead7"/>
    </linearGradient>
    <radialGradient id="peakShade" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="#b45309" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="#d97706" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#fef3c7" stop-opacity="0"/>
    </radialGradient>
    <pattern id="topoGrid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#d6ccb5" stroke-width="0.7" stroke-dasharray="3,3"/>
    </pattern>
  </defs>

  <!-- Map Base Sheet -->
  <rect width="800" height="500" fill="url(#paperBg)" rx="12"/>
  <rect x="28" y="20" width="744" height="460" fill="url(#topoGrid)" stroke="#78350f" stroke-width="2" rx="6"/>
  <rect x="33" y="25" width="734" height="450" fill="url(#peakShade)" stroke="#b45309" stroke-width="0.8" rx="4"/>

  <!-- Grid Coordinate Labels -->
  <g font-family="'Noto Sans Arabic', 'Cairo', sans-serif" font-size="10" font-weight="700" fill="#78350f" opacity="0.8">
    <text x="120" y="15" text-anchor="middle">أ</text>
    <text x="280" y="15" text-anchor="middle">ب</text>
    <text x="440" y="15" text-anchor="middle">ج</text>
    <text x="600" y="15" text-anchor="middle">د</text>
    <text x="720" y="15" text-anchor="middle">هـ</text>
    <text x="16" y="105" text-anchor="middle">1</text>
    <text x="16" y="205" text-anchor="middle">2</text>
    <text x="16" y="305" text-anchor="middle">3</text>
    <text x="16" y="405" text-anchor="middle">4</text>
  </g>

  <!-- Elevation Hypsometric Bands & 100m Index Contours + 20m Intermediate Contours -->
  <!-- Note: 5 intervals between each 100m index contour = 20m contour interval (V-shaped bends point upstream NE along Wadi El-Muluk) -->

  <!-- 1000m Index Contour -->
  <path d="M 76 382 C 130 435 280 448 425 426 C 565 405 685 388 712 318 C 736 254 718 142 638 92 C 590 62 558 108 530 112 C 495 72 415 62 325 74 C 195 92 98 158 72 252 C 58 302 58 352 76 382 Z"
        fill="#fef3c7" fill-opacity="0.48" stroke="#92400e" stroke-width="2.4"/>

  <!-- Intermediate 20m Contours (1020m, 1040m, 1060m, 1080m) -->
  <g fill="none" stroke="#b45309" stroke-width="0.9" stroke-opacity="0.72">
    <path d="M 92 370 C 145 418 282 432 420 412 C 550 392 666 374 692 310 C 714 252 698 150 626 104 C 584 78 552 120 526 122 C 492 84 415 76 330 86 C 208 104 114 166 90 252 C 76 298 76 344 92 370 Z"/>
    <path d="M 108 358 C 160 402 284 416 416 398 C 536 380 648 360 672 302 C 692 250 678 158 614 116 C 576 92 546 130 522 132 C 488 96 415 90 335 98 C 222 116 130 174 108 252 C 94 294 94 336 108 358 Z"/>
    <path d="M 124 346 C 175 386 286 400 412 384 C 522 368 630 346 652 294 C 670 248 658 166 602 128 C 568 106 540 140 518 142 C 484 108 415 104 340 110 C 236 128 146 182 126 252 C 112 290 112 328 124 346 Z"/>
    <path d="M 140 334 C 190 370 288 384 408 370 C 508 356 612 332 632 286 C 648 246 638 174 590 140 C 560 120 534 150 514 152 C 480 120 415 118 345 122 C 250 140 162 190 144 252 C 130 286 130 320 140 334 Z"/>
  </g>

  <!-- 1100m Index Contour -->
  <path d="M 156 322 C 205 354 290 368 404 356 C 494 344 594 318 612 278 C 626 244 618 182 578 152 C 552 134 528 160 510 162 C 476 132 415 132 350 134 C 264 152 178 198 162 252 C 148 282 148 312 156 322 Z"
        fill="#fde68a" fill-opacity="0.38" stroke="#92400e" stroke-width="2.4"/>

  <!-- Intermediate 20m Contours (1120m, 1140m, 1160m, 1180m) -->
  <g fill="none" stroke="#b45309" stroke-width="0.9" stroke-opacity="0.72">
    <path d="M 172 310 C 218 340 295 354 402 342 C 484 332 576 306 594 270 C 606 238 600 188 566 162 C 542 146 520 168 504 170 C 472 144 416 144 356 146 C 276 162 194 206 180 250 C 166 278 166 300 172 310 Z"/>
    <path d="M 188 298 C 231 326 300 340 400 328 C 474 320 558 294 576 262 C 586 232 582 194 554 172 C 532 158 512 176 498 178 C 468 156 417 156 362 158 C 288 172 210 214 198 248 C 184 274 184 288 188 298 Z"/>
    <path d="M 204 286 C 244 312 305 326 398 314 C 464 308 540 282 558 254 C 566 226 564 200 542 182 C 522 170 504 184 492 186 C 464 168 418 168 368 170 C 300 182 226 222 216 246 C 202 270 202 276 204 286 Z"/>
    <path d="M 220 274 C 257 298 310 312 396 300 C 454 296 522 270 540 246 C 546 220 546 206 530 192 C 512 182 496 192 486 194 C 460 180 419 180 374 182 C 312 192 242 230 234 244 C 220 266 220 266 220 274 Z"/>
  </g>

  <!-- 1200m Index Contour -->
  <path d="M 236 262 C 270 284 315 298 394 286 C 444 284 504 258 522 238 C 528 216 528 212 518 202 C 502 192 488 200 480 202 C 456 190 420 192 380 194 C 324 202 258 238 252 242 C 238 258 238 256 236 262 Z"
        fill="#fcd34d" fill-opacity="0.42" stroke="#78350f" stroke-width="2.4"/>

  <!-- Intermediate 20m Contours (1220m - 1280m) & 1300m, 1400m, 1500m Volcanic Cone -->
  <g fill="none" stroke="#92400e" stroke-width="0.9" stroke-opacity="0.78">
    <path d="M 262 252 C 292 274 335 284 398 276 C 448 272 496 248 506 230 C 512 208 492 196 458 196 C 420 196 374 198 326 208 C 282 218 256 238 262 252 Z"/>
    <path d="M 284 246 C 312 266 350 274 402 268 C 446 264 484 242 492 226 C 496 206 476 198 446 198 C 414 198 378 200 338 208 C 298 218 278 234 284 246 Z"/>
  </g>

  <!-- 1300m Index Contour -->
  <path d="M 304 240 C 330 258 364 264 406 258 C 444 254 472 236 478 222 C 482 206 462 200 434 200 C 406 200 378 202 348 208 C 314 216 298 228 304 240 Z"
        fill="#fbbf24" fill-opacity="0.45" stroke="#78350f" stroke-width="2.3"/>

  <!-- 1350m / 1400m / 1450m Inner Steep Conical Contours -->
  <path d="M 328 234 C 350 248 378 252 410 248 C 440 244 458 230 462 218 C 464 208 446 203 422 203 C 396 203 372 205 352 210 C 332 216 322 224 328 234 Z"
        fill="#f59e0b" fill-opacity="0.5" stroke="#78350f" stroke-width="1.8"/>

  <!-- 1500m Peak Contour (التل المخروطي البركاني) -->
  <path d="M 352 228 C 370 238 394 240 418 236 C 438 232 446 222 444 214 C 442 208 426 206 406 206 C 384 206 364 210 354 216 C 348 220 346 224 352 228 Z"
        fill="#b45309" fill-opacity="0.72" stroke="#451a03" stroke-width="2.6"/>

  <!-- Summit Triangle -->
  <polygon points="398,214 391,226 405,226" fill="#ffffff" stroke="#451a03" stroke-width="1.6"/>
  <text x="412" y="224" font-family="'Noto Sans Arabic', 'Cairo', sans-serif" font-size="12" font-weight="900" fill="#ffffff">1500م</text>
  <rect x="332" y="242" width="136" height="20" rx="5" fill="#fffbeb" fill-opacity="0.92" stroke="#92400e" stroke-width="1"/>
  <text x="400" y="256" font-family="'Noto Sans Arabic', 'Cairo', sans-serif" font-size="11" font-weight="900" fill="#78350f" text-anchor="middle">قمة التل المخروطي البركاني</text>

  <!-- Contour Elevation Labels -->
  <g font-family="'Noto Sans Arabic', sans-serif" font-size="11" font-weight="900" fill="#78350f">
    <rect x="115" y="405" width="44" height="16" rx="3" fill="#fcf9f1" fill-opacity="0.9"/>
    <text x="137" y="417" text-anchor="middle">1000م</text>

    <rect x="645" y="102" width="44" height="16" rx="3" fill="#fcf9f1" fill-opacity="0.9"/>
    <text x="667" y="114" text-anchor="middle">1000م</text>

    <rect x="165" y="330" width="44" height="16" rx="3" fill="#fef3c7" fill-opacity="0.92"/>
    <text x="187" y="342" text-anchor="middle">1100م</text>

    <rect x="230" y="274" width="44" height="16" rx="3" fill="#fde68a" fill-opacity="0.92"/>
    <text x="252" y="286" text-anchor="middle">1200م</text>

    <rect x="292" y="248" width="44" height="16" rx="3" fill="#fcd34d" fill-opacity="0.92"/>
    <text x="314" y="260" text-anchor="middle">1300م</text>
  </g>

  <!-- Wadi El-Muluk Seasonal Stream (NE -> SW Flow) -->
  <path d="M 655 62 C 600 98 552 122 505 162 C 460 198 425 275 352 332 C 280 388 188 418 112 452"
        fill="none" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <path d="M 655 62 C 600 98 552 122 505 162 C 460 198 425 275 352 332 C 280 388 188 418 112 452"
        fill="none" stroke="#7dd3fc" stroke-width="2" stroke-dasharray="10,5" stroke-linecap="round"/>

  <!-- Stream Flow Arrows (pointing SW = جنوب غربي) -->
  <polygon points="518,151 533,146 526,160" fill="#0369a1"/>
  <polygon points="315,358 331,353 323,367" fill="#0369a1"/>
  <polygon points="158,431 174,427 166,441" fill="#0369a1"/>

  <rect x="468" y="138" width="138" height="20" rx="5" fill="#e0f2fe" fill-opacity="0.95" stroke="#0284c7" stroke-width="1" transform="rotate(-24 537 148)"/>
  <text x="537" y="152" font-family="'Noto Sans Arabic', 'Cairo', sans-serif" font-size="11" font-weight="900" fill="#0c4a6e" text-anchor="middle" transform="rotate(-24 537 148)">← مجرى وادي الملوك</text>

  <!-- Location Pins A and B -->
  <g transform="translate(566, 98)">
    <circle cx="0" cy="0" r="11" fill="#dc2626" stroke="#ffffff" stroke-width="2.2"/>
    <text x="0" y="4" font-family="'Noto Sans Arabic', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">أ</text>
    <rect x="14" y="-10" width="66" height="20" rx="5" fill="#ffffff" fill-opacity="0.92" stroke="#dc2626" stroke-width="1"/>
    <text x="47" y="4" font-family="'Noto Sans Arabic', sans-serif" font-size="10" font-weight="900" fill="#991b1b" text-anchor="middle">النقطة (أ)</text>
  </g>

  <g transform="translate(278, 308)">
    <circle cx="0" cy="0" r="11" fill="#2563eb" stroke="#ffffff" stroke-width="2.2"/>
    <text x="0" y="4" font-family="'Noto Sans Arabic', sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">ب</text>
    <rect x="-78" y="-10" width="64" height="20" rx="5" fill="#ffffff" fill-opacity="0.92" stroke="#2563eb" stroke-width="1"/>
    <text x="-46" y="4" font-family="'Noto Sans Arabic', sans-serif" font-size="10" font-weight="900" fill="#1e40af" text-anchor="middle">الموقع (ب)</text>
  </g>

  <!-- Map Title Banner -->
  <g transform="translate(42, 32)">
    <rect x="0" y="0" width="388" height="32" fill="#ffffff" fill-opacity="0.96" rx="8" stroke="#92400e" stroke-width="1.5"/>
    <text x="194" y="20" font-family="'Noto Sans Arabic', 'Cairo', sans-serif" font-size="12" font-weight="900" fill="#78350f" text-anchor="middle">خريطة جبل مرة الكنتورية الطوبوغرافية (شرق دارفور)</text>
  </g>

  <!-- Compass Rose (North Arrow) -->
  <g transform="translate(725, 70)">
    <circle cx="0" cy="0" r="28" fill="#ffffff" fill-opacity="0.96" stroke="#78350f" stroke-width="2"/>
    <polygon points="0,-21 6,0 0,-4 -6,0" fill="#dc2626"/>
    <polygon points="0,21 6,0 0,4 -6,0" fill="#475569"/>
    <polygon points="-21,0 0,5 -4,0 0,-5" fill="#94a3b8"/>
    <polygon points="21,0 0,5 4,0 0,-5" fill="#94a3b8"/>
    <text x="0" y="-23" font-family="'Noto Sans Arabic', sans-serif" font-size="11" font-weight="900" fill="#dc2626" text-anchor="middle">ش</text>
    <text x="0" y="36" font-family="'Noto Sans Arabic', sans-serif" font-size="9" font-weight="800" fill="#475569" text-anchor="middle">ج</text>
  </g>

  <!-- Map Legend (مفتاح الخريطة) -->
  <g transform="translate(568, 378)">
    <rect x="0" y="0" width="194" height="88" fill="#ffffff" fill-opacity="0.95" rx="8" stroke="#92400e" stroke-width="1.2"/>
    <text x="97" y="16" font-family="'Noto Sans Arabic', sans-serif" font-size="10" font-weight="900" fill="#78350f" text-anchor="middle">مفتاح الخريطة</text>
    <line x1="12" y1="22" x2="182" y2="22" stroke="#e5deca" stroke-width="1"/>
    <line x1="138" y1="34" x2="178" y2="34" stroke="#78350f" stroke-width="2.4"/>
    <text x="130" y="38" font-family="'Noto Sans Arabic', sans-serif" font-size="9" font-weight="700" fill="#1e293b" text-anchor="end">خط كنتور رئيسي (100م)</text>
    <line x1="138" y1="50" x2="178" y2="50" stroke="#b45309" stroke-width="1"/>
    <text x="130" y="54" font-family="'Noto Sans Arabic', sans-serif" font-size="9" font-weight="700" fill="#1e293b" text-anchor="end">خط كنتور فرعي (20م)</text>
    <line x1="138" y1="66" x2="178" y2="66" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/>
    <text x="130" y="70" font-family="'Noto Sans Arabic', sans-serif" font-size="9" font-weight="700" fill="#1e293b" text-anchor="end">مجرى وادي موسمي</text>
    <polygon points="158,76 152,84 164,84" fill="#b45309"/>
    <text x="130" y="83" font-family="'Noto Sans Arabic', sans-serif" font-size="9" font-weight="700" fill="#1e293b" text-anchor="end">قمة جبلية (1500م)</text>
  </g>

  <!-- Linear Scale Bar -->
  <g transform="translate(44, 438)">
    <rect x="0" y="0" width="215" height="30" fill="#ffffff" fill-opacity="0.95" rx="7" stroke="#92400e" stroke-width="1.2"/>
    <text x="204" y="19" font-family="'Noto Sans Arabic', sans-serif" font-size="10" font-weight="900" fill="#78350f" text-anchor="end">مقياس الرسم:</text>
    <rect x="20" y="16" width="50" height="5" fill="#1e293b"/>
    <rect x="70" y="16" width="50" height="5" fill="#ffffff" stroke="#1e293b" stroke-width="1"/>
    <text x="20" y="12" font-family="'Noto Sans Arabic', sans-serif" font-size="8" font-weight="800" fill="#1e293b" text-anchor="middle">0</text>
    <text x="70" y="12" font-family="'Noto Sans Arabic', sans-serif" font-size="8" font-weight="800" fill="#1e293b" text-anchor="middle">1 كم</text>
    <text x="120" y="12" font-family="'Noto Sans Arabic', sans-serif" font-size="8" font-weight="800" fill="#1e293b" text-anchor="middle">2 كم</text>
  </g>
</svg>`;

export const JEBEL_MARRA_CONTOUR_MAP_SVG_URL = `data:image/svg+xml;utf8,${encodeURIComponent(JEBEL_MARRA_CONTOUR_MAP_SVG)}`;

