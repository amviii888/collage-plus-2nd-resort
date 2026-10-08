
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminAccessGateway() {
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        // This page is a gateway. The actual security check happens in the layout.
        // If a user reaches this page, they are authorized. Redirect them to the main dashboard.
        router.replace('/admin/dashboard');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center text-center">
            <div>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <h1 className="mt-4 text-xl font-bold">{t('Redirecting to Admin Panel...')}</h1>
            </div>
        </div>
    );
}
