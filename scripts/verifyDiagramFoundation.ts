/**
 * DIAGRAM LABELING (Visual Mastery Lab) — FOUNDATION ACCEPTANCE (CR-2026-11-06). Written test-first.
 * Covers the pure/server layers only: region geometry, upload validation, schemas, grading, snapshots, demo.
 * Modules are loaded dynamically so every missing piece is reported as its own FAIL (not one crash).
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
async function load(p: string): Promise<any> { try { return await import(p); } catch { return null; } }
const need = (m: any, name: string, what: string) => { if (!m || !m[name]) throw new Error(`missing export ${name} (${what})`); return m[name]; };

const ELL = { type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.1, ry: 0.05 };
const RECT = { type: 'rect', x: 0.2, y: 0.2, w: 0.2, h: 0.1 };
const TRI = { type: 'polygon', points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.3, y: 0.5 }] };
const LSHAPE = { type: 'polygon', points: [{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.1 }, { x: 0.6, y: 0.3 }, { x: 0.3, y: 0.3 }, { x: 0.3, y: 0.6 }, { x: 0.1, y: 0.6 }] };

const diagramContent = () => ({
  prompt: 'اكتب على الرسم', diagram: { url: '/assets/diagrams/x.svg', alt: 'عدسة' },
  subQuestions: [
    { id: 'sq1', kind: 'locate', prompt: 'حدد موضع البؤرة F', marks: 1, hints: ['في الجهة اليمنى', 'قرب المحور'] },
    { id: 'sq2', kind: 'name', prompt: 'ما اسم الجزء المظلل؟', marks: 1, target: { type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.05, ry: 0.05 },
      options: [{ id: 'sq2_a', text: 'العدسة المحدبة' }, { id: 'sq2_b', text: 'المرآة' }, { id: 'sq2_c', text: 'المنشور' }] },
    { id: 'sq3', kind: 'function', prompt: 'ماذا تفعل العدسة المحدبة بالأشعة الموازية؟', marks: 2,
      options: [{ id: 'sq3_a', text: 'تجمعها' }, { id: 'sq3_b', text: 'تفرقها' }, { id: 'sq3_c', text: 'تعكسها' }] },
  ],
});
const key = (): any => ({
  subAnswers: {
    sq1: { regions: [{ type: 'ellipse', cx: 0.8, cy: 0.5, rx: 0.04, ry: 0.04 }] },
    sq2: { optionId: 'sq2_a', acceptedNames: ['العدسة المحدبة', 'عدسة محدبة'] },
    sq3: { optionId: 'sq3_a' },
  },
  explanations: { sq1: 'EXPLAIN_SECRET_F' },
});
const perfect = () => ({ subAnswers: { sq1: { point: { x: 0.8, y: 0.5 } }, sq2: { optionId: 'sq2_a' }, sq3: { optionId: 'sq3_a' } } });

async function main() {
  const geo = await load('../src/shared/regionGeometry');
  const upl = await load('../src/server/lib/mediaValidation');
  const sch = await load('../src/shared/validation/schemas');
  const sco = await load('../src/server/lib/scoringEngine');
  const snp = await load('../src/server/lib/snapshot');
  const K = await load('../src/shared/constants');

  console.log('--- G. Region geometry (normalized 0..1 coordinates, tolerance in normalized units, default 0.01) ---');
  const inR = (p: any, r: any) => need(geo, 'pointInRegion', 'regionGeometry')(p, r);
  t('G1 ellipse: inside / outside', () => {
    assert.strictEqual(inR({ x: 0.5, y: 0.5 }, ELL), true);
    assert.strictEqual(inR({ x: 0.59, y: 0.5 }, ELL), true);
    assert.strictEqual(inR({ x: 0.7, y: 0.5 }, ELL), false);
    assert.strictEqual(inR({ x: 0.5, y: 0.54 }, ELL), true);
    assert.strictEqual(inR({ x: 0.5, y: 0.6 }, ELL), false);
  });
  t('G2 ellipse tolerance: default 0.01 forgives 0.005, not 0.03; explicit tolerance respected', () => {
    assert.strictEqual(inR({ x: 0.605, y: 0.5 }, ELL), true);
    assert.strictEqual(inR({ x: 0.63, y: 0.5 }, ELL), false);
    assert.strictEqual(inR({ x: 0.605, y: 0.5 }, { ...ELL, tolerance: 0 }), false);
    assert.strictEqual(inR({ x: 0.64, y: 0.5 }, { ...ELL, tolerance: 0.05 }), true);
  });
  t('G3 rectangle: inside / outside / tolerance', () => {
    assert.strictEqual(inR({ x: 0.3, y: 0.25 }, RECT), true);
    assert.strictEqual(inR({ x: 0.195, y: 0.25 }, RECT), true);
    assert.strictEqual(inR({ x: 0.15, y: 0.25 }, RECT), false);
    assert.strictEqual(inR({ x: 0.3, y: 0.35 }, RECT), false);
    assert.strictEqual(inR({ x: 0.3, y: 0.305 }, RECT), true);
  });
  t('G4 polygon (triangle): inside / outside / near vertex tolerance', () => {
    assert.strictEqual(inR({ x: 0.3, y: 0.2 }, TRI), true);
    assert.strictEqual(inR({ x: 0.9, y: 0.9 }, TRI), false);
    assert.strictEqual(inR({ x: 0.3, y: 0.52 }, TRI), false);
    assert.strictEqual(inR({ x: 0.3, y: 0.505 }, TRI), true);
  });
  t('G5 concave polygon (L shape): notch is outside', () => {
    assert.strictEqual(inR({ x: 0.2, y: 0.5 }, LSHAPE), true);
    assert.strictEqual(inR({ x: 0.45, y: 0.2 }, LSHAPE), true);
    assert.strictEqual(inR({ x: 0.5, y: 0.5 }, LSHAPE), false);
  });
  t('G6 invalid points never match and never throw', () => {
    for (const p of [{ x: NaN, y: 0.5 }, { x: 2, y: 0.5 }, { x: 0.5 }, null, undefined, 'x']) assert.strictEqual(inR(p as any, ELL), false);
  });
  t('G7 validateRegion accepts valid regions', () => {
    const v = need(geo, 'validateRegion', 'regionGeometry');
    for (const r of [ELL, RECT, TRI, LSHAPE]) assert.strictEqual(v(r).valid, true);
  });
  t('G8 validateRegion rejects bad regions', () => {
    const v = need(geo, 'validateRegion', 'regionGeometry');
    const bad: any[] = [
      { ...ELL, rx: 0 }, { ...ELL, cx: 1.2 }, { ...RECT, w: 0 }, { ...RECT, x: 0.9, w: 0.2 },
      { type: 'polygon', points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }] }, { ...TRI, points: [{ x: 0.1, y: -0.1 }, { x: 0.5, y: 0.1 }, { x: 0.3, y: 0.5 }] },
      { ...ELL, tolerance: 0.5 }, { type: 'circle', cx: 0.5, cy: 0.5, r: 0.1 }, { ...ELL, cx: NaN }, null,
    ];
    for (const r of bad) assert.strictEqual(v(r).valid, false, JSON.stringify(r));
  });

  console.log('--- U. Image upload validation (no new dependency; magic bytes) ---');
  const pad = (head: number[], n = 64) => { const a = new Uint8Array(n); a.set(head); return a; };
  const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const JPG = pad([0xff, 0xd8, 0xff, 0xe0]);
  const WEBP = pad([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const GIF = pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const val = (mimeType: string, bytes: Uint8Array) => need(upl, 'validateImageUpload', 'mediaValidation')({ mimeType, bytes, fileName: 'a' });
  t('U1 PNG / JPEG / WebP accepted with detectedMime', () => {
    assert.strictEqual(val('image/png', PNG).valid, true);
    assert.strictEqual(val('image/jpeg', JPG).valid, true);
    assert.strictEqual(val('image/webp', WEBP).valid, true);
    assert.strictEqual(val('image/png', PNG).detectedMime, 'image/png');
  });
  t('U2 SVG (script risk) and GIF rejected', () => {
    assert.strictEqual(val('image/svg+xml', SVG).valid, false);
    assert.strictEqual(val('image/png', SVG).valid, false);
    assert.strictEqual(val('image/gif', GIF).valid, false);
  });
  t('U3 declared type must match the real bytes', () => assert.strictEqual(val('image/png', JPG).valid, false));
  t('U4 empty and oversize (> 2 MB) rejected', () => {
    assert.strictEqual(val('image/png', new Uint8Array(0)).valid, false);
    const big = new Uint8Array(2 * 1024 * 1024 + 1); big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.strictEqual(val('image/png', big).valid, false);
  });

  console.log('--- S. Schemas (new shape + legacy still valid) ---');
  const vc = (c: any) => need(sch, 'validateQuestionContent', 'schemas')('diagram_labeling', c).valid;
  const mut = (f: (c: any) => void) => { const c: any = diagramContent(); f(c); return c; };
  t('S1 valid new content passes; legacy content still passes', () => {
    assert.strictEqual(vc(diagramContent()), true);
    assert.strictEqual(vc({ prompt: 'p', diagram: { url: '/assets/a.png', type: 'image' }, labels: [{ id: 'a', pointNumber: 1, correctValue: 'x' }] }), true);
  });
  t('S2 diagram needs exactly one of assetId | bundled /assets url; external urls rejected', () => {
    assert.strictEqual(vc(mut((c) => { c.diagram = { assetId: '3f2b8c1e-0000-4000-8000-000000000001' }; })), true);
    assert.strictEqual(vc(mut((c) => { c.diagram = { alt: 'x' }; })), false);
    assert.strictEqual(vc(mut((c) => { c.diagram = { assetId: '3f2b8c1e-0000-4000-8000-000000000001', url: '/assets/a.png' }; })), false);
    assert.strictEqual(vc(mut((c) => { c.diagram = { url: 'https://example.com/a.png' }; })), false);
  });
  t('S3 subQuestion rules: unique ids, kinds, option counts, hints <= 4, valid target, non-empty list', () => {
    assert.strictEqual(vc(diagramContent()), true); // baseline must be valid, otherwise every rejection below is meaningless
    assert.strictEqual(vc(mut((c) => { c.subQuestions[1].id = 'sq1'; })), false);
    assert.strictEqual(vc(mut((c) => { c.subQuestions[0].kind = 'draw'; })), false);
    assert.strictEqual(vc(mut((c) => { c.subQuestions[1].options.pop(); })), false);
    assert.strictEqual(vc(mut((c) => { c.subQuestions[2].options.push({ id: 'd', text: 'x' }, { id: 'e', text: 'y' }); })), false);
    assert.strictEqual(vc(mut((c) => { c.subQuestions[0].hints = ['1', '2', '3', '4', '5']; })), false);
    assert.strictEqual(vc(mut((c) => { c.subQuestions[1].target = { type: 'ellipse', cx: 2, cy: 0.5, rx: 0.1, ry: 0.1 }; })), false);
    assert.strictEqual(vc(mut((c) => { c.subQuestions = []; })), false);
  });
  t('S4 student answer shape: point / optionId / text', () => {
    const va = (a: any) => need(sch, 'validateQuestionAnswer', 'schemas')('diagram_labeling', a).valid;
    assert.strictEqual(va(perfect()), true);
    assert.strictEqual(va({ subAnswers: { sq2: { text: 'عدسة' } } }), true);
    assert.strictEqual(va({ subAnswers: { sq1: { point: { x: 2, y: 0.5 } } } }), false);
    assert.strictEqual(va({ subAnswers: { sq1: { point: { x: 0.5 } } } }), false);
    assert.strictEqual(va({ subAnswers: { sq3: { optionId: 7 } } }), false);
    assert.strictEqual(va({ subAnswers: { sq2: { text: 5 } } }), false);
  });
  t('S5 answer-key validator: complete and consistent with the content', () => {
    const vk = need(sch, 'validateDiagramLabelingKey', 'schemas');
    assert.strictEqual(vk(diagramContent(), key()).valid, true);
    const bad = (f: (k: any) => void) => { const k = key(); f(k); return vk(diagramContent(), k).valid; };
    assert.strictEqual(bad((k) => { k.subAnswers.sq1.regions = []; }), false);
    assert.strictEqual(bad((k) => { k.subAnswers.sq1.regions = [{ type: 'ellipse', cx: 3, cy: 0, rx: 1, ry: 1 }]; }), false);
    assert.strictEqual(bad((k) => { k.subAnswers.zz = { optionId: 'a' }; }), false);
    assert.strictEqual(bad((k) => { k.subAnswers.sq2.optionId = 'nope'; }), false);
    assert.strictEqual(bad((k) => { k.subAnswers.sq2.acceptedNames = []; }), false);
    assert.strictEqual(bad((k) => { k.subAnswers.sq3.optionId = 'nope'; }), false);
    assert.strictEqual(bad((k) => { delete k.subAnswers.sq3; }), false);
  });

  console.log('--- R. Grading: three abilities graded independently, weights, no fuzzy text ---');
  const g = (answer: any, k: any = key(), c: any = diagramContent(), max = 8) => need(sco, 'gradeDiagramLabeling', 'scoringEngine')(c, k, answer, max);
  t('R1 perfect answer => full marks, components [2,2,4]', () => {
    const r = g(perfect());
    assert.strictEqual(r.obtainedMarks, 8);
    assert.deepStrictEqual(r.components.map((x: any) => [x.id, x.earned, x.max]), [['sq1', 2, 2], ['sq2', 2, 2], ['sq3', 4, 4]]);
  });
  t('R2 wrong location only => name and function still earned independently', () => {
    const r = g({ subAnswers: { ...perfect().subAnswers, sq1: { point: { x: 0.1, y: 0.1 } } } });
    assert.strictEqual(r.obtainedMarks, 6);
    assert.strictEqual(r.components.find((x: any) => x.id === 'sq1').earned, 0);
  });
  t('R3 typed name (simulator): diacritics / hamza / taa-marbuta tolerated, substring and wrong text are not', () => {
    const typed = (text: string) => g({ subAnswers: { ...perfect().subAnswers, sq2: { text } } }).obtainedMarks;
    assert.strictEqual(typed('العِدَسَةُ المُحَدَّبَةُ'), 8);
    assert.strictEqual(typed('عدسه محدبه'), 8);
    assert.strictEqual(typed('العدسة'), 6);
    assert.strictEqual(typed('مرآة'), 6);
  });
  t('R4 robustness: missing / malformed / unknown values score 0 for that part only', () => {
    const base = perfect().subAnswers;
    assert.strictEqual(g({ subAnswers: { ...base, sq1: {} } }).obtainedMarks, 6);
    assert.strictEqual(g({ subAnswers: { ...base, sq1: { point: 'x' } } }).obtainedMarks, 6);
    assert.strictEqual(g({ subAnswers: { ...base, sq3: { optionId: 'zzz' } } }).obtainedMarks, 4);
    assert.strictEqual(g({ subAnswers: { ...base, extra: { optionId: 'q' } } }).obtainedMarks, 8);
    assert.strictEqual(g({ subAnswers: {} }).obtainedMarks, 0);
    assert.strictEqual(g(undefined).obtainedMarks, 0);
  });
  t('R5 tap tolerance: just outside the region counts, far outside does not', () => {
    const at = (x: number) => g({ subAnswers: { ...perfect().subAnswers, sq1: { point: { x, y: 0.5 } } } }).obtainedMarks;
    assert.strictEqual(at(0.845), 8);
    assert.strictEqual(at(0.9), 6);
  });
  t('R6 several acceptable regions: any of them counts', () => {
    const k = key(); k.subAnswers.sq1.regions.push({ type: 'rect', x: 0.1, y: 0.7, w: 0.1, h: 0.1 });
    assert.strictEqual(g({ subAnswers: { ...perfect().subAnswers, sq1: { point: { x: 0.15, y: 0.75 } } } }, k).obtainedMarks, 8);
  });
  t('R7 skill tags: defaults by kind, explicit override respected', () => {
    const r = g(perfect());
    assert.deepStrictEqual(r.components.map((x: any) => [x.kind, x.skill]), [['locate', 'identification'], ['name', 'recognition'], ['function', 'understanding']]);
    const c = diagramContent(); (c.subQuestions[0] as any).skill = 'understanding';
    assert.strictEqual(g(perfect(), key(), c).components[0].skill, 'understanding');
  });
  t('R8 optionId wins over text when both are sent', () =>
    assert.strictEqual(g({ subAnswers: { ...perfect().subAnswers, sq2: { optionId: 'sq2_b', text: 'العدسة المحدبة' } } }).obtainedMarks, 6));
  t('R9 never negative, never above max; autoGrade delegates to the same result', () => {
    const r = g(perfect());
    assert.ok(r.obtainedMarks >= 0 && r.obtainedMarks <= 8);
    const a = need(sco, 'autoGrade', 'scoringEngine')('diagram_labeling', diagramContent(), key(), perfect(), 8);
    assert.strictEqual(a.obtainedMarks, 8);
  });
  t('R10 legacy labels question grades exactly as before', () => {
    const a = need(sco, 'autoGrade', 'scoringEngine')('diagram_labeling', { prompt: 'p', diagram: { url: '/assets/a.png', type: 'image' }, labels: [{ id: 'a', pointNumber: 1, correctValue: 'x' }, { id: 'b', pointNumber: 2, correctValue: 'y' }] }, { labels: { a: 'x', b: 'y' } }, { labels: { a: 'x', b: 'z' } }, 4);
    assert.strictEqual(a.obtainedMarks, 2);
  });

  console.log('--- N. Snapshots: simulator hides every key; training keeps feedback data; option order persisted ---');
  const row = () => ({ id: 'q1', subject_id: 's', question_type: 'diagram_labeling', content: diagramContent(), correct_answer: key(), primary_interaction_mode: 'x', marks: 8, explanation: 'EXPL_SECRET' });
  const pair = (mode: any) => need(snp, 'createSnapshotPair', 'snapshot')(row(), mode, 1);
  t('N1 SIMULATOR client snapshot: no regions, accepted names, hints, explanations or answer keys', () => {
    const j = JSON.stringify(pair(K?.ExamMode?.SIMULATOR).clientSnapshot);
    const leaks = ['regions', 'acceptedNames', 'explanations', 'EXPLAIN_SECRET_F', 'EXPL_SECRET', 'في الجهة اليمنى', 'hints', 'subAnswers', 'correctAnswer'].filter((x) => j.includes(x));
    assert.deepStrictEqual(leaks, [], `leaked: ${leaks.join(', ')}`);
  });
  t('N2 SIMULATOR keeps the question itself: diagram ref, prompts, kinds, options, display target', () => {
    const c: any = pair(K?.ExamMode?.SIMULATOR).clientSnapshot.content;
    assert.strictEqual(c.diagram.url, '/assets/diagrams/x.svg');
    assert.deepStrictEqual(c.subQuestions.map((s: any) => s.kind), ['locate', 'name', 'function']);
    assert.strictEqual(c.subQuestions[1].options.length, 3);
    assert.strictEqual(c.subQuestions[2].options.length, 3);
    assert.strictEqual(c.subQuestions[1].target.type, 'ellipse');
  });
  t('N3 TRAINING snapshot: hints and the answer key (regions) are available for feedback', () => {
    const s: any = pair(K?.ExamMode?.TRAINING).clientSnapshot;
    assert.deepStrictEqual(s.content.subQuestions[0].hints, ['في الجهة اليمنى', 'قرب المحور']);
    assert.ok(s.correctAnswer.subAnswers.sq1.regions.length >= 1);
  });
  const orderOf = (x: any) => x.content.subQuestions.filter((s: any) => s.options).map((s: any) => s.options.map((o: any) => o.id).join(',')).join('|');
  t('N4 option order is shuffled per attempt, persisted in the DB snapshot, and stable on rebuild', () => {
    let notFirst = 0;
    for (let i = 0; i < 100; i++) {
      const p = pair(K?.ExamMode?.SIMULATOR);
      if (p.clientSnapshot.content.subQuestions[2].options[0].id !== 'sq3_a') notFirst++;
      assert.strictEqual(orderOf(p.dbSnapshot), orderOf(p.clientSnapshot));
    }
    assert.ok(notFirst > 25, `options look unshuffled (not-first ${notFirst}/100)`);
    const p = pair(K?.ExamMode?.SIMULATOR);
    const again: any = need(snp, 'createClientSnapshot', 'snapshot')(p.dbSnapshot, K.ExamMode.SIMULATOR, 1);
    assert.strictEqual(orderOf(again), orderOf(p.clientSnapshot));
  });
  t('N4b SIMULATOR snapshot rebuilt from the stored DB snapshot (resume) is also free of keys', () => {
    const p = pair(K?.ExamMode?.SIMULATOR);
    const again: any = need(snp, 'createClientSnapshot', 'snapshot')(p.dbSnapshot, K.ExamMode.SIMULATOR, 1);
    const j = JSON.stringify(again);
    const leaks = ['regions', 'acceptedNames', 'explanations', 'EXPLAIN_SECRET_F', 'EXPL_SECRET', 'في الجهة اليمنى', 'hints', 'subAnswers', 'correctAnswer'].filter((x) => j.includes(x));
    assert.deepStrictEqual(leaks, [], `leaked on resume: ${leaks.join(', ')}`);
  });
  t('N5 end-to-end: answer built from what the student saw scores full on the server', () => {
    const p = pair(K?.ExamMode?.SIMULATOR);
    const seen = new Set(p.clientSnapshot.content.subQuestions.flatMap((s: any) => (s.options || []).map((o: any) => o.id)));
    const ans = perfect();
    for (const id of ['sq2_a', 'sq3_a']) assert.ok(seen.has(id), `${id} never shown`);
    const r = need(sco, 'autoGrade', 'scoringEngine')('diagram_labeling', p.dbSnapshot.content, p.dbSnapshot.correct_answer, ans, 8);
    assert.strictEqual(r.obtainedMarks, 8);
  });
  t('N6 DB snapshot (grading copy) keeps the full key', () => {
    const p = pair(K?.ExamMode?.SIMULATOR);
    assert.ok(p.dbSnapshot.correct_answer.subAnswers.sq1.regions.length >= 1);
    assert.deepStrictEqual(p.dbSnapshot.correct_answer.subAnswers.sq2.acceptedNames, ['العدسة المحدبة', 'عدسة محدبة']);
  });

  console.log('--- D. Demo question (physics) ---');
  const demo = await load('../src/shared/diagramDemoQuestion');
  const D = () => { if (!demo?.DEMO_DIAGRAM_LABELING) throw new Error('src/shared/diagramDemoQuestion.ts must export DEMO_DIAGRAM_LABELING'); return demo.DEMO_DIAGRAM_LABELING; };
  const centre = (r: any) => r.type === 'ellipse' ? { x: r.cx, y: r.cy } : r.type === 'rect' ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : { x: r.points.reduce((a: number, p: any) => a + p.x, 0) / r.points.length, y: r.points.reduce((a: number, p: any) => a + p.y, 0) / r.points.length };
  t('D1 belongs to physics, content and key validate, all three kinds present', () => {
    const d = D();
    assert.strictEqual(d.subjectSlug, 'physics');
    assert.strictEqual(need(sch, 'validateQuestionContent', 'schemas')('diagram_labeling', d.row.content).valid, true);
    assert.strictEqual(need(sch, 'validateDiagramLabelingKey', 'schemas')(d.row.content, d.row.correct_answer).valid, true);
    assert.deepStrictEqual([...new Set(d.row.content.subQuestions.map((s: any) => s.kind))].sort(), ['function', 'locate', 'name']);
  });
  t('D2 a perfect answer (centre of the key regions, key option ids) scores full marks', () => {
    const d = D(); const sa: any = {};
    for (const s of d.row.content.subQuestions) {
      const k = d.row.correct_answer.subAnswers[s.id];
      sa[s.id] = s.kind === 'locate' ? { point: centre(k.regions[0]) } : { optionId: k.optionId };
    }
    const r = need(sco, 'autoGrade', 'scoringEngine')('diagram_labeling', d.row.content, d.row.correct_answer, { subAnswers: sa }, d.row.marks);
    assert.strictEqual(r.obtainedMarks, d.row.marks);
  });
  t('D3 the bundled diagram file exists under public/', () => {
    const url: string = D().row.content.diagram.url;
    assert.ok(url && url.startsWith('/assets/diagrams/'), 'diagram.url must be under /assets/diagrams/');
    assert.ok(fs.existsSync(path.join(process.cwd(), 'public', url)), `file public${url} not found`);
  });
  const cur = await load('../src/client/storage/defaultCurriculumData');
  t('D4 the client default curriculum contains the physics diagram demo', () => {
    const qs = need(cur, 'generateInitialQuestions', 'defaultCurriculumData')();
    assert.ok(qs.some((q: any) => q.subjectSlug === 'physics' && q.questionType === 'diagram_labeling' && Array.isArray(q.content?.subQuestions)), 'physics diagram_labeling demo missing');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}
main();
