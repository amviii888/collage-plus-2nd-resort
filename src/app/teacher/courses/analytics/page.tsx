'use client';

import { useUser } from '@/firebase';
import { CourseAnalytics } from '@/components/teacher/CourseAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CourseAnalyticsContent() {
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || undefined;

  if (isUserLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <CourseAnalytics teacherId={user.uid} initialCourseId={initialCourseId} />;
}

export default function TeacherCourseAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <CourseAnalyticsContent />
    </Suspense>
  );
}
