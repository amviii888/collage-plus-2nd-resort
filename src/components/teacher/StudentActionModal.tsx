
'use client';

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
import { Label } from '@/components/ui/label';
import type { LocalStudent, LocalTransaction } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, CalendarCheck, DollarSign, HandCoins } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Textarea } from '../ui/textarea';


interface StudentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: LocalStudent | null;
  planName: string;
  onAttend: () => void;
  onAddPayment: (amount: number) => void;
  onToggleDebt: () => void;
  onSaveNote: (note: string) => void;
  localTransactions: LocalTransaction[];
}

export function StudentActionModal({
  isOpen,
  onClose,
  student,
  planName,
  onAttend,
  onAddPayment,
  onToggleDebt,
  onSaveNote,
  localTransactions,
}: StudentActionModalProps) {
  const { t } = useTranslation();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (student) {
        setNote(student.notes || '');
    }
  }, [student]);

  const lastAttendedDate = useMemo(() => {
    if (!student?.lastAttendedAt) {
      return null;
    }
    const dateValue = student.lastAttendedAt as any;
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    try {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (e) {
      // Invalid date format
    }
    return null;
  }, [student?.lastAttendedAt]);

  const lastPaymentAmount = useMemo(() => {
    if (!student || !localTransactions || localTransactions.length === 0) {
        return null;
    }
    const studentTransactions = localTransactions
        .filter(tx => tx.studentId === student.id && tx.type === 'payment')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return studentTransactions.length > 0 ? studentTransactions[0].amount : null;
  }, [student, localTransactions]);

  if (!student) return null;

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount > 0) {
      onAddPayment(amount);
      setPaymentAmount('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student.name}</DialogTitle>
          <DialogDescription>
            {t('Plan')}: {planName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm">
            <p><span className="font-semibold">{t('Phone')}:</span> {student.phone}</p>
            <p><span className="font-semibold">{t('Last Attendance')}:</span> {lastAttendedDate ? formatDistanceToNow(lastAttendedDate, { addSuffix: true }) : t('Never')}</p>
            {lastPaymentAmount !== null && (
                <p><span className="font-semibold">{t('Last Payment')}:</span> £{lastPaymentAmount.toFixed(2)}</p>
            )}
          </div>
          {student.isInDebt && (
            <div className="flex items-center gap-2 text-destructive p-2 rounded-md bg-destructive/10">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">{t('This student is marked as in debt.')}</span>
            </div>
          )}
          <div className="space-y-2 pt-4">
            <Label htmlFor="student-note">{t('Notes')}</Label>
            <Textarea
              id="student-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('Add a persistent note for this student...')}
            />
            <Button size="sm" onClick={() => onSaveNote(note)}>{t('Save Note')}</Button>
          </div>
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={onAttend} className="w-full h-16 text-lg sm:col-span-3">
                <CalendarCheck className="mr-2"/>
                {t('Attend')}
            </Button>
            <div className="flex items-center gap-2 sm:col-span-2">
                <Label htmlFor="payment-amount" className="sr-only">Amount</Label>
                <Input
                    id="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={t("Amount (£)")}
                    className="h-12 text-lg"
                />
                <Button onClick={handlePayment} className="h-12" disabled={!paymentAmount}>
                    <DollarSign />
                </Button>
            </div>
            <Button onClick={onToggleDebt} variant="secondary" className="w-full h-12">
                <HandCoins className="mr-2"/>
                {student.isInDebt ? t('Remove from Debt') : t('Add to Debt')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
