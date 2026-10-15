'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  getDoc,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { AppCache } from '@/lib/cache';

type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | null;
}

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null,
  ttlMs: number = 86_400_000 // 24 hours heavy persistent cache TTL
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    let isMounted = true; 

    if (!memoizedDocRef) {
      if (isMounted) {
        setData(null);
        setIsLoading(false);
      }
      return;
    }

    const cacheKey = `doc_${memoizedDocRef.path}`;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Check persistent cache (allowing stale when offline)
    const cachedItem = AppCache.get<WithId<T>>(cacheKey, { allowStale: isOffline });

    if (cachedItem) {
      if (isMounted) {
        setData(cachedItem);
        setIsLoading(false);
      }
      // If we are offline or cache is fresh, do not consume remote read quotas
      if (isOffline) {
        return;
      }
    }

    // Only show loading if we don't have any cached version to display
    if (!cachedItem) {
      setIsLoading(true);
    }
    setError(null);

    const fetchDoc = async (isRetry = false) => {
      try {
        if (!isMounted) return;
        
        // Skip network fetch if offline and we already have cached data
        if (typeof navigator !== 'undefined' && !navigator.onLine && cachedItem) {
          return;
        }

        const docSnapshot = await getDoc(memoizedDocRef);

        if (isMounted) {
            if (docSnapshot.exists()) {
                const docData = { ...(docSnapshot.data() as T), id: docSnapshot.id };
                AppCache.set(cacheKey, docData, ttlMs);
                setData(docData);
                setIsLoading(false);
            } else {
                const staleFallback = AppCache.get<WithId<T>>(cacheKey, { allowStale: true });
                if (staleFallback) {
                  setData(staleFallback);
                } else {
                  setData(null);
                }
                setIsLoading(false);
            }
        }
      } catch (err: any) {
        if (isMounted) {
          // If network fetch fails (e.g. offline, connection drop), recover from persistent cache
          const staleFallback = AppCache.get<WithId<T>>(cacheKey, { allowStale: true });
          if (staleFallback) {
            setData(staleFallback);
            setError(null);
          } else {
            setError(err);
          }
          setIsLoading(false);
          console.warn("useDoc getDoc offline/network note:", err?.message || err);
        }
      }
    };
    
    fetchDoc();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedDocRef?.path]); // Depend on path to re-fetch if ref changes

  return { data, isLoading, error };
}
