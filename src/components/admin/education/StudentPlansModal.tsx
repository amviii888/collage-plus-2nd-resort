
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrolledStudent } from '@/lib/types';
import { format, isAfter, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';

type StudentPlansModalProps = {
  isOpen: boolean;
  onClose: () => void;
  student: EnrolledStudent | null;
};

export function StudentPlansModal({ isOpen, onClose, student }: StudentPlansModalProps) {
  const { t } = useTranslation();

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Active Plans for')} {student.name}</DialogTitle>
          <DialogDescription>
            {t('Showing all current and past subscriptions for this student.')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Plan Name')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead>{t('Expires On')}</TableHead>
                        <TableHead className="text-right">{t('Amount Owed')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {student.activeSubscriptions?.length > 0 ? (
                        student.activeSubscriptions.map(sub => {
                            const isExpired = !isAfter(parseISO(sub.endDate), new Date());
                            return (
                                <TableRow key={sub.subscriptionId}>
                                    <TableCell className="font-medium">{sub.planName}</TableCell>
                                    <TableCell>
                                        {isExpired ? <Badge variant="destructive">{t('Expired')}</Badge> : <Badge variant="secondary">{t('Active')}</Badge>}
                                    </TableCell>
                                    <TableCell>{format(parseISO(sub.endDate), 'PPP')}</TableCell>
                                    <TableCell className="text-right">
                                        {sub.remaining > 0 ? (
                                            <Badge variant="destructive">£{sub.remaining.toFixed(2)}</Badge>
                                        ) : (
                                            <Badge variant="outline">£0.00</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">{t('This student has no active plans.')}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

    