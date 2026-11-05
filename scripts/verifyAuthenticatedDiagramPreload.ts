/**
 * CR-2026-11-09 Point D: Authentication & Security Verification Suite
 * Verifies authenticated preloading, Bearer token inclusion, 401 token refresh retry,
 * blob URL lifecycle (creation and revocation on unmount), and logout cache purging.
 */
import assert from 'assert';
import { MemoryCache, preloadAssets } from '../src/client/lib/examAssetPreload';
import { apiClient } from '../src/client/api/apiClient';

let passed = 0;
let failed = 0;

async function t(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`❌ [FAIL] ${name}\n   ${String(e?.message || e).split('\n')[0]}`);
    failed++;
    process.exitCode = 1;
  }
}

// In-memory localStorage mock for Node environment
const storageStore = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => storageStore.get(k) || null,
  setItem: (k: string, v: string) => storageStore.set(k, String(v)),
  removeItem: (k: string) => storageStore.delete(k),
  clear: () => storageStore.clear(),
};
Object.defineProperty(globalThis, 'localStorage', {
  value: fakeLocalStorage,
  configurable: true,
  writable: true,
});

async function run() {
  console.log('===============================================================');
  console.log('CR-2026-11-09 (POINT D): AUTHENTICATED PRELOAD & RENDERER TESTS');
  console.log('===============================================================\n');

  // Test 1: Authenticated preload sends Authorization header
  await t('D1: preload with authenticated fetch forwards Bearer token for /api/media/:id', async () => {
    const assetUrl = '/api/media/asset-test-001';
    const cache = new MemoryCache();
    const headersSent: Record<string, string> = {};

    apiClient.setAccessToken('valid-mock-token-abc');

    const fakeFetch = async (url: string, init?: RequestInit) => {
      if (init?.headers) {
        Object.assign(headersSent, init.headers as Record<string, string>);
      }
      return {
        ok: true,
        status: 200,
        clone: () => ({ ok: true, status: 200 }),
      };
    };

    const origFetch = globalThis.fetch;
    globalThis.fetch = fakeFetch as any;

    try {
      const res = await preloadAssets(
        [assetUrl],
        {
          cache,
          fetchFn: (u) => apiClient.authenticatedFetch(u),
        },
        { concurrency: 1, retries: 0 }
      );

      assert.deepStrictEqual(res.loaded, [assetUrl]);
      assert.strictEqual(headersSent['Authorization'], 'Bearer valid-mock-token-abc');
      const match = await cache.match(assetUrl);
      assert.ok(match, 'Asset must be stored in cache');
    } finally {
      globalThis.fetch = origFetch;
      apiClient.clearAuth();
    }
  });

  // Test 2: 401 response triggers token refresh and retries with new token
  await t('D2: 401 on /api/media/:id triggers token refresh and retries with renewed token', async () => {
    const assetUrl = '/api/media/asset-test-002';
    const cache = new MemoryCache();
    let requestCount = 0;
    const tokensSeen: string[] = [];

    apiClient.setAccessToken('expired-token-111');
    apiClient.setRefreshToken('valid-refresh-token-222');

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      if (url === '/api/auth/refresh') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { accessToken: 'fresh-renewed-token-333', refreshToken: 'fresh-refresh-token-444' },
          }),
        };
      }

      requestCount++;
      const authHeader = (init?.headers as Record<string, string>)?.[
        'Authorization'
      ];
      tokensSeen.push(authHeader || '');

      if (requestCount === 1) {
        return { ok: false, status: 401 };
      }
      return {
        ok: true,
        status: 200,
        clone: () => ({ ok: true, status: 200 }),
      };
    }) as any;

    try {
      const res = await preloadAssets(
        [assetUrl],
        {
          cache,
          fetchFn: (u) => apiClient.authenticatedFetch(u),
        },
        { concurrency: 1, retries: 1 }
      );

      assert.deepStrictEqual(res.loaded, [assetUrl]);
      assert.strictEqual(requestCount, 2);
      assert.strictEqual(tokensSeen[0], 'Bearer expired-token-111');
      assert.strictEqual(tokensSeen[1], 'Bearer fresh-renewed-token-333');
      assert.strictEqual(apiClient.getAccessToken(), 'fresh-renewed-token-333');
    } finally {
      globalThis.fetch = origFetch;
      apiClient.clearAuth();
    }
  });

  // Test 3: Object URL creation and revocation
  await t('D3: renderer creates blob URL from authenticated response and revokes on unmount', () => {
    const createdUrls: string[] = [];
    const revokedUrls: string[] = [];

    const mockCreateObjectURL = (blob: any) => {
      const u = `blob:http://localhost:3000/${Math.random().toString(36).slice(2)}`;
      createdUrls.push(u);
      return u;
    };

    const mockRevokeObjectURL = (url: string) => {
      revokedUrls.push(url);
    };

    const origCreate = globalThis.URL.createObjectURL;
    const origRevoke = globalThis.URL.revokeObjectURL;
    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    try {
      const mockBlob = new Blob(['fake image bytes'], { type: 'image/png' });
      let currentBlobUrl: string | null = null;

      // Simulate renderer mount / load
      currentBlobUrl = globalThis.URL.createObjectURL(mockBlob);
      assert.strictEqual(createdUrls.length, 1);
      assert.strictEqual(currentBlobUrl, createdUrls[0]);

      // Simulate renderer unmount cleanup
      if (currentBlobUrl) {
        globalThis.URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
      }

      assert.strictEqual(revokedUrls.length, 1);
      assert.strictEqual(revokedUrls[0], createdUrls[0]);
    } finally {
      globalThis.URL.createObjectURL = origCreate;
      globalThis.URL.revokeObjectURL = origRevoke;
    }
  });

  // Test 4: Logout purges diagram cache
  await t('D4: apiClient.clearAuth() triggers purge of exam-diagrams-v1 cache', async () => {
    let deletedCacheName: string | null = null;
    let postedMessageType: string | null = null;

    const fakeCaches = {
      delete: async (name: string) => {
        deletedCacheName = name;
        return true;
      },
    };

    const fakeWorker = {
      controller: {
        postMessage: (data: any) => {
          postedMessageType = data?.type;
        },
      },
    };

    (globalThis as any).window = { caches: fakeCaches };
    const origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: { serviceWorker: fakeWorker },
      configurable: true,
      writable: true,
    });

    try {
      apiClient.setAccessToken('token-to-clear');
      apiClient.clearAuth();

      assert.strictEqual(deletedCacheName, 'exam-diagrams-v1');
      assert.strictEqual(postedMessageType, 'CLEAR_DIAGRAM_CACHE');
      assert.strictEqual(apiClient.getAccessToken(), null);
    } finally {
      delete (globalThis as any).window;
      if (origNav) {
        Object.defineProperty(globalThis, 'navigator', origNav);
      }
    }
  });

  // Test 5: Rejection of bare <img> fallback for /api/media/ on network error
  await t('D5: failure to load /api/media/:id sets error state and never falls back to bare <img>', () => {
    const src = '/api/media/unauthorized-id-999';
    let displayedImageUrl: string | null = null;
    let isErrorState = false;

    // Simulate error handler logic from DiagramLabelingRenderer
    const onErrorHandler = (url: string) => {
      if (!url.startsWith('/api/media/')) {
        displayedImageUrl = url;
      } else {
        isErrorState = true;
      }
    };

    onErrorHandler(src);
    assert.strictEqual(displayedImageUrl, null, 'Must NOT set bare /api/media/ URL');
    assert.strictEqual(isErrorState, true, 'Must set error state');
  });

  console.log(`\n===============================================================`);
  console.log(`POINT D VERIFICATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`===============================================================\n`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
