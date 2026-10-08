
'use client';
import { useState } from 'react';
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
import { useTranslation } from 'react-i18next';

type ExportPhonesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: (message: string) => void;
};

export function ExportPhonesModal({ isOpen, onClose, onExport }: ExportPhonesModalProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Export Student Phones')}</DialogTitle>
          <DialogDescription>
            {t('This will generate an Excel file with student names, phone numbers, and an optional message.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="export-message">{t('Message (Optional)')}</Label>
            <Textarea
              id="export-message"
              placeholder={t('e.g., Special offer for you!')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={() => onExport(message)}>{t('Export to Excel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    