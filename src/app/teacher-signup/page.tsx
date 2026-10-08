'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Globe, Phone, MessageCircle, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import i18next from 'i18next';

const AuthHeader = () => {
  const isArabic = i18next.language === 'ar';

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar';
    i18next.changeLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('universe-lang', newLang);
    }
  };

  return (
    <header className="px-4 sm:px-8 py-3.5 flex justify-between items-center border-b border-[#cbd5e1]/80 backdrop-blur-md sticky top-0 z-40 bg-white/85 shadow-xs">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#2563eb] group-hover:scale-110 transition-transform" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0f172a]">
            {isArabic ? 'ملخصاتي' : 'Mol5saty'}
          </span>
          <span className="text-[9px] text-[#2563eb] font-bold tracking-wider uppercase">
            {isArabic ? 'بوابة الأساتذة والدكاترة' : 'FACULTY ONBOARDING'}
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        <button 
          onClick={toggleLanguage} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          <Globe className="w-3.5 h-3.5 text-[#2563eb]"/>
          <span>{isArabic ? 'English' : 'عربي'}</span>
        </button>
        <Link 
          href="/signup-options" 
          className="text-xs font-bold text-slate-600 hover:text-[#2563eb] px-3 py-1.5 border border-slate-300 hover:border-[#2563eb] bg-white rounded-xl transition-all shadow-xs"
        >
          {isArabic ? 'تغيير الدور' : 'Change Role'}
        </Link>
      </div>
    </header>
  );
};

export default function TeacherSignupContactPage() {
  const isArabic = i18next.language === 'ar';

  return (
    <div className={cn("min-h-screen bg-[#f0f4f9] text-[#0f172a] selection:bg-[#2563eb] selection:text-white flex flex-col justify-between", isArabic ? 'rtl' : 'ltr')}>
      <AuthHeader />
      <div className="flex flex-col flex-1 items-center justify-center p-4 py-12 max-w-xl mx-auto w-full">
        
        {/* Contact Info Card */}
        <Card className="w-full bg-white border-2 border-slate-200 shadow-xl shadow-blue-900/5 text-center rounded-3xl p-4 sm:p-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] shadow-xs">
                <GraduationCap className="w-9 h-9" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-[#0f172a]">
                  {isArabic ? 'انضمام الأساتذة ودكاترة الجامعات' : 'Join as a University Professor / Doctor'}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  {isArabic 
                    ? 'لفتح قناة أكاديمية، رفع محاضرات الفيديو المحمية، وإدارة طلاب الكليات، يرجى التواصل مع فريق التنسيق الأكاديمي.'
                    : 'To establish your verified academic channel, upload DRM-protected lectures, and enroll students, contact our academic onboarding team.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="https://wa.me/201201402632" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white p-3.5 rounded-xl transition-all font-bold text-sm shadow-md shadow-blue-500/20 flex-1"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: 01201402632</span>
              </a>
              <a 
                href="tel:01201402632" 
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-xl transition-all font-bold text-sm shadow-xs flex-1"
              >
                <Phone className="w-4 h-4" />
                <span>Call: 01201402632</span>
              </a>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
              <span>{isArabic ? 'اعتماد أكاديمي فوري لأساتذة الجامعات' : 'Instant Academic Verification for Faculty Staff'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs max-w-xl mx-auto w-full text-center text-slate-500 font-mono">
        MOL5SATY // FACULTY_ONBOARDING_2026
      </footer>
    </div>
  );
}
