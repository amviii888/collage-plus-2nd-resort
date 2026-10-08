'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EnrolledStudent, Transaction, StudentSubscription } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AddPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentBarcodeId: string, updatedSubscriptions: StudentSubscription[], transactionData: Omit<Transaction, 'id' | 'aide' | 'date'>) => void;
  student: EnrolledStudent | null;
  hubId: string;
};

export function AddPaymentModal({ isOpen, onClose, onSave, student }: AddPaymentModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | undefined>();
  
  const subscriptionsWithDebt = useMemo(() => {
    return student?.activeSubscriptions.filter(s => s.remaining > 0) || [];
  }, [student]);
  
  const selectedSubscription = useMemo(() => {
    return subscriptionsWithDebt.find(s => s.subscriptionId === selectedSubscriptionId);
  }, [subscriptionsWithDebt, selectedSubscriptionId]);

  const remainingBalance = selectedSubscription?.remaining || 0;

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setError(null);
      // Auto-select the first subscription with debt if available
      setSelectedSubscriptionId(subscriptionsWithDebt[0]?.subscriptionId);
    }
  }, [isOpen, subscriptionsWithDebt]);

  const handleSave = () => {
    if (!student || !selectedSubscription) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError(t('Please enter a valid positive amount.'));
      return;
    }
    if (paymentAmount > remainingBalance) {
        setError(`${t('Payment cannot exceed the remaining balance of £')}${remainingBalance}.`);
        return;
    }
    setError(null);

    const updatedSubscriptions = student.activeSubscriptions.map(sub => {
        if (sub.subscriptionId === selectedSubscriptionId) {
            return {
                ...sub,
                paid: sub.paid + paymentAmount,
                remaining: sub.remaining - paymentAmount,
            };
        }
        return sub;
    });

    const transactionData: Omit<Transaction, 'id' | 'aide' | 'date'> = {
        studentId: student.barcodeId,
        studentName: student.name,
        planId: selectedSubscription.planId,
        planName: `${t('Payment for')} ${selectedSubscription.planName}`,
        duration: '-',
        totalPrice: remainingBalance, // The "total" for this transaction is the debt being paid
        paidAmount: paymentAmount,
        remaining: remainingBalance - paymentAmount,
        note: note,
        type: 'Payment',
        centerId: student.centerId,
        centerName: student.centerName,
    };
    
    onSave(student.barcodeId, updatedSubscriptions, transactionData);
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Add Payment for')} {student.name}</DialogTitle>
           <div className="text-sm text-muted-foreground pt-2">
            {t('Select the plan to apply payment to.')}
          </div>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subscription-select">{t('Plan with Debt')}</Label>
            <Select value={selectedSubscriptionId} onValueChange={setSelectedSubscriptionId}>
                <SelectTrigger id="subscription-select">
                    <SelectValue placeholder={t('Select a plan')} />
                </SelectTrigger>
                <SelectContent>
                    {subscriptionsWithDebt.map(sub => (
                        <SelectItem key={sub.subscriptionId} value={sub.subscriptionId}>
                            {sub.planName} ({t('Owes')} £{sub.remaining.toFixed(2)})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>

          {selectedSubscription && (
            <>
            <div className="space-y-2">
                <Label htmlFor="amount">{t('Payment Amount (£)')}</Label>
                <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${t('Enter amount up to £')}${remainingBalance.toFixed(2)}`}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setAmount(String(remainingBalance))}>
                {t('Pay full remaining balance')}
            </Button>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">{t('Note (Optional)')}</Label>
            <Textarea
              id="note"
              placeholder={t("e.g., Cash payment for last month's dues.")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSave} disabled={!amount || !selectedSubscription}>{t('Save Payment')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
