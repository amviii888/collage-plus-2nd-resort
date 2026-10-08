
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

type MessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentId: string, message: { text: string, from: string }) => void;
  student: EnrolledStudent;
  aideName: string;
};

export function MessageModal({ isOpen, onClose, onSave, student, aideName }: MessageModalProps) {
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      setMessageText(student.message?.text || '');
    }
  }, [isOpen, student]);

  const handleSave = () => {
    const message = {
      text: messageText,
      from: aideName,
    };
    onSave(student.barcodeId, message);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Send Message to')} {student.name}</DialogTitle>
          <DialogDescription>
            {t("This message will appear on the student's profile page.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">{t('Message')}</Label>
            <Textarea
              id="message"
              placeholder={t('e.g., Please come to the front desk.')}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSave}>{t('Send Message')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    