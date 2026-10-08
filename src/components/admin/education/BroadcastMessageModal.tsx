
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

type BroadcastMessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string, from: string) => void;
  aideName: string;
};

export function BroadcastMessageModal({ isOpen, onClose, onSend, aideName }: BroadcastMessageModalProps) {
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState('');

  const handleSend = () => {
    if (messageText.trim() === '') return;
    onSend(messageText, aideName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Broadcast Message to All Students')}</DialogTitle>
          <DialogDescription>
            {t("This message will appear on every student's profile page for this hub.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-message">{t('Message')}</Label>
            <Textarea
              id="broadcast-message"
              placeholder={t('e.g., The hub will be closed tomorrow for maintenance.')}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSend} disabled={!messageText.trim()}>{t('Send to All')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    