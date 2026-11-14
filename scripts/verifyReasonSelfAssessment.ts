/**
 * ODD-ONE-OUT REASON: SELF-ASSESSMENT IN WEEKLY SIMULATION (CR-2026-11-13). Test-first: expected to FAIL before implementation.
 * Flow: the student writes the reason, presses Enter, the true reason (referenceReason) appears, the student answers
 * "was your answer correct? yes/no" (reasonSelfEval). Same philosophy as fill_blank: only in Weekly Simulation.
 */
import assert from 'assert';
import { ExamMode, GradingStatus } from '../src/shared/constants';
import { createClientSnapshot, createSnapshotPair } from '../src/server/lib/snapshot';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { validateQuestionContent, validateQuestionAnswer } from '../src/shared/validation/schemas';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const REF = 'لأنه جهاز مركب من عدة عناصر بصرية، بينما البقية عناصر بصرية مفردة';
const items = [{ id: 'i1', text: 'التلسكوب' }, { id: 'i2', text: 'العدسة المحدبة' }, { id: 'i3', text: 'المرآة المستوية' }, { id: 'i4', text: 'العدسة المقعرة' }];
const choices = [{ id: 'r1', text: 'لأنه جهاز مركب' }, { id: 'r2', text: 'لأنه فلكي فقط' }, { id: 'r3', text: 'لأنه لا يعتمد على الضوء' }];
const row = (content: any, ca: any): any => ({ id: 'q1', subject_id: 's', question_type: 'odd_one_out', content, correct_answer: ca, primary_interaction_mode: 'x', marks: 4, explanation: 'EXPL' });
const withChoices = (fraction = 0.5) => ({ prompt: 'استخرج الشاذ', items, reasoning: { prompt: 'علّل', marksFraction: fraction, trainingChoices: choices } });
const noChoices = (fraction = 0.5) => ({ prompt: 'استخرج الشاذ', items, reasoning: { prompt: 'علّل', marksFraction: fraction } });
const selfRow = (fraction = 0.5) => row(withChoices(fraction), { selectedItemIds: ['i1'], reasoning: { correctChoiceId: 'r1', referenceReason: REF } });
const simOnlyRow = () => row(noChoices(), { selectedItemIds: ['i1'], reasoning: { referenceReason: REF } });
const legacyRow = () => row(withChoices(), { selectedItemIds: ['i1'], reasoning: { correctChoiceId: 'r1', keywordGroups: [['جهاز'], ['مركب']], minGroups: 2 } });
const pair = (r: any, mode: any, weekly: boolean) => createSnapshotPair(clone(r), mode, 1, weekly) as any;
const grade = (r: any, answer: unknown, weekly: boolean, mode: any = ExamMode.SIMULATOR) => {
  const { dbSnapshot } = pair(r, mode, weekly);
  return autoGrade('odd_one_out' as any, dbSnapshot.content, dbSnapshot.correct_answer, answer, 4);
};
const ans = (over: any = {}) => ({ selectedItemIds: ['i1'], reasonText: 'جهاز', reasonConfirmed: true, reasonSelfEval: true, ...over });

console.log('--- V. Validation ---');
t('V1 a reasoning block WITHOUT training choices is valid (simulator-only question)', () => assert.strictEqual(validateQuestionContent('odd_one_out', noChoices()).valid, true));
t('V2 answer: reasonConfirmed and reasonSelfEval must be booleans', () => {
  const v = (a: any) => validateQuestionAnswer('odd_one_out', a).valid;
  assert.strictEqual(v(ans()), true); assert.strictEqual(v(ans({ reasonSelfEval: false })), true);
  assert.strictEqual(v(ans({ reasonSelfEval: 'yes' })), false); assert.strictEqual(v(ans({ reasonConfirmed: 1 })), false);
});

console.log('--- N. Snapshots: the true reason exists only in Weekly Simulation ---');
t('N1 WEEKLY simulator snapshot carries the true reason and no keys', () => {
  const s = pair(selfRow(), ExamMode.SIMULATOR, true).clientSnapshot; const j = JSON.stringify(s);
  assert.strictEqual(s.content.reasoning.referenceReason, REF);
  for (const k of ['correctAnswer', 'correctChoiceId', 'keywordGroups', 'trainingChoices', 'EXPL']) assert.ok(!j.includes(k), `leaked ${k}`);
});
t('N2 STANDARD simulator snapshot never carries the true reason', () => {
  const j = JSON.stringify(pair(selfRow(), ExamMode.SIMULATOR, false).clientSnapshot);
  assert.ok(!j.includes('referenceReason') && !j.includes('جهاز مركب من عدة'));
});
t('N3 resume: rebuilding from the stored DB snapshot keeps the weekly/standard difference', () => {
  const w = pair(selfRow(), ExamMode.SIMULATOR, true).dbSnapshot;
  assert.ok(JSON.stringify(createClientSnapshot(w, ExamMode.SIMULATOR, 1, true)).includes('جهاز مركب من عدة'));
  assert.ok(!JSON.stringify(createClientSnapshot(w, ExamMode.SIMULATOR, 1, false)).includes('جهاز مركب من عدة'));
});
t('N4 a simulator-only question (no distractors) still shows prompt and true reason in weekly mode', () => {
  const s = pair(simOnlyRow(), ExamMode.SIMULATOR, true).clientSnapshot;
  assert.strictEqual(s.content.reasoning.prompt, 'علّل'); assert.strictEqual(s.content.reasoning.referenceReason, REF);
});

console.log('--- G. Grading ---');
t('G1 weekly: stage 1 right + self-evaluation yes => full marks (auto graded); no => stage-1 share only', () => {
  const yes = grade(selfRow(), ans(), true); assert.strictEqual(yes.obtainedMarks, 4); assert.strictEqual(yes.gradingStatus, GradingStatus.AUTO_GRADED);
  assert.strictEqual(grade(selfRow(), ans({ reasonSelfEval: false }), true).obtainedMarks, 2);
});
t('G2 a self-evaluation counts only when the reason was confirmed and the flag is a real boolean', () => {
  assert.strictEqual(grade(selfRow(), ans({ reasonConfirmed: false }), true).obtainedMarks, 2);
  assert.strictEqual(grade(selfRow(), ans({ reasonConfirmed: undefined }), true).obtainedMarks, 2);
  assert.strictEqual(grade(selfRow(), ans({ reasonSelfEval: 'true' }), true).obtainedMarks, 2);
});
t('G3 wrong odd item => 0 even if the student says the reason was right', () => assert.strictEqual(grade(selfRow(), ans({ selectedItemIds: ['i2'] }), true).obtainedMarks, 0));
t('G4 marksFraction is respected (0.25: yes => 4, no => 3)', () => {
  assert.strictEqual(grade(selfRow(0.25), ans(), true).obtainedMarks, 4); assert.strictEqual(grade(selfRow(0.25), ans({ reasonSelfEval: false }), true).obtainedMarks, 3);
});
t('G5 SECURITY: a forged self-evaluation in a STANDARD simulator earns nothing and is not auto graded as complete', () => {
  const r = grade(selfRow(), ans(), false);
  assert.strictEqual(r.obtainedMarks, 2); assert.notStrictEqual(r.gradingStatus, GradingStatus.AUTO_GRADED);
});
t('G6 questions authored with keyword groups keep grading by keywords; self-evaluation cannot override them', () => {
  assert.strictEqual(grade(legacyRow(), ans({ reasonText: 'لأنه جهاز مركب', reasonSelfEval: false }), false).obtainedMarks, 4);
  assert.strictEqual(grade(legacyRow(), ans({ reasonText: 'جهاز', reasonSelfEval: true }), true).obtainedMarks, 2);
  assert.strictEqual(grade(legacyRow(), ans({ reasonText: 'جهاز', reasonSelfEval: true }), false).obtainedMarks, 2);
});
t('G7 training choices still grade by id in every mode', () => {
  const choice = (id: string, weekly: boolean) => grade(selfRow(), { selectedItemIds: ['i1'], reasonChoiceId: id }, weekly, ExamMode.TRAINING).obtainedMarks;
  assert.strictEqual(choice('r1', false), 4); assert.strictEqual(choice('r2', false), 2); assert.strictEqual(choice('r1', true), 4);
});
t('G8 no reasoning block: behaviour unchanged (right => full, wrong => 0)', () => {
  const plain = row({ prompt: 'p', items }, { selectedItemIds: ['i1'] });
  assert.strictEqual(grade(plain, { selectedItemIds: ['i1'] }, false).obtainedMarks, 4); assert.strictEqual(grade(plain, { selectedItemIds: ['i2'] }, false).obtainedMarks, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
