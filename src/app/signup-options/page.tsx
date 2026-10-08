'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Globe, ArrowLeft, ArrowRight, BookOpen, GraduationCap, Users, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SignUpOptionsPage() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mola5saty_theme') || localStorage.getItem('app_mode_dark');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      localStorage.setItem('mola5saty_theme', next ? 'dark' : 'light');
      localStorage.setItem('app_mode_dark', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('app_theme_changed'));
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const nextLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mola5saty-lang', nextLang);
    }
  };

  const roles = [
    {
      href: '/student-signup',
      title: isArabic ? 'طالب جامعي' : 'University Student',
      subtitle: isArabic ? 'الكليات والمعاهد العليا' : 'Undergraduate & Graduate',
      desc: isArabic
        ? 'الوصول لملخصات المحاضرات الكبسولية، بنوك الأسئلة الإكلينيكية، وتسجيلات الدكاترة المعتمدة.'
        : 'Access high-yield lecture summaries, clinical question banks, and verified professor recordings.',
      badge: isArabic ? 'دراسة وتفوق' : 'Learn & Excel',
      icon: <GraduationCap className="w-8 h-8 text-[#2563eb] dark:text-blue-400" />,
      accentColor: '#2563eb'
    },
    {
      href: '/teacher-signup',
      title: isArabic ? 'دكتور / أستاذ جامعي' : 'Professor / Doctor',
      subtitle: isArabic ? 'أعضاء هيئة التدريس' : 'Faculty & Academic Staff',
      desc: isArabic
        ? 'إنشاء المقررات الأكاديمية، رفع المحاضرات المحمية ضد التسريب، واعتماد طلبات انضمام الطلاب.'
        : 'Publish academic courses, upload DRM-protected lectures, and approve student enrollment requests.',
      badge: isArabic ? 'إدارة وتدريس' : 'Teach & Lead',
      icon: <BookOpen className="w-8 h-8 text-[#1d4ed8] dark:text-blue-500" />,
      accentColor: '#1d4ed8'
    },
    {
      href: '/assistant-login',
      title: isArabic ? 'مساعد أكاديمي' : 'Teaching Assistant',
      subtitle: isArabic ? 'إشراف ومتابعة القاعات' : 'Course Operations & Rounds',
      desc: isArabic
        ? 'تسجيل حضور قاعات المحاضرات، مسح باركود الطلاب، ومتابعة الاستفسارات نيابة عن الدكتور.'
        : 'Manage lecture hall attendance, scan student barcodes, and coordinate student questions for the professor.',
      badge: isArabic ? 'دعم وتشغيل' : 'Ops & Support',
      icon: <Users className="w-8 h-8 text-[#0284c7] dark:text-cyan-400" />,
      accentColor: '#0284c7'
    }
  ];

  return (
    <div 
      className="min-h-screen bg-white dark:bg-[#070b14] text-[#0f172a] dark:text-slate-100 selection:bg-[#2563eb] selection:text-white relative flex flex-col justify-between transition-colors" 
      dir={isArabic ? 'rtl' : 'ltr'} 
      id="signup-options-root"
    >
      {/* Background Soft Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[400px] bg-gradient-to-b from-[#dbeafe]/80 dark:from-blue-950/30 via-[#eff6ff]/40 dark:via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#e0f2fe]/60 dark:bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="px-4 sm:px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <Link 
          href="/" 
          className="flex items-center gap-2.5 group select-none" 
          id="brand-title"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[9px] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#2563eb] group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0f172a] dark:text-white">
              {isArabic ? 'ملخصاتي' : 'Mola5saty'}
            </span>
            <span className="text-[9px] text-[#2563eb] dark:text-blue-400 font-bold tracking-wider uppercase">
              {isArabic ? 'بوابة الكليات' : 'COLLEGE PORTAL'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3" id="signup-header-actions">
          <button
            onClick={toggleTheme}
            type="button"
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
            id="signup-lang-toggle-btn"
          >
            <Globe className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>{isArabic ? 'English' : 'عربي'}</span>
          </button>

          <Link 
            href="/" 
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#2563eb] hover:text-[#2563eb] bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1 shadow-xs active:scale-95" 
            id="back-to-home"
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
            <span>{isArabic ? 'الرئيسية' : 'Home'}</span>
          </Link>
        </div>
      </header>

      {/* Main Role Selection */}
      <main className="px-4 sm:px-6 py-12 max-w-5xl mx-auto w-full my-auto">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[#1d4ed8] dark:text-blue-300 text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isArabic ? 'بوابة التسجيل الأكاديمية' : 'SECURE COLLEGE ACCESS'}</span>
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f172a] dark:text-white tracking-tight">
            {isArabic ? (
              <>
                اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] dark:from-blue-400 dark:to-indigo-300">نوع حسابك</span> الأكاديمي
              </>
            ) : (
              <>
                Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] dark:from-blue-400 dark:to-indigo-300">Account Role</span>
              </>
            )}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#475569] dark:text-slate-400 leading-relaxed">
            {isArabic
              ? 'حدد دورك الأكاديمي داخل المنصة للبدء في تخصيص واجهتك وصلاحياتك الجامعية.'
              : 'Select your role to access customized university course summaries and clinical tools.'}
          </p>
        </div>

        {/* 3 Streamlined Roles (Student, Professor, Assistant) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="signup-grid">
          {roles.map((role, index) => (
            <motion.div
              key={role.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
            >
              <Link 
                href={role.href} 
                className="h-full bg-white dark:bg-[#0b1329] rounded-3xl border-2 border-slate-200 dark:border-slate-800 hover:border-[#2563eb] dark:hover:border-blue-500 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between group relative overflow-hidden"
                id={`role-card-${index}`}
              >
                {/* Top Ambient Glow */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20 dark:opacity-30 group-hover:opacity-40 transition-opacity" 
                  style={{ backgroundColor: role.accentColor }}
                />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                      {role.icon}
                    </div>
                    <span 
                      className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-[#1d4ed8] dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    >
                      {role.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[#0f172a] dark:text-white mb-1 group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors">
                    {role.title}
                  </h3>
                  
                  <div className="text-xs font-bold text-[#64748b] dark:text-slate-400 mb-3">
                    {role.subtitle}
                  </div>

                  <p className="text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
                    {role.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#2563eb] dark:text-blue-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  <span>{isArabic ? 'تسجيل الدخول / إنشاء حساب' : 'Continue to Portal'}</span>
                  {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b14] text-xs max-w-5xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center gap-3 text-slate-500 dark:text-slate-400">
        <div className="font-mono text-[11px]">
          MOLA5SATY // COLLEGE_SYS_2026
        </div>
        
        <div className="flex items-center gap-1.5 text-sm">
          <span>{isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}</span>
          <Link 
            href="/login" 
            className="text-[#2563eb] dark:text-blue-400 font-bold hover:underline"
            id="signup-login-link"
          >
            {isArabic ? 'تسجيل الدخول' : 'Sign In'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
