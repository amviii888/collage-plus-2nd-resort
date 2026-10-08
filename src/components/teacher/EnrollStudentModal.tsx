'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import type { LocalPlan, LocalStudent } from '@/lib/types';
import { CameraBarcodeScanner } from '../admin/education/CameraBarcodeScanner';
import { add } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search } from 'lucide-react';

const enrollSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  parentPhone: z.string().optional(),
  barcodeId: z.string().optional(),
  planId: z.string().min(1, 'You must select a plan.'),
});

type EnrollFormValues = z.infer<typeof enrollSchema>;

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<LocalStudent, 'id' | 'createdAt'>) => void;
  localPlans: LocalPlan[];
}

export function EnrollStudentModal({ isOpen, onClose, onSave, localPlans }: EnrollStudentModalProps) {
  const { t } = useTranslation();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState('');

  const form = useForm<EnrollFormValues>({
    resolver: zodResolver(enrollSchema),
  });

  const planOptions = useMemo(() => localPlans.map(p => ({ value: p.id, label: p.name })), [localPlans]);
  
  const filteredPlanOptions = useMemo(() => {
    if (!planSearchTerm) {
      return planOptions;
    }
    return planOptions.filter(option =>
      option.label.toLowerCase().includes(planSearchTerm.toLowerCase())
    );
  }, [planOptions, planSearchTerm]);

  useEffect(() => {
    if(isOpen) {
        form.reset({
            name: '',
            phone: '',
            parentPhone: '',
            barcodeId: '',
            planId: '',
        });
        setPlanSearchTerm('');
    }
  }, [isOpen, form]);

  const onSubmit = (data: EnrollFormValues) => {
    const plan = localPlans.find(p => p.id === data.planId);
    if (!plan) return;

    // A unique ID is generated in the parent component where the doc ref is created
    const studentData: Omit<LocalStudent, 'id' | 'createdAt'> = {
      name: data.name,
      phone: data.phone,
      parentPhone: data.parentPhone,
      barcodeId: data.barcodeId, // This can be empty, parent will handle generation
      planId: plan.id,
      planName: plan.name,
      endDate: add(new Date(), { months: plan.durationMonths }).toISOString(),
      price: plan.price,
      paid: 0,
      remaining: 0,
      lastAttendedAt: null,
      attendanceCount: 0,
      isInDebt: false,
    };
    onSave(studentData);
  };
  
  const handleScan = (code: string) => {
    form.setValue('barcodeId', code, { shouldValidate: true });
    setIsScannerOpen(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Enroll New Student')}</DialogTitle>
            <DialogDescription>{t("Add a new student to one of your personal plans.")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="planId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Select Plan')}</FormLabel>
                     <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("Search plans...")}
                            value={planSearchTerm}
                            onChange={(e) => setPlanSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <ScrollArea className="h-40 rounded-md border p-4">
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                        >
                            {filteredPlanOptions.map(option => (
                                <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value={option.value} />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {option.label}
                                    </FormLabel>
                                </FormItem>
                            ))}
                             {filteredPlanOptions.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">{t('No plans match your search.')}</p>
                             )}
                        </RadioGroup>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t('Name')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>{t('Phone')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="parentPhone" render={({ field }) => (
                <FormItem><FormLabel>{t("Parent's Phone (Optional)")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="barcodeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("Student's QR Code ID (Optional)")}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl><Input {...field} placeholder="Scan or enter ID"/></FormControl>
                    <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>{t('Scan')}</Button>
                  </div>
                   <p className="text-xs text-muted-foreground">{t("If not provided, a unique ID will be generated.")}</p>
                  <FormMessage />
                </FormItem>
              )}/>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
                <Button type="submit">{t('Enroll Student')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent><DialogHeader><DialogTitle>{t('Scan QR Code')}</DialogTitle></DialogHeader><CameraBarcodeScanner onScan={handleScan} /></DialogContent>
      </Dialog>
    </>
  );
}
