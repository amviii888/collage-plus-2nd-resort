'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseCollection } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { BookOpen, Lock, Unlock, Sparkles, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import type { CourseCollection, CourseCollectionAccess } from '@/lib/types';
import { useMemo } from 'react';

interface CollectionCardProps {
  collection: CourseCollection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { user } = useUser();

  const studentId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('viewingStudentId');
      if (stored) return stored;
    }
    return user?.uid || '';
  }, [user]);

  // Check access in Firestore
  const accessRef = useMemoFirebase(() => {
    if (!firestore || !studentId || !collection.id) return null;
    return doc(firestore, `students/${studentId}/courseCollectionAccess/${collection.id}`);
  }, [firestore, studentId, collection.id]);
  const { data: accessData } = useDoc<CourseCollectionAccess>(accessRef);

  const isUnlocked = useMemo(() => {
    if (collection.locked === false) return true;
    if (accessData) return true;
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(`student_collection_access_${collection.id}`)) return true;
      const firstCourseId = collection.courseIds?.[0];
      if (firstCourseId && localStorage.getItem(`student_course_access_${firstCourseId}`)) return true;
    }
    return false;
  }, [collection, accessData]);

  const customItemsCount = collection.customItems?.length || 0;

  return (
    <Link href={`/collections/${collection.teacherId}/${collection.id}`} className="block group h-full">
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl shadow-lg transition-all duration-300 liquid-glass hover:shadow-primary/20 hover:border-primary/50 bg-card border-border">
        <CardHeader className="relative p-0">
          <div className="aspect-video w-full overflow-hidden">
            <Image
              src={collection.thumbnailUrl || 'https://picsum.photos/seed/bundle/600/400'}
              alt={collection.title}
              width={600}
              height={400}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            {collection.price ? (
              <span className="bg-emerald-500 text-black font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg shadow-sm">
                {collection.price} EGP
              </span>
            ) : <div />}

            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm border shadow-sm",
              isUnlocked 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                : "bg-black/50 text-white border-white/20"
            )}>
              {isUnlocked ? (
                <Unlock className="h-4 w-4 text-emerald-400" />
              ) : (
                <Lock className="h-4 w-4 text-zinc-300" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col p-4 flex-grow">
          <div className='space-y-1.5 flex-grow'>
            <CardTitle className="line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors">
              {collection.title}
            </CardTitle>
            {collection.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {collection.description}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between p-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>
              {collection.courseIds.length} {collection.courseIds.length === 1 ? t('Course') : t('Courses')}
              {customItemsCount > 0 && ` + ${customItemsCount} files`}
            </span>
          </div>

          <div className={cn(
            "text-center py-1.5 px-3 font-bold text-xs rounded-lg transition-transform group-hover:scale-105 shadow-sm",
            isUnlocked 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
              : "bg-primary text-primary-foreground"
          )}>
            {isUnlocked ? 'مفتوح الآن' : 'طلب وصول / كود'}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
