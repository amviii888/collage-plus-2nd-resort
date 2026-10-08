'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useTranslation } from 'react-i18next';
import { VideoOff } from 'lucide-react';

interface CameraBarcodeScannerProps {
  onScan: (text: string) => void;
  className?: string;
}

export function CameraBarcodeScanner({ onScan, className }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Provide hints to the reader to improve performance.
    // This limits the formats it tries to detect.
    const hints = new Map();
    const formats = [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.CODE_39,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    
    const reader = new BrowserMultiFormatReader(hints);
    let controls: IScannerControls | null = null;
    let isMounted = true;

    const startScan = async () => {
      try {
        if (!isMounted || !videoRef.current) return;

        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (!isMounted) return;

          if (result) {
            onScan(result.getText());
          }

          // Don't show an error if a barcode is not found, as this happens continuously during scanning.
          if (err && !(err instanceof NotFoundException)) {
            console.error('Decode error:', err);
            setError(t('An error occurred while scanning.'));
          }
        });
        
      } catch (err: any) {
        if (isMounted) {
          console.error("Camera Error:", err);
          let message = t("Camera access denied or no camera found.");
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              message = t('Camera permission was denied. Please enable it in your browser settings.');
          } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
              message = t('No suitable camera was found on this device.');
          }
          setError(message);
        }
      }
    };

    startScan();

    return () => {
      isMounted = false;
      if (controls) {
        controls.stop();
      }
    };
  }, [onScan, t]);

  return (
    <div className={`relative w-full aspect-video rounded-md bg-black overflow-hidden ${className}`}>
      <video ref={videoRef} className="w-full h-full object-cover" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 rounded-md text-center">
          <VideoOff className="h-8 w-8 mb-2" />
          <p className="font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}
