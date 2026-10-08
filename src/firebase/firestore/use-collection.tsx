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
    ttlMs: number = 300_000 // 5 minutes default cache TTL
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
        setData(null);
        setIsLoading(false);
        return;
    }

    const cacheKey = getQueryCacheKey(memoizedTargetRefOrQuery);
    const cachedData = AppCache.get<ResultItemType[]>(cacheKey);

    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      // We already have cached data; avoid redundant network reads unless explicitly stale
      return;
    }

    setIsLoading(true);

    getDocs(memoizedTargetRefOrQuery)
        .then((querySnapshot: QuerySnapshot) => {
            const results: ResultItemType[] = [];
            querySnapshot.forEach((doc) => {
                results.push({ ...(doc.data() as T), id: doc.id });
            });
            AppCache.set(cacheKey, results, ttlMs);
            setData(results);
            setIsLoading(false);
            setError(null);
        })
        .catch((err: FirestoreError) => {
            setError(err);
            setIsLoading(false);
            console.error("useCollection getDocs error:", err);
        });
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedTargetRefOrQuery]); // Re-run if the query object itself changes.

  return { data, isLoading, error };
}
