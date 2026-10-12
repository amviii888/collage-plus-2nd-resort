'use client';

import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 p-4 md:p-8 flex justify-center">
      <Card className="max-w-4xl w-full bg-zinc-900 border-zinc-800 shadow-2xl p-4 md:p-6 space-y-6">
        <CardHeader className="p-0 pb-4 border-b border-zinc-800">
          <Button variant="ghost" size="sm" asChild className="pl-0 gap-1 text-zinc-400 hover:text-white mb-2">
            <Link href="/"><ArrowLeft className="w-4 h-4"/> Back to Home</Link>
          </Button>
          <CardTitle className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Privacy Policy & Data Protection (سياسة الخصوصية)
          </CardTitle>
          <p className="text-xs text-zinc-400">Effective Date: October 2026 • Compliant with Apple App Review & Google Play Policies</p>
        </CardHeader>
        <CardContent className="p-0 space-y-6 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <Eye className="w-4 h-4" /> 1. Information We Collect
            </h2>
            <p>
              To provide university lecture streaming, DRM watermarking, and academic attendance tracking, Universe Academy collects:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Student Name, Barcode ID, and Student Phone Number.</li>
              <li>Enrolled course watch history and quiz attempt scores.</li>
              <li>Device security tokens for screenshot/screen recording protection.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <Lock className="w-4 h-4" /> 2. Academic DRM & Security Protections
            </h2>
            <p>
              Protected video streams enforce dynamic student ID watermarking, screenshot blocking, and restriction of external wireless display mirroring (Apple AirPlay) to safeguard educational content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 3. Account & Data Deletion Rights
            </h2>
            <p>
              In accordance with Apple App Store Guideline 5.1.1(v) and Google Play Data Safety policies, students can request full deletion of their account and personal data at any time via the in-app settings or directly at <Link href="/delete-account" className="text-emerald-400 underline font-bold">/delete-account</Link>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
