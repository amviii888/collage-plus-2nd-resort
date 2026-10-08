'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function QrCodePage() {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio-7131243333-e72f1.web.app';

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-md text-center shadow-2xl rounded-2xl bg-card border-border">
        <CardHeader>
          <QrCode className="mx-auto h-14 w-14 text-primary" />
          <CardTitle className="mt-2 text-2xl font-bold">Scan to Open App</CardTitle>
          <CardDescription>
            Point your camera at the code below to open the application on your mobile device.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 pt-0">
          <div className="rounded-2xl border-2 border-primary/40 p-4 bg-white shadow-xl flex items-center justify-center">
            <QRCodeSVG 
              value={appUrl}
              size={260}
              level="H"
              includeMargin={false}
              className="rounded-lg"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
