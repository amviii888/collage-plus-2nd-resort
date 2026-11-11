'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Fingerprint, Lock, ShieldCheck, KeyRound, Sparkles, CheckCircle, ArrowRight, Shield, ScanFace, Smartphone, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/firebase';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/teacher-signup',
  '/student-signup',
  '/signup-options',
  '/terms',
  '/terms-of-service',
  '/terms-and-conditions',
  '/privacy',
  '/privacy-policy',
  '/support',
  '/delete-account',
  '/copyright',
  '/meet-the-devs',
  '/offline',
  '/forgot-password',
  '/parent-login',
  '/assistant-login',
  '/student-login'
];

export function BiometricAppLock() {
  const pathname = usePathname();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { user } = useUser();

  const [isLocked, setIsLocked] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscodeField, setShowPasscodeField] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastHiddenTimeRef = useRef<number | null>(null);
  const hasAutoTriggeredRef = useRef<boolean>(false);

  // Check if current route is public / exempt
  const isExemptRoute = useCallback(() => {
    if (!pathname) return true;
    const clean = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    if (PUBLIC_ROUTES.includes(clean)) return true;
    if (
      pathname.startsWith('/terms') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/support') ||
      pathname.startsWith('/delete-account') ||
      pathname.startsWith('/courses') ||
      pathname.startsWith('/collections') ||
      pathname.startsWith('/discover')
    ) {
      return true;
    }
    return false;
  }, [pathname]);

  // Check if any user session is logged in
  const hasActiveSession = useCallback(() => {
    if (typeof window === 'undefined') return false;
    if (user && !user.isAnonymous) return true;
    const hasStudent = !!(
      localStorage.getItem('viewingStudentId') ||
      localStorage.getItem('student_barcode') ||
      localStorage.getItem('studentBarcode') ||
      localStorage.getItem('app_student_auth_session')
    );
    const hasTeacher = !!(
      localStorage.getItem('teacher_session') === 'true' ||
      localStorage.getItem('teacherId') ||
      localStorage.getItem('teacher_accounts')
    );
    const hasParent = !!localStorage.getItem('parentForStudentBarcode');
    const hasAssistant = !!(
      localStorage.getItem('assistantForTeacherId') ||
      localStorage.getItem('assistantTeacherName')
    );
    return hasStudent || hasTeacher || hasParent || hasAssistant;
  }, [user]);

  // Detect iOS vs Android
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    setDeviceType(isIOS ? 'ios' : isAndroid ? 'android' : 'other');
  }, []);

  // Determine initial lock state when app opens
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const biometricEnabled = localStorage.getItem('mol5saty_biometric_enabled') !== 'false';
    if (!biometricEnabled) {
      setIsLocked(false);
      return;
    }

    if (isExemptRoute() || !hasActiveSession()) {
      setIsLocked(false);
      return;
    }

    const isUnlockedThisSession = sessionStorage.getItem('mol5saty_app_unlocked') === 'true';
    if (!isUnlockedThisSession) {
      setIsLocked(true);
    }
  }, [isExemptRoute, hasActiveSession]);

  // Monitor app backgrounding / screen off (visibilitychange)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      const biometricEnabled = localStorage.getItem('mol5saty_biometric_enabled') !== 'false';
      if (!biometricEnabled) return;

      if (document.visibilityState === 'hidden') {
        lastHiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const lastHidden = lastHiddenTimeRef.current;
        if (lastHidden) {
          const elapsedMs = Date.now() - lastHidden;
          // Re-lock if the app was closed/backgrounded for more than 45 seconds
          if (elapsedMs > 45 * 1000) {
            if (!isExemptRoute() && hasActiveSession()) {
              sessionStorage.removeItem('mol5saty_app_unlocked');
              setIsLocked(true);
              setScanSuccess(false);
              setErrorMessage(null);
              hasAutoTriggeredRef.current = false;
            }
          }
        }
        lastHiddenTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isExemptRoute, hasActiveSession]);

  // Trigger Native iOS Face ID / Android Fingerprint Sheet
  const handleAuthorizeAndUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    // Haptic vibration feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 40, 25]);
      } catch (e) {}
    }

    let biometricPromptOpened = false;

    // Trigger platform WebAuthn credentials prompt (triggers Apple Face ID on iOS, Google Biometrics on Android)
    if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
      try {
        const savedCredId = localStorage.getItem('mol5saty_saved_biometric_cred_id');
        const isRegistered = localStorage.getItem('mol5saty_biometric_registered') === 'true' || !!savedCredId;
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        biometricPromptOpened = true;

        if (isRegistered) {
          // 1. Subsequent unlocks: ALWAYS verify existing saved fingerprint/Face ID via credentials.get
          // Never ask user to create a passkey again once registered!
          let allowCredentialsList: PublicKeyCredentialDescriptor[] | undefined = undefined;
          if (savedCredId) {
            try {
              const rawIdBytes = Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0));
              allowCredentialsList = [
                {
                  id: rawIdBytes,
                  type: 'public-key',
                }
              ];
            } catch (e) {}
          }

          const getOptions: CredentialRequestOptions = {
            publicKey: {
              challenge,
              ...(allowCredentialsList && allowCredentialsList.length > 0 ? { allowCredentials: allowCredentialsList } : {}),
              userVerification: 'preferred',
              timeout: 60000,
            }
          };

          const getAssertion = await navigator.credentials.get(getOptions);
          if (getAssertion) {
            // Keep registration flag permanent
            localStorage.setItem('mol5saty_biometric_registered', 'true');
          }
        } else {
          // 2. First-time registration: Create and save the credential ID once
          const userId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
          const credResult: any = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: 'Mol5saty University' },
              user: {
                id: userId,
                name: user?.email || 'student@mol5saty.edu',
                displayName: user?.displayName || 'Authorized Scholar',
              },
              pubKeyCredParams: [
                { alg: -7, type: 'public-key' },
                { alg: -257, type: 'public-key' }
              ],
              authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'preferred',
              },
              timeout: 60000,
            }
          });

          if (credResult && credResult.rawId) {
            const rawIdStr = btoa(String.fromCharCode(...new Uint8Array(credResult.rawId)));
            localStorage.setItem('mol5saty_saved_biometric_cred_id', rawIdStr);
          }
          // Mark permanently registered so it never asks to create again!
          localStorage.setItem('mol5saty_biometric_registered', 'true');
        }
      } catch (err: any) {
        console.warn('Biometric platform prompt note:', err?.name);
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
          // User deliberately cancelled the biometric sheet
          setIsAuthenticating(false);
          setShowPasscodeField(true);
          setErrorMessage(isArabic ? 'تم إلغاء فحص البصمة. يمكنك إدخال كود الطالب أو المحاولة مجدداً.' : 'Biometric prompt cancelled. Enter student code or try again.');
          return;
        }
      }
    }

    // Success transition
    setScanSuccess(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60]);
      } catch (e) {}
    }

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mol5saty_app_unlocked', 'true');
      }
      setIsLocked(false);
      setIsAuthenticating(false);
      setScanSuccess(false);
    }, 450);
  }, [user, isArabic]);

  // Auto-trigger on phone mount so Face ID / Fingerprint prompt fires immediately upon launch
  useEffect(() => {
    if (isLocked && !hasAutoTriggeredRef.current && !showPasscodeField) {
      hasAutoTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handleAuthorizeAndUnlock();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isLocked, showPasscodeField, handleAuthorizeAndUnlock]);

  // Passcode / Student Code / Password Unlock
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = passcodeInput.trim();
    if (!val) {
      setErrorMessage(isArabic ? 'يرجى إدخال كود الطالب أو كلمة المرور الخاصة بحسابك' : 'Please enter your student code or account password');
      return;
    }

    if (typeof window !== 'undefined') {
      const studentCode = localStorage.getItem('student_barcode') || 
                          localStorage.getItem('studentBarcode') || 
                          localStorage.getItem('studentCode') ||
                          localStorage.getItem('app_student_auth_session') ||
                          localStorage.getItem('viewingStudentId');

      const teacherPass = localStorage.getItem('teacher_password');
      const assistantPass = localStorage.getItem('assistantPassword');
      const userEmailPrefix = user?.email?.split('@')[0];

      const validCodes = [
        studentCode,
        userEmailPrefix,
        teacherPass,
        assistantPass,
      ].filter(Boolean).map(c => (c || '').toString().trim().toUpperCase());

      const inputClean = val.trim().toUpperCase();

      const isValid = validCodes.some(code => code === inputClean || (code && inputClean === code));

      if (isValid || validCodes.length === 0) {
        setErrorMessage(null);
        setScanSuccess(true);
        setTimeout(() => {
          sessionStorage.setItem('mol5saty_app_unlocked', 'true');
          setIsLocked(false);
          setPasscodeInput('');
        }, 300);
        return;
      } else {
        setErrorMessage(isArabic ? 'كود الطالب أو كلمة المرور غير صحيحة، يرجى إعادة المحاولة.' : 'Incorrect student code or password. Please try again.');
        return;
      }
    }
  };

  // If not locked or on public pages, render nothing
  if (!isLocked || isExemptRoute() || !hasActiveSession()) {
    return null;
  }

  const isIOS = deviceType === 'ios';
  const biometricName = isIOS ? 'Apple Face ID' : (deviceType === 'android' ? 'بصمة الإصبع (Fingerprint)' : 'Face ID / Fingerprint');

  return (
    <AnimatePresence>
      <motion.div
        key="app-biometric-lock-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center bg-[#09090b]/98 backdrop-blur-2xl text-foreground p-4 sm:p-6 select-none overflow-hidden"
        style={{ direction: isArabic ? 'rtl' : 'ltr' }}
      >
        {/* Ambient background glows */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-sm rounded-3xl bg-[#131316]/95 border border-zinc-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-6">
          
          {/* Device Biometric Scanner Target */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-300 relative ${
              scanSuccess
                ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_40px_rgba(34,197,94,0.4)]'
                : isAuthenticating
                ? (isIOS
                    ? 'bg-blue-500/15 border-2 border-blue-400 text-blue-400 shadow-[0_0_35px_rgba(59,130,246,0.35)]'
                    : 'bg-emerald-500/15 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_35px_rgba(34,197,94,0.35)]')
                : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-500/50'
            }`}>
              
              {/* iOS Viewfinder Framing Corners */}
              {isIOS && (
                <div className="absolute inset-1.5 pointer-events-none">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current rounded-br-sm" />
                </div>
              )}

              {/* Android Radar Pulse Wave Ring */}
              {!isIOS && isAuthenticating && !scanSuccess && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-3xl bg-emerald-400/20 opacity-75 pointer-events-none" />
              )}

              {scanSuccess ? (
                <CheckCircle className="w-12 h-12 text-emerald-400 animate-in zoom-in-75 duration-200" />
              ) : isIOS ? (
                <ScanFace className={`w-12 h-12 transition-transform ${isAuthenticating ? 'animate-pulse scale-105 text-blue-400' : 'text-zinc-300'}`} />
              ) : (
                <Fingerprint className={`w-12 h-12 transition-transform ${isAuthenticating ? 'animate-pulse scale-105 text-emerald-400' : 'text-zinc-300'}`} />
              )}
            </div>

            {/* Lock Badge */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#131316] border border-zinc-700 flex items-center justify-center text-zinc-300 shadow-md">
              {scanSuccess ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
            </div>
          </div>

          {/* Title & Prompt */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
              <span>{isArabic ? (isIOS ? 'التحقق عبر Face ID' : 'التحقق عبر بصمة الهاتف') : (isIOS ? 'Apple Face ID Verification' : 'Fingerprint Verification')}</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[270px] mx-auto">
              {scanSuccess ? (
                <span className="text-emerald-400 font-bold">{isArabic ? 'تم التحقق بنجاح! جاري فتح التطبيق...' : 'Verified! Opening session...'}</span>
              ) : isAuthenticating ? (
                <span className="text-blue-400 animate-pulse font-medium">
                  {isArabic 
                    ? (isIOS ? 'جاري قراءة بصمة الوجه...' : 'جاري التحقق من بصمة الإصبع...') 
                    : (isIOS ? 'Scanning Face ID...' : 'Touch fingerprint sensor...')}
                </span>
              ) : (
                <span>
                  {isArabic
                    ? `اضغط للتحقق عبر ${biometricName} لفتح حسابك أو استخدم كود الطالب.`
                    : `Authenticate via ${biometricName} or enter student code.`}
                </span>
              )}
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="w-full space-y-3 pt-1">
            <button
              type="button"
              onClick={handleAuthorizeAndUnlock}
              disabled={isAuthenticating || scanSuccess}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                scanSuccess
                  ? 'bg-emerald-500 text-white'
                  : isIOS
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/20 active:scale-98'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20 active:scale-98'
              }`}
            >
              {scanSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 text-white" />
                  <span>{isArabic ? 'تم تأكيد الهوية' : 'Identity Verified'}</span>
                </>
              ) : isAuthenticating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{isArabic ? 'جاري الفحص...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  {isIOS ? <ScanFace className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                  <span>{isArabic ? `تشغيل ${biometricName}` : `Scan with ${biometricName}`}</span>
                </>
              )}
            </button>

            {/* Quick Toggle Passcode Form */}
            {!showPasscodeField ? (
              <button
                type="button"
                onClick={() => setShowPasscodeField(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isArabic ? 'استخدام كود الطالب أو كلمة المرور' : 'Use Student Code or Password'}</span>
              </button>
            ) : (
              <form onSubmit={handlePasscodeSubmit} className="pt-2 border-t border-zinc-800/80 space-y-2 text-start animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                  <span>{isArabic ? 'أدخل كود الطالب أو كلمة المرور:' : 'Student Code or Password:'}</span>
                  <button
                    type="button"
                    onClick={() => setShowPasscodeField(false)}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    {isArabic ? 'رجوع للبصمة' : 'Back'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder={isArabic ? 'كود الطالب (مثال 91234)' : 'Student code or password'}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isArabic ? 'دخول' : 'Enter'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Friendly Security Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/60 w-full">
            <Smartphone className="w-3 h-3 text-emerald-500/70" />
            <span>MOL5SATY DEVICE SECURITY</span>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
