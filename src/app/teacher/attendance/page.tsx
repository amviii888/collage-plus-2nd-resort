
'use client';
import { TeacherAttendance } from '@/components/teacher/TeacherAttendance';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherAttendancePage() {
    const { user, isUserLoading } = useUser();
    
    // The TeacherFeatureLayout already handles redirecting,
    // but we show a skeleton here for a better loading state.
    if (isUserLoading || !user) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    // isAssistant logic can be handled inside the layout or passed down if needed.
    // For now, we assume the user is the teacher.
    return <TeacherAttendance teacherId={user.uid} />;
}
