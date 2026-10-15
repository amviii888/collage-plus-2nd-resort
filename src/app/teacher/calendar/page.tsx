
'use client';

import { useUser } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { ManageCalendar } from '@/components/ManageCalendar';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherCalendarPage() {
    const { user, isUserLoading } = useUser();
    const { teacherId } = useLocalData();
    const effectiveTeacherId = (user && !user.isAnonymous ? user.uid : null) || teacherId || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null);

    if (isUserLoading && !effectiveTeacherId) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <Skeleton className="lg:col-span-1 h-96" />
                <Skeleton className="lg:col-span-2 h-96" />
            </div>
        );
    }
    
    const currentId = effectiveTeacherId || 'default_teacher';
    return <ManageCalendar teacherId={currentId} />;
}
