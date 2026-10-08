'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlansRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/offers');
  }, [router]);
  return null;
}
