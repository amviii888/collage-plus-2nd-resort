'use client';

import React, { useMemo } from 'react';
import { useUser, useStudent } from '@/firebase';
import { usePathname } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';

export function GlobalStudentPassStamp() {
  const pathname = usePathname();
  const { user } = useUser();

  // Retrieve student identification from user session or cached local storage
  const localStudentId = typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null;
  const effectiveStudentId = user?.uid || localStudentId;
  const { student } = useStudent(effectiveStudentId || '');

  // Cached student profile fallback (zero latency & offline support)
  const localCachedStudent = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      if (effectiveStudentId) {
        const raw = localStorage.getItem('cached_student_profile_' + effectiveStudentId);
        if (raw) return JSON.parse(raw);
      }
      const rawGeneric = localStorage.getItem('student_profile') || localStorage.getItem('student_user_profile');
      if (rawGeneric) return JSON.parse(rawGeneric);
    } catch {}
    return null;
  }, [effectiveStudentId]);

  // Route restrictions: Never show on public, login, signup, or admin routes
  const isPublicOrAdminRoute = useMemo(() => {
    if (!pathname) return true;
    return (
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/teacher-signup') ||
      pathname.startsWith('/student-signup') ||
      pathname.startsWith('/signup-options') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/copyright')
    );
  }, [pathname]);

  const hasValidAccount = Boolean(user && !user.isAnonymous && (user.uid || user.email));
  const studentName = student?.name || user?.displayName || localCachedStudent?.name || (user?.email ? user.email.split('@')[0] : '');
  const studentCode = student?.barcodeId || localCachedStudent?.barcodeId || (user?.email?.includes('@universe.student') ? user.email.split('@')[0] : (user?.uid ? user.uid.slice(0, 8).toUpperCase() : ''));

  if (isPublicOrAdminRoute || !hasValidAccount || !studentCode || !studentName) {
    return null;
  }

  return (
    <div 
      id="global-student-pass-stamp"
      className="fixed bottom-4 right-4 z-40 pointer-events-none select-none p-2.5 rounded-2xl bg-black/85 border border-emerald-500/40 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-in fade-in duration-300"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="bg-white p-1 rounded-xl shadow-inner shrink-0">
        <QRCodeSVG value={studentCode} size={42} level="H" />
      </div>
      <div className="text-right font-mono leading-tight">
        <div className="text-[9px] text-emerald-400 font-extrabold tracking-wider uppercase flex items-center justify-end gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>SECURE DIGITAL PASS</span>
        </div>
        <div className="text-[11px] text-white font-bold max-w-[130px] truncate">
          {studentName}
        </div>
        <div className="text-[9px] text-zinc-400 font-mono">
          ID: {studentCode}
        </div>
      </div>
    </div>
  );
}
