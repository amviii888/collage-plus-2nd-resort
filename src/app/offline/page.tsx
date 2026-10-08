'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Home, QrCode, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/icons';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function OfflinePage() {
  const { t, i18n } = useTranslation();
  const [cachedStudent, setCachedStudent] = useState<{ name: string; barcodeId: string; grade?: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const studentId = localStorage.getItem('viewingStudentId') || localStorage.getItem('parentForStudentBarcode');
      const directBarcode = localStorage.getItem('studentBarcodeId');

      if (studentId) {
        const cachedRaw = localStorage.getItem('cached_student_profile_' + studentId) ||
          localStorage.getItem('student_profile_offline_' + studentId) ||
          localStorage.getItem('user-student-' + studentId);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed?.barcodeId || parsed?.id) {
            setCachedStudent({
              name: parsed.name || 'Scholar',
              barcodeId: parsed.barcodeId || parsed.id,
              grade: parsed.grade,
            });
            return;
          }
        }
      }

      if (directBarcode) {
        setCachedStudent({
          name: 'Student Pass',
          barcodeId: directBarcode,
        });
      }
    } catch (e) {
      console.error('Error reading cached student for offline QR:', e);
    }
  }, []);

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const isAr = i18n.language === 'ar';

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-[#09090b] p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(132,220,6,0.08)_0%,transparent_60%)] pointer-events-none" />

      <Card className="mx-auto w-full max-w-md text-center shadow-2xl border-zinc-800 bg-[#131316]/90 backdrop-blur-xl relative z-10 rounded-2xl overflow-hidden">
        <CardHeader className="space-y-4 pt-8 pb-3">
          <div className="mx-auto flex items-center justify-center">
            <Logo width={64} height={64} className="rounded-2xl shadow-lg border border-white/10" />
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-500 font-mono text-xs uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 py-1 px-3 rounded-full w-fit mx-auto">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{isAr ? 'وضع بدون اتصال' : 'OFFLINE MODE'}</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white font-['Syne',sans-serif]">
            {isAr ? 'أنت تعمل بدون اتصال' : "You're Offline"}
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
            {isAr
              ? 'بيانات الطلاب والدرجات وسجلات الحضور محفوظة بأمان محلياً على هذا الجهاز وسيتم مزامنتها تلقائياً عند استعادة الاتصال.'
              : 'Your student rosters, attendance records, and grades remain safely stored on this device and will automatically sync when connection returns.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          {/* Active Student Offline QR Pass if available */}
          {cachedStudent?.barcodeId && (
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-500/30 text-center space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {cachedStudent.name}
                </span>
                {cachedStudent.grade && (
                  <span className="text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full text-[10px]">
                    {cachedStudent.grade}
                  </span>
                )}
              </div>

              {/* Crisp offline SVG QR code */}
              <div className="bg-white p-3 rounded-xl inline-block shadow-md mx-auto">
                <QRCodeSVG
                  value={cachedStudent.barcodeId}
                  size={150}
                  level="H"
                  includeMargin={false}
                  className="rounded"
                />
              </div>

              <p className="text-xs font-mono font-bold text-zinc-300 tracking-wider">
                ID: {cachedStudent.barcodeId}
              </p>
            </div>
          )}

          <Button onClick={handleRefresh} className="w-full bg-[#84DC06] hover:bg-[#72C003] text-black font-semibold h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#84DC06]/20">
            <RefreshCw className="w-4 h-4" />
            <span>{isAr ? 'إعادة تحميل الصفحة' : 'Retry Connection'}</span>
          </Button>
          <Button asChild variant="outline" className="w-full border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 h-11 rounded-xl">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              <span>{isAr ? 'العودة للرئيسية' : 'Go to Home'}</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
