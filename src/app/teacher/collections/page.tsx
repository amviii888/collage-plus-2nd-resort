
'use client';

import { useUser } from '@/firebase';
import { ManageCollections } from '@/components/teacher/ManageCollections';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherCollectionsPage() {
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
    
    return <ManageCollections teacherId={user.uid} />;
}
