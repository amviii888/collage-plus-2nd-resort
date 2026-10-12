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
            <Link href="/"><ArrowLeft className="w-4 h-4"/> Back to Home</Link>
          </Button>
          <CardTitle className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-emerald-400" />
            Terms of Service & EULA (الشروط والأحكام)
          </CardTitle>
          <p className="text-xs text-zinc-400">Universe Academy Standard End User License Agreement</p>
        </CardHeader>
        <CardContent className="p-0 space-y-6 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 1. Academic Content Usage
            </h2>
            <p>
              All university courses, DRM video lectures, and assessments hosted on Universe Academy are intellectual property of their respective professors. Unauthorized recording, redistribution, or sharing of access credentials is strictly prohibited.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 2. Security & Anti-Piracy
            </h2>
            <p>
              By accessing protected courses, users agree not to attempt bypassing screen watermarks, devtools inspection guards, or screen recording restrictions. Violations may result in account termination.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
