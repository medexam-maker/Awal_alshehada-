/**
 * VISUAL MASTERY LAB — PHASE B1 ACCEPTANCE: viewport math for the student diagram renderer (CR-2026-11-07).
 * Pure functions in src/client/lib/imageViewport.ts. Test-first: expected to FAIL before implementation.
 * Conventions: all screen points are relative to the top-left of the interactive container (CSS px).
 * The image is laid out with object-fit: contain inside the container; an inner layer is then transformed with
 * `translate(tx,ty) scale(scale)` and transform-origin 0 0, so  screen = scale * base + (tx,ty).
 */
import assert from 'assert';

let passed = 0, failed = 0;
function t(name: string, fn: () => void) {
  try { fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

async function main() {
  let m: any = null;
  try { m = await import('../src/client/lib/imageViewport'); } catch { m = null; }
  const f = (name: string) => { if (!m || !m[name]) throw new Error(`missing export ${name} in src/client/lib/imageViewport.ts`); return m[name]; };

  const C = { width: 400, height: 300 };
  const IMG = { width: 800, height: 400 };           // 2:1 image in a 4:3 container => letterboxed top/bottom
  const ID = { scale: 1, tx: 0, ty: 0 };

  console.log('--- fitRect (object-fit: contain) ---');
  t('V1 wide image in a taller container is centred vertically', () => {
    assert.deepStrictEqual(f('fitRect')(C, IMG), { x: 0, y: 50, width: 400, height: 200 });
  });
  t('V2 tall image in a wider container is centred horizontally', () => {
    assert.deepStrictEqual(f('fitRect')({ width: 400, height: 200 }, { width: 100, height: 200 }), { x: 150, y: 0, width: 100, height: 200 });
  });
  t('V3 degenerate sizes give an empty rect and never throw', () => {
    for (const [c, i] of [[{ width: 0, height: 0 }, IMG], [C, { width: 0, height: 10 }], [{ width: NaN, height: 1 }, IMG]] as any[]) {
      const r = f('fitRect')(c, i); assert.strictEqual(r.width, 0); assert.strictEqual(r.height, 0);
    }
  });

  console.log('--- screen <-> normalized image coordinates ---');
  const s2n = (p: any, v: any = ID, c: any = C, i: any = IMG) => f('screenToNormalized')(p, c, i, v);
  const n2s = (p: any, v: any = ID, c: any = C, i: any = IMG) => f('normalizedToScreen')(p, c, i, v);
  t('V4 identity viewport: centre, corners', () => {
    const c = s2n({ x: 200, y: 150 }); near(c.x, 0.5); near(c.y, 0.5);
    const a = s2n({ x: 0, y: 50 }); near(a.x, 0); near(a.y, 0);
    const b = s2n({ x: 400, y: 250 }); near(b.x, 1); near(b.y, 1);
  });
  t('V5 taps in the letterbox (outside the image) return null', () => {
    assert.strictEqual(s2n({ x: 200, y: 20 }), null);
    assert.strictEqual(s2n({ x: 200, y: 260 }), null);
    assert.strictEqual(s2n({ x: -5, y: 150 }), null);
  });
  t('V6 zoomed viewport maps correctly', () => {
    const v = { scale: 2, tx: -200, ty: -150 };
    const c = s2n({ x: 200, y: 150 }, v); near(c.x, 0.5); near(c.y, 0.5);
    const q = s2n({ x: 0, y: 0 }, v); near(q.x, 0.25); // base (100,75) -> ((100-0)/400, (75-50)/200)
    near(q.y, 0.125);
  });
  t('V7 round trip: normalizedToScreen(screenToNormalized(p)) ~ p for many viewports and points', () => {
    const vs = [ID, { scale: 2, tx: -100, ty: -60 }, { scale: 3.3, tx: -700, ty: -500 }, { scale: 1.5, tx: -30, ty: -10 }];
    for (const v of vs) for (const p of [{ x: 120, y: 120 }, { x: 300, y: 200 }, { x: 399, y: 249 }, { x: 10, y: 60 }]) {
      const n = s2n(p, v); if (!n) continue;
      const back = n2s(n, v); near(back.x, p.x, 1e-7); near(back.y, p.y, 1e-7);
    }
  });
  t('V8 invalid inputs return null and never throw', () => {
    assert.strictEqual(s2n({ x: NaN, y: 1 }), null);
    assert.strictEqual(s2n(null), null);
    assert.strictEqual(f('screenToNormalized')({ x: 1, y: 1 }, { width: 0, height: 0 }, IMG, ID), null);
    assert.strictEqual(s2n({ x: 100, y: 100 }, { scale: 0, tx: 0, ty: 0 }), null);
  });

  console.log('--- zoom / pan / clamp ---');
  t('V9 zoomAt keeps the anchored image point fixed under the finger', () => {
    const anchor = { x: 300, y: 100 };
    const before = s2n(anchor, ID);
    const v2 = f('zoomAt')(ID, 2, anchor, C, IMG);
    near(v2.scale, 2);
    const after = s2n(anchor, v2); near(after.x, before.x); near(after.y, before.y);
  });
  t('V10 scale is limited to [1, 4] by default and to a custom maxScale', () => {
    assert.strictEqual(f('zoomAt')(ID, 100, { x: 10, y: 10 }, C, IMG).scale, 4);
    assert.strictEqual(f('zoomAt')(ID, 100, { x: 10, y: 10 }, C, IMG, { maxScale: 2 }).scale, 2);
    const back = f('zoomAt')({ scale: 4, tx: -900, ty: -600 }, 0.01, { x: 10, y: 10 }, C, IMG);
    assert.strictEqual(back.scale, 1); assert.strictEqual(back.tx, 0); assert.strictEqual(back.ty, 0);
  });
  t('V11 clampViewport / panBy keep the content covering the container', () => {
    const z = { scale: 2, tx: 0, ty: 0 };
    const a = f('panBy')(z, 500, 500, C, IMG); assert.strictEqual(a.tx, 0); assert.strictEqual(a.ty, 0);
    const b = f('panBy')(z, -9999, -9999, C, IMG); assert.strictEqual(b.tx, -400); assert.strictEqual(b.ty, -300);
    const c = f('clampViewport')({ scale: 2, tx: 50, ty: -999 }, C, IMG); assert.strictEqual(c.tx, 0); assert.strictEqual(c.ty, -300);
    const d = f('panBy')(ID, 100, 100, C, IMG); assert.strictEqual(d.tx, 0); assert.strictEqual(d.ty, 0); // nothing to pan at scale 1
  });
  t('V12 non-finite factor or anchor leaves the viewport unchanged', () => {
    assert.deepStrictEqual(f('zoomAt')(ID, NaN, { x: 1, y: 1 }, C, IMG), ID);
    assert.deepStrictEqual(f('zoomAt')(ID, 2, { x: NaN, y: 1 }, C, IMG), ID);
  });
  t('V13 the functions do not mutate their input viewport', () => {
    const v = Object.freeze({ scale: 2, tx: -10, ty: -10 });
    f('panBy')(v, 5, 5, C, IMG); f('zoomAt')(v, 1.5, { x: 5, y: 5 }, C, IMG); f('clampViewport')(v, C, IMG);
  });

  console.log('--- gesture classification ---');
  t('V14 classifyGesture: tap vs pan vs long press', () => {
    const g = f('classifyGesture');
    assert.strictEqual(g({ x: 0, y: 0 }, { x: 3, y: 4 }, 200), 'tap');
    assert.strictEqual(g({ x: 0, y: 0 }, { x: 20, y: 0 }, 200), 'pan');
    assert.strictEqual(g({ x: 0, y: 0 }, { x: 1, y: 1 }, 800), 'longpress');
    assert.strictEqual(g({ x: 0, y: 0 }, { x: 30, y: 0 }, 800), 'pan');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}
main();
