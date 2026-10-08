
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, isAfter } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Offer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2, PlusCircle, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountdownTimer } from '@/components/admin/education/CountdownTimer';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

type AdminSession = { name: string; role: string };

const offerSchema = z.object({
  title: z.string().min(3, 'Offer title must be at least 3 characters long'),
  endDate: z.date({
    required_error: "An end date is required.",
  }).refine(date => isAfter(date, new Date()), {
    message: "End date must be in the future.",
  }),
});

type OfferFormValues = z.infer<typeof offerSchema>;

function OfferFormModal({
    isOpen,
    onClose,
    onSave,
    offerToEdit,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (offer: Omit<Offer, 'id'>) => void;
    offerToEdit: Offer | null;
}) {
    const { t } = useTranslation();
    const form = useForm<OfferFormValues>({
        resolver: zodResolver(offerSchema),
    });

    useEffect(() => {
        if (offerToEdit) {
            form.reset({
                title: offerToEdit.title,
                endDate: new Date(offerToEdit.endDate),
            });
        } else {
            form.reset({
                title: '',
                endDate: addDays(new Date(), 7),
            });
        }
    }, [offerToEdit, form]);

    const onSubmit = (data: OfferFormValues) => {
        onSave({
            title: data.title,
            endDate: data.endDate.toISOString(),
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{offerToEdit ? t('Edit Offer') : t('Add New Offer')}</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('Offer Title')}</FormLabel>
                                <FormControl>
                                <Input placeholder={t('e.g., 50% Off Annual Plans!')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>{t('Offer End Date')}</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>{t('Pick a date')}</span>}
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                    />
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">{t('Save Offer')}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}


export function OffersPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const offersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `offers`) : null, [firestore]);
  const { data: offers, isLoading } = useCollection<Offer>(offersCollectionRef);

  const handleSaveOffer = (offerData: Omit<Offer, 'id'>) => {
    if (!offersCollectionRef) return;
    const offerToSave: Offer = {
        id: editingOffer?.id || uuidv4(),
        ...offerData
    };
    
    const offerDocRef = doc(offersCollectionRef, offerToSave.id);
    
    setDocumentNonBlocking(offerDocRef, offerToSave, { merge: true });
    
    toast({
      title: editingOffer ? t('Offer Updated!') : t('Offer Published!'),
      description: `${t('The offer')} "${offerData.title}" ${t('is now live.')}`,
    });
    setEditingOffer(null);
  };

  const handleDeleteOffer = (offerId: string) => {
    if (!offersCollectionRef) return;
    
    const offerDocRef = doc(offersCollectionRef, offerId);
    deleteDocumentNonBlocking(offerDocRef);
    toast({
      title: t('Offer Removed'),
      description: t('The limited time offer has been removed.'),
      variant: 'destructive',
    });
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{t('Limited Time Offers')}</CardTitle>
                <CardDescription>{t('Create and manage special offers that will be displayed to all students.')}</CardDescription>
            </div>
            <Button onClick={() => { setEditingOffer(null); setIsModalOpen(true);}}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('Add Offer')}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        {!isLoading && offers && offers.length > 0 ? (
            offers.filter(o => isAfter(new Date(o.endDate), new Date())).map(offer => (
                <div key={offer.id} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="text-center flex-grow">
                            <h3 className="text-2xl font-bold text-primary">{t(offer.title)}</h3>
                            <p className="text-muted-foreground">{t('This offer is currently active.')}</p>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {setEditingOffer(offer); setIsModalOpen(true);}}>
                                <Edit className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteOffer(offer.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                    <p className="text-sm font-medium">{t('Time remaining:')}</p>
                    <CountdownTimer endDate={offer.endDate} />
                    </div>
                </div>
            ))
        ) : !isLoading && (
            <p className="text-center py-10 text-muted-foreground">{t('No active offers found. Add one to get started!')}</p>
        )}
      </CardContent>
    </Card>
    <OfferFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOffer}
        offerToEdit={editingOffer}
    />
    </>
  );
}

// This needs to be a default export for the page to render.
export default function AdminOffersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

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

  if (isAuthChecking || !adminSession) {
      return (
          <div className="container mx-auto p-4 md:p-8">
              <Skeleton className="h-96 w-full" />
          </div>
      )
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <OffersPage />
    </div>
  );
}
