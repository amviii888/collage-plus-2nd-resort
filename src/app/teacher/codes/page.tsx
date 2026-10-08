
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ManageShareCodes } from '@/components/ManageShareCodes';
import { Skeleton } from '@/components/ui/skeleton';
import type { Teacher } from '@/lib/types';

export default function TeacherShareCodesPage() {
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
    
    return <ManageShareCodes teacher={teacher} />;
}
