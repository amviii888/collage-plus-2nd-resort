'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Zap, 
  ShieldCheck, 
  BookOpen, 
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Cpu,
  GraduationCap,
  Award,
  Users,
  TrendingUp,
  Sun,
  Moon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isStudentEmail } from '@/lib/auth-helpers';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!(
        localStorage.getItem('viewingStudentId') ||
        localStorage.getItem('mola5saty_active_student_profile') ||
        localStorage.getItem('student_logged_in') ||
        localStorage.getItem('assistantTeacherName') ||
        localStorage.getItem('admin-session')
      );
    }
    return false;
  });

  // Automatic account detection & skip landing page
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewingStudentId = localStorage.getItem('viewingStudentId');
    const hasStudentProfile = localStorage.getItem('mola5saty_active_student_profile');
    const assistant = localStorage.getItem('assistantTeacherName');
    const admin = localStorage.getItem('admin-session');

    if (assistant) {
      setIsRedirecting(true);
      window.location.replace('/assistant/dashboard');
      return;
    }
    if (admin) {
      setIsRedirecting(true);
      window.location.replace('/admin/dashboard');
      return;
    }
    if (viewingStudentId || hasStudentProfile) {
      setIsRedirecting(true);
      window.location.replace('/profile');
      return;
    }

    if (!isUserLoading && user) {
      setIsRedirecting(true);
      if (isStudentEmail(user.email) || user.isAnonymous) {
        window.location.replace('/profile');
      } else {
        window.location.replace('/teacher');
      }
    }
  }, [user, isUserLoading]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('mola5saty_theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('mola5saty_theme', next ? 'dark' : 'light');
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const toggleLanguage = () => {
    const nextLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faculties = [
    {
      nameAr: 'الطب البشري',
      nameEn: 'Human Medicine',
      descAr: 'محاضرات التشريح، الباثولوجي، الفارماكولوجي، والجراحة السريرية مع ملخصات دورية شاملة.',
      descEn: 'Anatomy, Pathology, Pharmacology, and Clinical Surgery lectures with comprehensive high-yield summaries.',
      icon: '🩺',
      tag: 'Clinical Medicine'
    },
    {
      nameAr: 'طب الفم والأسنان',
      nameEn: 'Dentistry',
      descAr: 'مقررات التركيبات الثابتة، علاج الجذور، وجراحة الفم مع أطالس تفاعلية للحالات السريرية.',
      descEn: 'Operative dentistry, prosthodontics, and oral surgery with interactive clinical case atlases.',
      icon: '🦷',
      tag: 'Oral Sciences'
    },
    {
      nameAr: 'الصيدلة الإكلينيكية',
      nameEn: 'Clinical Pharmacy',
      descAr: 'كيمياء الأدوية، السموم، والجرعات السريرية منظمة في كبسولات دراسية سريعة الحفظ.',
      descEn: 'Medicinal chemistry, toxicology, and clinical dosing organized in high-efficiency memory capsules.',
      icon: '💊',
      tag: 'Pharmaceuticals'
    },
    {
      nameAr: 'الهندسة وتكنولوجيا المعلومات',
      nameEn: 'Engineering & CS',
      descAr: 'شروحات الخوارزميات، الدوائر الكهربائية، وهندسة البرمجيات مع ملفات الأكواد والمشاريع.',
      descEn: 'Algorithms, electrical circuits, and software engineering with companion source repositories.',
      icon: '⚡',
      tag: 'Tech & Applied Math'
    },
    {
      nameAr: 'إدارة الأعمال والاقتصاد',
      nameEn: 'Business & Economics',
      descAr: 'المحاسبة المتقدمة، التحليل المالي، واستراتيجيات التسويق الحديثة بأسلوب مبسط وشامل.',
      descEn: 'Advanced accounting, financial analytics, and modern business strategy simplified.',
      icon: '📊',
      tag: 'Finance & Strategy'
    },
    {
      nameAr: 'الحقوق والعلوم القانونية',
      nameEn: 'Law & Jurisprudence',
      descAr: 'القوانين المدنية والجنائية والتشريعات التجارية ملخصة في خرائط ذهنية سهلة المراجعة.',
      descEn: 'Civil, criminal, and commercial law organized into intuitive review mind maps.',
      icon: '⚖️',
      tag: 'Legal Studies'
    }
  ];

  const features = [
    {
      titleAr: 'كبسولات وملخصات جامعية مركزة',
      titleEn: 'High-Yield Academic Summaries',
      descAr: 'ملخصات مصممة على أيدي أوائل الدفعات والمشرفين الأكاديميين لتوفير ساعات من القراءة المعقدة قبل الامتحانات.',
      descEn: 'Curated summaries created by top honor students and professors to condense hundreds of textbook pages before finals.',
      badgeAr: 'ملخصات ذهبية',
      badgeEn: 'High Yield',
      icon: <BookOpen className="w-6 h-6 text-[#2563eb]" />
    },
    {
      titleAr: 'قنوات الأساتذة ودكاترة الجامعات',
      titleEn: 'Doctor & Professor Direct Channels',
      descAr: 'تواصل مباشر مع أساتذة المقررات، الحصول على تسجيلات المحاضرات الرسمية، وتلقي الإشعارات الفورية بالمذكرات.',
      descEn: 'Direct pipeline to course professors, lecture recordings, official handouts, and real-time announcements.',
      badgeAr: 'أكاديمي معتمد',
      badgeEn: 'Direct Faculty',
      icon: <GraduationCap className="w-6 h-6 text-[#1d4ed8]" />
    },
    {
      titleAr: 'بث فيديو فائق الأمان ومضاد للتسريب',
      titleEn: 'Fortress Anti-Piracy Video Streaming',
      descAr: 'تقنية حماية المحتوى من التسجيل والسرقة مع علامة مائية ديناميكية مشفرة باسم ورقم كل طالب لمنع تسريب المادة.',
      descEn: 'Tokenized DRM video streaming with dynamic floating student watermarks to protect proprietary medical lectures.',
      badgeAr: 'حماية مشفرة',
      badgeEn: 'DRM Protected',
      icon: <ShieldCheck className="w-6 h-6 text-[#0284c7]" />
    },
    {
      titleAr: 'بنوك الأسئلة والتدريب السريري',
      titleEn: 'Clinical MCQs & Interactive Question Banks',
      descAr: 'تدرب على آلاف الأسئلة الامتحانية للأعوام السابقة مع توضيحات علمية فورية لكل إجابة ورصد دقيق لمستوى تقدمك.',
      descEn: 'Practice past university exam questions with instant clinical rationales and performance analytics.',
      badgeAr: 'اختبارات فورية',
      badgeEn: 'Exam Ready',
      icon: <Award className="w-6 h-6 text-[#2563eb]" />
    },
    {
      titleAr: 'نظام طلب الانضمام المباشر للمقررات',
      titleEn: 'Direct Course Access Requests',
      descAr: 'انضم لمجموعاتك الجامعية بضغطة زر واحدة دون الحاجة لأكواد ورقية معقدة؛ يوافق الأستاذ وتظهر مقرراتك فوراً.',
      descEn: 'Submit 1-tap course enrollment requests without paper coupons; access is instantly granted upon professor approval.',
      badgeAr: 'وصول فوري',
      badgeEn: '1-Tap Join',
      icon: <Users className="w-6 h-6 text-[#1d4ed8]" />
    },
    {
      titleAr: 'تجربة سريعة وتعمل بدون إنترنت',
      titleEn: 'Offline-First Smart Sync Engine',
      descAr: 'حمّل ملخصاتك وتصفح مذكراتك داخل مدرجات الجامعة حتى في ظل انقطاع شبكة الهاتف أو ضعف التغطية.',
      descEn: 'Access downloaded summaries and handouts inside university lecture halls even with zero mobile network reception.',
      badgeAr: 'أوفلاين بالكامل',
      badgeEn: 'Offline First',
      icon: <Zap className="w-6 h-6 text-[#0284c7]" />
    }
  ];

  const faqItems = [
    {
      qAr: 'ما هي منصة ملخصاتي (Mola5saty)؟',
      qEn: 'What is Mola5saty?',
      aAr: 'ملخصاتي هي المنصة الجامعية المتطورة المخصصة لطلاب الكليات وأساتذة الجامعات، حيث توفر ملخصات كبسولية للمحاضرات، تسجيلات آمنة، بنوك أسئلة تدريبية، وتواصلاً مباشراً مع الأساتذة والمساعدين.',
      aEn: 'Mola5saty is the modern university academic hub connecting college students with professors, offering high-yield lecture summaries, protected video streaming, question banks, and direct course requests.'
    },
    {
      qAr: 'كيف يمكن للطالب الانضمام لمقرر دراسي أو ملخص معين؟',
      qEn: 'How does a student join a course or access summaries?',
      aAr: 'من خلال البحث عن اسم الأستاذ أو الكلية والقسم، ثم الضغط على "طلب انضمام". بمجرد اعتماد الأستاذ للطلب يظهر المحتوى بالكامل في حساب الطالب.',
      aEn: 'Search for the professor or faculty department, click "Request Access", and the entire course repository becomes available once approved.'
    },
    {
      qAr: 'هل يمكن تشغيل المنصة كتطبيق أصلي على هواتف iPhone و Android؟',
      qEn: 'Can the platform run as a native mobile app on iPhone and Android?',
      aAr: 'نعم، تم تزويد المنصة بحاوية Capacitor المتوافقة مع معايير App Store 4.2 لتعمل بتجربة تطبيق كامل ومستقل مع دعم الإشعارات وحفظ الملفات.',
      aEn: 'Yes! The platform is packaged with a dedicated Capacitor wrapper built for iOS App Store and Android with push alerts and safe-area optimization.'
    },
    {
      qAr: 'كيف تضمن المنصة حماية فيديوهات ومذكرات الدكاترة من التسريب؟',
      qEn: 'How does Mola5saty protect professor videos and lecture handouts?',
      aAr: 'نطبق نظام حماية متعدد الطبقات يشمل علامات مائية عائمة برقم الطالب ورمز جهازه، بجانب منع التقاط الشاشة وحظر التحميل غير المصرح به.',
      aEn: 'We deploy a multi-layered DRM system including floating dynamic student watermarks, native screenshot blanking, and tokenized playback.'
    }
  ];

  if (isRedirecting) {
    return (
      <div 
        className="min-h-screen bg-[#06080e] flex flex-col items-center justify-center p-6 text-center select-none" 
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col items-center gap-5 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-0.5 shadow-2xl shadow-blue-500/30 flex items-center justify-center animate-pulse">
            <div className="w-full h-full bg-[#0a1120] rounded-[14px] flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-[#3b82f6]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {isArabic ? 'جاري توجيهك إلى حسابك مباشرة...' : 'Directing straight to your account...'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {isArabic ? 'تم التعرف على حسابك، يتم تخطي الصفحة الرئيسية تلقائياً.' : 'Active session found. Skipping the landing page automatically.'}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span className="text-[11px] font-mono text-blue-400">
              {isArabic ? 'مرحباً بعودتك إلى ملخصاتي' : 'Welcome back to Mola5saty'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveSession = typeof window !== 'undefined' && !!(localStorage.getItem('viewingStudentId') || user);
  const portalHref = hasActiveSession ? '/profile' : '/signup-options';
  const portalLabel = hasActiveSession 
    ? (isArabic ? 'بوابتي الجامعية' : 'My Student Portal') 
    : (isArabic ? 'انضم للمنصة' : 'Get Started');
  const heroCtaLabel = hasActiveSession
    ? (isArabic ? 'الدخول لحسابي مباشرة' : 'Open My College Portal')
    : (isArabic ? 'ابدأ الآن مجاناً' : 'Join Your College Portal');

  return (
    <div 
      className={`min-h-screen font-sans selection:bg-[#2563eb] selection:text-white relative overflow-hidden transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#06080e] text-[#f8fafc]' 
          : 'bg-[#f0f4f9] text-[#0f172a]'
      }`} 
      dir={isArabic ? 'rtl' : 'ltr'}
      id="mola5saty-landing"
    >
      {/* Background Soft Ambiance: Rich Navy Blue & Sky Accents */}
      <div 
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1300px] h-[550px] blur-3xl pointer-events-none -z-10 transition-opacity ${
          isDarkMode 
            ? 'bg-gradient-to-b from-[#1d4ed8]/20 via-[#2563eb]/10 to-transparent' 
            : 'bg-gradient-to-b from-[#bfdbfe]/60 via-[#dbeafe]/30 to-transparent'
        }`} 
      />
      <div 
        className={`absolute top-[25%] -left-[100px] w-[450px] h-[450px] rounded-full blur-[130px] pointer-events-none -z-10 transition-opacity ${
          isDarkMode ? 'bg-[#3b82f6]/10' : 'bg-[#93c5fd]/30'
        }`} 
      />
      <div 
        className={`absolute top-[50%] -right-[100px] w-[450px] h-[450px] rounded-full blur-[130px] pointer-events-none -z-10 transition-opacity ${
          isDarkMode ? 'bg-[#1e40af]/15' : 'bg-[#bfdbfe]/35'
        }`} 
      />

      {/* Floating Modern Header */}
      <header className="sticky top-4 z-50 max-w-[1240px] mx-auto px-4 sm:px-6">
        <div 
          className={`backdrop-blur-xl rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl transition-all ${
            isDarkMode 
              ? 'bg-[#0b0f19]/80 border border-white/10 shadow-black/40' 
              : 'bg-white/85 border border-[#cbd5e1]/80 shadow-blue-900/5'
          }`}
        >
          
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
              <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${isDarkMode ? 'bg-[#06080e]' : 'bg-white'}`}>
                <BookOpen className="w-5 h-5 text-[#2563eb] group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`font-extrabold text-xl sm:text-2xl tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0f172a]'}`}>
                  {isArabic ? 'ملخصاتي' : 'Mola5saty'}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse" />
              </div>
              <span className="text-[10px] text-[#2563eb] font-bold tracking-wider uppercase">
                {isArabic ? 'المنصة الجامعية الذكية' : 'College Academic Portal'}
              </span>
            </div>
          </Link>

          {/* Nav Anchors */}
          <nav className={`hidden md:flex items-center gap-6 text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <a href="#faculties" className="hover:text-[#2563eb] transition-colors">
              {isArabic ? 'الكليات والأقسام' : 'Faculties'}
            </a>
            <a href="#features" className="hover:text-[#2563eb] transition-colors">
              {isArabic ? 'المميزات' : 'Features'}
            </a>
            <a href="#faq" className="hover:text-[#2563eb] transition-colors">
              {isArabic ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
            <a href="#founders" className="hover:text-[#2563eb] transition-colors">
              {isArabic ? 'المؤسسون' : 'Leadership'}
            </a>
          </nav>

          {/* Action Buttons, Theme Switcher & Language Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDarkMode 
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-amber-300' 
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-blue-700'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 shadow-xs active:scale-95 ${
                isDarkMode 
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300' 
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
              }`}
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>{isArabic ? 'English' : 'عربي'}</span>
            </button>

            <Link
              href="/login"
              className={`hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs ${
                isDarkMode 
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' 
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-900 font-bold'
              }`}
            >
              {isArabic ? 'تسجيل الدخول' : 'Sign In'}
            </Link>

            <Link
              href={portalHref}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5"
            >
              <span>{portalLabel}</span>
              {isArabic ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </Link>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-[1240px] mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex flex-wrap items-center justify-center gap-2.5 mb-6"
        >
          {/* Teacher Badge */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-xs ${
            isDarkMode 
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' 
              : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}>
            <GraduationCap className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>{isArabic ? 'للأساتذة والمحاضرين' : 'Professors & Faculty'}</span>
          </div>

          <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>•</span>

          {/* Student Badge */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-xs ${
            isDarkMode 
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' 
              : 'border-indigo-200 bg-indigo-50 text-indigo-800'
          }`}>
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isArabic ? 'لطلاب جميع الكليات' : 'All College Students'}</span>
          </div>

          <span className={`hidden sm:inline text-xs font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>•</span>

          {/* Universities Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold shadow-xs ${
            isDarkMode 
              ? 'border-slate-700 bg-slate-800/80 text-slate-300' 
              : 'border-slate-300 bg-white text-slate-700'
          }`}>
            <BookOpen className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>{isArabic ? 'جميع الجامعات والمعاهد 2026' : 'ALL UNIVERSITIES 2026'}</span>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl mx-auto leading-[1.15] ${
            isDarkMode ? 'text-white' : 'text-[#0a152d]'
          }`}
        >
          {isArabic ? (
            <>
              طريقك الأسرع للتفوق في <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]">المدرجات والامتحانات</span>
            </>
          ) : (
            <>
              Master Every Lecture with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]">Mola5saty</span>
            </>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`mt-6 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {isArabic 
            ? 'كبسولات دراسية مكثفة، تسجيلات أساتذة الجامعات المعتمدة، وبنوك أسئلة شاملة مصممة خصيصاً لطلاب جميع الكليات العملية والنظرية.'
            : 'Concise high-yield summaries, verified university professor lectures, and comprehensive exam question banks tailored for all college students.'}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href={portalHref}
            className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <span>{heroCtaLabel}</span>
            {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </Link>
          <a
            href="#faculties"
            className={`px-7 py-3.5 rounded-xl border font-bold text-sm sm:text-base transition-all shadow-xs ${
              isDarkMode 
                ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' 
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
            }`}
          >
            {isArabic ? 'تصفح الكليات المتاحة' : 'Browse Faculties'}
          </a>
        </motion.div>

        {/* Quick Trust Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className={`mt-12 pt-8 border-t grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-3xl mx-auto ${
            isDarkMode ? 'border-white/10' : 'border-slate-300'
          }`}
        >
          <div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>100%</div>
            <div className={`text-xs mt-1 font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isArabic ? 'حماية ضد التسريب' : 'DRM Protected'}</div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>24/7</div>
            <div className={`text-xs mt-1 font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isArabic ? 'تشغيل أوفلاين' : 'Offline Access'}</div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>1-Tap</div>
            <div className={`text-xs mt-1 font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isArabic ? 'طلب انضمام فوري' : 'Course Join'}</div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>iOS & Web</div>
            <div className={`text-xs mt-1 font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{isArabic ? 'تطبيق آيفون وأندرويد' : 'Native Container'}</div>
          </div>
        </motion.div>
      </section>

      {/* Faculties Explorer Section */}
      <section className="py-16 px-4 sm:px-6 max-w-[1240px] mx-auto scroll-mt-24" id="faculties">
        <div className="text-center mb-10">
          <span className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
            isDarkMode 
              ? 'text-[#60a5fa] bg-blue-500/10 border-blue-500/20' 
              : 'text-[#1e40af] bg-blue-100 border-blue-200'
          }`}>
            {isArabic ? 'التخصصات الجامعية' : 'COLLEGE DEPARTMENTS'}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black mt-3 ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>
            {isArabic ? 'الكليات والأقسام الأكاديمية' : 'Explore Your Faculty'}
          </h2>
          <p className={`text-sm mt-2 max-w-xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {isArabic 
              ? 'مناهج مصنفة طبقاً للوائح الجامعات الحكومية والخاصة مع مذكرات مخصصة لكل فرقة دراسية.'
              : 'Structured academic tracks tailored for public and private universities with dedicated course repositories.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {faculties.map((fac, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`p-6 rounded-2xl border-2 transition-all group hover:-translate-y-1 relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-[#0b0f19]/90 border-white/10 hover:border-blue-500/50' 
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-3xl p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-blue-50 border-blue-100'}`}>
                  {fac.icon}
                </span>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border ${
                  isDarkMode 
                    ? 'text-[#93c5fd] bg-blue-900/30 border-blue-500/30' 
                    : 'text-[#1e40af] bg-blue-100 border-blue-200'
                }`}>
                  {fac.tag}
                </span>
              </div>
              <h3 className={`text-xl font-bold mb-2 group-hover:text-[#2563eb] transition-colors ${
                isDarkMode ? 'text-white' : 'text-[#0a152d]'
              }`}>
                {isArabic ? fac.nameAr : fac.nameEn}
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {isArabic ? fac.descAr : fac.descEn}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-16 px-4 sm:px-6 max-w-[1240px] mx-auto scroll-mt-24" id="features">
        <div className="text-center mb-12">
          <span className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
            isDarkMode 
              ? 'text-[#60a5fa] bg-blue-500/10 border-blue-500/20' 
              : 'text-[#1e40af] bg-blue-100 border-blue-200'
          }`}>
            {isArabic ? 'تقنيات متقدمة' : 'PLATFORM ARCHITECTURE'}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black mt-3 ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>
            {isArabic ? 'بنية تحتية مصممة للتميز الأكاديمي' : 'Engineered for Academic Excellence'}
          </h2>
          <p className={`text-sm mt-2 max-w-xl mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {isArabic 
              ? 'كل ما يحتاجه الدكتور والطالب لتنظيم الحصص، الامتحانات، وتداول الملخصات بأقصى سرعة وأمان.'
              : 'Everything professors and students need to organize lectures, tests, and clinical files with peak speed and security.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`p-6 rounded-2xl border-2 transition-all group ${
                isDarkMode 
                  ? 'bg-[#0b0f19]/70 border-white/10 hover:border-blue-500/50' 
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl border group-hover:scale-110 transition-transform ${
                  isDarkMode 
                    ? 'bg-blue-500/10 border-blue-500/20' 
                    : 'bg-blue-100/70 border-blue-200'
                }`}>
                  {feat.icon}
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                  isDarkMode 
                    ? 'text-[#60a5fa] bg-blue-500/10 border-blue-500/30' 
                    : 'text-[#1e40af] bg-blue-100 border-blue-200'
                }`}>
                  {isArabic ? feat.badgeAr : feat.badgeEn}
                </span>
              </div>
              <h3 className={`text-lg font-bold mb-2 group-hover:text-[#2563eb] transition-colors ${
                isDarkMode ? 'text-white' : 'text-[#0a152d]'
              }`}>
                {isArabic ? feat.titleAr : feat.titleEn}
              </h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {isArabic ? feat.descAr : feat.descEn}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 max-w-[850px] mx-auto scroll-mt-24" id="faq">
        <div className="text-center mb-10">
          <span className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
            isDarkMode 
              ? 'text-[#60a5fa] bg-blue-500/10 border-blue-500/20' 
              : 'text-[#1e40af] bg-blue-100 border-blue-200'
          }`}>
            {isArabic ? 'إجابات مباشرة' : 'FREQUENTLY ASKED'}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black mt-3 ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>
            {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="space-y-3.5">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index}
                className={`border rounded-2xl overflow-hidden transition-colors ${
                  isDarkMode 
                    ? 'border-white/10 bg-[#0b0f19]/80 hover:border-blue-500/30' 
                    : 'border-slate-300 bg-white hover:border-blue-400 shadow-xs'
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                  style={{ textAlign: isArabic ? 'right' : 'left' }}
                >
                  <span className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>
                    {isArabic ? item.qAr : item.qEn}
                  </span>
                  <ChevronDown 
                    className={`w-5 h-5 text-[#2563eb] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-6 pb-5 pt-1 text-sm leading-relaxed border-t ${
                        isDarkMode 
                          ? 'text-slate-300 border-white/5' 
                          : 'text-slate-600 border-slate-100'
                      }`}>
                        {isArabic ? item.aAr : item.aEn}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Founders & Leadership Section */}
      <section className="py-16 px-4 sm:px-6 max-w-[1000px] mx-auto scroll-mt-24" id="founders">
        <div className="text-center mb-10">
          <span className={`text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
            isDarkMode 
              ? 'text-[#60a5fa] bg-blue-500/10 border-blue-500/20' 
              : 'text-[#1e40af] bg-blue-100 border-blue-200'
          }`}>
            {isArabic ? 'القيادة والمؤسسون' : 'FOUNDERS & ARCHITECTS'}
          </span>
          <h2 className={`text-3xl sm:text-4xl font-black mt-3 ${isDarkMode ? 'text-white' : 'text-[#0a152d]'}`}>
            {isArabic ? 'فريق العمل والقيادة' : 'Leadership & Architecture'}
          </h2>
          <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {isArabic 
              ? 'يقود منصة ملخصاتي نخبة من المطورين والخبراء الأكاديميين لبناء أفضل بيئة جامعية رقمية.'
              : 'Engineered and led by passionate software architects and academic leaders.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: amviii8 */}
          <div className={`p-7 rounded-2xl border-2 transition-all group relative overflow-hidden ${
            isDarkMode 
              ? 'bg-[#0b0f19] border-blue-500/30 hover:border-blue-400 shadow-xl shadow-blue-950/20' 
              : 'bg-white border-blue-200 hover:border-blue-500 shadow-lg shadow-blue-500/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                isDarkMode 
                  ? 'text-[#60a5fa] bg-blue-900/30 border-blue-500/30' 
                  : 'text-[#1e40af] bg-blue-100 border-blue-200'
              }`}>
                #01_FOUNDER
              </span>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs font-mono ${
                isDarkMode 
                  ? 'bg-blue-500/10 border-blue-500/30 text-[#60a5fa]' 
                  : 'bg-blue-100/70 border-blue-200 text-[#2563eb]'
              }`}>
                AV
              </div>
            </div>
            <h3 className={`text-2xl font-black mb-2 group-hover:text-[#2563eb] transition-colors ${
              isDarkMode ? 'text-white' : 'text-[#0a152d]'
            }`}>
              amviii8
            </h3>
            <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {isArabic 
                ? "المؤسس ومطور النظام — قام ببناء تطبيق المنصة، البنية التحتية البرمجية، وأنظمة الحماية المتقدمة." 
                : "Founder & Software Architect — Built the application, including full-stack infrastructure and advanced security systems."}
            </p>
            <div className={`pt-3 border-t flex items-center justify-between text-xs font-semibold ${
              isDarkMode ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-500'
            }`}>
              <span className="flex items-center gap-1.5 text-[#2563eb]">
                <Cpu className="w-3.5 h-3.5" />
                <span>SYSTEM_CORE // LEAD ENGINEER & ARCHITECT</span>
              </span>
              <a 
                href="https://instagram.com/amviii_8" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-[#2563eb] transition-colors"
              >
                @amviii_8 ➔
              </a>
            </div>
          </div>

          {/* Card 2: Ahmed */}
          <div className={`p-7 rounded-2xl border-2 transition-all group relative overflow-hidden ${
            isDarkMode 
              ? 'bg-[#0b0f19] border-blue-500/30 hover:border-blue-400 shadow-xl shadow-blue-950/20' 
              : 'bg-white border-blue-200 hover:border-blue-500 shadow-lg shadow-blue-500/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
                isDarkMode 
                  ? 'text-[#60a5fa] bg-blue-900/30 border-blue-500/30' 
                  : 'text-[#1e40af] bg-blue-100 border-blue-200'
              }`}>
                #02_FOUNDER
              </span>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xs font-mono ${
                isDarkMode 
                  ? 'bg-blue-500/10 border-blue-500/30 text-[#60a5fa]' 
                  : 'bg-blue-100/70 border-blue-200 text-[#2563eb]'
              }`}>
                AH
              </div>
            </div>
            <h3 className={`text-2xl font-black mb-2 group-hover:text-[#2563eb] transition-colors ${
              isDarkMode ? 'text-white' : 'text-[#0a152d]'
            }`}>
              Ahmed
            </h3>
            <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {isArabic 
                ? "المؤسس ومدير العلاقات الأكاديمية والتسويق — قيادة التنسيق مع الدكاترة والأساتذة الجامعيين، إدارة استراتيجيات الانتشار والتوسع في الجامعات." 
                : "Founder & Academic Strategy Director — Driving university faculty partnerships, doctor outreach, and strategic student growth models."}
            </p>
            <div className={`pt-3 border-t flex items-center justify-between text-xs font-semibold ${
              isDarkMode ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-500'
            }`}>
              <span className="flex items-center gap-1.5 text-[#2563eb]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>ACADEMIC_EXPANSION</span>
              </span>
              <span>FOUNDER</span>
            </div>
          </div>

        </div>
      </section>

      {/* Footer Section */}
      <footer className="mt-20 border-t border-slate-800 bg-[#0a1120] text-slate-300 pt-14 pb-8 px-4 sm:px-6">
        <div className="max-w-[1240px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 text-sm">
            
            {/* Col 1: About */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xl font-black text-white tracking-tight">
                  {isArabic ? 'ملخصاتي' : 'Mola5saty'}
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md mb-4">
                {isArabic
                  ? 'المنصة الجامعية المتطورة لمساعدة طلاب الجامعات والأطباء والمهندسين في الوصول إلى أعلى مراتب التفوق الأكاديمي.'
                  : 'The premier college and university learning network empowering students, doctors, and professors with cutting-edge academic summaries.'}
              </p>
              <div className="text-xs text-slate-400 space-y-1.5">
                <div>{isArabic ? 'البريد الإلكتروني:' : 'Email:'} amviii888@gmail.com</div>
                <div>{isArabic ? 'الدعم الفني:' : 'Support:'} 01201402632</div>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                {isArabic ? 'روابط سريعة' : 'Quick Links'}
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                  </Link>
                </li>
                <li>
                  <Link href="/signup-options" className="hover:text-white transition-colors">
                    {isArabic ? 'إنشاء حساب جديد' : 'Register New Account'}
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-white transition-colors">
                    {isArabic ? 'مركز الدعم والمساعدة' : 'Support Center'}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Legal & Privacy */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                {isArabic ? 'الشروط والأحكام' : 'Legal & Compliance'}
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/terms-of-service" className="hover:text-white transition-colors">
                    {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-white transition-colors">
                    {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
                  </Link>
                </li>
                <li>
                  <Link href="/copyright" className="hover:text-white transition-colors">
                    {isArabic ? 'حقوق النشر وحماية الملكية' : 'Copyright Protection'}
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <div>
              © 2026 {isArabic ? 'ملخصاتي (Mola5saty) — جميع الحقوق محفوظة' : 'MOLA5SATY // ALL RIGHTS RESERVED'}
            </div>
            <div>[MOLA5SATY_V2.0_COLLEGE_SYS]</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
