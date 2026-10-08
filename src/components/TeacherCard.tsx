'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Teacher } from '@/lib/types';
import { Star, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface TeacherCardProps {
  teacher: Teacher;
}

const TeacherCardComponent = ({ teacher }: TeacherCardProps) => {

  return (
    <Link href={`/teacher?id=${teacher.id}`} className="block group h-full">
        <Card className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-2xl glass-card transition-all duration-500",
            `hover:shadow-md hover:-translate-y-1 hover:border-primary/50`
        )}>
            <div className={cn(
                "relative w-full overflow-hidden aspect-[2/1] bg-muted/30"
            )}>
                 <Image
                    src={teacher.heroImageUrl || 'https://picsum.photos/seed/' + teacher.id + '/600/400'}
                    alt={`${teacher.name}'s hero image`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    style={{ objectFit: 'cover' }}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            </div>

             <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-foreground bg-background/80 backdrop-blur shadow-sm">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{teacher.averageRating?.toFixed(1) || 'N/A'}</span>
                </div>
                 <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-foreground bg-background/80 backdrop-blur shadow-sm">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>{teacher.viewCount || 0}</span>
                </div>
            </div>
            
            <CardContent className="relative flex flex-grow flex-col items-center p-4 pt-12 text-center bg-background">
                <Avatar className="absolute -top-10 left-1/2 -translate-x-1/2 h-20 w-20 border-4 border-background shadow-md">
                    <AvatarImage src={teacher.profilePictureUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">{teacher.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="w-full min-w-0">
                    <h3 className="font-bold text-lg text-foreground truncate">{teacher.name}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">{teacher.subjects?.join(', ') || 'Various Subjects'}</p>
                </div>
            </CardContent>
        </Card>
    </Link>
  );
}

export const TeacherCard = memo(TeacherCardComponent);
