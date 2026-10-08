
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

  useEffect(() => {
    if (!isPublicTeacherProfile && !isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router, isPublicTeacherProfile]);

  if (isPublicTeacherProfile) {
    return (
      <LocalDataProvider teacherId={user?.uid || 'guest'}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {children}
        </div>
      </LocalDataProvider>
    );
  }

  if (isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <LocalDataProvider teacherId={user.uid}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
          {children}
      </div>
    </LocalDataProvider>
  )
}
