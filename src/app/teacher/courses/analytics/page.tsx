'use client';
import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { CourseAnalytics } from '@/components/teacher/CourseAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';

function CourseAnalyticsContent() {
  const { user, isUserLoading } = useUser();
  const { teacherId: contextTeacherId } = useLocalData();
  const searchParams = useSearchParams();
  const queryTeacherId = searchParams.get('id') || searchParams.get('teacherId');
  const initialCourseId = searchParams.get('courseId') || undefined;

  const [effectiveTeacherId, setEffectiveTeacherId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const qId = new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.search).get('teacherId');
      if (qId) return qId;
      if (user && !user.isAnonymous) return user.uid;
      const stored = localStorage.getItem('teacherId');
      if (stored) return stored;
      try {
        const accs = JSON.parse(localStorage.getItem('teacher_accounts') || '[]');
        if (accs.length > 0 && accs[0]?.id) return accs[0].id;
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    if (queryTeacherId) {
      setEffectiveTeacherId(queryTeacherId);
    } else if (contextTeacherId) {
      setEffectiveTeacherId(contextTeacherId);
    } else if (user && !user.isAnonymous) {
      setEffectiveTeacherId(user.uid);
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('teacherId');
      if (stored) {
        setEffectiveTeacherId(stored);
      } else {
        try {
          const accs = JSON.parse(localStorage.getItem('teacher_accounts') || '[]');
          if (accs.length > 0 && accs[0]?.id) {
            setEffectiveTeacherId(accs[0].id);
          }
        } catch (e) {}
      }
    }
  }, [queryTeacherId, contextTeacherId, user]);

  if (isUserLoading && !effectiveTeacherId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentId = effectiveTeacherId || user?.uid || 'default_teacher';
  return <CourseAnalytics teacherId={currentId} initialCourseId={initialCourseId} />;
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
