import assert from 'assert';
import { matchKeywords, normalizeArabicText } from '../src/shared/keywordMatcher';

console.log('--- Running Pattern 8 Keyword Matcher Unit Tests ---');

// Test 1: Arabic Normalization (Alef, Teh Marbuta, Yeh, Tashkeel)
{
  console.log('Test 1: Normalization (Alef, Teh Marbuta, Yeh, Tashkeel)');
  const rawInput = 'تَأْمِينُ الإِمْدَادِ وَالقُوَّةِ الاِحْتِيَاطِيَّةِ!';
  const normalized = normalizeArabicText(rawInput);
  assert.strictEqual(normalized, 'تامين الامداد والقوه الاحتياطيه');
  console.log('✓ Passed: Normalization');
}

// Test 2: Full Match with Fixture
{
  console.log('Test 2: Full Match with Military Science Fixture');
  const userText = '1. تأمين خطوط الإمداد والتموين وحمايتها من الاختراق. 2. توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة أو سد الثغرات.';
  const keywords = ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'];

  const result = matchKeywords(userText, keywords, 2, 0.5);
  assert.strictEqual(result.status, 'FULL');
  assert.strictEqual(result.matchedKeywords.length, 4);
  assert.strictEqual(result.missingKeywords.length, 0);
  assert.strictEqual(result.score, 2);
  assert.strictEqual(result.maxScore, 2);
  console.log('✓ Passed: Full Match');
}

// Test 3: Partial Match (>= Threshold)
{
  console.log('Test 3: Partial Match');
  const userText = 'توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة.';
  const keywords = ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'];

  // Matched 3 out of 4 (0.75 ratio >= 0.5 threshold)
  const result = matchKeywords(userText, keywords, 2, 0.5);
  assert.strictEqual(result.status, 'PARTIAL');
  assert.strictEqual(result.matchedKeywords.length, 3);
  assert.strictEqual(result.missingKeywords.length, 1);
  assert.strictEqual(result.missingKeywords[0], 'تأمين الإمداد');
  assert.strictEqual(result.score, 1.5);
  console.log('✓ Passed: Partial Match');
}

// Test 4: Failed Match (< Threshold)
{
  console.log('Test 4: Failed Match');
  const userText = 'هذا النص لا يحتوي على أي عنصر من الإجابة المطلوب ذكرها في التكتيكات.';
  const keywords = ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'];

  const result = matchKeywords(userText, keywords, 2, 0.5);
  assert.strictEqual(result.status, 'FAILED');
  assert.strictEqual(result.matchedKeywords.length, 0);
  assert.strictEqual(result.missingKeywords.length, 4);
  assert.strictEqual(result.score, 0);
  console.log('✓ Passed: Failed Match');
}

// Test 5: Word Order Invariance and Compound Phrases
{
  console.log('Test 5: Compound Phrases and Word Order Invariance');
  const userText = 'يقوم الجيش بصد الهجمات وتوفير قوة احتياطية مع تأمين الإمداد بالكامل والتدخل السريع.';
  const keywords = ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'];

  const result = matchKeywords(userText, keywords, 5, 0.5);
  assert.strictEqual(result.status, 'FULL');
  assert.strictEqual(result.score, 5);
  console.log('✓ Passed: Compound Phrases & Order Invariance');
}

console.log('--- ALL PATTERN 8 KEYWORD MATCHER TESTS PASSED! ---');
