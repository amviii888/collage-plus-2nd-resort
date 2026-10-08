
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, query, updateDoc, orderBy, setDoc, onSnapshot } from 'firebase/firestore';
import type { RecordingOffer, RecordingBooking } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Edit, Trash2, Video, CheckCircle, XCircle, Clock, CalendarRange } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';

type AdminSession = { name: string; role: string };

function OfferFormModal({
  isOpen,
  onClose,
  onSave,
  offerToEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offer: RecordingOffer) => void;
  offerToEdit: RecordingOffer | null;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<'per-hour' | 'per-package'>('per-hour');
  const [videoCount, setVideoCount] = useState('');

  useEffect(() => {
    if (offerToEdit) {
      setTitle(offerToEdit.title);
      setDescription(offerToEdit.description || '');
      setPrice(String(offerToEdit.price));
      setType(offerToEdit.type);
      setVideoCount(String(offerToEdit.videoCount || ''));
    } else {
      setTitle('');
      setDescription('');
      setPrice('');
      setType('per-hour');
      setVideoCount('');
    }
  }, [offerToEdit]);

  const handleSave = () => {
    if (!title || !price) {
        // Basic validation
        return;
    }
    const offerData: RecordingOffer = {
      id: offerToEdit?.id || uuidv4(),
      title,
      description,
      price: parseFloat(price),
      type,
      videoCount: type === 'per-package' ? parseInt(videoCount, 10) : undefined,
    };
    onSave(offerData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{offerToEdit ? t('Edit Offer') : t('Add New Offer')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('Title')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">{t('Price (£)')}</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{t('Offer Type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per-hour">{t('Per Hour')}</SelectItem>
                <SelectItem value="per-package">{t('Per Package')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'per-package' && (
            <div className="space-y-2">
              <Label htmlFor="videoCount">{t('Number of Videos')}</Label>
              <Input id="videoCount" type="number" value={videoCount} onChange={(e) => setVideoCount(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave}>{t('Save Offer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRecordingsPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<RecordingOffer | null>(null);

  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [isComingSoon, setIsComingSoon] = useState<boolean>(true);

  // Studio availability state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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
      console.error("Error loading studio availability config:", err);
    });
    return () => unsub();
  }, [firestore]);

  const availableDays = useMemo(() => availability.availableDates.map(d => {
    const parts = d.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }), [availability]);

  const unavailableDays = useMemo(() => availability.unavailableDates.map(d => {
    const parts = d.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }), [availability]);

  const handleSetAvailabilityStatus = async (status: 'available' | 'unavailable' | 'default') => {
    if (!firestore || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    let newAvailable = [...availability.availableDates];
    let newUnavailable = [...availability.unavailableDates];
    
    newAvailable = newAvailable.filter(d => d !== dateStr);
    newUnavailable = newUnavailable.filter(d => d !== dateStr);
    
    if (status === 'available') {
      newAvailable.push(dateStr);
    } else if (status === 'unavailable') {
      newUnavailable.push(dateStr);
    }
    
    try {
      const docRef = doc(firestore, 'studioAvailability', 'config');
      await setDoc(docRef, {
        availableDates: newAvailable,
        unavailableDates: newUnavailable
      }, { merge: true });
      toast({ title: t('Calendar Updated'), description: `${dateStr} set to ${status}.` });
    } catch (e: any) {
      toast({ title: t('Update Failed'), description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleShowPrices = async (checked: boolean) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'studioAvailability', 'config');
      await setDoc(docRef, {
        showPrices: checked
      }, { merge: true });
      setShowPrices(checked);
      toast({ title: t('Settings Saved'), description: t('Pricing visibility updated.') });
    } catch (e: any) {
      toast({ title: t('Update Failed'), description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleComingSoon = async (checked: boolean) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'studioAvailability', 'config');
      await setDoc(docRef, {
        isComingSoon: checked
      }, { merge: true });
      setIsComingSoon(checked);
      toast({ 
        title: t('Status Updated'), 
        description: checked ? t('Studio Recordings set to Coming Soon.') : t('Studio Recordings are now Live for booking.') 
      });
    } catch (e: any) {
      toast({ title: t('Update Failed'), description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    try {
        const sessionData = localStorage.getItem('admin-session');
        if (!sessionData) {
            router.replace('/admin/access');
            return;
        }
        
        const parsedSession: AdminSession = JSON.parse(sessionData);
        if (parsedSession.role !== 'S Admin' && parsedSession.role !== 'Manager') {
            router.replace('/admin/check-in');
            toast({ title: t("Access Denied"), variant: "destructive" });
        } else {
            setAdminSession(parsedSession);
        }
    } catch (e) {
         console.error("Session storage not available.");
         router.replace('/admin/access');
    }
    setIsAuthChecking(false);
  }, [router, t, toast]);

  const offersQuery = useMemoFirebase(() => collection(firestore, `recordingOffers`), [firestore]);
  const { data: offers, isLoading: offersLoading } = useCollection<RecordingOffer>(offersQuery);

  const bookingsQuery = useMemoFirebase(() => query(collection(firestore, `recordingBookings`), orderBy('createdAt', 'desc')), [firestore]);
  const { data: bookings, isLoading: bookingsLoading } = useCollection<RecordingBooking>(bookingsQuery);

  const handleSaveOffer = async (offer: RecordingOffer) => {
    if (!firestore) return;
    const offerRef = doc(firestore, `recordingOffers`, offer.id);
    try {
        await setDoc(offerRef, offer, { merge: true });
        toast({ title: t('Offer Saved'), description: `"${offer.title}" ${t('has been saved.')}` });
    } catch (e: any) {
        console.error("Error saving offer: ", e);
        toast({ title: t('Save Failed'), description: e.message, variant: 'destructive'});
    }
    setIsModalOpen(false);
    setEditingOffer(null);
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!firestore) return;
    if (window.confirm(t('Are you sure you want to delete this offer?'))) {
      const offerRef = doc(firestore, `recordingOffers`, offerId);
      await deleteDoc(offerRef);
      toast({ title: t('Offer Deleted'), variant: 'destructive' });
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: 'approved' | 'declined') => {
    if (!firestore) return;
    const bookingRef = doc(firestore, `recordingBookings`, bookingId);
    await updateDoc(bookingRef, { status });
    toast({ title: t('Booking Updated'), description: `${t('The booking has been')} ${t(status)}.` });
  };
  
  const getStatusBadge = (status: RecordingBooking['status']) => {
    switch(status) {
        case 'approved': return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" /> {t('Approved')}</Badge>
        case 'declined': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> {t('Declined')}</Badge>
        case 'pending':
        default:
            return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> {t('Pending')}</Badge>
    }
  }

  if (isAuthChecking || !adminSession) {
      return (
          <div className="container mx-auto p-4 md:p-8">
              <Skeleton className="h-96 w-full" />
          </div>
      )
  }

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('Manage Recording Offers')}</CardTitle>
            <CardDescription>{t('Create and manage pricing for the recording studio.')}</CardDescription>
          </div>
          <Button
            onClick={() => {
              setEditingOffer(null);
              setIsModalOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Offer')}
          </Button>
        </CardHeader>
        <CardContent>
          {offersLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Title')}</TableHead>
                  <TableHead>{t('Price')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers?.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">{t(offer.title)}</TableCell>
                    <TableCell>£{offer.price}</TableCell>
                    <TableCell>{t(offer.type)} {offer.type === 'per-package' ? `(${offer.videoCount} videos)` : ''}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingOffer(offer);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                {t('Studio Calendar')}
              </CardTitle>
              <CardDescription>{t('Manage available vs booked dates.')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border p-3 w-full max-w-[280px]"
                modifiers={{
                  available: availableDays,
                  unavailable: unavailableDays,
                }}
                modifiersClassNames={{
                  available: "bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-md",
                  unavailable: "bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 rounded-md",
                }}
              />
              <div className="flex flex-col gap-2 w-full pt-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full font-bold" onClick={() => handleSetAvailabilityStatus('available')}>
                  {t('Mark Available (Green)')}
                </Button>
                <Button size="sm" variant="destructive" className="w-full font-bold" onClick={() => handleSetAvailabilityStatus('unavailable')}>
                  {t('Mark Booked (Red)')}
                </Button>
                <Button size="sm" variant="outline" className="w-full font-semibold" onClick={() => handleSetAvailabilityStatus('default')}>
                  {t('Reset to Default')}
                </Button>
              </div>

              <div className="flex flex-col gap-2 w-full pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isComingSoon ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                    {t('Coming Soon Mode')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = !isComingSoon;
                      handleToggleComingSoon(newVal);
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isComingSoon ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isComingSoon ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {isComingSoon
                    ? t('Active: Teachers see a "Coming Soon" showcase screen with features preview.')
                    : t('Live: Teachers can book slots and view live packages.')}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">{t('Display Prices on Teacher App')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = !showPrices;
                      handleToggleShowPrices(newVal);
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showPrices ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                        showPrices ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {t('If disabled, prices are hidden and booking defaults to free pre-meet messages via WhatsApp.')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t('Booking Requests')}</CardTitle>
              <CardDescription>{t('Review and manage booking requests from teachers.')}</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <Skeleton className="h-60 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Teacher')}</TableHead>
                      <TableHead>{t('Offer')}</TableHead>
                      <TableHead>{t('Requested Date & Time')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings?.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-semibold">{booking.teacherName}</TableCell>
                        <TableCell>{t(booking.offerTitle)}</TableCell>
                        <TableCell>{format(new Date(booking.requestedDate), 'PPP')} @ {booking.requestedTime}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell className="text-right">
                          {booking.status === 'pending' && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="secondary" onClick={() => handleUpdateBookingStatus(booking.id, 'approved')}>
                                {t('Approve')}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleUpdateBookingStatus(booking.id, 'declined')}>
                                {t('Decline')}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                     {bookings?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('No booking requests yet.')}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OfferFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveOffer} offerToEdit={editingOffer} />
    </div>
  );
}
