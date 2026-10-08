'use client';

import { CalendarView } from '@/components/CalendarView';
import type { Grade } from '@/lib/types';
import { useStudent, useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarPage() {
    const { user, isUserLoading } = useUser();
    const { student } = useStudent(user?.uid);
    
    if (isUserLoading) {
        return <div className="p-4 pt-4"><Skeleton className="h-[500px] w-full" /></div>
    }

    return (
        <div className="p-4">
            <CalendarView initialGrade={student?.grade || undefined}/>
        </div>
    );
}
