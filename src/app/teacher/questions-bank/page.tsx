'use client';

import { ManageQuestionsBank } from '@/components/teacher/ManageQuestionsBank';
import { useUser } from '@/firebase';
import { useLocalData } from '@/context/LocalDataContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function QuestionsBankPage() {
  const { user, isUserLoading } = useUser();
  const { teacherId } = useLocalData();
  const effectiveTeacherId = (user && !user.isAnonymous ? user.uid : null) || teacherId || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null);

  if (isUserLoading && !effectiveTeacherId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const currentId = effectiveTeacherId || 'default_teacher';
  return <ManageQuestionsBank teacherId={currentId} />;
}
