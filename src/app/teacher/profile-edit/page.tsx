
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TeacherProfileForm } from '@/components/TeacherProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import type { Teacher } from '@/lib/types';

export default function TeacherProfileEditPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'teachers', user.uid);
    }, [firestore, user]);
    
    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    if (isUserLoading || isTeacherLoading || !teacher) {
        return <Skeleton className="h-96 w-full" />;
    }
    
    return <TeacherProfileForm teacher={teacher} />;
}
