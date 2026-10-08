'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { TeacherAnalyticsDashboard } from '@/components/teacher/TeacherAnalyticsDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherAnalyticsPage() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const { localPlans } = useLocalData();

  const planOptions = useMemo(() => {
    return localPlans.map(p => ({ value: p.id, label: p.name }));
  }, [localPlans]);

  if (isUserLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('My Analytics')}</h1>
        <p className="text-muted-foreground">{t('Analyze student performance, enrollment metrics, and revenues.')}</p>
      </div>
      
      <TeacherAnalyticsDashboard teacherId={user.uid} planOptions={planOptions} />
    </div>
  );
}
