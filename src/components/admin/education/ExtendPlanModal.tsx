'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { add, format, isAfter } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EnrolledStudent, Transaction, Hub, EnrollmentPlan, StudentSubscription } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Combobox } from '@/components/ui/combobox';
import { grades } from '@/lib/data';

type ExtendPlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (studentBarcodeId: string, updatedSubscriptions: StudentSubscription[], newTransaction: Omit<Transaction, 'id' | 'aide' | 'date'>) => void;
  student: EnrolledStudent | null;
  hub: Hub;
};

export function ExtendPlanModal({ isOpen, onClose, onExtend, student, hub }: ExtendPlanModalProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  
  const plansCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/plans`) : null, [firestore, hub.id]);
  const { data: plans, isLoading: plansLoading } = useCollection<EnrollmentPlan>(plansCollectionRef);

  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  
  const selectedPlan = useMemo(() => plans?.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);
  const totalPrice = useMemo(() => selectedPlan?.price || 0, [selectedPlan]);
  
  const planDurationLabel = useMemo(() => {
    if (!selectedPlan) return '';
    const { durationValue, durationUnit } = selectedPlan;
    
    const value = durationValue ?? 1;
    const unit = durationUnit ?? 'months';

    if (unit === 'days') return `${value} ${value > 1 ? t('Days') : t('Day')}`;
    if (value === 1) return t('1 Month');
    return `${value} ${t('Months')}`;

  }, [selectedPlan, t]);
  
  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    if (gradeFilter === 'all') return plans;
    return plans.filter(p => p.grades.includes(gradeFilter));
  }, [plans, gradeFilter]);

  const planOptions = useMemo(() => {
    return filteredPlans.map(p => ({
      value: p.id,
      label: `${t(p.name)} - £${p.price}`
    }));
  }, [filteredPlans, t]);


  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId(undefined);
      setNote('');
      setIsFullPayment(true);
    }
  }, [isOpen, student]);
  
  useEffect(() => {
    if (isFullPayment) {
        setPaidAmount(String(totalPrice));
    } else {
        setPaidAmount('');
    }
  }, [isFullPayment, totalPrice]);


  const handleExtend = () => {
    if (!student || !selectedPlan || (paidAmount.trim() === '' && !isFullPayment)) {
        return;
    }

    const { durationValue, durationUnit } = selectedPlan;
    const value = durationValue ?? 1;
    const unit = durationUnit ?? 'months';
    
    // Check if there is an existing subscription for this plan
    const existingSubIndex = student.activeSubscriptions.findIndex(s => s.planId === selectedPlan.id);
    const updatedSubscriptions = [...student.activeSubscriptions];

    const paid = parseFloat(paidAmount);
    const remaining = totalPrice - paid;
    
    if (existingSubIndex > -1) {
        // Extend existing subscription
        const existingSub = updatedSubscriptions[existingSubIndex];
        const startDate = isAfter(new Date(existingSub.endDate), new Date()) ? new Date(existingSub.endDate) : new Date();
        const newEndDate = add(startDate, { [unit]: value });

        updatedSubscriptions[existingSubIndex] = {
            ...existingSub,
            endDate: newEndDate.toISOString(),
            paid: existingSub.paid + paid,
            remaining: existingSub.remaining + remaining,
        };
    } else {
        // Add new subscription
        const newEndDate = add(new Date(), { [unit]: value });
        const newSub: StudentSubscription = {
            subscriptionId: uuidv4(),
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            planType: selectedPlan.type,
            teacherSchedules: selectedPlan.teacherSchedules,
            price: totalPrice,
            paid: paid,
            remaining: remaining,
            startDate: new Date().toISOString(),
            endDate: newEndDate.toISOString(),
        };
        updatedSubscriptions.push(newSub);
    }


    const transactionData: Omit<Transaction, 'id' | 'aide' | 'date'> = {
        studentId: student.barcodeId,
        studentName: student.name,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        duration: planDurationLabel,
        totalPrice: totalPrice,
        paidAmount: paid,
        remaining: remaining,
        note: note,
        type: 'Extend/Payment',
        centerId: student.centerId,
        centerName: student.centerName,
    };

    onExtend(student.barcodeId, updatedSubscriptions, transactionData);
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Add / Extend Plan for')} {student.name}</DialogTitle>
          <DialogDescription>
            {t('Add a new plan or extend an existing one for this student.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('Filter Plans by Grade (Optional)')}</Label>
               <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">{t('All Grades')}</SelectItem>
                      {grades.map(g => <SelectItem key={g} value={g}>{t(g)}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
                <Label>{t('Select Plan')}</Label>
                <Combobox
                  options={planOptions}
                  value={selectedPlanId || ''}
                  onChange={setSelectedPlanId}
                  placeholder={t('Select a plan to add/extend')}
                  searchPlaceholder={t('Search plans...')}
                  emptyText={t('No plans found.')}
                />
            </div>
          
          <div className="space-y-2">
            <Label>{t('Total Price (£)')}</Label>
            <Input value={`£${totalPrice}`} disabled className="font-bold text-lg h-12" />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="payment-mode" checked={isFullPayment} onCheckedChange={setIsFullPayment} />
            <Label htmlFor="payment-mode">{isFullPayment ? t('Full Payment') : t('Partial Payment')}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">{t('Paid Amount')}</Label>
            <Input
              id="paidAmount"
              type="number"
              placeholder={t('e.g., 100')}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              disabled={isFullPayment}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t('Note (Optional)')}</Label>
            <Textarea
              id="note"
              placeholder={t('e.g., Promised to pay the rest next week.')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleExtend} disabled={!paidAmount || !selectedPlanId}>{t('Save / Confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
