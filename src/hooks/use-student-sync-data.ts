'use client';

import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { doc, onSnapshot, type DocumentData, type FirestoreError } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { StudentSyncData } from '@/lib/types';

export function useStudentSyncData(studentBarcodeId: string | null | undefined) {
    const firestore = useFirestore();
    const { user } = useUser();
    const [syncData, setSyncData] = useState<StudentSyncData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | null>(null);

    const syncDataRef = useMemoFirebase(() => {
        if (!firestore || !studentBarcodeId || !user) return null;
        return doc(firestore, 'studentSyncData', studentBarcodeId);
    }, [firestore, studentBarcodeId, user]);

    useEffect(() => {
        if (!syncDataRef) {
            setSyncData(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribe = onSnapshot(
            syncDataRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setSyncData(snapshot.data() as StudentSyncData);
                } else {
                    setSyncData(null);
                }
                setIsLoading(false);
                setError(null);
            },
            (err: FirestoreError) => {
                setError(err);
                setIsLoading(false);
                console.error("useStudentSyncData onSnapshot error:", err);
            }
        );

        return () => unsubscribe();
    }, [syncDataRef]);

    return { syncData, isLoading, error };
}
