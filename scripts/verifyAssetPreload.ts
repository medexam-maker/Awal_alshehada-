/**
 * VISUAL MASTERY LAB — PHASE B3 ACCEPTANCE: offline preloading of exam diagrams (CR-2026-11-09).
 * Pure logic in src/client/lib/examAssetPreload.ts with injected cache and fetch. Test-first: expected to FAIL before implementation.
 */
import assert from 'assert';

let passed = 0, failed = 0;
async function t(name: string, fn: () => Promise<void> | void) {
  try { await fn(); console.log(`✅ [PASS] ${name}`); passed++; }
  catch (e: any) { console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`); failed++; process.exitCode = 1; }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeCache(opts: { putThrows?: boolean } = {}) {
  const store = new Map<string, any>(); let puts = 0;
  return { store, get puts() { return puts; },
    match: async (u: string) => store.get(u),
    put: async (u: string, r: any) => { if (opts.putThrows) throw new Error('quota'); puts++; store.set(u, r); } };
}
const okResp = () => ({ ok: true, status: 200, clone() { return { ok: true, status: 200 }; } });
const badResp = (status = 503) => ({ ok: false, status, clone() { return { ok: false, status }; } });

async function main() {
  let m: any = null;
  try { m = await import('../src/client/lib/examAssetPreload'); } catch { m = null; }
  const f = (name: string) => { if (!m || !m[name]) throw new Error(`missing export ${name} in src/client/lib/examAssetPreload.ts`); return m[name]; };

  console.log('--- P. Exam asset preloading ---');
  await t('P1 PRELOAD_CACHE_NAME is exam-diagrams-v1', () => assert.strictEqual(f('PRELOAD_CACHE_NAME'), 'exam-diagrams-v1'));
  await t('P2 collectDiagramAssetUrls: assetId and bundled url, de-duplicated, first-appearance order', () => {
    const qs = [
      { questionType: 'diagram_labeling', content: { diagram: { assetId: 'abc' } } },
      { questionType: 'multiple_choice', content: { diagram: { assetId: 'zzz' } } },
      { questionType: 'diagram_labeling', content: { diagram: { url: '/assets/diagrams/x.svg' } } },
      { questionType: 'diagram_labeling', content: { diagram: { assetId: 'abc' } } },
      { type: 'diagram_labeling', content: { diagram: { assetId: 'def' } } },
    ];
    assert.deepStrictEqual(f('collectDiagramAssetUrls')(qs), ['/api/media/abc', '/assets/diagrams/x.svg', '/api/media/def']);
  });
  await t('P3 collectDiagramAssetUrls ignores malformed questions and never throws', () => {
    const bad: any[] = [null, undefined, 5, {}, { questionType: 'diagram_labeling' }, { questionType: 'diagram_labeling', content: null },
      { questionType: 'diagram_labeling', content: { diagram: { assetId: 7 } } }, { questionType: 'diagram_labeling', content: { diagram: {} } }];
    assert.deepStrictEqual(f('collectDiagramAssetUrls')(bad), []);
    assert.deepStrictEqual(f('collectDiagramAssetUrls')(undefined as any), []);
  });
  await t('P4 preloadAssets fetches and stores every url', async () => {
    const cache = fakeCache(); let n = 0;
    const r = await f('preloadAssets')(['/a', '/b', '/c'], { cache, fetchFn: async () => { n++; return okResp(); } });
    assert.deepStrictEqual([...r.loaded].sort(), ['/a', '/b', '/c']); assert.deepStrictEqual(r.failed, []); assert.strictEqual(cache.puts, 3); assert.strictEqual(n, 3);
  });
  await t('P5 urls already in the cache are not fetched again', async () => {
    const cache = fakeCache(); cache.store.set('/a', { ok: true }); let n = 0;
    const r = await f('preloadAssets')(['/a', '/b'], { cache, fetchFn: async () => { n++; return okResp(); } });
    assert.deepStrictEqual(r.cached, ['/a']); assert.deepStrictEqual(r.loaded, ['/b']); assert.strictEqual(n, 1);
  });
  await t('P6 a transient failure is retried (default 2 retries) and then loads', async () => {
    const cache = fakeCache(); let n = 0;
    const r = await f('preloadAssets')(['/a'], { cache, fetchFn: async () => { n++; return n === 1 ? badResp(503) : okResp(); } });
    assert.deepStrictEqual(r.loaded, ['/a']); assert.deepStrictEqual(n, 2);
  });
  await t('P7 a permanent failure makes exactly retries+1 attempts and is reported in failed; others still load; non-ok responses are never cached', async () => {
    const cache = fakeCache(); const attempts: Record<string, number> = {};
    const r = await f('preloadAssets')(['/bad', '/good'], { cache, fetchFn: async (u: string) => { attempts[u] = (attempts[u] || 0) + 1; return u === '/bad' ? badResp(404) : okResp(); } });
    assert.deepStrictEqual(r.failed, ['/bad']); assert.deepStrictEqual(r.loaded, ['/good']); assert.strictEqual(attempts['/bad'], 3);
    assert.ok(!cache.store.has('/bad'));
  });
  await t('P8 retries option is respected (0 retries = one attempt)', async () => {
    let n = 0; const r = await f('preloadAssets')(['/a'], { cache: fakeCache(), fetchFn: async () => { n++; return badResp(500); } }, { retries: 0 });
    assert.strictEqual(n, 1); assert.deepStrictEqual(r.failed, ['/a']);
  });
  await t('P9 a throwing fetch or a throwing cache.put is reported as failed, never thrown', async () => {
    const r1 = await f('preloadAssets')(['/a'], { cache: fakeCache(), fetchFn: async () => { throw new Error('offline'); } }, { retries: 1 });
    assert.deepStrictEqual(r1.failed, ['/a']);
    const r2 = await f('preloadAssets')(['/a'], { cache: fakeCache({ putThrows: true }), fetchFn: async () => okResp() });
    assert.deepStrictEqual(r2.failed, ['/a']);
  });
  await t('P10 concurrency never exceeds the limit (default 3, custom 2)', async () => {
    const urls = Array.from({ length: 8 }, (_, i) => `/u${i}`);
    for (const [limit, opts] of [[3, undefined], [2, { concurrency: 2 }]] as any[]) {
      let inflight = 0, max = 0;
      await f('preloadAssets')(urls, { cache: fakeCache(), fetchFn: async () => { inflight++; max = Math.max(max, inflight); await sleep(5); inflight--; return okResp(); } }, opts);
      assert.ok(max <= limit && max >= 1, `max in flight ${max} for limit ${limit}`);
    }
  });
  await t('P11 onProgress is called once per url, monotonically, ending at (total,total)', async () => {
    const calls: Array<[number, number]> = [];
    await f('preloadAssets')(['/a', '/b', '/c', '/d'], { cache: fakeCache(), fetchFn: async () => okResp() }, { onProgress: (d: number, t2: number) => calls.push([d, t2]) });
    assert.strictEqual(calls.length, 4); assert.deepStrictEqual(calls[calls.length - 1], [4, 4]);
    for (let i = 1; i < calls.length; i++) assert.ok(calls[i][0] > calls[i - 1][0]);
  });
  await t('P12 an empty list resolves with empty results', async () => {
    assert.deepStrictEqual(await f('preloadAssets')([], { cache: fakeCache(), fetchFn: async () => okResp() }), { loaded: [], cached: [], failed: [] });
  });
  await t('P13 allCached is true only when every url is cached', async () => {
    const cache = fakeCache(); cache.store.set('/a', {}); cache.store.set('/b', {});
    assert.strictEqual(await f('allCached')(['/a', '/b'], cache), true);
    assert.strictEqual(await f('allCached')(['/a', '/x'], cache), false);
    assert.strictEqual(await f('allCached')([], cache), true);
  });
  await t('P14 duplicate urls in the input are processed once', async () => {
    let n = 0; const r = await f('preloadAssets')(['/a', '/a', '/a'], { cache: fakeCache(), fetchFn: async () => { n++; return okResp(); } });
    assert.strictEqual(n, 1); assert.deepStrictEqual(r.loaded, ['/a']);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
}
main();
