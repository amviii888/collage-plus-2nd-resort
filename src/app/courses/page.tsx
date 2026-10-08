'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function CoursesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/discover');
  }, [router]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-96 w-full rounded-2xl liquid-glass" />)}
        </div>
    </div>
  )
}
