
'use client';

import { useMemo, memo } from 'react';
import Image from 'next/image';
import { Lock, PlayCircle, Star, Eye, CheckCircle, Layers } from 'lucide-react';
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

  const activeStudentId = typeof window !== 'undefined' ? (localStorage.getItem('viewingStudentId') || user?.uid) : user?.uid;

  const accessRef = useMemoFirebase(() => {
    const targetUid = activeStudentId || user?.uid;
    if (!firestore || !targetUid) return null;
    return doc(firestore, `students/${targetUid}/courseAccess`, course.id);
  }, [firestore, user?.uid, activeStudentId, course.id]);

  const { data: courseAccessDoc, isLoading: isAccessLoading } = useDoc(accessRef);

  // Also check local cache for immediate feedback
  const localAccess = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`student_course_access_${course.id}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, [course.id]);

  const effectiveAccess = courseAccessDoc || localAccess;

  const hasAccess = useMemo(() => {
    if (isOwner || !course.locked) return true;
    if (effectiveAccess) {
      if (effectiveAccess.fullAccess) return true;
      if (effectiveAccess.unlockedUnitIds && effectiveAccess.unlockedUnitIds.length > 0) return true;
      const limit = effectiveAccess.viewLimit ?? 3;
      if (limit === 0) return true;
      return (effectiveAccess.viewCount ?? 0) < limit;
    }
    return false;
  }, [isOwner, course.locked, effectiveAccess]);

  const hasOnlyUnitAccess = useMemo(() => {
    if (isOwner || !course.locked) return false;
    return !!(effectiveAccess && !effectiveAccess.fullAccess && effectiveAccess.unlockedUnitIds && effectiveAccess.unlockedUnitIds.length > 0);
  }, [isOwner, course.locked, effectiveAccess]);

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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Top-Left: Price Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            {course.price && course.price > 0 ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-black text-[11px] shadow-lg shadow-black/50 px-2.5 py-0.5 rounded-lg border border-emerald-400">
                {course.price} EGP
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] backdrop-blur-md px-2 py-0.5 rounded-lg">
                مجاني Free
              </Badge>
            )}
          </div>

          {/* Top-Right: Lock Status & Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {course.locked ? (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-[10px] flex items-center gap-1 shadow-md px-2 py-0.5 rounded-lg">
                <Lock className="w-3 h-3" />
                <span>
                  {course.lockMode === 'requests_only' 
                    ? 'طلبات فقط' 
                    : course.lockMode === 'codes_only' 
                    ? 'كود فقط' 
                    : 'محمي'}
                </span>
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-semibold text-[10px] backdrop-blur-sm px-2 py-0.5 rounded-lg">
                مفتوح
              </Badge>
            )}

            {course.averageRating && course.averageRating > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-bold text-white border border-white/20 backdrop-blur-sm">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>{course.averageRating.toFixed(1)}</span>
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
            {/* Action Button: Watch Now or Unlock & Buy */}
            {isOwner ? (
              <div className="w-full text-center py-2.5 font-bold text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>معاينة وإدارة الكورس</span>
              </div>
            ) : isLockedForUser ? (
              <div className="w-full text-center py-2.5 font-bold text-xs rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {course.price && course.price > 0 
                    ? `شراء أو طلب فتح الكورس (${course.price} EGP)` 
                    : 'طلب فتح الكورس (Request Access)'}
                </span>
              </div>
            ) : hasOnlyUnitAccess ? (
              <div className="w-full text-center py-2.5 font-bold text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 group-hover:scale-[1.01]">
                <Layers className="w-3.5 h-3.5" />
                <span>مشاهدة الوحدات المفتوحة (View Unlocked Units)</span>
              </div>
            ) : (
              <div className="w-full text-center py-2.5 font-bold text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 group-hover:scale-[1.01]">
                <PlayCircle className="w-3.5 h-3.5" />
                <span>مشاهدة المحاضرات الآن (Watch Now)</span>
              </div>
            )}
        </CardFooter>
      </Card>
    </Link>
  );
}

export const CourseCard = memo(CourseCardComponent);

    