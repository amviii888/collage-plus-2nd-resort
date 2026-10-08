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
  ttlMs: number = 300_000 // 5 minutes default cache TTL
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
    const cachedItem = AppCache.get<WithId<T>>(cacheKey);

    if (cachedItem) {
      if (isMounted) {
        setData(cachedItem);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchDoc = async (isRetry = false) => {
      try {
        if (!isMounted) return;
        const docSnapshot = await getDoc(memoizedDocRef);

        if (isMounted) {
            if (docSnapshot.exists()) {
                const docData = { ...(docSnapshot.data() as T), id: docSnapshot.id };
                AppCache.set(cacheKey, docData, ttlMs);
                setData(docData);
                setIsLoading(false);
            } else if (!isRetry) {
                // If the doc doesn't exist on the first try, wait and retry once.
                setTimeout(() => fetchDoc(true), 1500);
            } else {
                // If it still doesn't exist on retry, then it's not found.
                setData(null);
                setIsLoading(false);
            }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
          console.error("useDoc getDoc error:", err);
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
