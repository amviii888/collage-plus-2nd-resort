
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Teacher } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopTeacherCardProps {
  teacher: Teacher;
  rank: number;
}

const rankClasses = {
  1: {
    medal: 'from-amber-400 to-yellow-500 text-white',
    border: 'border-amber-400/50',
    shadow: 'shadow-amber-400/20'
  },
  2: {
    medal: 'from-slate-300 to-gray-400 text-white',
    border: 'border-slate-400/50',
    shadow: 'shadow-slate-400/20'
  },
  3: {
    medal: 'from-yellow-600 to-amber-700 text-white',
    border: 'border-yellow-600/50',
    shadow: 'shadow-yellow-700/20'
  },
};

const AnimatedMedal = ({ rank }: { rank: number }) => {
    const rankConfig = rankClasses[rank as keyof typeof rankClasses] || { medal: 'bg-muted text-muted-foreground' };
    return (
        <div className={cn(
            "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br shimmering-medal overflow-hidden shadow-lg",
            rankConfig.medal
        )}>
            <Award className="w-5 h-5" />
            <span className="absolute text-[9px] font-black">{rank}</span>
        </div>
    )
}

export function TopTeacherCard({ teacher, rank }: TopTeacherCardProps) {
  const rankConfig = rankClasses[rank as keyof typeof rankClasses] || { border: 'border-muted', shadow: 'shadow-none' };
  
  return (
    <div className="p-1 animate-in fade-in-0 slide-in-from-bottom-4">
      <Link href={`/teacher?id=${teacher.id}`} className="block group">
        <Card className={cn(
          "relative overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-card border",
          rankConfig.border,
          rankConfig.shadow
        )}>
          <div className="relative h-20 bg-muted group-hover:scale-105 transition-transform duration-300">
            {teacher.heroImageUrl && (
              <Image
                src={teacher.heroImageUrl}
                alt={`${teacher.name}'s hero image`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
              />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <AnimatedMedal rank={rank} />
          </div>
          <CardContent className="relative flex flex-col items-center p-3 pt-8">
             <Avatar className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 border-4 border-card shadow-lg">
                <AvatarImage src={teacher.profilePictureUrl} />
                <AvatarFallback className="text-lg">{teacher.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="w-full text-center">
                <h3 className="font-bold text-sm line-clamp-1">{teacher.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{teacher.subjects?.join(', ')}</p>
                 <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-xs">{teacher.averageRating?.toFixed(1) || 'New'}</span>
                    <span className="text-[10px] text-muted-foreground">({teacher.ratingCount || 0})</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
