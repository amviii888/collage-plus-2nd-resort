
'use client';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LocalDataProvider } from '@/context/LocalDataContext';

export default function TeacherFeatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicTeacherProfile = pathname === '/teacher';

  const hasTeacherSession = typeof window !== 'undefined' && (
    (user && !user.isAnonymous) ||
    !!localStorage.getItem('teacherId') ||
    !!localStorage.getItem('teacher_session') ||
    !!localStorage.getItem('teacher_accounts')
  );

  const effectiveTeacherId = (user && !user.isAnonymous ? user.uid : null) || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null) || 'guest_teacher';

  useEffect(() => {
    if (isPublicTeacherProfile || isUserLoading) return;

    const currentTeacherSession = (user && !user.isAnonymous) ||
      (typeof window !== 'undefined' && (
        !!localStorage.getItem('teacherId') ||
        !!localStorage.getItem('teacher_session') ||
        !!localStorage.getItem('teacher_accounts')
      ));

    if (!currentTeacherSession) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router, isPublicTeacherProfile]);

  if (isPublicTeacherProfile) {
    return (
      <LocalDataProvider teacherId={effectiveTeacherId}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {children}
        </div>
      </LocalDataProvider>
    );
  }

  if (isUserLoading && !hasTeacherSession) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <LocalDataProvider teacherId={effectiveTeacherId}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
          {children}
      </div>
    </LocalDataProvider>
  )
}
