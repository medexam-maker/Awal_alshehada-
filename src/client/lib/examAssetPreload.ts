/**
 * VISUAL MASTERY LAB — PHASE B3: offline preloading of exam diagrams (CR-2026-11-09).
 * Pure logic module with injected cache and fetch. Never throws.
 */

export const PRELOAD_CACHE_NAME = 'exam-diagrams-v1';

export interface CacheLike {
  match: (request: string | any) => Promise<any>;
  put: (request: string | any, response: any) => Promise<void>;
  delete?: (request: string | any) => Promise<boolean>;
  keys?: () => Promise<Array<any> | readonly any[]>;
}

export interface PreloadOptions {
  retries?: number;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface PreloadContext {
  cache?: CacheLike;
  fetchFn?: (url: string) => Promise<any>;
}

export interface PreloadResult {
  loaded: string[];
  cached: string[];
  failed: string[];
}

/**
 * In-memory fallback for environments without CacheStorage (e.g., some WebViews).
 */
export class MemoryCache implements CacheLike {
  private store = new Map<string, any>();

  async match(request: string | any): Promise<any> {
    const key = typeof request === 'string' ? request : request?.url || String(request);
    return this.store.get(key);
  }

  async put(request: string | any, response: any): Promise<void> {
    const key = typeof request === 'string' ? request : request?.url || String(request);
    this.store.set(key, response);
  }

  async delete(request: string | any): Promise<boolean> {
    const key = typeof request === 'string' ? request : request?.url || String(request);
    return this.store.delete(key);
  }

  async keys(): Promise<Array<any>> {
    return Array.from(this.store.keys()).map((k) => ({ url: k }));
  }
}

export const inMemoryDiagramCache = new MemoryCache();

/**
 * Collects and de-duplicates diagram image URLs from a list of questions in first-appearance order.
 * Accepts questions with questionType or type == 'diagram_labeling'.
 * Safely ignores malformed questions and never throws.
 */
export function collectDiagramAssetUrls(questions: any[]): string[] {
  if (!Array.isArray(questions)) return [];

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const q of questions) {
    if (!q || typeof q !== 'object') continue;
    const qType = q.questionType || q.type;
    if (qType !== 'diagram_labeling') continue;

    const diagram = q.content?.diagram;
    if (!diagram || typeof diagram !== 'object') continue;

    let targetUrl: string | null = null;
    if (typeof diagram.assetId === 'string' && diagram.assetId.trim()) {
      targetUrl = `/api/media/${diagram.assetId.trim()}`;
    } else if (typeof diagram.url === 'string' && diagram.url.trim()) {
      targetUrl = diagram.url.trim();
    }

    if (targetUrl && !seen.has(targetUrl)) {
      seen.add(targetUrl);
      urls.push(targetUrl);
    }
  }

  return urls;
}

/**
 * Checks whether every URL in the list is present in the cache.
 */
export async function allCached(urls: string[], cache?: CacheLike): Promise<boolean> {
  if (!Array.isArray(urls) || urls.length === 0) return true;

  try {
    const targetCache =
      cache ||
      (typeof window !== 'undefined' && 'caches' in window
        ? await window.caches.open(PRELOAD_CACHE_NAME)
        : inMemoryDiagramCache);

    for (const url of urls) {
      const match = await targetCache.match(url);
      if (!match) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Preloads a list of asset URLs into Cache Storage using concurrency and retry controls.
 * Pure logic: cache and fetch are injected. Never throws.
 */
export async function preloadAssets(
  urls: string[],
  context?: PreloadContext,
  options?: PreloadOptions
): Promise<PreloadResult> {
  const result: PreloadResult = {
    loaded: [],
    cached: [],
    failed: [],
  };

  if (!Array.isArray(urls) || urls.length === 0) {
    return result;
  }

  // De-duplicate URLs maintaining order
  const uniqueUrls = Array.from(new Set(urls));
  const total = uniqueUrls.length;
  const retries = typeof options?.retries === 'number' && options.retries >= 0 ? options.retries : 2;
  const concurrency = typeof options?.concurrency === 'number' && options.concurrency >= 1 ? options.concurrency : 3;
  const onProgress = options?.onProgress;

  let targetCache: CacheLike;
  try {
    targetCache =
      context?.cache ||
      (typeof window !== 'undefined' && 'caches' in window
        ? await window.caches.open(PRELOAD_CACHE_NAME)
        : inMemoryDiagramCache);
  } catch {
    targetCache = inMemoryDiagramCache;
  }

  const fetchFn =
    context?.fetchFn ||
    (typeof fetch !== 'undefined'
      ? fetch
      : async () => {
          throw new Error('fetch unavailable');
        });

  let completedCount = 0;

  // Process a single URL
  async function processUrl(url: string): Promise<void> {
    try {
      // 1. Check if already in cache
      let cachedMatch: any = null;
      try {
        cachedMatch = await targetCache.match(url);
      } catch {
        cachedMatch = null;
      }

      if (cachedMatch) {
        result.cached.push(url);
        completedCount++;
        onProgress?.(completedCount, total);
        return;
      }

      // 2. Fetch with retries
      let success = false;
      const maxAttempts = retries + 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetchFn(url);
          if (res && res.ok) {
            const toCache = typeof res.clone === 'function' ? res.clone() : res;
            await targetCache.put(url, toCache);
            success = true;
            break;
          }
        } catch {
          // Retry on network / put error
        }
      }

      if (success) {
        result.loaded.push(url);
      } else {
        result.failed.push(url);
      }
    } catch {
      result.failed.push(url);
    } finally {
      completedCount++;
      onProgress?.(completedCount, total);
    }
  }

  // Concurrency Pool
  let currentIndex = 0;
  async function worker(): Promise<void> {
    while (currentIndex < uniqueUrls.length) {
      const idx = currentIndex++;
      await processUrl(uniqueUrls[idx]);
    }
  }

  const workerCount = Math.min(concurrency, uniqueUrls.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return result;
}

/**
 * Housekeeping: removes cached diagrams not referenced by the current attempt,
 * keeping at most maxEntries (default 100).
 */
export async function cleanupUnusedDiagramAssets(
  activeUrls: string[],
  cache?: CacheLike,
  maxEntries = 100
): Promise<void> {
  try {
    const targetCache =
      cache ||
      (typeof window !== 'undefined' && 'caches' in window
        ? await window.caches.open(PRELOAD_CACHE_NAME)
        : inMemoryDiagramCache);

    if (!targetCache.keys || !targetCache.delete) return;

    const allKeys = await targetCache.keys();
    const activeSet = new Set(activeUrls);

    // Filter out keys not in active attempt
    const deletableKeys: any[] = [];
    for (const key of allKeys) {
      const url = typeof key === 'string' ? key : key.url;
      if (!activeSet.has(url)) {
        deletableKeys.push(key);
      }
    }

    // Delete unused keys
    for (const key of deletableKeys) {
      await targetCache.delete(key);
    }

    // If still exceeds maxEntries, evict oldest
    const remainingKeys = await targetCache.keys();
    if (remainingKeys.length > maxEntries) {
      const excess = remainingKeys.length - maxEntries;
      for (let i = 0; i < excess; i++) {
        await targetCache.delete(remainingKeys[i]);
      }
    }
  } catch (err) {
    console.warn('[examAssetPreload] Cleanup warning:', err);
  }
}
