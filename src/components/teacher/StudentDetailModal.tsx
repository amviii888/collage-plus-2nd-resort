
'use client';
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LocalStudent, LocalTransaction, LocalAttendanceRecord } from '@/lib/types';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '../ui/scroll-area';

type StudentDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  student: LocalStudent | null;
  teacherId: string;
  localAttendance: LocalAttendanceRecord[];
  localTransactions: LocalTransaction[];
};

export function StudentDetailModal({ isOpen, onClose, student, teacherId, localAttendance, localTransactions }: StudentDetailModalProps) {
  const { t } = useTranslation();
  
  const studentHistory = useMemo(() => {
    if (!student) return { transactions: [], checkIns: [] };

    const transactions = localTransactions
        .filter(tx => tx.studentId === student.id)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const checkIns = localAttendance
        .filter(att => att.studentId === student.id)
        .sort((a,b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

    return { transactions, checkIns };
  }, [student, localTransactions, localAttendance]);


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
        <div className="grid md:grid-cols-2 gap-6 flex-grow min-h-0 pt-4">
            <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-2">{t('Attendance History')}</h3>
                <ScrollArea className="flex-grow border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableHead>{t('Date')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {studentHistory.checkIns.length > 0 ? (
                            studentHistory.checkIns.map(record => (
                                <TableRow key={record.id}>
                                    <TableCell>{format(new Date(record.checkInTime), 'PPp')}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell className="text-center h-24">{t('No attendance found.')}</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
             <div className="flex flex-col">
                <h3 className="text-lg font-semibold mb-2">{t('Payment History')}</h3>
                <ScrollArea className="flex-grow border rounded-lg">
                     <Table>
                        <TableHeader><TableRow><TableHead>{t('Date')}</TableHead><TableHead>{t('Amount')}</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {studentHistory.transactions.length > 0 ? (
                            studentHistory.transactions.map(tx => {
                                const dateValue = tx.date as any;
                                const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
                                return (
                                    <TableRow key={tx.id}>
                                        <TableCell>{!isNaN(date.getTime()) ? format(date, 'PPP') : 'Pending...'}</TableCell>
                                        <TableCell>£{tx.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={2} className="text-center h-24">{t('No payments found.')}</TableCell></TableRow>
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
