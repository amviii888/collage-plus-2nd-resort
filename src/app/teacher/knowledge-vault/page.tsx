
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PlaceholderPage() {
    const { t } = useTranslation();
    return (
        <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
                    <CardTitle className="mt-4">{t('Under Construction')}</CardTitle>
                    <CardDescription>
                        {t('This feature is currently under development. Please check back later.')}
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
