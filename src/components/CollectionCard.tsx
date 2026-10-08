'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseCollection } from '@/lib/types';
import { BookOpen, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface CollectionCardProps {
  collection: CourseCollection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/collections/${collection.teacherId}/${collection.id}`} className="block group h-full">
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl shadow-lg transition-all duration-300 liquid-glass hover:shadow-primary/20 hover:border-primary/50">
        <CardHeader className="relative p-0">
          <div className="aspect-video w-full overflow-hidden">
            <Image
              src={collection.thumbnailUrl}
              alt={collection.title}
              width={600}
              height={400}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                <Lock className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col p-4 flex-grow">
          <div className='space-y-1 flex-grow'>
            <CardTitle className="line-clamp-2 text-base font-bold text-foreground">{t(collection.title)}</CardTitle>
            {collection.description && <p className="text-xs text-muted-foreground line-clamp-2">{collection.description}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 pt-2">
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{collection.courseIds.length} {collection.courseIds.length === 1 ? t('Course') : t('Courses')}</span>
            </div>
            <div className="w-full text-center py-2 font-semibold text-sm rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105 group-hover:shadow-lg max-w-[120px]">
                {t('View Bundle')}
            </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
