
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import type { RecordingOffer, RecordingBooking, Hub, Teacher } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Hourglass, Film, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

const MOCK_HUB_ID = 'main-hub';

function BookingModal({
  isOpen,
  onClose,
  offer,
  teacherId,
  teacherName,
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: RecordingOffer;
  teacherId: string;
  teacherName: string;
}) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleBooking = async () => {
    if (!firestore || !date || !time) {
      toast({ title: t('Please select a date and time.'), variant: 'destructive' });
      return;
    }

    const newBooking: Omit<RecordingBooking, 'id'> = {
      teacherId,
      teacherName,
      offerId: offer.id,
      offerTitle: offer.title,
      requestedDate: date,
      requestedTime: time,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      const bookingsRef = collection(firestore, `hubs/${MOCK_HUB_ID}/recordingBookings`);
      await addDoc(bookingsRef, newBooking);
      toast({ title: t('Booking Request Sent!'), description: t('Your request has been sent for admin approval.') });
      onClose();
    } catch (e: any) {
      toast({ title: t('Booking Failed'), description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('Book Session')}: {t(offer.title)}
          </DialogTitle>
          <DialogDescription>{t('Select your desired date and time. An admin will confirm your booking.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">{t('Date')}</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">{t('Time')}</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleBooking}>{t('Request Booking')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RecRoomPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedOffer, setSelectedOffer] = useState<RecordingOffer | null>(null);

  const offersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, `hubs/${MOCK_HUB_ID}/recordingOffers`) : null),
    [firestore]
  );
  const { data: offers, isLoading: offersLoading } = useCollection<RecordingOffer>(offersQuery);

  const teacherQuery = useMemoFirebase(
      () => (firestore && user ? doc(firestore, `teachers/${user.uid}`) : null),
      [firestore, user]
  )
  const {data: teacher} = useDoc<Teacher>(teacherQuery);


  const handleBookClick = (offer: RecordingOffer) => {
    if (!user || !teacher) {
        toast({ title: t('You must be logged in as a teacher to book a session.'), variant: 'destructive' });
        return;
    }
    setSelectedOffer(offer);
  };
  
  const isLoading = offersLoading;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('Recording Room Offers')}</h1>
        <p className="text-muted-foreground mt-2">{t('Book our professional studio for your next course.')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)
          : offers && offers.length > 0
          ? offers.map((offer) => (
              <Card key={offer.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <Video /> {t(offer.title)}
                  </CardTitle>
                  <CardDescription>{t(offer.description)}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4 pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">£{offer.price}</span>
                  </div>
                  {offer.type === 'per-hour' && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Hourglass className="h-4 w-4" />
                      <span>{t('Per Hour')}</span>
                    </div>
                  )}
                  {offer.type === 'per-package' && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Film className="h-4 w-4" />
                      <span>
                        {t('Package of')} {offer.videoCount} {t('videos')}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => handleBookClick(offer)}>
                    {t('Book Now')}
                  </Button>
                </CardFooter>
              </Card>
            ))
          : <p className="col-span-full text-center py-12 text-muted-foreground">{t('No recording offers are available at the moment.')}</p>
        }
      </div>
      {selectedOffer && teacher && (
        <BookingModal
          isOpen={!!selectedOffer}
          onClose={() => setSelectedOffer(null)}
          offer={selectedOffer}
          teacherId={teacher.id}
          teacherName={teacher.name}
        />
      )}
    </div>
  );
}
