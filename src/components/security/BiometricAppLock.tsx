'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Fingerprint, Lock, ShieldCheck, KeyRound, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useUser, useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

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
  const auth = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [fallbackPassword, setFallbackPassword] = useState('');
  const [isVerifyingFallback, setIsVerifyingFallback] = useState(false);

  const lastHiddenTimeRef = useRef<number | null>(null);
  const autoPromptRef = useRef(false);

  // Check if current route is exempt from lock screen
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

  // Check platform and hardware WebAuthn capabilities on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS vs Android vs other
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    setDeviceType(isIOS ? 'ios' : isAndroid ? 'android' : 'other');

    // Check if platform authenticator (Face ID / Fingerprint) is supported
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setIsBiometricSupported(available);
        })
        .catch(() => {
          setIsBiometricSupported(false);
        });
    } else {
      setIsBiometricSupported(false);
    }
  }, []);

  // Determine initial lock state when app opens
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Is biometric lock feature enabled in settings? (Default: enabled)
    const biometricEnabled = localStorage.getItem('mol5saty_biometric_enabled') !== 'false';
    if (!biometricEnabled) {
      setIsLocked(false);
      return;
    }

    if (isExemptRoute() || !hasActiveSession()) {
      setIsLocked(false);
      return;
    }

    // Has user already unlocked in current runtime session?
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
              setErrorMessage(null);
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

  // Trigger Native WebAuthn Biometric Prompt (Face ID / Touch ID / Fingerprint)
  const requestBiometricUnlock = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      if (window.PublicKeyCredential) {
        // Generate random 32-byte challenge
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        // Try platform credentials retrieval first or creation to trigger hardware prompt
        try {
          // If a credential was stored previously in localStorage, attempt get
          const storedCredId = localStorage.getItem('mol5saty_biometric_credential_id');
          
          if (storedCredId) {
            const rawId = Uint8Array.from(atob(storedCredId), c => c.charCodeAt(0));
            await navigator.credentials.get({
              publicKey: {
                challenge,
                timeout: 45000,
                userVerification: 'required',
                allowCredentials: [{
                  id: rawId,
                  type: 'public-key',
                  transports: ['internal']
                }]
              }
            });
          } else {
            // Register platform authenticator (Apple Face ID / Android Fingerprint)
            const credential = await navigator.credentials.create({
              publicKey: {
                challenge,
                rp: {
                  name: 'Mol5saty University Hub',
                  id: window.location.hostname
                },
                user: {
                  id: userId,
                  name: user?.email || 'student@mol5saty.edu',
                  displayName: user?.displayName || 'Authorized Student'
                },
                pubKeyCredParams: [
                  { alg: -7, type: 'public-key' },  // ES256
                  { alg: -257, type: 'public-key' } // RS256
                ],
                authenticatorSelection: {
                  authenticatorAttachment: 'platform',
                  userVerification: 'required',
                  requireResidentKey: false
                },
                timeout: 45000,
                attestation: 'none'
              }
            }) as PublicKeyCredential | null;

            if (credential && credential.rawId) {
              const base64Id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
              localStorage.setItem('mol5saty_biometric_credential_id', base64Id);
            }
          }

          // Biometrics succeeded!
          sessionStorage.setItem('mol5saty_app_unlocked', 'true');
          setIsLocked(false);
          setIsAuthenticating(false);
          return;
        } catch (authErr: any) {
          console.warn('Biometric platform verification note:', authErr?.name, authErr?.message);
          
          // User clicked cancel or device doesn't have enrolled biometrics
          if (authErr?.name === 'NotAllowedError') {
            setErrorMessage(
              isArabic
                ? 'تم إلغاء التحقق بالبصمة. يمكنك المحاولة مجدداً أو استخدام كلمة المرور.'
                : 'Biometric authorization was cancelled. You can retry or use your password.'
            );
          } else if (authErr?.name === 'SecurityError') {
            // Iframe/domain restriction fallback: allow unlocking via fallback
            setShowPasswordFallback(true);
          } else {
            setErrorMessage(
              isArabic
                ? 'تعذر قراءة البصمة حالياً. اضغط للمحاولة أو استخدم كلمة المرور.'
                : 'Could not complete biometric scan. Tap to retry or use password.'
            );
          }
        }
      } else {
        // WebAuthn not supported by browser
        setShowPasswordFallback(true);
      }
    } catch (e: any) {
      console.warn('Biometric top-level exception:', e);
      setErrorMessage(
        isArabic
          ? 'حدث خطأ في طلب البصمة. يمكنك استخدام كلمة المرور لتسجيل الدخول.'
          : 'Could not access biometric prompt. Use password to continue.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  }, [user, isArabic]);

  // Automatically prompt for Face ID / Fingerprint on cold start when locked
  useEffect(() => {
    if (isLocked && !autoPromptRef.current && !showPasswordFallback) {
      autoPromptRef.current = true;
      const timer = setTimeout(() => {
        requestBiometricUnlock();
      }, 350);
      return () => clearTimeout(timer);
    }
    if (!isLocked) {
      autoPromptRef.current = false;
    }
  }, [isLocked, requestBiometricUnlock, showPasswordFallback]);

  // Fallback Unlock using Password or Student Code
  const handleFallbackUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackPassword.trim()) return;

    setIsVerifyingFallback(true);
    setErrorMessage(null);

    try {
      const trimmed = fallbackPassword.trim();

      // Check 1: Student Barcode match
      const localBarcode = localStorage.getItem('student_barcode') || localStorage.getItem('studentBarcode');
      if (localBarcode && trimmed.toUpperCase() === localBarcode.toUpperCase()) {
        sessionStorage.setItem('mol5saty_app_unlocked', 'true');
        setIsLocked(false);
        setIsVerifyingFallback(false);
        return;
      }

      // Check 2: Try Firebase Auth verification if user has email
      if (auth && user && user.email) {
        try {
          await signInWithEmailAndPassword(auth, user.email, trimmed);
          sessionStorage.setItem('mol5saty_app_unlocked', 'true');
          setIsLocked(false);
          setIsVerifyingFallback(false);
          return;
        } catch (credErr) {
          // Fall through to invalid check
        }
      }

      // Check 3: Local cached student pass check
      const studentProfile = localStorage.getItem('student_profile') || localStorage.getItem('mol5saty_active_student_profile');
      if (studentProfile) {
        try {
          const parsed = JSON.parse(studentProfile);
          if (parsed.barcodeId && trimmed.toUpperCase() === parsed.barcodeId.toUpperCase()) {
            sessionStorage.setItem('mol5saty_app_unlocked', 'true');
            setIsLocked(false);
            setIsVerifyingFallback(false);
            return;
          }
        } catch (e) {}
      }

      // If nothing matched
      setErrorMessage(
        isArabic
          ? 'كلمة المرور أو كود الطالب غير صحيح. يرجى التأكد والمحاولة مرة أخرى.'
          : 'Incorrect password or student code. Please check and try again.'
      );
    } catch (err) {
      setErrorMessage(
        isArabic ? 'فشل التحقق من كلمة المرور.' : 'Password verification failed.'
      );
    } finally {
      setIsVerifyingFallback(false);
    }
  };

  // If not locked or on public pages, render nothing
  if (!isLocked || isExemptRoute() || !hasActiveSession()) {
    return null;
  }

  const biometricName = deviceType === 'ios' 
    ? (isArabic ? 'Face ID / Touch ID' : 'Face ID or Touch ID')
    : (isArabic ? 'بصمة الإصبع أو الوجه' : 'Fingerprint or Face Unlock');

  return (
    <AnimatePresence>
      <motion.div
        key="biometric-lock-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center bg-[#09090b]/98 backdrop-blur-2xl text-foreground p-4 sm:p-6 select-none overflow-hidden"
        style={{ direction: isArabic ? 'rtl' : 'ltr' }}
      >
        {/* Ambient background glowing accents matching obsidian/electric green palette */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-sm rounded-3xl bg-[#131316]/90 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-6">
          
          {/* Header Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_35px_rgba(34,197,94,0.25)]">
              {isAuthenticating ? (
                <RefreshCw className="w-10 h-10 animate-spin text-emerald-400" />
              ) : (
                <Fingerprint className="w-10 h-10 text-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#131316] border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          {/* Title & App Branding */}
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{isArabic ? 'تطبيق ملخصاتي مقفل' : 'Mol5saty Is Locked'}</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[260px] mx-auto">
              {isArabic
                ? `قم بتأكيد هويتك بواسطة ${biometricName} لفتح حسابك بأمان.`
                : `Authenticate via ${biometricName} to unlock your secure session.`}
            </p>
          </div>

          {/* Error Message Toast */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 text-start"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="leading-tight">{errorMessage}</span>
            </motion.div>
          )}

          {/* Action Buttons */}
          {!showPasswordFallback ? (
            <div className="w-full space-y-3 pt-2">
              <button
                type="button"
                onClick={requestBiometricUnlock}
                disabled={isAuthenticating}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isArabic ? 'جاري التحقق...' : 'Scanning...'}</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    <span>{isArabic ? `فتح بواسطة ${biometricName}` : `Unlock with ${biometricName}`}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordFallback(true);
                  setErrorMessage(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>{isArabic ? 'استخدام كلمة المرور أو كود الطالب' : 'Use Password or Student Code'}</span>
              </button>
            </div>
          ) : (
            /* Fallback Form */
            <form onSubmit={handleFallbackUnlock} className="w-full space-y-3 pt-1 text-start">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300 block">
                  {isArabic ? 'كلمة المرور أو كود الطالب (Barcode):' : 'Password or Student Barcode:'}
                </label>
                <input
                  type="password"
                  value={fallbackPassword}
                  onChange={(e) => setFallbackPassword(e.target.value)}
                  placeholder={isArabic ? 'أدخل كلمة المرور أو الكود' : 'Enter password or code'}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordFallback(false);
                    setErrorMessage(null);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs font-semibold cursor-pointer"
                >
                  {isArabic ? 'رجوع للبصمة' : 'Back to Biometrics'}
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingFallback || !fallbackPassword.trim()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingFallback ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>{isArabic ? 'تأكيد الفتح' : 'Confirm Unlock'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Secure Platform Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/60 w-full">
            <Smartphone className="w-3 h-3 text-emerald-500/70" />
            <span>MOL5SATY HARDWARE SECURITY LOCK</span>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
