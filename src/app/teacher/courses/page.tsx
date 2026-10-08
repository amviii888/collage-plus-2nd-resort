
'use client';

import { useUser } from '@/firebase';
import { ManageCourses } from '@/components/ManageCourses';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherCoursesPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading || !user) {
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
    
    // We can assume the user is a teacher here because of route guards or component logic
    return <ManageCourses teacherId={user.uid} teacher={{id: user.uid} as any} />;
}
