/**
 * PIPELINE AUDIT — Arabic Grammar Lab (C1) and Active Reading Journey (Contract 3) (CR-2026-11-12).
 * Real flow: row -> createSnapshotPair -> student answer built from what the student saw -> autoGrade(dbSnapshot).
 * Written as an audit: checks that already hold are regression guards, the rest document real defects.
 */
import assert from 'assert';
import { ExamMode } from '../src/shared/constants';
import { createClientSnapshot, createSnapshotPair } from '../src/server/lib/snapshot';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { DEMO_READING_ACTIVE_JOURNEY } from '../src/shared/batch1DemoQuestions';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const pair = (row: any, mode: any) => createSnapshotPair(clone(row), mode, 1) as any;

// ───────────────────────────── Arabic grammar (C1) ─────────────────────────────
const G_HINT = 'لاحظ أن الحرف المنسوخ (إنّ) يدخل على الجملة الاسمية.';
const G_EXPL = 'إنّ تنصب المبتدأ وتسمى اسم إنّ';
const gRow = (): any => ({
  id: 'g1', subject_id: 'arabic', question_type: 'arabic_grammar', primary_interaction_mode: 'select_from_preset_options', marks: 10, explanation: G_EXPL,
  content: {
    prompt: 'أعرب الكلمتين المحددتين', passage: 'إنّ المعلمينَ مخلصونَ في رسالتهم', sentence: 'إنّ المعلمينَ مخلصونَ في رسالتهم', targetWord: 'المعلمينَ - مخلصونَ',
    components: [
      { id: 'comp_1', label: 'الموقع الإعرابي لـ (المعلمينَ)', points: 4, choices: [{ id: 'ch_1a', text: 'اسم إنّ منصوب' }, { id: 'ch_1b', text: 'خبر إنّ مرفوع' }, { id: 'ch_1c', text: 'فاعل مرفوع' }], hints: [{ level: 1, text: G_HINT }] },
      { id: 'comp_2', label: 'علامة الإعراب', points: 2, choices: [{ id: 'ch_2a', text: 'الياء لأنه جمع مذكر سالم' }, { id: 'ch_2b', text: 'الفتحة الظاهرة' }, { id: 'ch_2c', text: 'الكسرة' }] },
      { id: 'comp_3', label: 'الموقع الإعرابي لـ (مخلصونَ)', points: 4, choices: [{ id: 'ch_3a', text: 'خبر إنّ مرفوع' }, { id: 'ch_3b', text: 'نعت مرفوع' }, { id: 'ch_3c', text: 'حال منصوب' }] },
    ],
  },
  correct_answer: { components: { comp_1: 'ch_1a', comp_2: 'ch_2a', comp_3: 'ch_3a' } },
});
const gGrade = (db: any, answer: unknown) => autoGrade('arabic_grammar' as any, db.content, db.correct_answer, answer, 10).obtainedMarks;
const gLeaks = (snap: any) => { const j = JSON.stringify(snap); return ['correctAnswer', G_HINT, G_EXPL, 'isCorrect', 'correctChoiceId'].filter((k) => j.includes(k)); };

console.log('--- G. Arabic grammar lab ---');
t('G1 SIMULATOR snapshot: no answer key, hints or explanation', () => assert.deepStrictEqual(gLeaks(pair(gRow(), ExamMode.SIMULATOR).clientSnapshot), []));
t('G2 a perfect answer built from the choice ids the student saw scores full marks; one wrong component loses exactly its share', () => {
  const { dbSnapshot, clientSnapshot } = pair(gRow(), ExamMode.SIMULATOR);
  const seen = new Set<string>(clientSnapshot.content.components.flatMap((c: any) => c.choices.map((x: any) => x.id)));
  const ans = dbSnapshot.correct_answer.components;
  Object.values(ans).forEach((id: any) => assert.ok(seen.has(id), `${id} never shown`));
  assert.strictEqual(gGrade(dbSnapshot, { components: ans }), 10);
  assert.strictEqual(gGrade(dbSnapshot, { components: { ...ans, comp_1: 'ch_1b' } }), 6);
  assert.strictEqual(gGrade(dbSnapshot, { components: { ...ans, comp_2: 'ch_2b' } }), 8);
});
t('G3 a choice id that belongs to another component earns nothing; missing or malformed answers score 0 without throwing', () => {
  const { dbSnapshot } = pair(gRow(), ExamMode.SIMULATOR);
  assert.strictEqual(gGrade(dbSnapshot, { components: { comp_1: 'ch_3a', comp_2: 'ch_2a', comp_3: 'ch_3a' } }), 6);
  for (const a of [undefined, null, {}, { components: null }, 'x', 7]) assert.strictEqual(gGrade(dbSnapshot, a), 0);
});
t('G4 TRAINING snapshot keeps hints and the answer key for instant feedback', () => {
  const s = pair(gRow(), ExamMode.TRAINING).clientSnapshot;
  assert.ok(JSON.stringify(s).includes(G_HINT)); assert.deepStrictEqual(s.correctAnswer.components, { comp_1: 'ch_1a', comp_2: 'ch_2a', comp_3: 'ch_3a' });
});
t('G5 SIMULATOR snapshot rebuilt from the stored DB snapshot (resume) is also free of keys', () => {
  const p = pair(gRow(), ExamMode.SIMULATOR);
  assert.deepStrictEqual(gLeaks(createClientSnapshot(p.dbSnapshot, ExamMode.SIMULATOR, 1)), []);
});
const gOrder = (x: any) => x.content.components.map((c: any) => c.choices.map((z: any) => z.id).join(',')).join('|');
t('G6 choices are shuffled per attempt (the authored correct choice is not always first), persisted in the DB snapshot, and stable on rebuild', () => {
  let notFirst = 0;
  for (let i = 0; i < 120; i++) {
    const p = pair(gRow(), ExamMode.SIMULATOR);
    if (p.clientSnapshot.content.components[0].choices[0].id !== 'ch_1a') notFirst++;
    assert.strictEqual(gOrder(p.dbSnapshot), gOrder(p.clientSnapshot), 'client order differs from the stored DB order');
  }
  assert.ok(notFirst > 40, `choices look unshuffled (not-first ${notFirst}/120)`);
  const p = pair(gRow(), ExamMode.SIMULATOR);
  assert.strictEqual(gOrder(createClientSnapshot(p.dbSnapshot, ExamMode.SIMULATOR, 1)), gOrder(p.clientSnapshot));
});

// ───────────────────────────── Active reading journey (Contract 3) ─────────────────────────────
const rRow = (): any => clone(DEMO_READING_ACTIVE_JOURNEY.row);
const R_DEFS = ['تدقيق واختبار ونقد المعلومات لتخليصها من الخطأ', 'ركز على الجملة الأخيرة في الفقرة الأولى', 'يدعو النص إلى استغلال التكنولوجيا الرقمية'];
const rLeaks = (snap: any) => { const j = JSON.stringify(snap); return ['correctOptionId', 'correctValue', 'acceptableAnswers', 'acceptedSentenceIds', 'acceptedQuoteKeywords', 'targetParagraphId', 'correctAnswer', ...R_DEFS].filter((k) => j.includes(k)); };
const rGrade = (db: any, answer: unknown, max = 10) => autoGrade('reading_comprehension' as any, db.content, db.correct_answer, answer, max).obtainedMarks;
const perfectReading = (): any => ({ subAnswers: { sq1: { coreAnswer: 'sq1_opt1', evidence: { paragraphId: 'p1' } }, sq2: { coreAnswer: 'sq2_opt1' }, sq3: { coreAnswer: 'sq3_opt1', evidence: { paragraphId: 'p2' } }, sq4: { coreAnswer: 'sq4_opt1', evidence: { paragraphId: 'p3' } }, sq5: { coreAnswer: 'sq5_opt1' } } });

console.log('--- R. Active reading journey ---');
t('R1 SIMULATOR snapshot: no answer keys, evidence targets, hints, vocabulary definitions or explanation', () => assert.deepStrictEqual(rLeaks(pair(rRow(), ExamMode.SIMULATOR).clientSnapshot), []));
t('R2 a perfect answer built from the option ids the student saw scores full marks on the DB snapshot', () => {
  const { dbSnapshot, clientSnapshot } = pair(rRow(), ExamMode.SIMULATOR);
  const seen = new Set<string>(clientSnapshot.content.subQuestions.flatMap((q: any) => (q.options || []).map((o: any) => o.id)));
  for (const k of ['sq1_opt1', 'sq2_opt1', 'sq3_opt1', 'sq4_opt1', 'sq5_opt1']) assert.ok(seen.has(k), `${k} never shown`);
  assert.strictEqual(rGrade(dbSnapshot, perfectReading()), 10);
});
const rOrder = (x: any) => x.content.subQuestions.map((q: any) => (q.options || []).map((o: any) => o.id).join(',')).join('|');
t('R3 options are shuffled per attempt, persisted in the DB snapshot, and stable on rebuild', () => {
  let notFirst = 0;
  for (let i = 0; i < 100; i++) {
    const p = pair(rRow(), ExamMode.SIMULATOR);
    if (p.clientSnapshot.content.subQuestions[0].options[0].id !== 'sq1_opt1') notFirst++;
    assert.strictEqual(rOrder(p.dbSnapshot), rOrder(p.clientSnapshot));
  }
  assert.ok(notFirst > 25, `options look unshuffled (not-first ${notFirst}/100)`);
  const p = pair(rRow(), ExamMode.SIMULATOR);
  assert.strictEqual(rOrder(createClientSnapshot(p.dbSnapshot, ExamMode.SIMULATOR, 1)), rOrder(p.clientSnapshot));
});
t('R4 SIMULATOR snapshot rebuilt from the stored DB snapshot (resume) is also free of keys', () => {
  const p = pair(rRow(), ExamMode.SIMULATOR);
  assert.deepStrictEqual(rLeaks(createClientSnapshot(p.dbSnapshot, ExamMode.SIMULATOR, 1)), []);
});
t('R5 core answer and evidence are graded independently (70% / 30%)', () => {
  const { dbSnapshot } = pair(rRow(), ExamMode.SIMULATOR);
  const wrongEv = perfectReading(); wrongEv.subAnswers.sq1.evidence = { paragraphId: 'p3' };
  assert.strictEqual(Math.round(rGrade(dbSnapshot, wrongEv) * 100) / 100, 9.4);
  const wrongCore = perfectReading(); wrongCore.subAnswers.sq1.coreAnswer = 'sq1_opt2';
  assert.strictEqual(Math.round(rGrade(dbSnapshot, wrongCore) * 100) / 100, 8.6);
});
t('R6 missing or malformed answers score 0 without throwing', () => {
  const { dbSnapshot } = pair(rRow(), ExamMode.SIMULATOR);
  for (const a of [undefined, null, {}, { subAnswers: null }, { subAnswers: { sq1: null } }, 'x', 5]) assert.strictEqual(rGrade(dbSnapshot, a), 0);
});
t('R7 TRAINING snapshot keeps hints, vocabulary definitions and the key', () => {
  const j = JSON.stringify(pair(rRow(), ExamMode.TRAINING).clientSnapshot);
  assert.ok(j.includes(R_DEFS[0]) && j.includes('correctOptionId'));
});
const evRow = (keywords: string[]): any => {
  const row = rRow(); const sq = row.content.subQuestions[0];
  sq.evidence = { required: true, acceptedQuoteKeywords: keywords }; row.correct_answer.subAnswers.sq1 = { correctOptionId: 'sq1_opt1', evidence: { required: true, acceptedQuoteKeywords: keywords } };
  return row;
};
const evMarks = (keywords: string[], quote: string) => {
  const { dbSnapshot } = pair(evRow(keywords), ExamMode.SIMULATOR);
  const a: any = perfectReading(); a.subAnswers.sq1 = { coreAnswer: 'sq1_opt1', evidence: { selectedQuote: quote } };
  return Math.round(rGrade(dbSnapshot, a) * 100) / 100;
};
t('R8 a quoted sentence containing the keyword earns the evidence marks (full 10)', () => assert.strictEqual(evMarks(['التلقين'], 'دون الاقتصار على التلقين المباشر'), 10));
t('R9 pasting the whole passage as the quote must NOT earn evidence marks', () => {
  const full = rRow().content.passage; assert.ok(full.length > 400);
  assert.strictEqual(evMarks(['التلقين'], full), 9.4);
});
t('R10 evidence keywords match whole words: "علم" is not found inside "متعلمون"', () => assert.strictEqual(evMarks(['علم'], 'الطلاب متعلمون'), 9.4));
t('R11 Arabic prefixes are still accepted: "والعلم" matches the keyword "علم"', () => assert.strictEqual(evMarks(['علم'], 'والعلم نور'), 10));

console.log(`\n${passed} passed, ${failed} failed`);
