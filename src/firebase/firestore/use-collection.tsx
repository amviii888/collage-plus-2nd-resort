'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  getDocs,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { AppCache } from '@/lib/cache';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | null;
}

function getQueryCacheKey(queryOrRef: any): string {
  if (!queryOrRef) return '';
  if (queryOrRef.path) return `coll_${queryOrRef.path}`;
  if (queryOrRef._query) {
    try {
      const path = queryOrRef._query.path?.toString() || '';
      const filters = JSON.stringify(queryOrRef._query.filters || []);
      const limit = queryOrRef._query.limit || '';
      return `query_${path}_${filters}_${limit}`;
    } catch {
      return 'query_custom';
    }
  }
  return 'query_generic';
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null,
    ttlMs: number = 86_400_000 // 24 hours heavy persistent cache TTL
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!memoizedTargetRefOrQuery) {
        if (isMounted) {
            setData(null);
            setIsLoading(false);
        }
        return;
    }

    const cacheKey = getQueryCacheKey(memoizedTargetRefOrQuery);
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const cachedData = AppCache.get<ResultItemType[]>(cacheKey, { allowStale: isOffline });

    if (cachedData) {
      if (isMounted) {
        setData(cachedData);
        setIsLoading(false);
      }
      // We already have cached data; avoid redundant network reads unless explicitly stale
      if (isOffline) {
        return;
      }
    }

    if (!cachedData) {
      if (isMounted) setIsLoading(true);
    }

    // Skip network call if offline and we already have cached data
    if (isOffline && cachedData) {
      return;
    }

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore timeout')), 3500)
    );

    Promise.race([
      getDocs(memoizedTargetRefOrQuery),
      timeoutPromise
    ])
        .then((querySnapshot: any) => {
            if (!isMounted) return;
            const results: ResultItemType[] = [];
            querySnapshot.forEach((doc: any) => {
                results.push({ ...(doc.data() as T), id: doc.id });
            });
            AppCache.set(cacheKey, results, ttlMs);
            setData(results);
            setIsLoading(false);
            setError(null);
        })
        .catch((err: FirestoreError) => {
            if (!isMounted) return;
            const staleFallback = AppCache.get<ResultItemType[]>(cacheKey, { allowStale: true });
            if (staleFallback) {
              setData(staleFallback);
              setError(null);
            } else {
              setError(err);
              setData([]);
            }
            setIsLoading(false);
            console.warn("useCollection getDocs offline/network/timeout note:", err?.message || err);
        });

    return () => {
      isMounted = false;
    };
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedTargetRefOrQuery]); // Re-run if the query object itself changes.

  return { data, isLoading, error };
}
