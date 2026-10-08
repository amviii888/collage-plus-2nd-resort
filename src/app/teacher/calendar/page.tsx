
'use client';

import { useUser } from '@/firebase';
import { ManageCalendar } from '@/components/ManageCalendar';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherCalendarPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading || !user) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <Skeleton className="lg:col-span-1 h-96" />
                <Skeleton className="lg:col-span-2 h-96" />
            </div>
        );
    }
    
    return <ManageCalendar teacherId={user.uid} />;
}
