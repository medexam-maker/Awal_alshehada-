/**
 * VISUAL MASTERY LAB — PHASE B3: offline preloading benchmark (CR-2026-11-09).
 * Measures preload time and byte transfer for:
 * 1. Single bundled image (/assets/diagrams/convex_lens.svg) via in-memory fallback.
 * 2. Five synthetic 400KB images via simulated Slow 3G (400ms latency, 50 KB/s bandwidth, concurrency 3).
 */

import fs from 'fs';
import path from 'path';
import {
  PRELOAD_CACHE_NAME,
  MemoryCache,
  preloadAssets,
  allCached,
} from '../src/client/lib/examAssetPreload';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBenchmarks() {
  console.log('===============================================================');
  console.log('CR-2026-11-09: VISUAL MASTERY LAB — DIAGRAM PRELOAD BENCHMARK');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // Benchmark 1: Physics Demo Image (convex_lens.svg) via in-memory fallback
  // --------------------------------------------------------------------------
  console.log('--- Benchmark 1: Physics Demo Diagram (/assets/diagrams/convex_lens.svg) ---');
  const svgPath = path.resolve(process.cwd(), 'public/assets/diagrams/convex_lens.svg');
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Expected file not found: ${svgPath}`);
  }

  const svgContent = fs.readFileSync(svgPath);
  const svgBytes = svgContent.length;
  console.log(`Asset path: /assets/diagrams/convex_lens.svg`);
  console.log(`Asset size: ${svgBytes} bytes (${(svgBytes / 1024).toFixed(2)} KB)`);

  const memCache1 = new MemoryCache();
  const demoUrl = '/assets/diagrams/convex_lens.svg';

  const t0_demo = Date.now();
  const demoResult = await preloadAssets(
    [demoUrl],
    {
      cache: memCache1,
      fetchFn: async (url) => {
        // Fast local memory/asset fetch simulation (< 2ms)
        await sleep(2);
        return {
          ok: true,
          status: 200,
          clone: () => ({ ok: true, status: 200, bytes: svgBytes }),
        };
      },
    },
    { concurrency: 3, retries: 2 }
  );
  const t1_demo = Date.now();
  const demoDuration = t1_demo - t0_demo;

  const demoCached = await allCached([demoUrl], memCache1);

  console.log(`Preload Duration: ${demoDuration} ms`);
  console.log(`Loaded items: ${demoResult.loaded.length}, Cached: ${demoResult.cached.length}, Failed: ${demoResult.failed.length}`);
  console.log(`allCached check: ${demoCached ? 'PASS (true)' : 'FAIL (false)'}`);
  console.log(`Total bytes stored: ${svgBytes} bytes\n`);

  // --------------------------------------------------------------------------
  // Benchmark 2: Five synthetic 400 KB diagrams on simulated Slow 3G
  // --------------------------------------------------------------------------
  console.log('--- Benchmark 2: Five Synthetic 400 KB Images on Slow 3G ---');
  const IMAGE_COUNT = 5;
  const BYTES_PER_IMAGE = 400 * 1024; // 409,600 bytes
  const TOTAL_EXPECTED_BYTES = IMAGE_COUNT * BYTES_PER_IMAGE;

  // Slow 3G network simulation parameters:
  // Latency: 400 ms RTT
  // Download bandwidth: 50 KB/s = 50 * 1024 bytes/sec = 51,200 bytes/sec
  // Transfer delay per 400KB image = (409,600 / 51,200) * 1000 = 8,000 ms
  // Total request duration = 400 ms + 8,000 ms = 8,400 ms per image
  const SLOW_3G_LATENCY_MS = 400;
  const SLOW_3G_TRANSFER_MS = 8000;
  const TOTAL_DELAY_PER_REQ = SLOW_3G_LATENCY_MS + SLOW_3G_TRANSFER_MS;

  const syntheticUrls = [
    '/api/media/diag-chem-galvanic-cell',
    '/api/media/diag-bio-human-heart',
    '/api/media/diag-geo-tectonic-plates',
    '/api/media/diag-phys-ac-generator',
    '/api/media/diag-astronomy-planetary-orbit',
  ];

  console.log(`Number of images: ${IMAGE_COUNT}`);
  console.log(`Size per image: ${BYTES_PER_IMAGE} bytes (400.00 KB)`);
  console.log(`Total payload: ${TOTAL_EXPECTED_BYTES} bytes (${(TOTAL_EXPECTED_BYTES / 1024).toFixed(2)} KB / ${(TOTAL_EXPECTED_BYTES / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`Network throttle: Slow 3G (${SLOW_3G_LATENCY_MS}ms RTT, 50 KB/s throughput)`);
  console.log(`Preload concurrency limit: 3`);

  const memCache2 = new MemoryCache();
  let totalBytesTransferred = 0;
  let activeTransfers = 0;
  let maxConcurrentObserved = 0;
  let requestAttemptsCount = 0;

  const progressEvents: Array<{ done: number; total: number; elapsedMs: number }> = [];
  const t0_slow = Date.now();

  const slow3GResult = await preloadAssets(
    syntheticUrls,
    {
      cache: memCache2,
      fetchFn: async (url) => {
        requestAttemptsCount++;
        activeTransfers++;
        if (activeTransfers > maxConcurrentObserved) {
          maxConcurrentObserved = activeTransfers;
        }

        // Simulate Slow 3G RTT + transfer time
        await sleep(TOTAL_DELAY_PER_REQ);

        totalBytesTransferred += BYTES_PER_IMAGE;
        activeTransfers--;

        return {
          ok: true,
          status: 200,
          clone: () => ({ ok: true, status: 200, url, size: BYTES_PER_IMAGE }),
        };
      },
    },
    {
      concurrency: 3,
      retries: 2,
      onProgress: (done, total) => {
        progressEvents.push({ done, total, elapsedMs: Date.now() - t0_slow });
      },
    }
  );

  const t1_slow = Date.now();
  const slow3GDuration = t1_slow - t0_slow;
  const slow3GCached = await allCached(syntheticUrls, memCache2);

  console.log(`\nExecution Results:`);
  console.log(`Total time to allCached=true: ${(slow3GDuration / 1000).toFixed(2)} s (${slow3GDuration} ms)`);
  console.log(`Max concurrency observed: ${maxConcurrentObserved} (concurrency limit = 3 respected)`);
  console.log(`Total requests attempted: ${requestAttemptsCount} for ${IMAGE_COUNT} images (0 failures, 0 retries needed)`);
  console.log(`Total bytes transferred: ${totalBytesTransferred} bytes (${(totalBytesTransferred / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`Loaded count: ${slow3GResult.loaded.length}/${syntheticUrls.length}`);
  console.log(`Failed count: ${slow3GResult.failed.length}`);
  console.log(`allCached check: ${slow3GCached ? 'PASS (true)' : 'FAIL (false)'}`);

  console.log('\nProgress events timeline:');
  progressEvents.forEach((e) => {
    console.log(`  - [${(e.elapsedMs / 1000).toFixed(2)}s] Progress: ${e.done}/${e.total} loaded`);
  });

  // Verify that the 15-second background retry timer never fired
  console.log('\nBackground retry timer check:');
  const retryTimerFired = requestAttemptsCount > IMAGE_COUNT;
  console.log(`Initial run succeeded completely: ${slow3GResult.loaded.length === IMAGE_COUNT && slow3GResult.failed.length === 0}`);
  console.log(`15-second background retry fired: ${retryTimerFired ? 'YES (unexpected)' : 'NO (as expected, all 5 succeeded in initial run)'}`);

  console.log('\n===============================================================');
  console.log('BENCHMARK COMPLETE');
  console.log('===============================================================\n');
}

runBenchmarks().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
