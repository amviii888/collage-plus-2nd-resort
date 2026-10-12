'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// In-memory cache storage (Layer 1 - fastest)
const memoryCache = new Map<string, CacheEntry<any>>();

const STORAGE_PREFIX = 'universe_cache_v2_';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours heavy caching

/**
 * Global persistent multi-tier cache utility for Firestore reads and expensive computations.
 * Supports multi-layer: In-Memory -> LocalStorage (Persistent) -> Stale-Offline Fallback.
 * Minimizes Firestore read quotas and guarantees instant app launch on phones even offline.
 */
export const AppCache = {
  get<T>(key: string, options?: { allowStale?: boolean }): T | null {
    if (!key) return null;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const allowStale = options?.allowStale || isOffline;

    // 1. Check In-Memory Cache (Layer 1)
    const memItem = memoryCache.get(key);
    if (memItem) {
      const isFresh = Date.now() - memItem.timestamp < memItem.ttlMs;
      if (isFresh || allowStale) {
        return memItem.data as T;
      } else {
        memoryCache.delete(key);
      }
    }

    // 2. Check LocalStorage Persistent Cache (Layer 2 - survives app restarts & phone reboots)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (raw) {
          const parsed: CacheEntry<T> = JSON.parse(raw);
          const isFresh = Date.now() - parsed.timestamp < parsed.ttlMs;
          if (isFresh || allowStale) {
            // Re-hydrate to memory cache for zero-latency subsequent lookups
            memoryCache.set(key, parsed);
            return parsed.data;
          } else if (!allowStale) {
            localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
          }
        }
      } catch (err) {
        // Silently fall through if localStorage is unavailable
      }

      // Backward-compatible fallback: check legacy sessionStorage
      try {
        const sessionVal = sessionStorage.getItem(`app_cache_${key}`);
        if (sessionVal) {
          const parsed: CacheEntry<T> = JSON.parse(sessionVal);
          const isFresh = Date.now() - parsed.timestamp < parsed.ttlMs;
          if (isFresh || allowStale) {
            memoryCache.set(key, parsed);
            return parsed.data;
          }
        }
      } catch {}
    }

    return null;
  },

  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    if (!key) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    // Save to Layer 1: Memory
    memoryCache.set(key, entry);

    // Save to Layer 2: Persistent LocalStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
      } catch (err: any) {
        // If quota exceeded, evict the oldest 25% cache items and retry
        try {
          const cacheKeys: { key: string; ts: number }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
              try {
                const item = JSON.parse(localStorage.getItem(k) || '{}');
                cacheKeys.push({ key: k, ts: item.timestamp || 0 });
              } catch {}
            }
          }
          // Sort oldest first
          cacheKeys.sort((a, b) => a.ts - b.ts);
          const evictCount = Math.max(1, Math.floor(cacheKeys.length * 0.25));
          for (let i = 0; i < evictCount; i++) {
            localStorage.removeItem(cacheKeys[i].key);
          }
          // Retry write
          localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
        } catch {}
      }

      // Also mirror to sessionStorage for fast intra-tab compatibility
      try {
        sessionStorage.setItem(`app_cache_${key}`, JSON.stringify(entry));
      } catch {}
    }
  },

  clear(keyOrPrefix?: string): void {
    if (!keyOrPrefix) {
      memoryCache.clear();
      if (typeof window !== 'undefined') {
        try {
          const toRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
              toRemove.push(k);
            }
          }
          toRemove.forEach((k) => localStorage.removeItem(k));

          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith('app_cache_')) {
              sessionStorage.removeItem(k);
            }
          });
        } catch {}
      }
      return;
    }

    // Clear specific key or keys starting with prefix from memory
    for (const k of memoryCache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        memoryCache.delete(k);
      }
    }

    // Clear from localStorage & sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k === `${STORAGE_PREFIX}${keyOrPrefix}` || k.startsWith(`${STORAGE_PREFIX}${keyOrPrefix}`))) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));

        Object.keys(sessionStorage).forEach((k) => {
          if (k === `app_cache_${keyOrPrefix}` || k.startsWith(`app_cache_${keyOrPrefix}`)) {
            sessionStorage.removeItem(k);
          }
        });
      } catch {}
    }
  },
};
