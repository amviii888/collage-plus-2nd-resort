
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { doc } from 'firebase/firestore';
import { ManageShareCodes } from '@/components/ManageShareCodes';
import { Skeleton } from '@/components/ui/skeleton';
import type { Teacher } from '@/lib/types';

export default function TeacherShareCodesPage() {
    const { user, isUserLoading } = useUser();
    const { teacherId } = useLocalData();
    const firestore = useFirestore();
    const effectiveTeacherId = (user && !user.isAnonymous ? user.uid : null) || teacherId || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null);

    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !effectiveTeacherId) return null;
        return doc(firestore, 'teachers', effectiveTeacherId);
    }, [firestore, effectiveTeacherId]);
    
    const { data: cloudTeacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    if (isUserLoading && !effectiveTeacherId) {
        return <Skeleton className="h-96 w-full" />;
    }

    const currentId = effectiveTeacherId || 'default_teacher';
    const teacher: Teacher = cloudTeacher || {
        id: currentId,
        name: user?.displayName || 'الأستاذ',
        email: user?.email || '',
        subjects: ['المقررات الجامعية'],
        gradesTaught: ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
        approved: true,
        createdAt: new Date().toISOString() as any,
    };
    
    return <ManageShareCodes teacher={teacher} />;
}
