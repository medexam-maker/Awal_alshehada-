/**
 * Pattern 8: Pure Arabic Keyword Matching Utility
 * Strictly non-AI, deterministic keyword matching for short structured essay answers.
 * Shared between client (zero-latency local feedback) and server (authoritative grading).
 */

export type EvalStatus = 'FULL' | 'PARTIAL' | 'FAILED';

export interface EvalResult {
  status: EvalStatus;
  matchedKeywords: string[];
  missingKeywords: string[];
  score: number;
  maxScore: number;
}

/**
 * Normalizes Arabic text for deterministic keyword matching:
 * 1. Normalizes Alef variants (أ / إ / آ -> ا)
 * 2. Normalizes Teh Marbuta (ة -> ه)
 * 3. Normalizes Yeh (ى -> ي)
 * 4. Strips Tatweel (\u0640)
 * 5. Strips Tashkeel / Diacritics (\u064B-\u065F)
 * 6. Strips punctuation, symbols, and standardizes whitespace.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';

  return text
    // Strip Tashkeel / Diacritics
    .replace(/[\u064B-\u065F]/g, '')
    // Strip Tatweel
    .replace(/\u0640/g, '')
    // Normalize Alef variants
    .replace(/[أإآ]/g, 'ا')
    // Normalize Teh Marbuta to Heh
    .replace(/ة/g, 'ه')
    // Normalize Alef Maqsura to Yeh
    .replace(/ى/g, 'ي')
    // Strip punctuation, numbers/symbols keeping Arabic and English alphanumeric characters
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    // Collapse multiple whitespace into a single space and trim
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Iteratively strips common Arabic prefixes (لل، وال، بال، كال، لال، فال، ال، و، ب، ك، ل، ف)
 * for morphological stems comparison.
 */
export function stripArabicPrefixes(str: string): string {
  if (!str) return '';
  let prev = '';
  let curr = str;
  while (curr !== prev) {
    prev = curr;
    curr = curr.replace(/^(لل|وال|بال|كال|لال|فال|ال|[وبكلف])/, '');
  }
  return curr;
}

/**
 * Checks whether a normalized token matches a keyword word.
 */
function tokenMatchesWord(token: string, word: string): boolean {
  if (!token || !word) return false;

  const normToken = normalizeArabicText(token);
  const normWord = normalizeArabicText(word);
  if (!normToken || !normWord) return false;

  if (normToken === normWord) return true;

  const sToken = stripArabicPrefixes(normToken);
  const sWord = stripArabicPrefixes(normWord);

  if (sToken && sWord && sToken === sWord) {
    return true;
  }

  // Handle minor morphological extensions (e.g. امداد / امدادات)
  if (sToken.length >= 3 && sWord.length >= 3) {
    if (sToken.startsWith(sWord) || sWord.startsWith(sToken)) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates a student's essay answer against required mandatory keywords.
 * - Word order invariant.
 * - Compound phrases (e.g. "تأمين الإمداد", "قوة احتياطية") supported flexibly.
 * - Full match (100% of keywords) -> FULL + maxScore
 * - Partial match (>= partialThreshold, default 0.5) -> PARTIAL + proportional score
 * - Otherwise -> FAILED + 0 score
 */
export function matchKeywords(
  userText: string,
  keywords: string[],
  maxScore: number = 2,
  partialThreshold: number = 0.5
): EvalResult {
  const normUserText = normalizeArabicText(userText);
  const userTokens = normUserText.split(/\s+/).filter(Boolean);
  const cleanKeywords = (keywords || []).filter((k) => typeof k === 'string' && k.trim().length > 0);

  if (cleanKeywords.length === 0) {
    return {
      status: 'FULL',
      matchedKeywords: [],
      missingKeywords: [],
      score: maxScore,
      maxScore,
    };
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of cleanKeywords) {
    const normKw = normalizeArabicText(kw);
    if (!normKw) continue;

    // 1. Direct exact substring match
    if (normUserText.includes(normKw)) {
      matchedKeywords.push(kw);
      continue;
    }

    // 2. Multi-word phrase token match (word order invariant & token matching)
    const kwWords = normKw.split(/\s+/).filter(Boolean);
    const allWordsMatched = kwWords.every((kwWord) =>
      userTokens.some((uToken) => tokenMatchesWord(uToken, kwWord))
    );

    if (allWordsMatched) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  const totalKw = cleanKeywords.length;
  const matchRatio = matchedKeywords.length / totalKw;

  if (matchRatio >= 1.0) {
    return {
      status: 'FULL',
      matchedKeywords,
      missingKeywords,
      score: maxScore,
      maxScore,
    };
  }

  const threshold = Math.min(1.0, Math.max(0.0, Number(partialThreshold) || 0.5));

  if (matchRatio >= threshold && matchedKeywords.length > 0) {
    const rawScore = (matchedKeywords.length / totalKw) * maxScore;
    const roundedScore = Math.round(rawScore * 100) / 100;
    return {
      status: 'PARTIAL',
      matchedKeywords,
      missingKeywords,
      score: roundedScore,
      maxScore,
    };
  }

  return {
    status: 'FAILED',
    matchedKeywords,
    missingKeywords,
    score: 0,
    maxScore,
  };
}
