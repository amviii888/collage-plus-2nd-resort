'use client';
import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { add, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import type { Student, EnrollmentPlan, Transaction, Center, StudentSubscription, Grade } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Barcode, PlusCircle, Trash2, CheckCircle, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { grades } from '@/lib/data';
import { cn } from '@/lib/utils';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';


const subscriptionSchema = z.object({
  planId: z.string().min(1, 'Plan must be selected'),
  paidAmount: z.coerce.number(),
});

const studentSchema = z.object({
  barcodeId: z.string().min(1, 'An ID must be linked to the student.'),
  name: z.string().min(1, 'Student name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  centerId: z.string().optional(),
  grade: z.string().optional(),
  subscriptions: z.array(subscriptionSchema).min(1, 'At least one plan must be selected.'),
  notes: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

type AddStudentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student, transactions: Omit<Transaction, 'id' | 'aide' | 'date'>[]) => void;
  hubId: string;
  centerId?: string | null;
  centerName?: string | null;
};


export function AddStudentModal({ 
    isOpen, 
    onClose, 
    onSave, 
    hubId,
    centerId,
    centerName,
}: AddStudentModalProps) {
  const { t } = useTranslation();
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  
  const firestore = useFirestore();
  const plansCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hubId}/plans`) : null, [firestore, hubId]);
  const { data: plans, isLoading: plansLoading } = useCollection<EnrollmentPlan>(plansCollectionRef);
  
  const centersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hubId}/centers`) : null, [firestore, hubId]);
  const { data: centers, isLoading: centersLoading } = useCollection<Center>(centersCollectionRef);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: '', phoneNumber: '', barcodeId: '', subscriptions: [], notes: '' },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subscriptions"
  });

  const watchedSubscriptions = useWatch({
    control: form.control,
    name: 'subscriptions',
  });
  
  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    let tempPlans = plans;
    if (gradeFilter !== 'all') {
        tempPlans = tempPlans.filter(p => p.grades.includes(gradeFilter as Grade));
    }
    if (planSearchTerm) {
        tempPlans = tempPlans.filter(p => t(p.name).toLowerCase().includes(planSearchTerm.toLowerCase()));
    }
    return tempPlans;
  }, [plans, gradeFilter, planSearchTerm, t]);

  const { totalCombinedPrice, totalCombinedPaid } = useMemo(() => {
    if (!watchedSubscriptions || !plans) {
        return { totalCombinedPrice: 0, totalCombinedPaid: 0 };
    }
    return watchedSubscriptions.reduce((acc, sub) => {
        const plan = plans.find(p => p.id === sub.planId);
        if (plan) {
            acc.totalCombinedPrice += plan.price;
            acc.totalCombinedPaid += Number(sub.paidAmount) || 0;
        }
        return acc;
    }, { totalCombinedPrice: 0, totalCombinedPaid: 0 });
  }, [watchedSubscriptions, plans]);


  useEffect(() => {
    if (isOpen) {
        form.reset({
            name: '',
            phoneNumber: '',
            barcodeId: uuidv4().substring(0, 6).toUpperCase(), // Generate a client-side ID
            centerId: centerId || undefined,
            subscriptions: [],
            notes: ''
        });
        setGradeFilter('all');
        setPlanSearchTerm('');
    }
  }, [isOpen, form, centerId]);

  const onSubmit = async (data: StudentFormValues) => {
    const centerIdToUse = centerId || data.centerId;
    const selectedCenterName = centerName || centers?.find(c => c.id === centerIdToUse)?.name;
    
    if (!centerIdToUse || !selectedCenterName) {
      form.setError("centerId", { message: "Center selection is required." });
      return;
    }
    
    const studentId = uuidv4();

    const newSubscriptions: StudentSubscription[] = [];
    const newTransactions: Omit<Transaction, 'id' | 'aide' | 'date'>[] = [];
    
    data.subscriptions.forEach(sub => {
        const plan = plans?.find(p => p.id === sub.planId);
        if (!plan) return;

        const { durationValue, durationUnit } = plan;
        const value = durationValue ?? 1;
        const unit = durationUnit ?? 'months';
        const newExpiryDate = add(new Date(), { [unit]: value });
        const remaining = plan.price - sub.paidAmount;

        newSubscriptions.push({
            subscriptionId: uuidv4(),
            planId: plan.id,
            planName: plan.name,
            planType: plan.type || 'Private',
            teacherSchedules: plan.teacherSchedules,
            price: plan.price,
            paid: sub.paidAmount,
            remaining,
            startDate: new Date().toISOString(),
            endDate: newExpiryDate.toISOString(),
        });
        
        const planDurationLabel = unit === 'days' ? `${value} ${value > 1 ? t('Days') : t('Day')}` : value === 1 ? t('1 Month') : `${value} ${t('Months')}`;
        newTransactions.push({
            studentId: data.barcodeId,
            studentName: data.name,
            planId: plan.id,
            planName: plan.name,
            duration: planDurationLabel,
            totalPrice: plan.price,
            paidAmount: sub.paidAmount,
            remaining,
            note: data.notes || t('New enrollment'),
            type: 'New Enrollment',
            centerId: centerIdToUse,
            centerName: selectedCenterName,
        });
    });

    const newStudentData: Student = {
        id: studentId,
        barcodeId: data.barcodeId,
        name: data.name,
        phoneNumber: data.phoneNumber,
        grade: data.grade,
        notes: data.notes,
        centerId: centerIdToUse,
        centerName: selectedCenterName,
        activeSubscriptions: newSubscriptions,
        createdAt: serverTimestamp() as any,
    };

    onSave(newStudentData, newTransactions);
    onClose();
  };

  const handleSelectPlan = (planId: string) => {
    const existingIndex = fields.findIndex(field => field.planId === planId);
    const plan = plans?.find(p => p.id === planId);
    if (!plan) return;

    if (existingIndex > -1) {
        remove(existingIndex);
    } else {
        append({ planId, paidAmount: plan.price });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Enroll Student')}</DialogTitle>
          <DialogDescription>
            {t("Scan or enter the student's ID, then add their plan(s).")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] p-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="barcodeId">{t('Student ID (for QR/Barcode)')}</Label>
                    <CameraBarcodeScanner onScan={(code) => form.setValue('barcodeId', code, { shouldValidate: true })} />
                    <FormField
                        control={form.control}
                        name="barcodeId"
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Input 
                                    placeholder={t("Or enter ID manually...")}
                                    className="mt-2"
                                    {...field}
                                    value={field.value || ''}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (<FormItem><FormLabel>{t('Full Name')}</FormLabel><FormControl><Input placeholder={t("e.g., Ahmed Ali")} {...field} /></FormControl><FormMessage /></FormItem>)}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (<FormItem><FormLabel>{t('Phone Number')}</FormLabel><FormControl><Input placeholder={t("e.g., 0123456789")} {...field} /></FormControl><FormMessage /></FormItem>)}
                  />
                  {!centerId && (
                    <FormField
                      control={form.control}
                      name="centerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Center Location')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={centersLoading}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t('Select a center location')} /></SelectTrigger></FormControl>
                            <SelectContent>{centers?.map(center => <SelectItem key={center.id} value={center.id}>{t(center.name)}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                   <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                        <FormItem><FormLabel>{t('Grade')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder={t("Select student's grade")} /></SelectTrigger></FormControl>
                            <SelectContent>{grades.map(grade => <SelectItem key={grade} value={grade}>{t(grade)}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                   <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Notes (Optional)')}</FormLabel>
                        <FormControl><Input placeholder={t("e.g., Brother of student XYZ, discount applied...")} {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('Select Plan(s)')}</Label>
                   <div className="grid gap-2">
                      <Select value={gradeFilter} onValueChange={(value) => setGradeFilter(value as Grade | 'all')}>
                          <SelectTrigger><SelectValue placeholder={t('Filter Plans by Grade (Optional)')} /></SelectTrigger>
                          <SelectContent><SelectItem value="all">{t('All Grades')}</SelectItem>{grades.map(g => <SelectItem key={g} value={g as string}>{t(g)}</SelectItem>)}</SelectContent>
                      </Select>
                       <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("Search plans...")}
                            value={planSearchTerm}
                            onChange={(e) => setPlanSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                      </div>
                  </div>
                </div>
                 <ScrollArea className="h-60 pr-3">
                  <div className="space-y-2">
                    {plansLoading ? <p>Loading plans...</p> : (
                      filteredPlans.map(plan => {
                          const isSelected = fields.some(f => f.planId === plan.id);
                          return (
                              <div key={plan.id} onClick={() => handleSelectPlan(plan.id)} className={cn("flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all", isSelected ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted/50")}>
                                  <div><p className="font-semibold">{t(plan.name)}</p><p className="text-sm text-muted-foreground">£{plan.price} / {plan.durationValue} {t(plan.durationUnit)}</p></div>
                                  {isSelected && <CheckCircle className="h-5 w-5 text-primary"/>}
                              </div>
                          )
                      })
                    )}
                  </div>
                 </ScrollArea>
                  <div className="space-y-4 rounded-lg border p-4 mt-6 max-h-48 overflow-y-auto">
                    <h3 className="font-medium">{t('Payment Details')}</h3>
                    {fields.map((item, index) => {
                         const plan = plans?.find(p => p.id === item.planId);
                         if (!plan) return null;
                          return (
                             <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                 <p className="font-semibold">{t(plan.name)}</p>
                                 <FormField
                                    control={form.control}
                                    name={`subscriptions.${index}.paidAmount`}
                                    render={({ field }) => (<FormItem><FormLabel>{t('Paid Amount')}</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl></FormItem>)}
                                />
                             </div>
                          )
                    })}
                    {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('Select a plan to see payment options.')}</p>}
                  </div>
              </div>
            </div>

             <div className="space-y-2 rounded-lg border p-4 mt-4 bg-muted/50">
                <h3 className="font-medium">{t('Enrollment Summary')}</h3>
                <div className="flex justify-between"><span>{t('Total Price')}</span><span className="font-semibold">£{totalCombinedPrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>{t('Total Paid')}</span><span className="font-semibold text-green-600">£{totalCombinedPaid.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-2 mt-2"><span>{t('Total Remaining Debt')}</span><span className="font-bold text-destructive">£{(totalCombinedPrice - totalCombinedPaid).toFixed(2)}</span></div>
            </div>
            
            <DialogFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm pt-4 z-10">
                <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
                <Button type="submit" disabled={!form.formState.isValid}>{t('Save Student')}</Button>
            </DialogFooter>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
