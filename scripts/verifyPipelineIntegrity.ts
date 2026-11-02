/**
 * PIPELINE INTEGRITY — acceptance suite for patterns: MCQ, True/False, Fill-blank, Matching, Ordering, Explain, Long Essay.
 * Real flow: row -> {dbSnapshot (grading), clientSnapshot (student)} -> student answer -> autoGrade(dbSnapshot).
 */
import assert from 'assert';
import { ExamMode } from '../src/shared/constants';
import { createClientSnapshot, createSnapshotPair } from '../src/server/lib/snapshot';
import { autoGrade } from '../src/server/lib/scoringEngine';

let passed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${e?.message || e}`); process.exitCode = 1; }
}
const mk = (type: string, content: any, ca: any) => ({ id: 'q1', subject_id: 's', question_type: type, content, correct_answer: ca, primary_interaction_mode: 'x', marks: 4, explanation: 'SECRET_EXPLANATION' });

const ROWS: Record<string, any> = {
  true_false: mk('true_false', { prompt: 'p', statement: 's' }, { value: true }),
  multiple_choice: mk('multiple_choice', { prompt: 'p', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] }, { selectedOptionId: 'a' }),
  fill_blank: mk('fill_blank', { textWithBlanks: 'x {{1}} y {{2}}', blanks: [{ id: '1', correctValue: 'SECRET_ONE', choices: ['SECRET_ONE', 'b', 'c'] }, { id: '2', correctValue: 'SECRET_TWO', choices: ['SECRET_TWO', 'd', 'e'] }] }, { answers: { '1': 'SECRET_ONE', '2': 'SECRET_TWO' } }),
  matching: mk('matching', { pairs: [{ id: 'p1', source: 's1', target: 't1' }, { id: 'p2', source: 's2', target: 't2' }], distractors: [{ id: 'd1', target: 't3' }] }, { pairs: { p1: 'target_p1', p2: 'target_p2' } }),
  ordering: mk('ordering', { items: [{ id: 's1', text: 'a' }, { id: 's2', text: 'b' }, { id: 's3', text: 'c' }], correctOrder: ['s1', 's2', 's3'] }, { orderedIds: ['s1', 's2', 's3'] }),
  explain: mk('explain', { prompt: 'p', correctSequence: ['لأن', 'كثافة', 'الجليد', 'أقل', 'من', 'كثافة', 'الماء'], distractorWords: ['أكبر'] }, { sequence: ['لأن', 'كثافة', 'الجليد', 'أقل', 'من', 'كثافة', 'الماء'] }),
  long_essay: mk('long_essay', { prompt: 'p' }, { model: 'SECRET_MODEL_ESSAY' }),
};

const LEAK_MARKERS = ['correctAnswer', 'SECRET_EXPLANATION', 'SECRET_ONE', 'SECRET_TWO', 'SECRET_MODEL_ESSAY', 'correctOrder', 'correctChunks', 'isDistractor', 'originalId', 'selectedOptionId', '"value":true'];

console.log('--- A. SIMULATOR snapshot must not expose any answer key ---');
for (const [type, row] of Object.entries(ROWS)) {
  t(`A.${type}: no answer keys in simulator client snapshot`, () => {
    const { clientSnapshot } = createSnapshotPair(row, ExamMode.SIMULATOR, 1);
    const json = JSON.stringify(clientSnapshot);
    const leaks = LEAK_MARKERS.filter((k) => json.includes(k));
    assert.deepStrictEqual(leaks, [], `leaked: ${leaks.join(', ')}`);
  });
}

console.log('--- B. A perfect student answer must score full marks on the server (and a wrong one 0) ---');
function grade(type: string, answer: unknown) {
  const { dbSnapshot } = createSnapshotPair(ROWS[type], ExamMode.SIMULATOR, 1);
  return autoGrade(type as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, answer, 4).obtainedMarks;
}
t('B.true_false', () => { assert.strictEqual(grade('true_false', { value: true }), 4); assert.strictEqual(grade('true_false', { value: false }), 0); });
t('B.multiple_choice', () => { assert.strictEqual(grade('multiple_choice', { selectedOptionId: 'a' }), 4); assert.strictEqual(grade('multiple_choice', { selectedOptionId: 'b' }), 0); });
t('B.fill_blank (free text)', () => { assert.strictEqual(grade('fill_blank', { answers: { '1': 'SECRET_ONE', '2': 'SECRET_TWO' } }), 4); assert.strictEqual(grade('fill_blank', { answers: { '1': 'x', '2': 'y' } }), 0); });
t('B.ordering', () => { assert.strictEqual(grade('ordering', { orderedIds: ['s1', 's2', 's3'] }), 4); assert.strictEqual(grade('ordering', { orderedIds: ['s2', 's3', 's1'] }), 0); });
t('B.matching: answer built ONLY from card ids the student saw', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(ROWS.matching, ExamMode.SIMULATOR, 1);
  const seen: string[] = (clientSnapshot as any).content.shuffledTargets.map((x: any) => x.id);
  const map = Object.fromEntries(((dbSnapshot as any).content.shuffledTargets as any[]).filter((x) => x.originalId).map((x) => [x.originalId, x.id]));
  seen.forEach((id) => assert.ok(typeof id === 'string'));
  const r = autoGrade('matching' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, { connections: map }, 4).obtainedMarks;
  assert.strictEqual(r, 4);
  const wrong = autoGrade('matching' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, { connections: { p1: map.p2, p2: map.p1 } }, 4).obtainedMarks;
  assert.strictEqual(wrong, 0);
});
t('B.explain word-block: chunks the student saw, in correct order', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(ROWS.explain, ExamMode.SIMULATOR, 1);
  const bank: Array<{ id: string; text: string }> = (clientSnapshot as any).content.shuffledBank;
  const full: any = createClientSnapshot(ROWS.explain, ExamMode.TRAINING, 1); // oracle only
  const byId = Object.fromEntries(bank.map((b) => [b.id, b.text]));
  const seq = (full.content.correctOrder as string[]).map((id) => byId[id]);
  const r = autoGrade('explain' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, { sequence: seq }, 4).obtainedMarks;
  assert.strictEqual(r, 4);
  const wrong = autoGrade('explain' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, { sequence: [...seq].reverse() }, 4).obtainedMarks;
  assert.strictEqual(wrong, 0);
});
t('B.long_essay: manual pending', () => assert.strictEqual(grade('long_essay', { text: 'مقال' }), 0));

console.log('--- C. Weekly Simulation fill_blank keeps referenceAnswers only ---');
t('C.1 weekly: referenceAnswers present, top-level correctAnswer absent', () => {
  const s: any = createSnapshotPair(ROWS.fill_blank, ExamMode.SIMULATOR, 1, true).clientSnapshot;
  assert.strictEqual(s.correctAnswer, undefined);
  assert.ok(s.content.referenceAnswers && s.content.referenceAnswers['1']);
});
t('C.2 non-weekly simulator: no referenceAnswers', () => {
  const s: any = createSnapshotPair(ROWS.fill_blank, ExamMode.SIMULATOR, 1, false).clientSnapshot;
  assert.strictEqual(s.content.referenceAnswers, undefined);
});

console.log('--- D. Resume determinism (matching) ---');
t('D.1 rebuilding the client snapshot from the stored DB snapshot yields the same card ids', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(ROWS.matching, ExamMode.SIMULATOR, 1);
  const again: any = createClientSnapshot(dbSnapshot as any, ExamMode.SIMULATOR, 1);
  const ids = (x: any) => x.content.shuffledTargets.map((t: any) => `${t.id}:${t.text}`).join('|');
  assert.strictEqual(ids(again), ids(clientSnapshot));
});

console.log('--- E. TRAINING mode keeps keys for instant feedback ---');
t('E.1 training snapshot still carries correctAnswer', () => {
  const s: any = createSnapshotPair(ROWS.true_false, ExamMode.TRAINING, 1).clientSnapshot;
  assert.deepStrictEqual(s.correctAnswer, { value: true });
});

console.log('--- F. Simulator coverage for Patterns 7, 8, 11 ---');

// F.1 Pattern 7 (Calculation / Multi-step)
const calcRow = mk('calculation', {
  mode: 'multi_step_mcq',
  prompt: 'مسألة حسابية',
  steps: [
    { id: 's1', order: 1, prompt: 'الخطوة 1', marks: 2, options: [{ id: 'opt_1a', label: '10' }, { id: 'opt_1b', label: '20' }] },
    { id: 's2', order: 2, prompt: 'الخطوة 2', marks: 2, options: [{ id: 'opt_2a', label: '100' }, { id: 'opt_2b', label: '200' }] }
  ]
}, {
  step_answers: {
    s1: { canonical_option_id: 'opt_1a', marks: 2 },
    s2: { canonical_option_id: 'opt_2a', marks: 2 }
  },
  conditional_credit_rules: [
    {
      rule_id: 'r_s2',
      target_step_id: 's2',
      awarded_option_id: 'opt_2b',
      prerequisite_step_id: 's1',
      prerequisite_option_id: 'opt_1b',
      credit_fraction: 0.5
    }
  ]
});

const CALC_LEAK_MARKERS = [
  'correctAnswer', 'SECRET_EXPLANATION', 'step_answers', 'stepAnswers',
  'conditional_credit_rules', 'conditionalCreditRules', 'canonical_option_id',
  'canonicalOptionId', 'awarded_option_id', 'awardedOptionId', 'prerequisite_option_id',
  'prerequisiteOptionId'
];

t('F.1.a calculation: no answer keys in simulator client snapshot', () => {
  const { clientSnapshot } = createSnapshotPair(calcRow, ExamMode.SIMULATOR, 1);
  const json = JSON.stringify(clientSnapshot);
  const leaks = CALC_LEAK_MARKERS.filter((k) => json.includes(k));
  assert.deepStrictEqual(leaks, [], `calculation leaked: ${leaks.join(', ')}`);
});

t('F.1.b calculation: perfect answer scores full marks, wrong scores 0', () => {
  const { dbSnapshot } = createSnapshotPair(calcRow, ExamMode.SIMULATOR, 1);
  const perfectAns = { step_answers: { s1: 'opt_1a', s2: 'opt_2a' } };
  const rPerfect = autoGrade('calculation' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, perfectAns, 4).obtainedMarks;
  assert.strictEqual(rPerfect, 4);

  const rWrong = autoGrade('calculation' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, { step_answers: { s1: 'opt_1b', s2: 'opt_1a' } }, 4).obtainedMarks;
  assert.strictEqual(rWrong, 0);
});

// F.2 Pattern 8 (Short Essay / Pattern 8)
const essayRow = mk('short_essay', {
  prompt: 'علل: تسمية عام الفيل بهذا الاسم.',
  question_text: 'علل: تسمية عام الفيل بهذا الاسم.',
  model_answer: 'SECRET_MODEL_SHORT_ESSAY',
  mandatory_keywords: ['SECRET_KEYWORD_ABRAHA'],
  hint: 'SECRET_HINT',
  max_words: 30,
  grading_mode: 'auto',
  partial_threshold: 0.5
}, {
  model_answer: 'SECRET_MODEL_SHORT_ESSAY',
  mandatory_keywords: ['SECRET_KEYWORD_ABRAHA']
});

const ESSAY_LEAK_MARKERS = [
  'correctAnswer', 'SECRET_EXPLANATION', 'SECRET_MODEL_SHORT_ESSAY',
  'SECRET_KEYWORD_ABRAHA', 'SECRET_HINT', 'model_answer', 'modelAnswer',
  'mandatory_keywords', 'mandatoryKeywords'
];

t('F.2.a short_essay: no answer keys in simulator client snapshot', () => {
  const { clientSnapshot } = createSnapshotPair(essayRow, ExamMode.SIMULATOR, 1);
  const json = JSON.stringify(clientSnapshot);
  const leaks = ESSAY_LEAK_MARKERS.filter((k) => json.includes(k));
  assert.deepStrictEqual(leaks, [], `short_essay leaked: ${leaks.join(', ')}`);
});

t('F.2.b short_essay: perfect answer scores full marks, wrong scores 0', () => {
  const { dbSnapshot } = createSnapshotPair(essayRow, ExamMode.SIMULATOR, 1);
  const perfectAns = { text: 'بسبب محاولة SECRET_KEYWORD_ABRAHA هدم الكعبة' };
  const rPerfect = autoGrade('short_essay' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, perfectAns, 4).obtainedMarks;
  assert.strictEqual(rPerfect, 4);

  const wrongAns = { text: 'بسبب تجارة القوافل' };
  const rWrong = autoGrade('short_essay' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, wrongAns, 4).obtainedMarks;
  assert.strictEqual(rWrong, 0);
});

// F.3 Pattern 11 (Contour Map / CONTOUR_MAP)
const contourRow = mk('contour_map', {
  mapCode: 'MAP_SUDAN_CONTOUR_01',
  prompt: 'أجب عن الفروع التالية:',
  subQuestions: [
    { id: 'cm_1', question: 'الفاصل الكنتوري', inputType: 'numeric' },
    { id: 'cm_2', question: 'اتجاه انحدار الوادي', inputType: 'direction8' },
    { id: 'cm_3', question: 'منطقة التل', inputType: 'mapOverlay' }
  ]
}, {
  subAnswers: {
    cm_1: 'SECRET_INTERVAL_20',
    cm_2: 'SECRET_SOUTH_WEST',
    cm_3: { polygon: [[10, 10], [50, 10], [50, 50], [10, 50]] }
  }
});

const CONTOUR_LEAK_MARKERS = [
  'correctAnswer', 'SECRET_EXPLANATION', 'SECRET_INTERVAL_20',
  'SECRET_SOUTH_WEST', 'subAnswers', 'sub_answers', 'correctValue',
  'correct_value', 'polygon'
];

t('F.3.a contour_map: no answer keys in simulator client snapshot', () => {
  const { clientSnapshot } = createSnapshotPair(contourRow, ExamMode.SIMULATOR, 1);
  const json = JSON.stringify(clientSnapshot);
  const leaks = CONTOUR_LEAK_MARKERS.filter((k) => json.includes(k));
  assert.deepStrictEqual(leaks, [], `contour_map leaked: ${leaks.join(', ')}`);
});

t('F.3.b contour_map: perfect answer scores full marks, wrong scores 0', () => {
  const { dbSnapshot } = createSnapshotPair(contourRow, ExamMode.SIMULATOR, 1);
  const perfectAns = {
    subAnswers: {
      cm_1: 'SECRET_INTERVAL_20',
      cm_2: 'SECRET_SOUTH_WEST',
      cm_3: { polygon: [[10, 10], [50, 10], [50, 50], [10, 50]] }
    }
  };
  const rPerfect = autoGrade('contour_map' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, perfectAns, 4).obtainedMarks;
  assert.strictEqual(rPerfect, 4);

  const wrongAns = {
    subAnswers: {
      cm_1: '9999',
      cm_2: 'خطأ',
      cm_3: { polygon: [[90, 90], [95, 90], [95, 95], [90, 95]] }
    }
  };
  const rWrong = autoGrade('contour_map' as any, (dbSnapshot as any).content, (dbSnapshot as any).correct_answer, wrongAns, 4).obtainedMarks;
  assert.strictEqual(rWrong, 0);
});

console.log(`\n${passed} passed`);
