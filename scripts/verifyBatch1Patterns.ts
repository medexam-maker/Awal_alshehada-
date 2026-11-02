/**
 * BATCH 1 ACCEPTANCE — Odd One Out (two-stage) + Comparison Table (3-option dropdown per cell).
 * Written test-first: this suite is expected to FAIL before implementation.
 * Real flow: row -> createSnapshotPair -> student answer -> autoGrade(dbSnapshot).
 */
import assert from 'assert';
import { ExamMode } from '../src/shared/constants';
import { createClientSnapshot, createSnapshotPair } from '../src/server/lib/snapshot';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { validateQuestionContent, validateQuestionAnswer } from '../src/shared/validation/schemas';

let passed = 0;
let failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const mk = (type: string, content: any, ca: any, marks = 4) =>
  ({ id: 'q1', subject_id: 's', question_type: type, content, correct_answer: ca, primary_interaction_mode: 'x', marks, explanation: 'SECRET_EXPLANATION' });
const dbOf = (row: any, mode = ExamMode.SIMULATOR) => createSnapshotPair(row, mode, 1).dbSnapshot as any;
const clientOf = (row: any, mode = ExamMode.SIMULATOR) => createSnapshotPair(row, mode, 1).clientSnapshot as any;
const grade = (row: any, answer: unknown, max = 4) => {
  const db = dbOf(row);
  return autoGrade(row.question_type, db.content, db.correct_answer, answer, max).obtainedMarks;
};

// ───────────────────────────── ODD ONE OUT ─────────────────────────────
console.log('--- ODD ONE OUT (two-stage) ---');
const oddContent = (fraction = 0.5) => ({
  prompt: 'استخرج الكلمة الشاذة:',
  items: [{ id: 'i1', text: 'التلسكوب' }, { id: 'i2', text: 'العدسة المحدبة' }, { id: 'i3', text: 'المرآة المستوية' }, { id: 'i4', text: 'العدسة المقعرة' }],
  reasoning: {
    prompt: 'علّل:',
    marksFraction: fraction,
    trainingChoices: [{ id: 'r1', text: 'لأنه جهاز مركب' }, { id: 'r2', text: 'لأنه فلكي فقط' }, { id: 'r3', text: 'لأنه لا يعتمد على الضوء' }],
  },
});
const oddCa = { selectedItemIds: ['i1'], reasoning: { correctChoiceId: 'r1', keywordGroups: [['جهاز', 'اداة'], ['مركب'], ['SECRET_KW_THREE']], minGroups: 2 } };
const oddRow = (fraction = 0.5) => mk('odd_one_out', oddContent(fraction), oddCa);

t('O1.a content with valid reasoning block passes schema', () =>
  assert.strictEqual(validateQuestionContent('odd_one_out', oddContent()).valid, true));
t('O1.b reasoning with != 3 trainingChoices is rejected', () => {
  const c: any = oddContent(); c.reasoning.trainingChoices = c.reasoning.trainingChoices.slice(0, 2);
  assert.strictEqual(validateQuestionContent('odd_one_out', c).valid, false);
});
t('O1.c marksFraction outside 0..1 is rejected', () => {
  assert.strictEqual(validateQuestionContent('odd_one_out', oddContent(1.5)).valid, false);
});
t('O1.d legacy content (no reasoning) still valid', () =>
  assert.strictEqual(validateQuestionContent('odd_one_out', { prompt: 'p', items: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }] }).valid, true));
t('O1.e answer with reasonChoiceId / reasonText accepted; non-string reasonText rejected', () => {
  assert.strictEqual(validateQuestionAnswer('odd_one_out', { selectedItemIds: ['i1'], reasonChoiceId: 'r1' }).valid, true);
  assert.strictEqual(validateQuestionAnswer('odd_one_out', { selectedItemIds: ['i1'], reasonText: 'نص' }).valid, true);
  assert.strictEqual(validateQuestionAnswer('odd_one_out', { selectedItemIds: ['i1'], reasonText: 123 }).valid, false);
});

t('O2.a SIMULATOR snapshot: no answer key, no keyword groups, no training choices', () => {
  const s = clientOf(oddRow());
  const j = JSON.stringify(s);
  const leaks = ['correctAnswer', 'keywordGroups', 'SECRET_KW_THREE', 'correctChoiceId', 'SECRET_EXPLANATION', 'trainingChoices', 'isOdd', 'isCorrect'].filter((k) => j.includes(k));
  assert.deepStrictEqual(leaks, [], `leaked: ${leaks.join(', ')}`);
});
t('O2.b SIMULATOR snapshot: reasoning prompt is ALWAYS present (no reveal of stage-1 result)', () => {
  const s = clientOf(oddRow());
  assert.strictEqual(s.content.reasoning?.prompt, 'علّل:');
});
t('O2.c TRAINING snapshot: 3 training choices present, no keywordGroups inside content', () => {
  const s = clientOf(oddRow(), ExamMode.TRAINING);
  assert.strictEqual(s.content.reasoning?.trainingChoices?.length, 3);
  assert.ok(!JSON.stringify(s.content).includes('keywordGroups'));
  assert.deepStrictEqual(s.correctAnswer?.selectedItemIds, ['i1']);
});

t('O3.a stage 1 + choice correct => full marks', () => assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'], reasonChoiceId: 'r1' }), 4));
t('O3.b stage 1 correct, wrong choice => stage-1 share only (2)', () => assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'], reasonChoiceId: 'r2' }), 2));
t('O3.c wrong odd item, right reason => 0', () => assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i2'], reasonChoiceId: 'r1' }), 0));
t('O3.d stage 1 only (no reason given) => 2', () => assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'] }), 2));
t('O3.e marksFraction 0.25: stage-1 only => 3, full => 4', () => {
  assert.strictEqual(grade(oddRow(0.25), { selectedItemIds: ['i1'] }), 3);
  assert.strictEqual(grade(oddRow(0.25), { selectedItemIds: ['i1'], reasonChoiceId: 'r1' }), 4);
});
t('O3.f never negative, never above max', () => {
  const r = grade(oddRow(), { selectedItemIds: ['i1', 'i2', 'i3'], reasonChoiceId: 'r1' });
  assert.ok(r >= 0 && r <= 4);
});

console.log('--- ODD ONE OUT: simulator free-text reasoning (keyword groups, Pattern-8 normalization) ---');
t('O4.a text matching 2 groups (with tashkeel) => full', () =>
  assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'], reasonText: 'لِأَنَّهُ جِهَازٌ مُرَكَّبٌ' }), 4));
t('O4.b synonym inside a group counts once (اداة + جهاز = ONE group) => not enough => 2', () =>
  assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'], reasonText: 'جهاز او اداة' }), 2));
t('O4.c only one group matched => 2', () => assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'], reasonText: 'لانه جهاز' }), 2));
t('O4.d unrelated text => 2 (stage 1 only)', () => assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i1'], reasonText: 'لا اعرف' }), 2));
t('O4.e wrong odd item => 0 even with perfect text', () =>
  assert.strictEqual(grade(oddRow(), { selectedItemIds: ['i2'], reasonText: 'جهاز مركب' }), 0));
t('O4.f hamza/alef/taa-marbuta variants still match', () => {
  const row = mk('odd_one_out', oddContent(), { selectedItemIds: ['i1'], reasoning: { correctChoiceId: 'r1', keywordGroups: [['أداة'], ['مركّبة']], minGroups: 2 } });
  assert.strictEqual(grade(row, { selectedItemIds: ['i1'], reasonText: 'لانه اداه مركبه' }), 4);
  assert.strictEqual(grade(row, { selectedItemIds: ['i1'], reasonText: 'لانه اداه' }), 2); // one group only
});
t('O4.g letters و/ف/ب/ل are NOT stripped from inside words (old proposal bug)', () => {
  const row = mk('odd_one_out', oddContent(), { selectedItemIds: ['i1'], reasoning: { correctChoiceId: 'r1', keywordGroups: [['بصرية'], ['عناصر']], minGroups: 2 } });
  assert.strictEqual(grade(row, { selectedItemIds: ['i1'], reasonText: 'عناصر بصرية' }), 4);
  assert.strictEqual(grade(row, { selectedItemIds: ['i1'], reasonText: 'عناصر' }), 2); // one group only
});
t('O4.h legacy question without reasoning: right => full, wrong => 0', () => {
  const row = mk('odd_one_out', { prompt: 'p', items: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }] }, { selectedItemIds: ['a'] });
  assert.strictEqual(grade(row, { selectedItemIds: ['a'] }), 4);
  assert.strictEqual(grade(row, { selectedItemIds: ['b'] }), 0);
});

// ───────────────────────────── COMPARISON TABLE ─────────────────────────────
console.log('--- COMPARISON TABLE (3-option dropdown per cell) ---');
const cell = (id: string) => ({ id, value: null, options: [{ id: `${id}_a`, text: `A-${id}` }, { id: `${id}_b`, text: `B-${id}` }, { id: `${id}_c`, text: `C-${id}` }] });
const cmpContent = () => ({
  prompt: 'قارن:',
  tableHeaders: ['الصحراوي', 'السافانا الغنية'],
  rows: [
    { id: 'r1', label: 'الأمطار', cells: [cell('c11'), cell('c12')] },
    { id: 'r2', label: 'الغطاء النباتي', cells: [cell('c21'), cell('c22')] },
  ],
});
const cmpCa = { cells: { c11: 'c11_a', c12: 'c12_b', c21: 'c21_c', c22: 'c22_a' } };
const cmpRow = () => mk('comparison_table', cmpContent(), cmpCa);

t('C1.a valid 3-option content passes schema', () => assert.strictEqual(validateQuestionContent('comparison_table', cmpContent()).valid, true));
t('C1.b cell with 2 options is rejected', () => {
  const c: any = cmpContent(); c.rows[0].cells[0].options.pop();
  assert.strictEqual(validateQuestionContent('comparison_table', c).valid, false);
});
t('C1.c duplicate option ids in a cell are rejected', () => {
  const c: any = cmpContent(); c.rows[0].cells[0].options[1].id = c.rows[0].cells[0].options[0].id;
  assert.strictEqual(validateQuestionContent('comparison_table', c).valid, false);
});
t('C1.d legacy content (string options + correctValue) still valid', () =>
  assert.strictEqual(validateQuestionContent('comparison_table', { prompt: 'p', tableHeaders: ['h'], rows: [{ id: 'r', label: 'l', cells: [{ id: 'c', value: null, correctValue: 'x', options: ['x', 'y', 'z'] }] }] }).valid, true));

t('C2.a SIMULATOR snapshot: options are {id,text}, no answer keys', () => {
  const s = clientOf(cmpRow());
  const j = JSON.stringify(s);
  const leaks = ['correctAnswer', 'correctValue', 'correctOptionId', 'SECRET_EXPLANATION'].filter((k) => j.includes(k));
  assert.deepStrictEqual(leaks, [], `leaked: ${leaks.join(', ')}`);
  const opt = s.content.rows[0].cells[0].options[0];
  assert.ok(opt && typeof opt.id === 'string' && typeof opt.text === 'string');
  assert.strictEqual(s.content.rows[0].cells[0].options.length, 3);
});
t('C2.b TRAINING snapshot keeps correctAnswer for instant feedback', () =>
  assert.deepStrictEqual(clientOf(cmpRow(), ExamMode.TRAINING).correctAnswer?.cells, cmpCa.cells));

t('C3.a option order shown to student is persisted in the DB snapshot', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(cmpRow(), ExamMode.SIMULATOR, 1) as any;
  const ids = (x: any) => x.content.rows.flatMap((r: any) => r.cells.map((c: any) => c.options.map((o: any) => o.id).join(','))).join('|');
  assert.strictEqual(ids(dbSnapshot), ids(clientSnapshot));
});
t('C3.b rebuilding the client snapshot from the stored DB snapshot gives the same order (resume)', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(cmpRow(), ExamMode.SIMULATOR, 1) as any;
  const again: any = createClientSnapshot(dbSnapshot, ExamMode.SIMULATOR, 1);
  const ids = (x: any) => x.content.rows.flatMap((r: any) => r.cells.map((c: any) => c.options.map((o: any) => o.id).join(','))).join('|');
  assert.strictEqual(ids(again), ids(clientSnapshot));
});

t('C4.a all cells correct => full', () => assert.strictEqual(grade(cmpRow(), { cells: { ...cmpCa.cells } }), 4));
t('C4.b two of four correct => half', () => assert.strictEqual(grade(cmpRow(), { cells: { c11: 'c11_a', c12: 'c12_b', c21: 'c21_a', c22: 'c22_b' } }), 2));
t('C4.c unknown option id / option of another cell => that cell wrong', () =>
  assert.strictEqual(grade(cmpRow(), { cells: { c11: 'c12_b', c12: 'zzz', c21: 'c21_c', c22: 'c22_a' } }), 2));
t('C4.d empty / missing answer => 0', () => { assert.strictEqual(grade(cmpRow(), { cells: {} }), 0); assert.strictEqual(grade(cmpRow(), undefined), 0); });
t('C4.e extra cell ids in the answer are ignored', () =>
  assert.strictEqual(grade(cmpRow(), { cells: { ...cmpCa.cells, c99: 'x' } }), 4));
t('C4.f prefilled (non-interactive) cells are not graded', () => {
  const c: any = cmpContent(); c.rows[0].cells[0] = { id: 'c11', value: 'ثابت' };
  const row = mk('comparison_table', c, { cells: { c12: 'c12_b', c21: 'c21_c', c22: 'c22_a' } }, 3);
  assert.strictEqual(grade(row, { cells: { c12: 'c12_b', c21: 'c21_c', c22: 'c22_a' } }, 3), 3);
  assert.strictEqual(grade(row, { cells: { c12: 'c12_b' } }, 3), 1);
});
t('C5 end-to-end: answer built ONLY from option ids the student saw scores full', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(cmpRow(), ExamMode.SIMULATOR, 1) as any;
  const seen = new Set<string>(clientSnapshot.content.rows.flatMap((r: any) => r.cells.flatMap((c: any) => c.options.map((o: any) => o.id))));
  const answer = { cells: dbSnapshot.correct_answer.cells };
  Object.values(answer.cells).forEach((id) => assert.ok(seen.has(id as string), `option ${id} was never shown`));
  assert.strictEqual(autoGrade('comparison_table' as any, dbSnapshot.content, dbSnapshot.correct_answer, answer, 4).obtainedMarks, 4);
});
t('C6 legacy cells (correctValue text) still graded by normalized text', () => {
  const content = { prompt: 'p', tableHeaders: ['h'], rows: [{ id: 'r', label: 'l', cells: [{ id: 'c1', value: null, correctValue: 'سودان', options: ['سودان', 'مصر', 'تشاد'] }, { id: 'c2', value: null, correctValue: 'خرطوم', options: ['خرطوم', 'القاهرة', 'انجمينا'] }] }] };
  const row = mk('comparison_table', content, {});
  assert.strictEqual(grade(row, { cells: { c1: 'سودان', c2: 'خرطوم' } }), 4);
  assert.strictEqual(grade(row, { cells: { c1: 'مصر', c2: 'خرطوم' } }), 2);
});

// ───────────────────────────── DEMO QUESTIONS ─────────────────────────────
console.log('--- DEMO QUESTIONS (one per pattern, suitable subject) ---');
async function demoChecks() {
  let demo: any;
  try { demo = await import('../src/shared/batch1DemoQuestions'); } catch { demo = null; }
  t('D1 src/shared/batch1DemoQuestions.ts exports DEMO_ODD_ONE_OUT and DEMO_COMPARISON_TABLE', () => {
    assert.ok(demo && demo.DEMO_ODD_ONE_OUT && demo.DEMO_COMPARISON_TABLE, 'module or exports missing');
  });
  if (demo?.DEMO_ODD_ONE_OUT) {
    const d = demo.DEMO_ODD_ONE_OUT;
    t('D2.a odd-one-out demo belongs to physics and passes schema', () => {
      assert.strictEqual(d.subjectSlug, 'physics');
      assert.strictEqual(validateQuestionContent('odd_one_out', d.row.content).valid, true);
    });
    t('D2.b odd-one-out demo: perfect training answer and perfect simulator text both score full', () => {
      const ca = d.row.correct_answer;
      assert.strictEqual(grade(d.row, { selectedItemIds: ca.selectedItemIds, reasonChoiceId: ca.reasoning.correctChoiceId }, d.row.marks), d.row.marks);
      const text = ca.reasoning.keywordGroups.slice(0, ca.reasoning.minGroups).map((g: string[]) => g[0]).join(' ');
      assert.strictEqual(grade(d.row, { selectedItemIds: ca.selectedItemIds, reasonText: text }, d.row.marks), d.row.marks);
    });
  }
  if (demo?.DEMO_COMPARISON_TABLE) {
    const d = demo.DEMO_COMPARISON_TABLE;
    t('D3.a comparison-table demo belongs to geography and passes schema', () => {
      assert.strictEqual(d.subjectSlug, 'geography');
      assert.strictEqual(validateQuestionContent('comparison_table', d.row.content).valid, true);
    });
    t('D3.b comparison-table demo: perfect answer scores full', () =>
      assert.strictEqual(grade(d.row, { cells: d.row.correct_answer.cells }, d.row.marks), d.row.marks));
  }
  let curriculum: any = null;
  try { curriculum = (await import('../src/client/storage/defaultCurriculumData')).generateInitialQuestions(); } catch { curriculum = null; }
  t('D4 client default curriculum contains the physics odd_one_out and the geography comparison_table demos', () => {
    assert.ok(curriculum, 'generateInitialQuestions() not loadable');
    assert.ok(curriculum.some((q: any) => q.subjectSlug === 'physics' && q.questionType === 'odd_one_out' && q.content?.reasoning), 'physics odd_one_out demo missing');
    assert.ok(curriculum.some((q: any) => q.subjectSlug === 'geography' && q.questionType === 'comparison_table'), 'geography comparison_table demo missing');
  });
  console.log(`\n${passed} passed, ${failed} failed`);
}
demoChecks();
