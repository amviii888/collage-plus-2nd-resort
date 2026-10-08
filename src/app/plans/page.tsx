
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Offer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { Percent, WifiOff, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CountdownTimer } from '@/components/admin/education/CountdownTimer';
import { isAfter } from 'date-fns';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { motion } from 'motion/react';

export default function PublicOffersPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();

  const offersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `hubs/main-hub/offers`);
  }, [firestore]);
  const { data: offers, isLoading: offersLoading } = useCollection<Offer>(offersQuery);

  const activeOffers = useMemo(() => {
      if (!offers) return [];
      return offers.filter(offer => isAfter(new Date(offer.endDate), new Date()));
  }, [offers]);

  const isLoading = offersLoading;

  if (!isOnline && !isLoading && !offers) {
      return (
        <div className="container mx-auto p-4 space-y-8 flex items-center justify-center h-[80vh]">
          <div className="text-center py-16 rounded-3xl bg-muted/20 border border-dashed w-full max-w-md">
            <WifiOff className="w-24 h-24 text-muted-foreground/50 mx-auto" />
            <h3 className="text-lg font-bold mt-4">You&apos;re Offline</h3>
            <p className="text-sm text-muted-foreground mt-2">This page requires an internet connection. Please check back later.</p>
          </div>
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8 mb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Percent className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{t('plans.pageTitle') || 'Exclusive Offers'}</h1>
        <p className="text-muted-foreground mt-4 max-w-lg mx-auto text-lg">{t("plans.pageDesc") || 'Unlock special discounts and limited-time promotions for your education journey.'}</p>
      </motion.div>
      
       {!isOnline && <div className="text-center p-3 bg-destructive/10 text-destructive font-medium rounded-xl">You are offline. Showing cached content.</div>}

      {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
      ) : activeOffers.length > 0 ? (
          <div className="space-y-6">
               <h2 className="text-2xl font-bold flex items-center gap-2">
                   <Sparkles className="text-amber-500 w-6 h-6"/> {t('plans.offersTitle') || 'Active Offers'}
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeOffers.map((offer, index) => (
                        <motion.div key={offer.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
                            <Card className="glass-card relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                <CardHeader className="relative z-10 text-center pb-2">
                                    <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">{t(offer.title)}</CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10 flex flex-col items-center justify-center space-y-4">
                                    <div className="px-4 py-2 bg-background/80 backdrop-blur-sm rounded-full shadow-sm border border-border/50">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 text-center">{t('plans.offerEndsIn') || 'Offer Ends In'}</p>
                                        <div className="text-amber-600 dark:text-amber-400 font-mono font-bold text-lg">
                                            <CountdownTimer endDate={offer.endDate} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
               </div>
          </div>
      ) : (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
            <Percent className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">No Active Offers</p>
            <p className="text-muted-foreground mt-1">Check back later for new promotions and discounts.</p>
          </div>
      )}
    </div>
  );
}
