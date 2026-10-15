
'use client';

import { useUser } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { ManageCourses } from '@/components/ManageCourses';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherCoursesPage() {
    const { user, isUserLoading } = useUser();
    const { teacherId } = useLocalData();
    const effectiveTeacherId = (user && !user.isAnonymous ? user.uid : null) || teacherId || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null);

    if (isUserLoading && !effectiveTeacherId) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-9 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }
    
    const currentId = effectiveTeacherId || 'default_teacher';
    return <ManageCourses teacherId={currentId} teacher={{id: currentId} as any} />;
}
