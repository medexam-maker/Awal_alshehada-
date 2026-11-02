/**
 * BATCH 1 FOLLOW-UP (CR-2026-11-05) — test-first.
 * F1: reason keywords must match WHOLE words (with Arabic prefixes), never substrings.
 * F2: the 3 training reason choices are shuffled at attempt start, persisted, and resume-stable,
 *     so the teacher's authored order (e.g. correct choice first) never leaks the answer by position.
 */
import assert from 'assert';
import { ExamMode } from '../src/shared/constants';
import { createClientSnapshot, createSnapshotPair } from '../src/server/lib/snapshot';
import { autoGrade } from '../src/server/lib/scoringEngine';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const content = {
  prompt: 'p', items: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
  reasoning: { prompt: 'علّل', marksFraction: 0.5, trainingChoices: [{ id: 'r1', text: 'الصحيح' }, { id: 'r2', text: 'مشتت 1' }, { id: 'r3', text: 'مشتت 2' }] },
};
const ca = (groups: string[][]) => ({ selectedItemIds: ['a'], reasoning: { correctChoiceId: 'r1', keywordGroups: groups, minGroups: 2 } });
const row = (groups: string[][] = [['ماء'], ['ضوء']]) => ({ id: 'q', subject_id: 's', question_type: 'odd_one_out', content, correct_answer: ca(groups), primary_interaction_mode: 'x', marks: 4, explanation: 'E' });
const grade = (text: string, groups?: string[][]) => {
  const db: any = createSnapshotPair(row(groups) as any, ExamMode.SIMULATOR, 1).dbSnapshot;
  return autoGrade('odd_one_out' as any, db.content, db.correct_answer, { selectedItemIds: ['a'], reasonText: text }, 4).obtainedMarks;
};

console.log('--- F1. Whole-word keyword matching ---');
t('F1.a "الماء والضوء" (ال prefix) matches keywords ماء + ضوء => full', () => assert.strictEqual(grade('الماء والضوء'), 4));
t('F1.b "السماء والضوء": سماء is NOT ماء => one group only => 2', () => assert.strictEqual(grade('السماء والضوء'), 2));
t('F1.c "استماع وضوء": substring inside another word must not match => 2', () => assert.strictEqual(grade('استماع وضوء', [['ماع'], ['ضوء']]), 2));
t('F1.d multi-word keyword needs all its words as words => full', () => assert.strictEqual(grade('هذه عناصر بصرية مفردة', [['عناصر بصرية'], ['مفردة']]), 4));
t('F1.e multi-word keyword split by unrelated substring does not match => 2', () => assert.strictEqual(grade('عناصرية بصريات مفردة', [['عناصر بصرية'], ['مفردة']]), 2));
t('F1.f exact word with tashkeel still matches => full', () => assert.strictEqual(grade('الْمَاءُ وَالضَّوْءُ'), 4));

console.log('--- F2. Reason choices shuffled, persisted, resume-stable ---');
const ids = (x: any) => x.content.reasoning.trainingChoices.map((c: any) => c.id).join(',');
t('F2.a TRAINING client order differs from authored order in most builds (not always r1 first)', () => {
  let notFirst = 0;
  for (let i = 0; i < 120; i++) {
    const s: any = createSnapshotPair(row() as any, ExamMode.TRAINING, 1).clientSnapshot;
    if (s.content.reasoning.trainingChoices[0].id !== 'r1') notFirst++;
  }
  assert.ok(notFirst > 40, `correct choice was first-in-list too often (not-first ${notFirst}/120)`);
});
t('F2.b same 3 choices are kept (no loss, no duplicates)', () => {
  const s: any = createSnapshotPair(row() as any, ExamMode.TRAINING, 1).clientSnapshot;
  assert.deepStrictEqual(ids(s).split(',').sort(), ['r1', 'r2', 'r3']);
});
t('F2.c the shuffled order is persisted in the DB snapshot (equal to what the student saw)', () => {
  for (let i = 0; i < 20; i++) {
    const { dbSnapshot, clientSnapshot } = createSnapshotPair(row() as any, ExamMode.TRAINING, 1) as any;
    assert.strictEqual(dbSnapshot.content.reasoning.trainingChoices.map((c: any) => c.id).join(','), ids(clientSnapshot));
  }
});
t('F2.d rebuilding the client snapshot from the stored DB snapshot keeps the order (resume)', () => {
  const { dbSnapshot, clientSnapshot } = createSnapshotPair(row() as any, ExamMode.TRAINING, 1) as any;
  const again: any = createClientSnapshot(dbSnapshot, ExamMode.TRAINING, 1);
  assert.strictEqual(ids(again), ids(clientSnapshot));
});
t('F2.e grading by choice id is unaffected by the shuffle', () => {
  const { dbSnapshot } = createSnapshotPair(row() as any, ExamMode.TRAINING, 1) as any;
  const g = (id: string) => autoGrade('odd_one_out' as any, dbSnapshot.content, dbSnapshot.correct_answer, { selectedItemIds: ['a'], reasonChoiceId: id }, 4).obtainedMarks;
  assert.strictEqual(g('r1'), 4); assert.strictEqual(g('r2'), 2);
});
t('F2.f SIMULATOR snapshot still has no trainingChoices', () => {
  const s: any = createSnapshotPair(row() as any, ExamMode.SIMULATOR, 1).clientSnapshot;
  assert.ok(!JSON.stringify(s).includes('trainingChoices'));
});
console.log(`\n${passed} passed, ${failed} failed`);
