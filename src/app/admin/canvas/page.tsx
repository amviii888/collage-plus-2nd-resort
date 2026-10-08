'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CanvasRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/analytics');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Redirecting to Hub Analytics...</p>
            </div>
        </div>
    );
}
