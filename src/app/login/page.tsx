'use client';

import Link from 'next/link';
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { cn } from '@/lib/utils';
import { 
  Globe, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  GraduationCap, 
  User,
  KeyRound,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'motion/react';
import { isStudentEmail } from '@/lib/auth-helpers';

const AuthHeader = () => {
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
      const newLang = isArabic ? 'en' : 'ar';
      i18n.changeLanguage(newLang);
      if (typeof window !== 'undefined') {
          localStorage.setItem('mola5saty-lang', newLang);
      }
    };
  
    return (
      <header className="px-4 sm:px-8 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5 group select-none">
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
              {isArabic ? 'بوابة الكليات والجامعات' : 'COLLEGE PORTAL'}
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-3">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-slate-700 dark:text-slate-200 shadow-xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#2563eb]"/>
            <span>{isArabic ? 'English' : 'العربية'}</span>
          </button>
          
          <Link 
            href="/" 
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors bg-white dark:bg-slate-900 shadow-xs"
          >
            {isArabic ? 'الرئيسية' : 'Home'}
          </Link>
        </div>
      </header>
    );
};

const getCooldownSecondsLeft = (key: string): number => {
    if (typeof window === 'undefined') return 0;
    const until = localStorage.getItem(`cooldown-until-${key}`);
    if (!until) return 0;
    const diff = Math.ceil((parseInt(until, 10) - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
};

const setCooldown = (key: string, seconds: number) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`cooldown-until-${key}`, (Date.now() + seconds * 1000).toString());
};

const getFailedAttempts = (key: string): number => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(`failed-attempts-${key}`) || '0', 10);
};

const incrementFailedAttempts = (key: string) => {
    if (typeof window === 'undefined') return;
    const current = getFailedAttempts(key);
    localStorage.setItem(`failed-attempts-${key}`, (current + 1).toString());
    
    if (current + 1 >= 3) {
        const cooldowns = [5, 15, 45, 120];
        const sec = cooldowns[Math.min(current + 1 - 3, cooldowns.length - 1)];
        setCooldown(key, sec);
    }
};

const resetFailedAttempts = (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`failed-attempts-${key}`);
    localStorage.removeItem(`cooldown-until-${key}`);
};

function LoginFormContent() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // If already logged in, redirect directly to user portal
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sid = localStorage.getItem('viewingStudentId');
            if (sid) {
                router.replace('/profile');
                return;
            }
        }
        if (!isUserLoading && user) {
            router.replace('/profile');
        }
    }, [user, isUserLoading, router]);

    useEffect(() => {
        setCooldownRemaining(getCooldownSecondsLeft('universal'));
        const interval = setInterval(() => {
            const left = getCooldownSecondsLeft('universal');
            setCooldownRemaining(left);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Cooldown rate limiting check
        const left = getCooldownSecondsLeft('universal');
        if (left > 0) {
            setError(isArabic ? `محاولات كثيرة خاطئة. يرجى الانتظار ${left} ثانية.` : `Too many failed attempts. Please wait ${left} seconds.`);
            return;
        }

        // Input Sanitization and Length Limits
        if (identifier.length > 100 || password.length > 128) {
            setError(isArabic ? "تجاوزت المدخلات الحد المسموح به." : "Input length exceeds safe limits.");
            return;
        }

        setIsSubmitting(true);
        setError('');
        if (!auth) {
            setIsSubmitting(false);
            return;
        }

        try {
            // S-ADMIN / ADMIN SPECIAL FLOW
            const lowerId = identifier.toLowerCase().trim();
            if (lowerId === 'eagle07amviii8$apfa4017@gmail.com' || lowerId === '6108almoamviii8chef@gmail.com') {
                try {
                    await signInWithEmailAndPassword(auth, identifier.trim(), password);
                    resetFailedAttempts('universal');
                    window.location.href = '/profile';
                    return;
                } catch (err: any) {
                    throw new Error("Invalid credentials.");
                }
            }

            // Universal Login logic (supports 5-6 digit student code, email, etc.)
            const isStudentAttempt = /^\d{5,6}$/.test(identifier.trim());
            let userCredential: any = null;

            if (isStudentAttempt) {
                try {
                    userCredential = await signInWithEmailAndPassword(auth, `${identifier.trim()}@mola5saty.student`, password);
                } catch (err: any) {
                    userCredential = await signInWithEmailAndPassword(auth, `${identifier.trim()}@universe.student`, password);
                }
            } else {
                userCredential = await signInWithEmailAndPassword(auth, identifier.trim(), password);
            }

            // Check if user is Admin in Firestore
            let detectedRole = 'teacher';
            if (firestore && userCredential?.user) {
                try {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
                    if (userDoc.exists()) {
                        const uData = userDoc.data();
                        if (uData?.role) {
                            detectedRole = uData.role.toLowerCase();
                        }
                    }
                } catch (e) {}
            }

            const isStudent = isStudentAttempt || 
                              detectedRole === 'student' ||
                              identifier.trim().toLowerCase().endsWith('@mola5saty.student') || 
                              identifier.trim().toLowerCase().endsWith('@universe.student') ||
                              userCredential.user.email?.toLowerCase().endsWith('@mola5saty.student') ||
                              userCredential.user.email?.toLowerCase().endsWith('@universe.student');

            const isAdmin = detectedRole === 'admin' || 
                            detectedRole === 's admin' || 
                            detectedRole === 'super_admin' || 
                            detectedRole === 'manager' ||
                            userCredential.user.email?.toLowerCase() === 'eagle07amviii8$apfa4017@gmail.com' ||
                            userCredential.user.email?.toLowerCase() === '6108almoamviii8chef@gmail.com';

            if (isAdmin) {
                resetFailedAttempts('universal');
                window.location.href = '/profile';
                return;
            }

            if (isStudent) {
                const studentCode = isStudentAttempt 
                    ? identifier.trim() 
                    : (userCredential.user.email ? userCredential.user.email.split('@')[0] : identifier.trim());
                if (studentCode) {
                    localStorage.setItem('studentBarcode', studentCode);
                    localStorage.setItem('studentBarcodeId', studentCode);
                    localStorage.setItem('studentCode', studentCode);
                }
                localStorage.setItem('viewingStudentId', userCredential.user.uid);

                if (firestore) {
                    const { doc, getDoc } = await import('firebase/firestore');
                    const studentRef = doc(firestore, 'students', userCredential.user.uid);
                    const studentSnap = await getDoc(studentRef);
                    if (!studentSnap.exists()) {
                        const cached = localStorage.getItem('student_profile_offline_' + userCredential.user.uid) ||
                                       localStorage.getItem('cached_student_profile_' + userCredential.user.uid);
                        if (!cached) {
                            await auth.signOut();
                            setError(isArabic ? 'الحساب غير موجود. لم يتم العثور على هذا الحساب للطالب.' : 'Account not found. This student account does not exist.');
                            setIsSubmitting(false);
                            return;
                        }
                    } else {
                        const sData = { id: userCredential.user.uid, ...studentSnap.data() };
                        localStorage.setItem('cached_student_profile_' + userCredential.user.uid, JSON.stringify(sData));
                        localStorage.setItem('mola5saty_active_student_profile', JSON.stringify(sData));
                        localStorage.setItem('student_logged_in', 'true');
                    }
                }
            }

            resetFailedAttempts('universal');
            window.location.href = '/profile';
        } catch (err: any) {
             incrementFailedAttempts('universal');
             const newLeft = getCooldownSecondsLeft('universal');
             if (newLeft > 0) {
                 setError(isArabic ? `بيانات غير صحيحة. تم قفل المحاولات مؤقتاً لمدة ${newLeft} ثانية.` : `Incorrect credentials. Too many failed attempts. Please wait ${newLeft} seconds.`);
                 setCooldownRemaining(newLeft);
             } else {
                 setError(isArabic ? 'بيانات الاعتماد غير صحيحة. يرجى التحقق من البريد أو الكود وكلمة المرور.' : 'Incorrect credentials. Please verify your details.');
             }
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeError = cooldownRemaining > 0 
        ? (isArabic ? `محاولات غير صحيحة. يرجى الانتظار ${cooldownRemaining} ثانية.` : `Incorrect credentials. Too many failed attempts. Please wait ${cooldownRemaining} second${cooldownRemaining !== 1 ? 's' : ''}.`)
        : error;

    return (
        <div 
          className="min-h-screen bg-white dark:bg-[#070b14] text-[#0f172a] dark:text-slate-100 selection:bg-[#2563eb] selection:text-white flex flex-col justify-between relative overflow-hidden transition-colors"
          dir={isArabic ? 'rtl' : 'ltr'}
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[350px] bg-gradient-to-b from-blue-100/50 via-indigo-50/20 dark:from-blue-900/20 dark:via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-50/60 dark:bg-blue-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />

          {/* Top Header */}
          <AuthHeader />

          {/* Center Card */}
          <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden space-y-6"
            >
              {/* Badge & Title */}
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-[#1e40af] dark:text-blue-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'بوابة الدخول الموحدة' : 'Unified Academic Sign In'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] dark:text-white tracking-tight">
                  {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed font-medium">
                  {isArabic 
                    ? 'أدخل كود الطالب (5-6 أرقام) أو البريد الإلكتروني الأكاديمي وكلمة المرور للمتابعة.' 
                    : 'Enter your student code (5-6 digits) or academic email and password to continue.'}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="universal-id" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>{isArabic ? 'كود الطالب أو البريد الإلكتروني' : 'Student Code or Email'}</span>
                    <span className="text-[10px] text-blue-600 font-mono">{isArabic ? 'كود 5-6 أرقام أو بريد' : '5-6 Digits or Email'}</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      id="universal-id" 
                      required 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)} 
                      placeholder={isArabic ? 'مثال: 10425 أو dr.name@college.edu' : 'e.g. 10425 or dr.name@college.edu'} 
                      maxLength={100}
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600/20 text-[#0f172a] dark:text-white placeholder:text-slate-400 rounded-2xl h-12 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="universal-password" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isArabic ? 'كلمة المرور' : 'Password'}
                    </Label>
                    <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline">
                      {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input 
                      id="universal-password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      maxLength={128} 
                      className={cn(
                        "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600/20 text-[#0f172a] dark:text-white placeholder:text-slate-400 rounded-2xl h-12 text-sm font-medium",
                        isArabic ? "pl-11 pr-3.5" : "pr-11 pl-3.5"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
                        isArabic ? "left-2" : "right-2"
                      )}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {activeError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 font-bold text-center animate-pulse">
                    ⚠️ {activeError}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-2xl font-bold text-sm transition-all bg-[#2563eb] hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 disabled:opacity-50 cursor-pointer ring-1 ring-blue-400/30 active:scale-95" 
                  disabled={isSubmitting || cooldownRemaining > 0}
                >
                  {cooldownRemaining > 0 
                    ? (isArabic ? `مقفل مؤقتاً (${cooldownRemaining} ثانية)` : `Locked (${cooldownRemaining}s)`)
                    : isSubmitting 
                      ? (isArabic ? 'جاري التحقق...' : 'Authenticating...')
                      : (isArabic ? 'تسجيل الدخول' : 'Sign In')}
                </Button>

                {/* Account Type Options Switcher */}
                <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {isArabic ? 'ليس لديك حساب بعد؟ ' : "Don't have an account yet? "}
                    <Link href="/signup-options" className="text-[#2563eb] dark:text-blue-400 font-bold hover:underline">
                      {isArabic ? 'إنشاء حساب جديد' : 'Create Account'}
                    </Link>
                  </p>
                </div>
              </form>
            </motion.div>
          </main>

          {/* Footer */}
          <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <span>© {new Date().getFullYear()} Mola5saty Academic Portal • المنظومة الأكاديمية للكليات</span>
          </footer>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#070b14]">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
            <LoginFormContent />
        </Suspense>
    );
}
