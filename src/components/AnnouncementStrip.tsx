'use client';

import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Announcement } from '@/lib/types';

interface AnnouncementStripProps {
  announcements: Announcement[];
  isLoading: boolean;
}

export function AnnouncementStrip({ announcements, isLoading }: AnnouncementStripProps) {
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<Set<string>>(new Set(announcements?.map(a => a.id) || []));

  const handleDismiss = (id: string) => {
    setVisibleAnnouncements(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
    });
  }

  if (isLoading) {
    return (
      <div className="px-4 mb-4 space-y-2">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const announcementsToShow = announcements?.filter(a => visibleAnnouncements.has(a.id)) || [];

  if (announcementsToShow.length === 0) {
    return null;
  }

  return (
    <div className="px-4 mb-4 space-y-2">
      {announcementsToShow.map(announcement => (
        <Alert key={announcement.id} className="relative bg-accent/50 border-accent text-accent-foreground shadow-md">
          <Megaphone className="h-4 w-4 !text-accent-foreground" />
          <AlertTitle className="font-bold">Heads up!</AlertTitle>
          <AlertDescription>
            {announcement.text}
          </AlertDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => handleDismiss(announcement.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
