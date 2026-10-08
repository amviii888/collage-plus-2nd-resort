'use client';

import { ManageQuestionsBank } from '@/components/teacher/ManageQuestionsBank';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function QuestionsBankPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return <ManageQuestionsBank teacherId={user.uid} />;
}
