
'use client';

import { useMemo, memo } from 'react';
import Image from 'next/image';
import { Lock, PlayCircle, Star, Eye, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Course, Teacher } from '@/lib/types';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { getGlowClass } from '@/lib/subjects';
import { useTranslation } from 'react-i18next';

interface CourseCardProps {
  course: Course;
  teacher: Teacher | null;
  progress?: number;
}

const CourseCardComponent = ({ course, teacher, progress }: CourseCardProps) => {
  const { user } = useUser();
  const { t } = useTranslation();
  const firestore = useFirestore();

  const isOwner = user && !user.isAnonymous && user.uid === course.teacherId;

  const accessRef = useMemoFirebase(() => {
    if (!user || !user.isAnonymous) return null;
    return doc(firestore, `students/${user.uid}/courseAccess`, course.id);
  }, [user, course.id, firestore]);

  const { data: courseAccessDoc, isLoading: isAccessLoading } = useDoc(accessRef);

  const hasAccess = useMemo(() => {
    if (isAccessLoading || !user) return false;
    if (isOwner || !course.locked) return true;
    if (courseAccessDoc) {
      if (courseAccessDoc.fullAccess) return true;
      if (courseAccessDoc.unlockedUnitIds && courseAccessDoc.unlockedUnitIds.length > 0) return true;
      const limit = courseAccessDoc.viewLimit ?? 0;
      if (limit === 0) return true;
      return (courseAccessDoc.viewCount ?? 0) < limit;
    }
    return false;
  }, [user, isOwner, course.locked, courseAccessDoc, isAccessLoading]);

  const isLockedForUser = course.locked && !hasAccess;
  const isCompleted = progress !== undefined && progress >= 95;
  const primarySubject = course.subjects?.[0];

  return (
    <Link href={`/courses/${course.teacherId}/${course.id}`} className="block group h-full">
      <Card
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-zinc-800 bg-white dark:bg-[#0e172a] shadow-md hover:shadow-xl dark:shadow-none hover:border-blue-500 dark:hover:border-blue-500/60 transition-all duration-300",
          primarySubject && `hover:${getGlowClass(primarySubject)}`
        )}
      >
        <CardHeader className="relative p-0 border-b border-slate-200 dark:border-zinc-800">
          <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              width={600}
              height={400}
              className={cn("h-full w-full object-cover transition-transform duration-300 group-hover:scale-105", isCompleted && "grayscale")}
            />
          </div>
          {isCompleted && (
            <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {isLockedForUser && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                <Lock className="h-4 w-4 text-white" />
              </div>
            )}
            {course.averageRating && course.averageRating > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white border border-white/20 backdrop-blur-sm">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>{course.averageRating.toFixed(1)}</span>
                {course.ratingCount && course.ratingCount > 0 && (
                  <span className="text-zinc-300 font-normal">({course.ratingCount})</span>
                )}
              </div>
            )}
          </div>
          <div className="absolute bottom-3 left-0 right-0 px-4 z-10">
            {teacher && (
              <div className="inline-flex items-center gap-2 transition-transform duration-200 group-hover:scale-105">
                <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
                  <AvatarImage src={teacher.profilePictureUrl} />
                  <AvatarFallback className="bg-blue-600 text-white text-[10px] font-bold">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-bold text-white drop-shadow-md">{teacher.name}</span>
              </div>
            )}
          </div>
          {progress !== undefined && progress > 0 && (
            <Progress value={progress} className="absolute bottom-0 h-1.5 w-full rounded-none bg-slate-200 dark:bg-zinc-700" />
          )}
        </CardHeader>
        <CardContent className="flex flex-col p-4 flex-grow bg-white dark:bg-[#0e172a]">
          <div className='space-y-1 flex-grow'>
            <CardTitle className="line-clamp-2 text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {t(course.title)}
            </CardTitle>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 p-4 pt-1 bg-white dark:bg-[#0e172a] border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {course.grades?.slice(0, 2).map(grade => (
                  <Badge key={grade} variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300">
                    {t(grade)}
                  </Badge>
                ))}
              </div>
              {primarySubject && (
                <Badge variant="secondary" className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                  {t(primarySubject)}
                </Badge>
              )}
            </div>
            <div className="w-full text-center py-2 font-bold text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all group-hover:shadow-md group-hover:scale-[1.02]">
                {t('courseCard.watchNow')}
            </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export const CourseCard = memo(CourseCardComponent);

    