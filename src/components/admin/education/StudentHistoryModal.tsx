
'use client';
import { useMemo, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { EnrolledStudent, Transaction, AttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

type StudentHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  student: EnrolledStudent | null;
  hubId: string;
};

export function StudentHistoryModal({ isOpen, onClose, student, hubId }: StudentHistoryModalProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [checkIns, setCheckIns] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !student || !firestore) {
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const transactionsQuery = query(
          collection(firestore, `hubs/${hubId}/transactions`),
          where('studentId', '==', student.barcodeId)
        );
        const transactionSnapshot = await getDocs(transactionsQuery);
        const transactionData = transactionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        transactionData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(transactionData);

        const checkInsQuery = query(
          collection(firestore, `hubs/${hubId}/attendance`),
          where('barcodeId', '==', student.barcodeId)
        );
        const checkInSnapshot = await getDocs(checkInsQuery);
        const checkInData = checkInSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        checkInData.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
        setCheckIns(checkInData);

      } catch (error) {
        console.error("Failed to fetch student history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, student, firestore, hubId]);


  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('History for')} {student.name}</DialogTitle>
          <DialogDescription>
            {t('Showing all recorded payments and attendance for this student.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 flex-grow min-h-0">
            <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-2">{t('Payment History')}</h3>
                <ScrollArea className="flex-grow border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Date')}</TableHead>
                                <TableHead>{t('Type')}</TableHead>
                                <TableHead>{t('Amount')}</TableHead>
                                <TableHead>{t('Aide')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                               <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                            ))
                        ) : transactions && transactions.length > 0 ? (
                            transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(new Date(tx.date), 'PPp')}</TableCell>
                                    <TableCell><Badge variant={tx.type === 'New Enrollment' ? 'secondary' : 'default'}>{t(tx.type)}</Badge></TableCell>
                                    <TableCell>£{tx.paidAmount.toFixed(2)}</TableCell>
                                    <TableCell>{tx.aide}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">{t('No transactions found.')}</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
             <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-2">{t('Attendance History')}</h3>
                <ScrollArea className="flex-grow border rounded-lg">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Date')}</TableHead>
                                <TableHead>{t('Aide')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                               <TableRow key={i}><TableCell colSpan={2}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                            ))
                        ) : checkIns && checkIns.length > 0 ? (
                            checkIns.map(ci => (
                                <TableRow key={ci.id}>
                                    <TableCell>{format(new Date(ci.checkInTime), 'PPp')}</TableCell>
                                    <TableCell>{ci.aideName}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={2} className="text-center h-24">{t('No check-ins found.')}</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    