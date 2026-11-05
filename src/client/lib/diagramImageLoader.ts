/**
 * Pure loader for diagram images.
 * Handles CacheStorage / MemoryCache lookup, authenticated fetching for /api/media/:id,
 * blob URL creation with explicit revocation, and elimination of unauthenticated bare <img> requests.
 */

import { inMemoryDiagramCache, PRELOAD_CACHE_NAME, CacheLike } from './examAssetPreload';
import { apiClient } from '../api/apiClient';

export interface DiagramImageLoadResult {
  imageUrl: string | null;
  error: boolean;
  revoke: () => void;
}

export interface DiagramImageLoaderDeps {
  cache?: CacheLike;
  authenticatedFetch?: (url: string) => Promise<Response>;
  standardFetch?: (url: string) => Promise<Response>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

export async function loadDiagramImage(
  src: string | null | undefined,
  deps?: DiagramImageLoaderDeps
): Promise<DiagramImageLoadResult> {
  const noopRevoke = () => {};

  if (!src || typeof src !== 'string' || !src.trim()) {
    return { imageUrl: null, error: true, revoke: noopRevoke };
  }

  const targetSrc = src.trim();
  const createUrl = deps?.createObjectUrl || ((b: Blob) => (typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(b) : 'blob:mock'));
  const revokeUrl = deps?.revokeObjectUrl || ((u: string) => { if (typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(u); });

  // 1. Try reading from Cache
  try {
    let targetCache: CacheLike;
    if (deps?.cache) {
      targetCache = deps.cache;
    } else if (typeof window !== 'undefined' && 'caches' in window) {
      targetCache = (await window.caches.open(PRELOAD_CACHE_NAME)) as any;
    } else {
      targetCache = inMemoryDiagramCache;
    }

    const cachedRes = await targetCache.match(targetSrc);
    if (cachedRes) {
      const blob = typeof cachedRes.blob === 'function' ? await cachedRes.blob() : cachedRes;
      const objUrl = createUrl(blob);
      return {
        imageUrl: objUrl,
        error: false,
        revoke: () => revokeUrl(objUrl),
      };
    }
  } catch (err) {
    // Cache miss or read failure, proceed to fetch
  }

  // 2. Fetch from network
  try {
    let res: Response;
    if (targetSrc.startsWith('/api/media/')) {
      const authFetch = deps?.authenticatedFetch || ((u) => apiClient.authenticatedFetch(u));
      res = await authFetch(targetSrc);
    } else {
      const stdFetch = deps?.standardFetch || ((u) => fetch(u));
      res = await stdFetch(targetSrc);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const blob = await res.blob();

    // Cache the successful response
    try {
      let targetCache: CacheLike;
      if (deps?.cache) {
        targetCache = deps.cache;
      } else if (typeof window !== 'undefined' && 'caches' in window) {
        targetCache = (await window.caches.open(PRELOAD_CACHE_NAME)) as any;
      } else {
        targetCache = inMemoryDiagramCache;
      }
      await targetCache.put(targetSrc, typeof Response !== 'undefined' ? new Response(blob) : (blob as any));
    } catch {
      // Non-critical cache write error
    }

    const objUrl = createUrl(blob);
    return {
      imageUrl: objUrl,
      error: false,
      revoke: () => revokeUrl(objUrl),
    };
  } catch (err) {
    // On failure: NEVER fall back to bare /api/media/ which causes 401 Unauthorized
    if (!targetSrc.startsWith('/api/media/')) {
      return { imageUrl: targetSrc, error: false, revoke: noopRevoke };
    }
    return { imageUrl: null, error: true, revoke: noopRevoke };
  }
}
