/**
 * VISUAL MASTERY LAB — AUTHORING ROUND TRIP (CR-2026-11-10). Test-first: expected to FAIL before implementation.
 * Pure functions in src/client/lib/diagramAuthoring.ts: buildDiagramQuestion(formState) and formStateFromQuestion(question).
 * The admin form keeps ONLY form state; ids are generated here, so the teacher never sees ids or JSON.
 */
import assert from 'assert';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const deepFreeze = (o: any): any => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const clone = (o: any) => JSON.parse(JSON.stringify(o));

const ELL = { type: 'ellipse', cx: 0.75, cy: 0.5, rx: 0.04, ry: 0.06 };
const POLY = { type: 'polygon', points: [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.1 }, { x: 0.2, y: 0.3 }], tolerance: 0.02 };
const RECT = { type: 'rect', x: 0.6, y: 0.6, w: 0.2, h: 0.1 };
const state = (): any => ({
  prompt: 'تأمل الرسم ثم أجب', marks: 8, diagram: { url: '/assets/diagrams/convex_lens.svg', alt: 'عدسة محدبة' },
  subQuestions: [
    { uid: 'a1', kind: 'locate', prompt: 'حدد موضع البؤرة', weight: 1, hints: ['على المحور', '  ', 'قرب العدسة'], options: ['LEFTOVER'], correctIndex: 0, acceptedNames: ['LEFTOVER'], explanation: '  هذه هي البؤرة  ', target: null },
    { uid: 'b2', kind: 'name', prompt: 'ما اسم الجزء المظلل؟', weight: 1, skill: 'recognition', hints: [], options: ['العدسة المحدبة', 'المرآة المقعرة', 'المنشور'], correctIndex: 0,
      acceptedNames: ['العدسة المحدبة', ' عدسة محدبة ', 'عدسة محدبة'], explanation: '', target: { type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.05, ry: 0.35 } },
    { uid: 'c3', kind: 'function', prompt: 'ماذا يحدث للأشعة الموازية؟', weight: 2, hints: [], options: ['تتجمع في البؤرة', 'تتفرق', 'تنعكس', 'لا تتأثر'], correctIndex: 0, acceptedNames: [], explanation: 'تتجمع لأن العدسة لامّة', target: null },
  ],
  regions: { a1: [ELL, RECT, POLY] },
});

async function main() {
  let m: any = null, sch: any = null, snp: any = null, sco: any = null, K: any = null, demo: any = null;
  try { m = await import('../src/client/lib/diagramAuthoring'); } catch { m = null; }
  try { sch = await import('../src/shared/validation/schemas'); snp = await import('../src/server/lib/snapshot'); sco = await import('../src/server/lib/scoringEngine'); K = await import('../src/shared/constants'); } catch { /* reported by tests */ }
  try { demo = await import('../src/shared/diagramDemoQuestion'); } catch { demo = null; }
  const f = (name: string) => { if (!m || !m[name]) throw new Error(`missing export ${name} in src/client/lib/diagramAuthoring.ts`); return m[name]; };
  const build = (s: any) => f('buildDiagramQuestion')(s);
  const codes = (s: any) => build(s).issues.map((i: any) => i.code);
  const mutate = (fn: (s: any) => void) => { const s = state(); fn(s); return s; };

  console.log('--- A. Build: generated ids, shapes, hygiene ---');
  t('A1 a valid form builds content + key with generated ids and no leftovers', () => {
    const r = build(state()); assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.issues, []);
    assert.deepStrictEqual(r.content.subQuestions.map((s: any) => s.id), ['sq1', 'sq2', 'sq3']);
    assert.deepStrictEqual(r.content.subQuestions[1].options.map((o: any) => o.id), ['sq2_a', 'sq2_b', 'sq2_c']);
    assert.deepStrictEqual(r.content.subQuestions[2].options.map((o: any) => o.id), ['sq3_a', 'sq3_b', 'sq3_c', 'sq3_d']);
    assert.strictEqual(r.content.subQuestions[0].options, undefined);          // locate has no options
    assert.deepStrictEqual(r.key.subAnswers.sq1.regions.length, 3);
    assert.strictEqual(r.key.subAnswers.sq1.acceptedNames, undefined);         // leftover from another kind is ignored
    assert.strictEqual(r.key.subAnswers.sq2.optionId, 'sq2_a');
    assert.strictEqual(r.key.subAnswers.sq3.optionId, 'sq3_a');
    assert.deepStrictEqual(r.content.subQuestions.map((s: any) => s.marks), [1, 1, 2]);
  });
  t('A2 text hygiene: trimmed, hints without blanks, accepted names de-duplicated, empty explanations omitted, null target omitted', () => {
    const r = build(state());
    assert.deepStrictEqual(r.content.subQuestions[0].hints, ['على المحور', 'قرب العدسة']);
    assert.strictEqual(r.content.subQuestions[1].hints, undefined);
    assert.deepStrictEqual(r.key.subAnswers.sq2.acceptedNames, ['العدسة المحدبة', 'عدسة محدبة']);
    assert.deepStrictEqual(r.key.explanations, { sq1: 'هذه هي البؤرة', sq3: 'تتجمع لأن العدسة لامّة' });
    assert.ok(!('target' in r.content.subQuestions[0]));
    assert.deepStrictEqual(r.content.subQuestions[1].target, state().subQuestions[1].target);
    assert.strictEqual(r.content.subQuestions[1].skill, 'recognition');
    assert.ok(!('skill' in r.content.subQuestions[0]));
  });
  t('A3 diagram reference: exactly one of assetId | url (assetId wins), alt trimmed or omitted', () => {
    const a = build(mutate((s) => { s.diagram = { assetId: '3f2b8c1e-0000-4000-8000-000000000001', url: '/assets/x.png', alt: '  ' }; }));
    assert.deepStrictEqual(a.content.diagram, { assetId: '3f2b8c1e-0000-4000-8000-000000000001' });
  });
  t('A4 deleting or reordering a sub-question renumbers ids and keeps regions with the right sub-question', () => {
    const s = state(); const moved = [s.subQuestions[2], s.subQuestions[0], s.subQuestions[1]];
    const r = build({ ...s, subQuestions: moved });
    assert.deepStrictEqual(r.content.subQuestions.map((x: any) => x.kind), ['function', 'locate', 'name']);
    assert.strictEqual(r.key.subAnswers.sq2.regions.length, 3);
    const d = build({ ...s, subQuestions: [s.subQuestions[0], s.subQuestions[2]] });
    assert.deepStrictEqual(d.content.subQuestions.map((x: any) => x.id), ['sq1', 'sq2']);
    assert.strictEqual(d.key.subAnswers.sq1.regions.length, 3);
  });
  t('A5 build never mutates its input', () => { build(deepFreeze(state())); });

  console.log('--- V. Validation: every problem is reported at once with an Arabic message ---');
  const expectCode = (code: string, s: any) => assert.ok(codes(s).includes(code), `expected ${code}, got [${codes(s).join(',')}]`);
  t('V1 form-level problems', () => {
    expectCode('NO_IMAGE', mutate((s) => { s.diagram = {}; }));
    expectCode('NO_PROMPT', mutate((s) => { s.prompt = '   '; }));
    expectCode('NO_SUBQUESTIONS', mutate((s) => { s.subQuestions = []; }));
  });
  t('V2 locate: no region / invalid region', () => {
    expectCode('NO_REGION', mutate((s) => { s.regions = {}; }));
    expectCode('BAD_REGION', mutate((s) => { s.regions = { a1: [{ type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0, ry: 0.1 }] }; }));
  });
  t('V3 options: wrong count, empty, duplicate (after trim/case), missing or out-of-range correct choice', () => {
    expectCode('OPTION_COUNT', mutate((s) => { s.subQuestions[1].options = ['a', 'b']; }));
    expectCode('OPTION_COUNT', mutate((s) => { s.subQuestions[2].options = ['a', 'b', 'c', 'd', 'e']; }));
    expectCode('OPTION_EMPTY', mutate((s) => { s.subQuestions[1].options[2] = '  '; }));
    expectCode('OPTION_DUPLICATE', mutate((s) => { s.subQuestions[1].options[1] = ' العدسة المحدبة '; }));
    expectCode('NO_CORRECT', mutate((s) => { s.subQuestions[1].correctIndex = null; }));
    expectCode('NO_CORRECT', mutate((s) => { s.subQuestions[2].correctIndex = 9; }));
  });
  t('V4 name needs accepted names; weights and hints limits; sub-question prompt', () => {
    expectCode('NO_ACCEPTED_NAME', mutate((s) => { s.subQuestions[1].acceptedNames = ['  ', '']; }));
    expectCode('BAD_WEIGHT', mutate((s) => { s.subQuestions[0].weight = 0; }));
    expectCode('BAD_WEIGHT', mutate((s) => { s.subQuestions[0].weight = NaN; }));
    expectCode('TOO_MANY_HINTS', mutate((s) => { s.subQuestions[0].hints = ['1', '2', '3', '4', '5']; }));
    expectCode('SUB_PROMPT_EMPTY', mutate((s) => { s.subQuestions[2].prompt = ''; }));
  });
  t('V5 invalid display target is reported', () => expectCode('BAD_REGION', mutate((s) => { s.subQuestions[1].target = { type: 'rect', x: 0.9, y: 0.9, w: 0.5, h: 0.5 }; })));
  t('V6 several problems are all reported together and nothing is built', () => {
    const r = build(mutate((s) => { s.prompt = ''; s.diagram = {}; s.regions = {}; s.subQuestions[1].options = ['a']; }));
    assert.strictEqual(r.ok, false); assert.strictEqual(r.content, undefined); assert.strictEqual(r.key, undefined);
    for (const c of ['NO_PROMPT', 'NO_IMAGE', 'NO_REGION', 'OPTION_COUNT']) assert.ok(r.issues.map((i: any) => i.code).includes(c), c);
  });
  t('V7 every issue has an Arabic message; sub-question issues name the sub-question uid', () => {
    const r = build(mutate((s) => { s.regions = {}; s.subQuestions[1].correctIndex = null; s.prompt = ''; }));
    for (const i of r.issues) { assert.ok(typeof i.message === 'string' && /[\u0600-\u06FF]/.test(i.message), `message for ${i.code}`); }
    assert.ok(r.issues.some((i: any) => i.code === 'NO_REGION' && i.subUid === 'a1'));
    assert.ok(r.issues.some((i: any) => i.code === 'NO_CORRECT' && i.subUid === 'b2'));
  });

  console.log('--- R. Round trip and server agreement ---');
  t('R1 built content passes the server validators', () => {
    const r = build(state());
    assert.strictEqual(sch.validateQuestionContent('diagram_labeling', r.content).valid, true);
    assert.strictEqual(sch.validateDiagramLabelingKey(r.content, r.key).valid, true);
  });
  t('R2 end to end: the authored question grades full marks for a perfect answer and hides every key in the simulator', () => {
    const r = build(state());
    const row = { id: 'q1', subject_id: 's', question_type: 'diagram_labeling', content: r.content, correct_answer: r.key, primary_interaction_mode: 'x', marks: 8, explanation: 'EXPL_SECRET' };
    const { dbSnapshot, clientSnapshot } = snp.createSnapshotPair(row, K.ExamMode.SIMULATOR, 1) as any;
    const sa: any = {};
    for (const s of r.content.subQuestions) {
      const k = r.key.subAnswers[s.id];
      if (s.kind === 'locate') { const g = k.regions[0]; sa[s.id] = { point: { x: g.cx, y: g.cy } }; } else sa[s.id] = { optionId: k.optionId };
    }
    const g = sco.autoGrade('diagram_labeling', dbSnapshot.content, dbSnapshot.correct_answer, { subAnswers: sa }, 8);
    assert.strictEqual(g.obtainedMarks, 8);
    const j = JSON.stringify(clientSnapshot);
    for (const leak of ['regions', 'acceptedNames', 'explanations', 'هذه هي البؤرة', 'على المحور', 'EXPL_SECRET']) assert.ok(!j.includes(leak), `leaked ${leak}`);
  });
  t('R3 round trip: form -> question -> form -> question gives identical content and key', () => {
    const r1 = build(state());
    const s2 = f('formStateFromQuestion')({ content: clone(r1.content), correct_answer: clone(r1.key), marks: 8 });
    const r2 = build(s2);
    assert.strictEqual(r2.ok, true);
    assert.deepStrictEqual(r2.content, r1.content); assert.deepStrictEqual(r2.key, r1.key);
  });
  t('R4 loading restores what the teacher typed: texts, correct choice index, names, hints, explanations, targets, all regions with tolerance and polygon points', () => {
    const r1 = build(state());
    const s2 = f('formStateFromQuestion')({ content: clone(r1.content), correct_answer: clone(r1.key), marks: 8 });
    assert.strictEqual(s2.prompt, 'تأمل الرسم ثم أجب'); assert.strictEqual(s2.marks, 8);
    assert.deepStrictEqual(s2.subQuestions.map((x: any) => x.kind), ['locate', 'name', 'function']);
    assert.deepStrictEqual(s2.subQuestions[1].options, ['العدسة المحدبة', 'المرآة المقعرة', 'المنشور']);
    assert.strictEqual(s2.subQuestions[1].correctIndex, 0); assert.strictEqual(s2.subQuestions[2].correctIndex, 0);
    assert.deepStrictEqual(s2.subQuestions[1].acceptedNames, ['العدسة المحدبة', 'عدسة محدبة']);
    assert.deepStrictEqual(s2.subQuestions[0].hints, ['على المحور', 'قرب العدسة']);
    assert.strictEqual(s2.subQuestions[0].explanation, 'هذه هي البؤرة');
    assert.deepStrictEqual(s2.subQuestions[1].target, state().subQuestions[1].target);
    const uid0 = s2.subQuestions[0].uid; assert.deepStrictEqual(s2.regions[uid0], [ELL, RECT, POLY]);
    const uids = s2.subQuestions.map((x: any) => x.uid); assert.strictEqual(new Set(uids).size, 3);
  });
  t('R5 the correct choice position is kept for any index (not always the first)', () => {
    const s = mutate((x) => { x.subQuestions[1].correctIndex = 2; x.subQuestions[2].correctIndex = 3; });
    const r = build(s); assert.strictEqual(r.key.subAnswers.sq2.optionId, 'sq2_c'); assert.strictEqual(r.key.subAnswers.sq3.optionId, 'sq3_d');
    const back = f('formStateFromQuestion')({ content: clone(r.content), correct_answer: clone(r.key), marks: 8 });
    assert.strictEqual(back.subQuestions[1].correctIndex, 2); assert.strictEqual(back.subQuestions[2].correctIndex, 3);
  });
  t('R6 loading the shipped physics demo and rebuilding keeps every authored value (ids may differ)', () => {
    const d = demo?.DEMO_DIAGRAM_LABELING; assert.ok(d, 'src/shared/diagramDemoQuestion.ts must export DEMO_DIAGRAM_LABELING');
    const s = f('formStateFromQuestion')({ content: clone(d.row.content), correct_answer: clone(d.row.correct_answer), marks: d.row.marks });
    const r = build(s); assert.deepStrictEqual(r.issues, []); assert.strictEqual(r.ok, true);
    const subs = d.row.content.subQuestions, out = r.content.subQuestions;
    assert.strictEqual(out.length, subs.length);
    subs.forEach((o: any, i: number) => {
      const n = out[i]; const ko = d.row.correct_answer.subAnswers[o.id], kn = r.key.subAnswers[n.id];
      assert.strictEqual(n.kind, o.kind); assert.strictEqual(n.prompt.trim(), o.prompt.trim()); assert.strictEqual(n.marks, o.marks ?? 1);
      assert.deepStrictEqual(n.hints ?? [], o.hints ?? []); assert.deepStrictEqual(n.target ?? null, o.target ?? null);
      if (o.kind === 'locate') assert.deepStrictEqual(kn.regions, ko.regions);
      else {
        assert.deepStrictEqual(n.options.map((x: any) => x.text), o.options.map((x: any) => x.text));
        const co = o.options.find((x: any) => x.id === ko.optionId).text, cn = n.options.find((x: any) => x.id === kn.optionId).text; assert.strictEqual(cn, co);
        if (o.kind === 'name') assert.deepStrictEqual(kn.acceptedNames, ko.acceptedNames);
      }
      assert.strictEqual(r.key.explanations?.[n.id], d.row.correct_answer.explanations?.[o.id]);
    });
  });
  t('R7 loading tolerates legacy or malformed input without throwing (returns an empty form)', () => {
    for (const q of [null, undefined, {}, { content: { prompt: 'p', diagram: { url: '/assets/a.png' }, labels: [] }, correct_answer: { labels: {} } }] as any[]) {
      const s = f('formStateFromQuestion')(q); assert.ok(s && Array.isArray(s.subQuestions));
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}
main();
