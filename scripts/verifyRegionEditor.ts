/**
 * VISUAL MASTERY LAB — PHASE B2 ACCEPTANCE: region editor state machine (CR-2026-11-08).
 * Pure reducer in src/client/lib/regionEditorState.ts. Test-first: expected to FAIL before implementation.
 * All points are normalized 0..1 relative to the original image (the UI converts pointer events with imageViewport.ts).
 */
import assert from 'assert';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);
const deepFreeze = (o: any): any => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };

async function main() {
  let m: any = null, geo: any = null;
  try { m = await import('../src/client/lib/regionEditorState'); } catch { m = null; }
  try { geo = await import('../src/shared/regionGeometry'); } catch { geo = null; }
  const f = (name: string) => { if (!m || !m[name]) throw new Error(`missing export ${name} in src/client/lib/regionEditorState.ts`); return m[name]; };
  const run = (actions: any[], start?: any) => actions.reduce((s, a) => f('editorReducer')(s, a), start ?? f('initialEditorState')());
  const P = (x: number, y: number) => ({ x, y });
  const drag = (a: any, b: any) => [{ type: 'POINTER_DOWN', point: a }, { type: 'POINTER_MOVE', point: b }, { type: 'POINTER_UP', point: b }];

  console.log('--- E. Region editor reducer ---');
  t('E1 initial state: select tool, nothing active, no regions, empty history', () => {
    const s = f('initialEditorState')();
    assert.strictEqual(s.tool, 'select'); assert.strictEqual(s.activeSubId, null);
    assert.deepStrictEqual(s.regions, {}); assert.strictEqual(s.draft, null); assert.strictEqual(s.selected, null);
    assert.strictEqual(s.past.length, 0); assert.strictEqual(s.future.length, 0);
  });
  t('E2 initial regions can be loaded for editing an existing question (no history)', () => {
    const r = { type: 'rect', x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
    const s = f('initialEditorState')({ sq1: [r] });
    assert.deepStrictEqual(s.regions.sq1, [r]); assert.strictEqual(s.past.length, 0);
  });
  t('E3 drawing without an active sub-question is ignored', () => {
    const s0 = run([{ type: 'SET_TOOL', tool: 'rect' }]);
    const s = run(drag(P(0.1, 0.1), P(0.4, 0.4)), s0);
    assert.deepStrictEqual(s.regions, {}); assert.strictEqual(s.draft, null);
  });
  t('E4 rectangle by drag (any direction) becomes a normalized rect on the active sub-question', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.5, 0.6), P(0.2, 0.3))]);
    const r = s.regions.sq1[0]; assert.strictEqual(r.type, 'rect');
    near(r.x, 0.2); near(r.y, 0.3); near(r.w, 0.3); near(r.h, 0.3);
    assert.deepStrictEqual(s.selected, { subId: 'sq1', index: 0 }); assert.strictEqual(s.draft, null);
  });
  t('E5 ellipse by drag is inscribed in the dragged box', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'ellipse' }, ...drag(P(0.2, 0.2), P(0.6, 0.4))]);
    const r = s.regions.sq1[0]; assert.strictEqual(r.type, 'ellipse');
    near(r.cx, 0.4); near(r.cy, 0.3); near(r.rx, 0.2); near(r.ry, 0.1);
  });
  t('E6 a tiny drag (< 0.01 in either direction) is discarded without touching history', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.5, 0.5), P(0.505, 0.7))]);
    assert.deepStrictEqual(s.regions, {}); assert.strictEqual(s.past.length, 0); assert.strictEqual(s.draft, null);
  });
  t('E7 points outside the image are clamped to 0..1', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(-0.3, 0.2), P(1.4, 0.5))]);
    const r = s.regions.sq1[0]; near(r.x, 0); near(r.w, 1);
  });
  t('E8 polygon: points by tap, preview on move, close with >= 3 points', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'polygon' },
      { type: 'POINTER_DOWN', point: P(0.1, 0.1) }, { type: 'POINTER_UP', point: P(0.1, 0.1) },
      { type: 'POINTER_DOWN', point: P(0.4, 0.1) }, { type: 'POINTER_UP', point: P(0.4, 0.1) },
      { type: 'POINTER_MOVE', point: P(0.3, 0.3) }]);
    assert.strictEqual(s.draft.points.length, 2);
    s = run([{ type: 'POLY_CLOSE' }], s);
    assert.strictEqual(s.regions.sq1, undefined, 'must not close with 2 points'); assert.strictEqual(s.draft.points.length, 2);
    s = run([{ type: 'POINTER_DOWN', point: P(0.3, 0.4) }, { type: 'POINTER_UP', point: P(0.3, 0.4) }, { type: 'POLY_CLOSE' }], s);
    assert.strictEqual(s.regions.sq1[0].type, 'polygon'); assert.strictEqual(s.regions.sq1[0].points.length, 3); assert.strictEqual(s.draft, null);
  });
  t('E9 polygon ignores a repeated identical point; CANCEL drops the draft', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'polygon' },
      { type: 'POINTER_DOWN', point: P(0.2, 0.2) }, { type: 'POINTER_DOWN', point: P(0.2, 0.2) }]);
    assert.strictEqual(s.draft.points.length, 1);
    s = run([{ type: 'CANCEL' }], s); assert.strictEqual(s.draft, null);
  });
  t('E10 regions are kept per sub-question; switching active sub-question or tool cancels a draft', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)),
      { type: 'SET_ACTIVE', subId: 'sq2' }, ...drag(P(0.5, 0.5), P(0.8, 0.8))]);
    assert.strictEqual(s.regions.sq1.length, 1); assert.strictEqual(s.regions.sq2.length, 1);
    s = run([{ type: 'SET_TOOL', tool: 'polygon' }, { type: 'POINTER_DOWN', point: P(0.1, 0.1) }, { type: 'SET_TOOL', tool: 'rect' }], s);
    assert.strictEqual(s.draft, null);
    s = run([{ type: 'SET_TOOL', tool: 'polygon' }, { type: 'POINTER_DOWN', point: P(0.1, 0.1) }, { type: 'SET_ACTIVE', subId: 'sq1' }], s);
    assert.strictEqual(s.draft, null);
  });
  t('E11 several acceptable regions can be added to one sub-question', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)), ...drag(P(0.6, 0.6), P(0.9, 0.9))]);
    assert.strictEqual(s.regions.sq1.length, 2); assert.deepStrictEqual(s.selected, { subId: 'sq1', index: 1 });
  });
  t('E12 undo / redo restore the region lists', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)), ...drag(P(0.6, 0.6), P(0.9, 0.9))]);
    s = run([{ type: 'UNDO' }], s); assert.strictEqual(s.regions.sq1.length, 1);
    s = run([{ type: 'UNDO' }], s); assert.ok(!s.regions.sq1 || s.regions.sq1.length === 0);
    const same = run([{ type: 'UNDO' }], s); assert.strictEqual(same.past.length, 0);
    s = run([{ type: 'REDO' }, { type: 'REDO' }], s); assert.strictEqual(s.regions.sq1.length, 2);
  });
  t('E13 a new action after undo clears the redo stack', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)), { type: 'UNDO' }, ...drag(P(0.5, 0.5), P(0.7, 0.7))]);
    assert.strictEqual(s.future.length, 0);
  });
  t('E14 select + delete removes only that region (undoable)', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)), ...drag(P(0.6, 0.6), P(0.9, 0.9)),
      { type: 'SELECT', subId: 'sq1', index: 0 }, { type: 'DELETE_SELECTED' }]);
    assert.strictEqual(s.regions.sq1.length, 1); near(s.regions.sq1[0].x, 0.6); assert.strictEqual(s.selected, null);
    s = run([{ type: 'UNDO' }], s); assert.strictEqual(s.regions.sq1.length, 2);
    const noSel = run([{ type: 'DELETE_SELECTED' }], f('initialEditorState')()); assert.strictEqual(noSel.past.length, 0);
  });
  t('E15 MOVE_VERTEX moves a polygon vertex (clamped) and ignores non-polygons', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'polygon' },
      { type: 'POINTER_DOWN', point: P(0.1, 0.1) }, { type: 'POINTER_DOWN', point: P(0.5, 0.1) }, { type: 'POINTER_DOWN', point: P(0.3, 0.5) }, { type: 'POLY_CLOSE' },
      { type: 'MOVE_VERTEX', subId: 'sq1', index: 0, vertex: 2, point: P(0.35, 1.7) }]);
    near(s.regions.sq1[0].points[2].x, 0.35); near(s.regions.sq1[0].points[2].y, 1);
    assert.strictEqual(s.regions.sq1[0].points.length, 3);
    let r = run([{ type: 'SET_ACTIVE', subId: 'sq2' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3))]);
    const before = JSON.stringify(r.regions);
    r = run([{ type: 'MOVE_VERTEX', subId: 'sq2', index: 0, vertex: 0, point: P(0.9, 0.9) }], r); assert.strictEqual(JSON.stringify(r.regions), before);
  });
  t('E16 SET_TOLERANCE clamps to 0..0.1 and is stored on the region', () => {
    let s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)), { type: 'SET_TOLERANCE', subId: 'sq1', index: 0, value: 0.05 }]);
    near(s.regions.sq1[0].tolerance, 0.05);
    s = run([{ type: 'SET_TOLERANCE', subId: 'sq1', index: 0, value: 0.5 }], s); near(s.regions.sq1[0].tolerance, 0.1);
    s = run([{ type: 'SET_TOLERANCE', subId: 'sq1', index: 0, value: -1 }], s); near(s.regions.sq1[0].tolerance, 0);
  });
  t('E17 RESET_ALL (image replaced) clears regions, draft, selection and history but keeps tool and active sub-question', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)), { type: 'RESET_ALL' }]);
    assert.deepStrictEqual(s.regions, {}); assert.strictEqual(s.selected, null); assert.strictEqual(s.past.length, 0);
    assert.strictEqual(s.tool, 'rect'); assert.strictEqual(s.activeSubId, 'sq1');
  });
  t('E18 toKey exports only sub-questions with regions and every region passes validateRegion', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3)),
      { type: 'SET_TOOL', tool: 'ellipse' }, ...drag(P(0.5, 0.5), P(0.8, 0.7))]);
    const key = f('toKey')(s); assert.deepStrictEqual(Object.keys(key), ['sq1']); assert.strictEqual(key.sq1.regions.length, 2);
    assert.ok(geo?.validateRegion, 'src/shared/regionGeometry.validateRegion required');
    for (const r of key.sq1.regions) assert.strictEqual(geo.validateRegion(r).valid, true);
  });
  t('E19 issues(): every locate sub-question needs at least one region; name/function do not', () => {
    const subs = [{ id: 'sq1', kind: 'locate' }, { id: 'sq2', kind: 'name' }, { id: 'sq3', kind: 'locate' }, { id: 'sq4', kind: 'function' }];
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }, ...drag(P(0.1, 0.1), P(0.3, 0.3))]);
    assert.deepStrictEqual(f('issues')(s, subs), [{ subId: 'sq3', code: 'NO_REGION' }]);
  });
  t('E20 the reducer never mutates its input state', () => {
    let s = deepFreeze(run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'polygon' }]));
    const acts = [{ type: 'POINTER_DOWN', point: P(0.1, 0.1) }, { type: 'POINTER_DOWN', point: P(0.5, 0.1) }, { type: 'POINTER_DOWN', point: P(0.3, 0.5) }, { type: 'POLY_CLOSE' },
      { type: 'SET_TOLERANCE', subId: 'sq1', index: 0, value: 0.02 }, { type: 'UNDO' }, { type: 'REDO' }, { type: 'RESET_ALL' }];
    for (const a of acts) s = deepFreeze(f('editorReducer')(s, a));
  });
  t('E21 unknown actions and invalid points leave the state unchanged and never throw', () => {
    const s = run([{ type: 'SET_ACTIVE', subId: 'sq1' }, { type: 'SET_TOOL', tool: 'rect' }]);
    assert.strictEqual(f('editorReducer')(s, { type: 'NOPE' }), s);
    assert.deepStrictEqual(run([{ type: 'POINTER_DOWN', point: { x: NaN, y: 0.1 } }, { type: 'POINTER_UP', point: null }], s).regions, {});
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}
main();
