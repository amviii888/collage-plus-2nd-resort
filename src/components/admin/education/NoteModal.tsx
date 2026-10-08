
'use client';
import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { EnrolledStudent } from '@/lib/types';
import { useTranslation } from 'react-i18next';

type NoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentId: string, note: string) => void;
  student: EnrolledStudent;
};

export function NoteModal({ isOpen, onClose, onSave, student }: NoteModalProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      setNote(student.notes || '');
    }
  }, [isOpen, student]);

  const handleSave = () => {
    onSave(student.barcodeId, note);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Add/Edit Note for')} {student.name}</DialogTitle>
          <DialogDescription>
            {t('This note will be visible in the attendance list.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">{t('Note')}</Label>
            <Textarea
              id="note"
              placeholder={t('e.g., Owes money, special instructions, etc.')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSave}>{t('Save Note')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    