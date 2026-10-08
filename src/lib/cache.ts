'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// In-memory cache storage
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Global cache utility for Firestore reads and expensive computations.
 * Supports multi-layer: In-Memory -> SessionStorage -> Fresh Fetch.
 */
export const AppCache = {
  get<T>(key: string): T | null {
    if (!key) return null;

    // 1. Check In-Memory Cache
    const memItem = memoryCache.get(key);
    if (memItem) {
      if (Date.now() - memItem.timestamp < memItem.ttlMs) {
        return memItem.data as T;
      } else {
        memoryCache.delete(key);
      }
    }

    // 2. Check SessionStorage Cache (for page refreshes/navigation)
    if (typeof window !== 'undefined') {
      try {
        const sessionVal = sessionStorage.getItem(`app_cache_${key}`);
        if (sessionVal) {
          const parsed: CacheEntry<T> = JSON.parse(sessionVal);
          if (Date.now() - parsed.timestamp < parsed.ttlMs) {
            // Restore to memory cache for fast access
            memoryCache.set(key, parsed);
            return parsed.data;
          } else {
            sessionStorage.removeItem(`app_cache_${key}`);
          }
        }
      } catch (err) {
        // Silently fail if storage is full or restricted
      }
    }

    return null;
  },

  set<T>(key: string, data: T, ttlMs: number = 300_000): void {
    if (!key) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    // Save to memory
    memoryCache.set(key, entry);

    // Save to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`app_cache_${key}`, JSON.stringify(entry));
      } catch (err) {
        // Handle storage quota exceeded gracefully
      }
    }
  },

  clear(keyOrPrefix?: string): void {
    if (!keyOrPrefix) {
      memoryCache.clear();
      if (typeof window !== 'undefined') {
        try {
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith('app_cache_')) {
              sessionStorage.removeItem(k);
            }
          });
        } catch (err) {}
      }
      return;
    }

    // Clear specific key or keys starting with prefix
    for (const k of memoryCache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        memoryCache.delete(k);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k === `app_cache_${keyOrPrefix}` || k.startsWith(`app_cache_${keyOrPrefix}`)) {
            sessionStorage.removeItem(k);
          }
        });
      } catch (err) {}
    }
  },
};
