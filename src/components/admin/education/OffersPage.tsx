
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, isAfter } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Offer, Hub } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountdownTimer } from './CountdownTimer';

const offerSchema = z.object({
  title: z.string().min(3, 'Offer title must be at least 3 characters long'),
  endDate: z.date({
    required_error: "An end date is required.",
  }).refine(date => isAfter(date, new Date()), {
    message: "End date must be in the future.",
  }),
});

type OfferFormValues = z.infer<typeof offerSchema>;

export function OffersPage({ hub }: { hub: Hub }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const offerDocRef = useMemoFirebase(() => firestore ? doc(firestore, `hubs/${hub.id}/offer/limited-time`) : null, [firestore, hub.id]);
  const { data: offer } = useDoc<Offer>(offerDocRef);

  const { toast } = useToast();

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      title: '',
      endDate: addDays(new Date(), 7),
    },
  });

  const onSubmit = (data: OfferFormValues) => {
    if (!offerDocRef) return;
    const newOffer: Offer = {
      id: 'limited-time', // Use a consistent ID
      title: data.title,
      endDate: data.endDate.toISOString(),
    };
    setDocumentNonBlocking(offerDocRef, newOffer, { merge: false });
    toast({
      title: t('Offer Published!'),
      description: `${t('The offer')} "${data.title}" ${t('is now live.')}`,
    });
    form.reset();
  };

  const handleDeleteOffer = () => {
    if (!offerDocRef) return;
    deleteDocumentNonBlocking(offerDocRef);
    toast({
      title: t('Offer Removed'),
      description: t('The limited time offer has been removed.'),
      variant: 'destructive',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Limited Time Offer')}</CardTitle>
        <CardDescription>{t('Create or manage a special offer that will be displayed to all students.')}</CardDescription>
      </CardHeader>
      <CardContent>
        {offer && isAfter(new Date(offer.endDate), new Date()) ? (
          <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-primary">{t(offer.title)}</h3>
              <p className="text-muted-foreground">{t('This offer is currently active.')}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium">{t('Time remaining:')}</p>
              <CountdownTimer endDate={offer.endDate} />
            </div>
            <Button onClick={handleDeleteOffer} variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" /> <span>{t('Delete Offer')}</span>
            </Button>
          </div>
        ) : (
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

              <Button type="submit" className="w-full">{t('Publish Offer')}</Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

    