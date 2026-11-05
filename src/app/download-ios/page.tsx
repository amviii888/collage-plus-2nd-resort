'use client';

import React from 'react';
import { Download, Apple, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DownloadIosPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-lg bg-[#131316] border border-[#27272a] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        
        {/* Apple Icon */}
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white shadow-inner">
          <Apple className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-white">
            حزمة تطبيق الآيفون (iOS Xcode Package)
          </h1>
          <p className="text-sm text-zinc-400">
            ملف المشروع الكامل جاهز للفتح في برنامج Xcode والرفع المباشر إلى TestFlight و App Store.
          </p>
        </div>

        {/* Big Download Button */}
        <div className="pt-2">
          <a
            href="/ios-project.zip"
            download="ios-project.zip"
            className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>تحميل ملف ios-project.zip الآن</span>
          </a>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono" dir="ltr">
            Size: ~165 KB • File: ios-project.zip
          </p>
        </div>

        {/* Included Checklist */}
        <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4 text-right space-y-2.5 text-xs text-zinc-300">
          <div className="font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ما تم تجهيزه وفحصه داخل الحزمة:</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>حظر تصوير وتسجيل الشاشة بشاشة سوداء على مستوى الهاردوير (Swift).</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>فتح نطاقات الفايربيس (Firebase) ومنع حظر WebKit للاتصال.</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>حل مشكلة الكيبورد في الآيفون عند إدخال كلمة المرور.</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>مشروع Xcode كامل (`ios/App/App.xcodeproj`) مدمج بالبلوجينز.</span>
          </div>
        </div>

        {/* Direct link copy */}
        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <span>أو يمكنك نسخ الرابط المباشر للتحميل:</span>
          <div className="mt-1.5 p-2 bg-zinc-900 rounded-xl font-mono text-[11px] text-emerald-400 select-all overflow-x-auto text-left" dir="ltr">
            /ios-project.zip
          </div>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للصفحة الرئيسية</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
