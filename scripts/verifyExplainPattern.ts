import assert from 'assert';
import { QuestionType, GradingStatus, ExamMode } from '../src/shared/constants';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { createClientSnapshot } from '../src/server/lib/snapshot';

let passed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${e?.message || e}`); process.exitCode = 1; }
}
console.log('--- EXPLAIN (علّل/فسّر) VERIFICATION ---');

const reasonContent = {
  prompt: 'علّل: يطفو الجليد على سطح الماء.',
  reasonOptions: [
    { id: 'r1', text: 'لأن كثافة الجليد أقل من كثافة الماء السائل' },
    { id: 'r2', text: 'لأن الجليد أبرد من الماء' },
    { id: 'r3', text: 'لأن الروابط الهيدروجينية تباعد الجزيئات في البلورة' },
    { id: 'r4', text: 'لأن الجليد أثقل' },
  ],
};
const reasonCa = { selectedReasonIds: ['r1', 'r3'] };
const g = (sa: unknown) => autoGrade(QuestionType.EXPLAIN, reasonContent, reasonCa, sa, 10);

t('reason-list: all correct => full marks', () => assert.strictEqual(g({ selectedReasonIds: ['r1', 'r3'] }).obtainedMarks, 10));
t('reason-list: one of two correct => half', () => assert.strictEqual(g({ selectedReasonIds: ['r1'] }).obtainedMarks, 5));
t('reason-list: correct + one wrong cancels => 0.5 of marks', () => assert.strictEqual(g({ selectedReasonIds: ['r1', 'r3', 'r4'] }).obtainedMarks, 5));
t('reason-list: only wrong => 0 (never negative)', () => assert.strictEqual(g({ selectedReasonIds: ['r2', 'r4'] }).obtainedMarks, 0));
t('reason-list: empty / missing answer => 0, auto graded', () => {
  const r = g(undefined);
  assert.strictEqual(r.obtainedMarks, 0);
  assert.strictEqual(r.gradingStatus, GradingStatus.AUTO_GRADED);
});
t('reason-list: no key configured => manual pending', () => {
  const r = autoGrade(QuestionType.EXPLAIN, reasonContent, {}, { selectedReasonIds: ['r1'] }, 10);
  assert.strictEqual(r.gradingStatus, GradingStatus.MANUAL_PENDING);
});
t('reason-list: duplicates in answer do not inflate score', () => assert.strictEqual(g({ selectedReasonIds: ['r1', 'r1', 'r1'] }).obtainedMarks, 5));

const row = { id: 'q1', subject_id: 's', question_type: 'explain', content: reasonContent, correct_answer: reasonCa, primary_interaction_mode: 'select_reason_from_list', marks: 10, explanation: 'شرح' };
t('snapshot (simulator): options exposed, correct ids NOT exposed', () => {
  const s: any = createClientSnapshot(row, ExamMode.SIMULATOR, 1);
  assert.strictEqual(s.content.reasonOptions.length, 4);
  assert.strictEqual(s.correctAnswer, undefined);
  assert.ok(!JSON.stringify(s).includes('selectedReasonIds'));
});
t('snapshot (training): correct ids available for local feedback', () => {
  const s: any = createClientSnapshot(row, ExamMode.TRAINING, 1);
  assert.deepStrictEqual(s.correctAnswer.selectedReasonIds, ['r1', 'r3']);
});

// Regression: word-block mode still works
t('word-block regression: exact sequence => full marks', () => {
  const r = autoGrade(QuestionType.EXPLAIN, { correctSequence: ['لأن', 'الكثافة', 'أقل'] }, { sequence: ['لأن', 'الكثافة', 'أقل'] }, { sequence: ['لأن', 'الكثافة', 'أقل'] }, 4);
  assert.strictEqual(r.obtainedMarks, 4);
});
t('word-block regression: wrong order => 0', () => {
  const r = autoGrade(QuestionType.EXPLAIN, { correctSequence: ['أ', 'ب'] }, {}, { sequence: ['ب', 'أ'] }, 4);
  assert.strictEqual(r.obtainedMarks, 0);
});
console.log(`\n${passed} passed`);
