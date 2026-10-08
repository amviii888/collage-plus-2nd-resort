
'use client';

import { useFirestore, useMemoFirebase, useDoc } from '..';
import { doc } from 'firebase/firestore';
import type { Student } from '@/lib/types';

export function useStudent(studentId: string | null | undefined) {
    const firestore = useFirestore();

    const studentRef = useMemoFirebase(() => {
        if (!firestore || !studentId) return null;
        return doc(firestore, 'students', studentId);
    }, [firestore, studentId]);

    const { data: student, isLoading, error } = useDoc<Student>(studentRef);

    return { student, isLoading, error };
}
