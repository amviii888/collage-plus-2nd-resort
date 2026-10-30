'use client';

import React from 'react';
import { ArrowLeft, BookOpen, ShieldCheck, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 p-4 md:p-8 flex justify-center">
      <Card className="max-w-4xl w-full bg-zinc-900 border-zinc-800 shadow-2xl p-4 md:p-6 space-y-6">
        <CardHeader className="p-0 pb-4 border-b border-zinc-800">
          <Button variant="ghost" size="sm" asChild className="pl-0 gap-1 text-zinc-400 hover:text-white mb-2">
            <Link href="/"><ArrowLeft className="w-4 h-4"/> Back to Home / العودة للرئيسية</Link>
          </Button>
          <CardTitle className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-emerald-400" />
            Terms of Service & EULA (شروط الخدمة واتفاقية الاستخدام)
          </CardTitle>
          <p className="text-xs text-zinc-400">منصة ملخصاتي الجامعية (Mol5saty) — Standard End User License Agreement (EULA)</p>
        </CardHeader>
        <CardContent className="p-0 space-y-6 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 1. Academic Content Usage (استخدام المحتوى الأكاديمي)
            </h2>
            <p>
              All university courses, educational video lectures, and lecture notes hosted on Mol5saty are the intellectual property of their respective professors and instructors. Materials are licensed solely for the enrolled student&apos;s personal academic study. Unauthorized recording, redistribution, or sharing of access credentials is strictly prohibited.
            </p>
            <p className="text-zinc-400 text-xs">
              جميع الكورسات الجامعية والمحاضرات والملخصات على منصة ملخصاتي هي حقوق فكرية محفوظة للأساتذة. المحتوى مخصص للدراسة الشخصية فقط، ويمنع منعاً باتاً تصوير أو مشاركة أو إعادة توزيع أي مادة علمية.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 2. Security & Anti-Piracy Compliance (الأمان ومكافحة القرصنة)
            </h2>
            <p>
              By accessing protected courses, students agree not to attempt bypassing security guards, DRM player restrictions, or screen protection mechanisms. Violations will result in immediate suspension of account privileges.
            </p>
            <p className="text-zinc-400 text-xs">
              يوافق الطالب عند استخدام المنصة على الالتزام بحماية المحتوى وعدم محاولة تخطي أنظمة الأمان الرقمية أو تصوير الشاشات.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 3. Student Account Deletion Right (حق حذف الحساب والبيانات)
            </h2>
            <p>
              In full compliance with Apple App Store Guideline 5.1.1(v) and global data protection regulations, students have the right to permanently delete their account and associated student records at any time directly through their in-app profile settings or via our dedicated web portal at{' '}
              <Link href="/delete-account" className="text-emerald-400 underline font-semibold">
                mol5saty.app/delete-account
              </Link>.
            </p>
            <p className="text-zinc-400 text-xs">
              يحق لكل طالب حذف حسابه وجميع بياناته الأكاديمية نهائياً في أي وقت من خلال إعدادات البروفايل أو عبر بوابة حذف الحسابات العامة.
            </p>
          </section>

          <section className="space-y-2 pt-2 border-t border-zinc-800 text-xs text-zinc-400 flex flex-wrap gap-4">
            <Link href="/privacy" className="text-emerald-400 hover:underline">
              Privacy Policy (سياسة الخصوصية)
            </Link>
            <Link href="/support" className="text-emerald-400 hover:underline">
              Support Center (مركز الدعم والمساعدة)
            </Link>
            <Link href="/delete-account" className="text-emerald-400 hover:underline">
              Delete Account Portal (بوابة حذف الحساب)
            </Link>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
