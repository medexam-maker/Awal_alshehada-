/**
 * DIAGRAM AUTHORING HARDENING (CR-2026-11-11). Test-first: expected to FAIL before implementation.
 * Closes gaps found while reviewing the admin form: sample content pre-filled in new forms, invalid skill values,
 * bundled image urls that may not exist, stale regions after deleting a sub-question.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const RECT = { type: 'rect', x: 0.2, y: 0.2, w: 0.2, h: 0.2 };
const validState = (): any => ({
  prompt: 'سؤال', marks: 3, diagram: { assetId: '3f2b8c1e-0000-4000-8000-000000000001' },
  subQuestions: [
    { uid: 'a1', kind: 'locate', prompt: 'حدد', weight: 1, hints: [], options: [], correctIndex: null, acceptedNames: [], explanation: '', target: null },
    { uid: 'b2', kind: 'function', prompt: 'ماذا؟', weight: 2, hints: [], options: ['س', 'ص', 'ع'], correctIndex: 1, acceptedNames: [], explanation: '', target: null },
  ],
  regions: { a1: [RECT] },
});

async function main() {
  let m: any = null, ed: any = null, sch: any = null, mv: any = null;
  try { m = await import('../src/client/lib/diagramAuthoring'); } catch { m = null; }
  try { ed = await import('../src/client/lib/regionEditorState'); } catch { ed = null; }
  try { sch = await import('../src/shared/validation/schemas'); } catch { sch = null; }
  try { mv = await import('../src/server/lib/mediaValidation'); } catch { mv = null; }
  const f = (mod: any, name: string, where: string) => { if (!mod || !mod[name]) throw new Error(`missing export ${name} in ${where}`); return mod[name]; };
  const A = (n: string) => f(m, n, 'src/client/lib/diagramAuthoring.ts');
  const codes = (r: any) => r.issues.map((i: any) => i.code);

  console.log('--- B. A new form starts blank (no sample content) ---');
  t('B1 emptyDiagramForm() is blank and does not build', () => {
    const s = A('emptyDiagramForm')();
    assert.strictEqual(s.prompt, ''); assert.deepStrictEqual(s.diagram, {}); assert.deepStrictEqual(s.subQuestions, []); assert.deepStrictEqual(s.regions, {});
    const r = A('buildDiagramQuestion')(s); assert.strictEqual(r.ok, false);
    for (const c of ['NO_PROMPT', 'NO_IMAGE', 'NO_SUBQUESTIONS']) assert.ok(codes(r).includes(c), c);
  });
  t('B2 newSubQuestion(kind, uid) creates a BLANK sub-question of each kind', () => {
    const scan = (v: any, path = ''): string[] => v == null ? [] : typeof v === 'string' ? (v.length && path !== 'uid' && path !== 'kind' ? [path] : []) : typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => scan(x, Array.isArray(v) ? path : k)) : [];
    const mk = A('newSubQuestion');
    const loc = mk('locate', 'x1'), nam = mk('name', 'x2'), fun = mk('function', 'x3');
    assert.strictEqual(loc.uid, 'x1'); assert.strictEqual(nam.kind, 'name');
    for (const q of [loc, nam, fun]) { assert.deepStrictEqual(scan(q), [], `non-empty text in ${q.kind}: ${scan(q).join(',')}`); assert.deepStrictEqual(q.hints, []); assert.strictEqual(q.target, null); assert.ok(q.weight > 0); assert.ok(!('skill' in q)); }
    assert.deepStrictEqual(nam.options, ['', '', '']); assert.strictEqual(nam.correctIndex, null); assert.deepStrictEqual(nam.acceptedNames, []);
    assert.deepStrictEqual(fun.options, ['', '', '']); assert.strictEqual(fun.correctIndex, null);
    assert.deepStrictEqual(loc.options ?? [], []);
  });
  t('B3 adding a blank sub-question to a valid form can never build silently', () => {
    const s = validState(); s.subQuestions.push(A('newSubQuestion')('name', 'n3'));
    const r = A('buildDiagramQuestion')(s); assert.strictEqual(r.ok, false);
    for (const c of ['SUB_PROMPT_EMPTY', 'OPTION_EMPTY', 'NO_CORRECT', 'NO_ACCEPTED_NAME']) assert.ok(r.issues.some((i: any) => i.code === c && i.subUid === 'n3'), c);
  });

  console.log('--- K. Skill values ---');
  t('K1 builder: only recognition | identification | understanding (or omitted) are accepted', () => {
    const build = A('buildDiagramQuestion');
    for (const ok of ['recognition', 'identification', 'understanding']) { const s = validState(); s.subQuestions[0].skill = ok; assert.strictEqual(build(s).ok, true, ok); }
    const none = validState(); assert.strictEqual(build(none).ok, true);
    const bad = validState(); bad.subQuestions[1].skill = 'spatial_reasoning';
    const r = build(bad); assert.strictEqual(r.ok, false); assert.ok(r.issues.some((i: any) => i.code === 'BAD_SKILL' && i.subUid === 'b2'));
  });
  t('K2 server schema rejects an unknown skill and accepts the three canonical ones', () => {
    const v = f(sch, 'validateQuestionContent', 'schemas');
    const base = (skill?: string) => ({ prompt: 'p', diagram: { assetId: 'abc' }, subQuestions: [{ id: 'sq1', kind: 'locate', prompt: 'q', ...(skill ? { skill } : {}) }] });
    assert.strictEqual(v('diagram_labeling', base()).valid, true);
    assert.strictEqual(v('diagram_labeling', base('understanding')).valid, true);
    assert.strictEqual(v('diagram_labeling', base('spatial_reasoning')).valid, false);
  });

  console.log('--- I. Image source rules ---');
  t('I1 new questions can forbid bundled urls (uploaded assetId only); the default stays permissive', () => {
    const build = A('buildDiagramQuestion'); const s = validState(); s.diagram = { url: '/assets/diagrams/convex_lens.svg' };
    assert.strictEqual(build(s).ok, true);
    const strict = build(s, { allowBundledUrl: false });
    assert.strictEqual(strict.ok, false); assert.ok(codes(strict).includes('BUNDLED_IMAGE_NOT_ALLOWED'));
    const up = validState(); assert.strictEqual(build(up, { allowBundledUrl: false }).ok, true);
  });
  t('I2 bundledDiagramExists accepts only existing image files under the public/assets folder', () => {
    const ex = f(mv, 'bundledDiagramExists', 'src/server/lib/mediaValidation.ts');
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pub-')); fs.mkdirSync(path.join(base, 'assets', 'diagrams'), { recursive: true });
    fs.writeFileSync(path.join(base, 'assets', 'diagrams', 'ok.png'), 'x'); fs.writeFileSync(path.join(base, 'assets', 'diagrams', 'note.txt'), 'x');
    fs.writeFileSync(path.join(path.dirname(base), 'outside.png'), 'x'); fs.mkdirSync(path.join(base, 'assets', 'diagrams', 'dir.png'));
    assert.strictEqual(ex('/assets/diagrams/ok.png', base), true);
    for (const bad of ['/assets/diagrams/missing.png', '/assets/diagrams/note.txt', '/assets/../outside.png', '/assets/diagrams/../../../outside.png', 'assets/diagrams/ok.png', '/other/ok.png', '/assets/diagrams/ok.png?x=1', '/assets/diagrams/dir.png', '', null, 7]) assert.strictEqual(ex(bad as any, base), false, String(bad));
  });
  t('I3 the shipped demo images exist (run from the repository root)', () => {
    const ex = f(mv, 'bundledDiagramExists', 'src/server/lib/mediaValidation.ts');
    assert.strictEqual(ex('/assets/diagrams/convex_lens.svg'), true);
    assert.strictEqual(ex('/assets/diagrams/physics_circuit.svg'), false);
  });

  console.log('--- E. Editor: removing a sub-question removes its regions (undoable) ---');
  t('E1 REMOVE_SUB deletes the regions, clears active/selected when they point to it, and can be undone', () => {
    const red = f(ed, 'editorReducer', 'regionEditorState.ts'), init = f(ed, 'initialEditorState', 'regionEditorState.ts');
    let s = init({ sq1: [RECT], sq2: [RECT, RECT] });
    s = red(s, { type: 'SET_ACTIVE', subId: 'sq1' }); s = red(s, { type: 'SELECT', subId: 'sq1', index: 0 });
    const r = red(s, { type: 'REMOVE_SUB', subId: 'sq1' });
    assert.strictEqual(r.regions.sq1, undefined); assert.strictEqual(r.regions.sq2.length, 2);
    assert.strictEqual(r.activeSubId, null); assert.strictEqual(r.selected, null); assert.strictEqual(r.draft, null);
    const u = red(r, { type: 'UNDO' }); assert.strictEqual(u.regions.sq1.length, 1);
  });
  t('E2 REMOVE_SUB for another or unknown sub-question keeps the active one; unknown ids change nothing', () => {
    const red = f(ed, 'editorReducer', 'regionEditorState.ts'), init = f(ed, 'initialEditorState', 'regionEditorState.ts');
    let s = init({ sq1: [RECT], sq2: [RECT] }); s = red(s, { type: 'SET_ACTIVE', subId: 'sq1' });
    const r = red(s, { type: 'REMOVE_SUB', subId: 'sq2' }); assert.strictEqual(r.activeSubId, 'sq1'); assert.strictEqual(r.regions.sq2, undefined);
    assert.strictEqual(red(s, { type: 'REMOVE_SUB', subId: 'nope' }), s);
  });
  t('E3 reducer immutability still holds for REMOVE_SUB', () => {
    const red = f(ed, 'editorReducer', 'regionEditorState.ts'), init = f(ed, 'initialEditorState', 'regionEditorState.ts');
    const freeze = (o: any): any => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(freeze); } return o; };
    red(freeze(init({ sq1: [clone(RECT)] })), { type: 'REMOVE_SUB', subId: 'sq1' });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}
main();
