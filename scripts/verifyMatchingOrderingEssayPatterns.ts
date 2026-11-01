import assert from 'assert';
import { QuestionType, GradingStatus, ExamMode } from '../src/shared/constants';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { validateMatchingQuestionContent } from '../src/shared/questionTypeRegistry';
import { validateQuestionContent, validateQuestionAnswer } from '../src/shared/validation/schemas';

let passed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${e?.message || e}`); process.exitCode = 1; }
}

console.log('--- MATCHING ---');
const mContent = {
  pairs: [
    { id: 'p1', source: 'السرعة', target: 'تغير المسافة' },
    { id: 'p2', source: 'التسارع', target: 'تغير السرعة' },
    { id: 'p3', source: 'القوة', target: 'مؤثر خارجي' },
  ],
  distractors: [{ id: 'd1', target: 'كمية المادة' }],
};
const mCa = { pairs: { p1: 'target_p1', p2: 'target_p2', p3: 'target_p3' } };
const m = (conn: Record<string, string>, content: any = mContent) =>
  autoGrade(QuestionType.MATCHING, content, mCa, { connections: conn }, 6).obtainedMarks;

t('matching: content validator accepts valid pairs', () => assert.strictEqual(validateMatchingQuestionContent(mContent).valid, true));
t('matching: validator rejects duplicate target', () =>
  assert.strictEqual(validateMatchingQuestionContent({ pairs: [{ id: 'a', source: 'x', target: 't' }, { id: 'b', source: 'y', target: 't' }] }).valid, false));
t('matching: validator rejects < 2 pairs', () =>
  assert.strictEqual(validateMatchingQuestionContent({ pairs: [{ id: 'a', source: 'x', target: 't' }] }).valid, false));
t('matching: all correct => full', () => assert.strictEqual(m({ p1: 'target_p1', p2: 'target_p2', p3: 'target_p3' }), 6));
t('matching: partial credit proportional', () => assert.strictEqual(m({ p1: 'target_p1', p2: 'target_p3' }), 2));
t('matching: distractor never scores', () => assert.strictEqual(m({ p1: 'd1' }), 0));
t('matching: empty => 0', () => assert.strictEqual(m({}), 0));
t('matching: all_or_nothing with one wrong => 0', () =>
  assert.strictEqual(m({ p1: 'target_p1', p2: 'target_p2', p3: 'target_p1' }, { ...mContent, scoring_type: 'all_or_nothing' }), 0));

console.log('--- ORDERING ---');
const oContent = { items: [{ id: 's1', text: 'أ' }, { id: 's2', text: 'ب' }, { id: 's3', text: 'ج' }, { id: 's4', text: 'د' }] };
const oCa = { orderedIds: ['s1', 's2', 's3', 's4'] };
const o = (sa: unknown) => autoGrade(QuestionType.ORDERING, oContent, oCa, sa, 8).obtainedMarks;
t('ordering: exact order => full', () => assert.strictEqual(o({ orderedIds: ['s1', 's2', 's3', 's4'] }), 8));
t('ordering: positional partial credit', () => assert.strictEqual(o({ orderedIds: ['s1', 's2', 's4', 's3'] }), 4));
t('ordering: reversed => 0', () => assert.strictEqual(o({ orderedIds: ['s4', 's3', 's2', 's1'] }), 0));
t('ordering: record shape {order:{id:pos}} accepted', () => assert.strictEqual(o({ order: { s1: 1, s2: 2, s3: 3, s4: 4 } }), 8));
t('ordering: incomplete answer scores only placed items', () => assert.strictEqual(o({ orderedIds: ['s1', 's2'] }), 4));
t('ordering: empty => 0', () => assert.strictEqual(o({}), 0));
t('ordering: legacy correctOrder in content', () =>
  assert.strictEqual(autoGrade(QuestionType.ORDERING, { ...oContent, correctOrder: ['s2', 's1', 's3', 's4'] }, {}, { orderedIds: ['s2', 's1', 's3', 's4'] }, 8).obtainedMarks, 8));

console.log('--- LONG ESSAY ---');
t('long essay: content requires prompt', () => assert.strictEqual(validateQuestionContent('long_essay', {}).valid, false));
t('long essay: valid content passes', () => assert.strictEqual(validateQuestionContent('long_essay', { prompt: 'اكتب مقالاً عن أهمية التعليم' }).valid, true));
t('long essay: answer requires text', () => assert.strictEqual(validateQuestionAnswer('long_essay', {}).valid, false));
t('long essay: never auto-scored => manual pending, 0 marks', () => {
  const r = autoGrade(QuestionType.LONG_ESSAY, { prompt: 'x' }, {}, { text: 'مقال طويل جداً' }, 10);
  assert.strictEqual(r.gradingStatus, GradingStatus.MANUAL_PENDING);
  assert.strictEqual(r.obtainedMarks, 0);
});
console.log(`\n${passed} passed`);
