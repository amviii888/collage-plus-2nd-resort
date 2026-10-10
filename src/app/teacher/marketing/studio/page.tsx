'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, HelpCircle, CalendarRange, CheckCircle, Clock, ExternalLink, Sparkles, ArrowLeft, Mic, Layers, Sliders } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TeacherStudioMarketingPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00 - 13:00');
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's profile details
  const teacherDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'teachers', user.uid);
  }, [firestore, user?.uid]);
  const { data: teacherProfile } = useDoc<any>(teacherDocRef);

  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [isComingSoon, setIsComingSoon] = useState<boolean>(true);

  // Subscribe to studio availability configuration
  const [availability, setAvailability] = useState<{ availableDates: string[]; unavailableDates: string[] }>({
    availableDates: [],
    unavailableDates: [],
  });

  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, 'studioAvailability', 'config');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAvailability({
          availableDates: data.availableDates || [],
          unavailableDates: data.unavailableDates || [],
        });
        setShowPrices(data.showPrices !== undefined ? data.showPrices : true);
        setIsComingSoon(data.isComingSoon !== undefined ? data.isComingSoon : true);
      }
    }, (err) => {
      console.error("Error loading studio availability:", err);
    });
    return () => unsub();
  }, [firestore]);

  // Fetch standard recording offers
  const offersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'recordingOffers');
  }, [firestore, user?.uid]);
  const { data: offers, isLoading: offersLoading } = useCollection<any>(offersQuery);

  // Process availability dates for calendar
  const availableDays = useMemo(() => availability.availableDates.map(d => {
    const parts = d.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }), [availability]);

  const unavailableDays = useMemo(() => availability.unavailableDates.map(d => {
    const parts = d.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }), [availability]);

  // Determine current day eligibility
  const isDateBookable = useMemo(() => {
    if (!selectedDate) return false;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    // If it is explicitly marked unavailable, it's not bookable
    if (availability.unavailableDates.includes(dateStr)) return false;
    return true;
  }, [selectedDate, availability]);

  const handleBookSession = async () => {
    if (!firestore || !user || !selectedDate) return;

    const selectedOffer = offers?.find((o: any) => o.id === selectedOfferId);
    if (!selectedOffer) {
      toast({
        title: t('Select Offer'),
        description: t('Please choose a package or per-hour recording offer to proceed.'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const teacherName = teacherProfile?.name || user.email || 'Teacher';
    const bookingId = uuidv4();

    try {
      // 1. Log booking request in Firestore recordingBookings
      const bookingRef = doc(firestore, 'recordingBookings', bookingId);
      await setDoc(bookingRef, {
        id: bookingId,
        teacherId: user.uid,
        teacherName: teacherName,
        offerId: selectedOffer.id,
        offerTitle: selectedOffer.title,
        requestedDate: dateStr,
        requestedTime: selectedTimeSlot,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Open WhatsApp Redirect
      const whatsAppNumber = '201201921424';
      const textMessage = `Hi! I am ${teacherName}, and I would like to book a Studio Recording session for "${selectedOffer.title}" on ${dateStr} during the slot ${selectedTimeSlot}. Please let me know the next steps to confirm!`;
      const whatsAppUrl = `https://wa.me/201201921424?text=${encodeURIComponent(textMessage)}`;

      toast({
        title: t('Booking Initialized'),
        description: t('Opening WhatsApp to complete your booking with support...'),
      });

      // Try multiple redirection methods to ensure it breaks through any iframe limitations
      try {
        const link = document.createElement('a');
        link.href = whatsAppUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(whatsAppUrl, '_blank');
      }

      // Also set a backup timeout redirection
      setTimeout(() => {
        window.location.href = whatsAppUrl;
      }, 600);
    } catch (err: any) {
      console.error('Booking failed', err);
      toast({
        title: t('Booking Failed'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComingSoon) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/profile">
              <ArrowLeft className="w-4 h-4" />
              {t('Back to Dashboard')}
            </Link>
          </Button>
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 font-mono tracking-wider font-bold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline animate-pulse" />
            COMING SOON
          </Badge>
        </div>

        <Card className="glass-card border-primary/20 bg-gradient-to-b from-primary/[0.04] to-transparent p-6 md:p-10 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <Video className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {t('Studio Recordings')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('We are engineering a state-of-the-art educational recording suite. Book soundproof studios, 4K multi-cam setups, green screens, and dedicated technicians to produce your courses.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2">
              <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('Acoustic Sound Booths')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Crystal clear audio isolation with broadcast-grade condenser microphones.')}</p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2">
              <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('4K Multi-Camera & Chroma')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Cinematic digital blackboard, green screen, and dynamic course overlays.')}</p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2">
              <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('Rapid Post-Production')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Automated lesson rendering, intro graphics, and digital master downloads.')}</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="h-11 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/profile">
                {t('Return to Dashboard')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 font-bold border-zinc-700 bg-background/50 hover:bg-accent">
              <a href="https://wa.me/201201921424?text=Hi!%20I%20am%20interested%20in%20early%20access%20to%20the%20Studio%20Recording%20services." target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4 text-emerald-500" />
                {t('Inquire on WhatsApp')}
              </a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Video className="w-8 h-8 text-primary" />
            {t('Studio Recordings')}
          </h1>
          <p className="text-muted-foreground">{t('Book our high-end recording studio to record professional educational courses.')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Studio Offerings Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('Recording Packages & Pricing')}</CardTitle>
              <CardDescription>{t('Choose the package or hourly rate that fits your schedule.')}</CardDescription>
            </CardHeader>
            <CardContent>
              {offersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers && offers.length > 0 ? (
                    offers.map((offer: any) => (
                      <div
                        key={offer.id}
                        onClick={() => setSelectedOfferId(offer.id)}
                        className={`cursor-pointer border-2 rounded-xl p-5 transition-all relative ${
                          selectedOfferId === offer.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border/50 bg-background/50 hover:border-primary/35'
                        }`}
                      >
                        {selectedOfferId === offer.id && (
                          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground font-black">
                            {t('Selected')}
                          </Badge>
                        )}
                        <h3 className="text-lg font-bold text-foreground">{offer.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">{offer.description}</p>
                        <div className="mt-4 flex items-baseline gap-1">
                          {showPrices ? (
                            <>
                              <span className="text-3xl font-black text-primary">£{offer.price}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                / {offer.type === 'per-hour' ? t('hour') : `${offer.videoCount || 0} videos`}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-primary">{t('Contact on WhatsApp')}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      {t('No recording offers currently published by Admin.')}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guidelines Section */}
          <Card className="liquid-glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                {t('Studio Recording Guidelines')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>● {t('Each session includes a technician to assist with cameras, green screens, and teleprompter setups.')}</p>
              <p>● {t('Please arrive 15 minutes before your booked slot to prepare your scripts.')}</p>
              <p>● {t('Cancellations or rescheduling must be requested at least 24 hours in advance.')}</p>
              <p>● {t('Your recording will be compiled and delivered digitally within 48 hours after the session.')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Booking Card Section */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                {t('Check Availability')}
              </CardTitle>
              <CardDescription>{t('Select an available day and slot to request your reservation.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border p-3 w-full"
                modifiers={{
                  available: availableDays,
                  unavailable: unavailableDays,
                }}
                modifiersClassNames={{
                  available: "bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-md",
                  unavailable: "bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 rounded-md",
                }}
              />

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-4 w-full text-xs pt-2 border-t">
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-600">{t('Available')}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-semibold text-red-500">{t('Booked / Blocked')}</span>
                </div>
              </div>

              {selectedDate && (
                <div className="w-full pt-4 space-y-3 border-t">
                  <div className="text-sm">
                    <span className="font-bold text-muted-foreground mr-1">{t('Selected Date:')}</span>
                    <span className="font-bold text-foreground font-mono">{format(selectedDate, 'PPP')}</span>
                  </div>

                  {!isDateBookable ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold">
                      ❌ {t('This date is currently booked or unavailable. Please choose another date.')}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">{t('Select Time Slot')}</label>
                        <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                          <SelectTrigger className="w-full bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="09:00 - 13:00">09:00 - 13:00 ({t('Morning')})</SelectItem>
                            <SelectItem value="13:00 - 17:00">13:00 - 17:00 ({t('Afternoon')})</SelectItem>
                            <SelectItem value="17:00 - 21:00">17:00 - 21:00 ({t('Evening')})</SelectItem>
                            <SelectItem value="09:00 - 21:00">09:00 - 21:00 ({t('Full Day')})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={handleBookSession}
                        disabled={isSubmitting || !selectedOfferId}
                        className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 mt-2"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {isSubmitting ? t('Processing...') : t('Book via WhatsApp')}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
