'use client';

import { ManageHomework } from '@/components/teacher/ManageHomework';
import { useUser } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomeworkPage() {
    const { user, isUserLoading } = useUser();
    const { teacherId } = useLocalData();
    const effectiveTeacherId = (user && !user.isAnonymous ? user.uid : null) || teacherId || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null);

    if (isUserLoading && !effectiveTeacherId) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const currentId = effectiveTeacherId || 'default_teacher';
    return <ManageHomework teacherId={currentId} />;
}
