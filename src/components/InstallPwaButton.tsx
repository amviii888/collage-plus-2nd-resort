
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaButton() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // Detect if the user is on an iOS device
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null);
      });
    } else if (isIos) {
      setShowIosInstructions(true);
    }
  };

  // Don't show the button if the PWA is already installed or the browser doesn't support the prompt (and it's not iOS)
  if (!installPrompt && !isIos) {
    return null;
  }
  
  // Don't show if running in standalone mode (already installed)
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleInstallClick}
        variant="outline"
        className="h-8 px-2.5 rounded-lg liquid-glass text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t('Install App')}</span>
      </Button>

      <Dialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Install on iOS')}</DialogTitle>
            <DialogDescription>
              {t('To install the app on your iOS device, follow these steps:')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <p>1. {t("Tap the 'Share' button in Safari.")} (<Share className="inline-block h-4 w-4 mx-1" />)</p>
            <p>2. {t("Scroll down and tap 'Add to Home Screen'.")}</p>
            <p>3. {t("Tap 'Add' in the top-right corner.")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
    
