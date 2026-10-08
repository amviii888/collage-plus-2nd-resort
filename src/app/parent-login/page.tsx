'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function ParentLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
        <Skeleton className="h-96 w-full max-w-sm" />
    </div>
  );
}
