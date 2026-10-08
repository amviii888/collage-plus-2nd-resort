'use client';
import { ManageHomework } from '@/components/teacher/ManageHomework';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomeworkPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading || !user) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return <ManageHomework teacherId={user.uid} />;
}
