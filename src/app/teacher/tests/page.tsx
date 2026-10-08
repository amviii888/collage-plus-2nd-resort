'use client';
import { ManageTests } from '@/components/teacher/ManageTests';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function TestsPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading || !user) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return <ManageTests teacherId={user.uid} />;
}
