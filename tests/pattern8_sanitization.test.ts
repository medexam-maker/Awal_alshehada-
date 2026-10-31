import assert from 'assert';
import { createClientSnapshot } from '../src/server/lib/snapshot';
import { ExamMode } from '../src/shared/constants';

console.log('--- Running Pattern 8 Snapshot Sanitization Unit Tests ---');

const fixtureRow = {
  id: 'ms_p8_short_essay_01',
  subject_id: 'sub_mil_sci_uuid',
  question_type: 'short_essay',
  primary_interaction_mode: 'large_cards',
  marks: 5,
  explanation: 'خطوط الدفاع الخلفية تضمن تأمين خطوط الإمداد والتموين وتتيح قوة احتياطية للتدخل السريع عند الطوارئ.',
  content: {
    prompt: 'اذكر باختصار الفائدتان الأساسيتان من إنشاء خطوط الدفاع الخلفية (الاحتياطية) في التكتيكات العسكرية؟',
    question_text: 'اذكر باختصار الفائدتان الأساسيتان من إنشاء خطوط الدفاع الخلفية (الاحتياطية) في التكتيكات العسكرية؟',
    model_answer: '1. تأمين خطوط الإمداد والتموين وحمايتها من الاختراق. 2. توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة أو سد الثغرات عند حدوث انهيار في الخطوط الأمامية.',
    mandatory_keywords: ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'],
    hint: 'فكر في دور القوات غير المشاركة مباشرة في الاشتباك الأمامي، وكيف تؤمن الخلفية والتموين.',
    max_words: 30,
    grading_mode: 'auto',
    partial_threshold: 0.5,
  },
  correct_answer: {
    model_answer: '1. تأمين خطوط الإمداد والتموين وحمايتها من الاختراق. 2. توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة أو سد الثغرات عند حدوث انهيار في الخطوط الأمامية.',
    mandatory_keywords: ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'],
  },
};

// Test 1: Simulator / Exam Mode Sanitization (Strictly Scrubbed)
{
  console.log('Test 1: Simulator Mode Sanitization');
  const snap = createClientSnapshot(fixtureRow, ExamMode.SIMULATOR, 1);

  assert.strictEqual(snap.id, 'ms_p8_short_essay_01');
  assert.strictEqual(snap.questionType, 'short_essay');
  assert.strictEqual(snap.marks, 5);

  const content = snap.content as Record<string, any>;
  assert.ok(content, 'Content must exist');
  assert.strictEqual(content.prompt, fixtureRow.content.prompt);
  assert.strictEqual(content.maxWords, 30);

  // Strictly verify all answer-revealing fields are absent
  assert.strictEqual(content.hint, undefined, 'hint must be scrubbed in SIMULATOR mode');
  assert.strictEqual(content.model_answer, undefined, 'model_answer must be scrubbed in SIMULATOR mode');
  assert.strictEqual(content.mandatory_keywords, undefined, 'mandatory_keywords must be scrubbed in SIMULATOR mode');
  assert.strictEqual(content.partial_threshold, undefined, 'partial_threshold must be scrubbed in SIMULATOR mode');
  assert.strictEqual(content.grading_mode, undefined, 'grading_mode must be scrubbed in SIMULATOR mode');
  assert.strictEqual(snap.correctAnswer, undefined, 'correctAnswer must be scrubbed in SIMULATOR mode');
  assert.strictEqual(snap.explanation, undefined, 'explanation must be scrubbed in SIMULATOR mode');
  assert.strictEqual(snap.explanationAr, undefined, 'explanationAr must be scrubbed in SIMULATOR mode');

  console.log('✓ Passed: Simulator mode strictly sanitized');
}

// Test 2: Training Mode Payload (Includes all payload fields for 0ms local evaluation)
{
  console.log('Test 2: Training Mode Payload');
  const snap = createClientSnapshot(fixtureRow, ExamMode.TRAINING, 1);

  assert.strictEqual(snap.id, 'ms_p8_short_essay_01');
  assert.strictEqual(snap.questionType, 'short_essay');

  const content = snap.content as Record<string, any>;
  assert.ok(content, 'Content must exist');
  assert.strictEqual(content.hint, fixtureRow.content.hint);
  assert.strictEqual(content.model_answer, fixtureRow.content.model_answer);
  assert.deepStrictEqual(content.mandatory_keywords, fixtureRow.content.mandatory_keywords);
  assert.strictEqual(content.partial_threshold, 0.5);
  assert.strictEqual(content.grading_mode, 'auto');

  assert.ok(snap.correctAnswer, 'correctAnswer must be provided in TRAINING mode');
  assert.ok(snap.explanation, 'explanation must be provided in TRAINING mode');

  console.log('✓ Passed: Training mode payload includes complete offline dataset');
}

console.log('--- ALL PATTERN 8 SNAPSHOT SANITIZATION TESTS PASSED! ---');
