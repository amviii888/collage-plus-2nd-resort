'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

type ResetStep = 1 | 2 | 3 | 4;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<ResetStep>(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Student Code + honeypot
  const [studentCode, setStudentCode] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Step 2: WhatsApp verification challenge
  const [challengeId, setChallengeId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [botPhone, setBotPhone] = useState('201201921424');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [copiedCode, setCopiedCode] = useState(false);
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Step 3: Set New Password (after WhatsApp verified exact registered phone)
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const checkingRef = useRef(false);

  // Step 1 -> Start WhatsApp Verification Challenge
  const handleStartReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = studentCode.trim();
    if (!cleanCode) {
      toast({
        variant: 'destructive',
        title: 'تنبيه (Notice)',
        description: 'يرجى إدخال كود الطالب (Please enter your Student Code).',
      });
      return;
    }

    setIsLoading(true);
    setMismatchError(null);
    try {
      const res = await fetch('/api/auth/reset-password/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: cleanCode,
          website: honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر التحقق من كود الطالب.');
      }

      setChallengeId(data.challengeId);
      setVerificationCode(data.verificationCode);
      setMaskedPhone(data.maskedPhone || '010****000');
      setBotPhone(data.botPhone || '201201921424');
      const expMs = data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 10 * 60 * 1000;
      setExpiresAt(expMs);
      setSecondsLeft(Math.max(0, Math.floor((expMs - Date.now()) / 1000)));
      setStep(2);

      toast({
        title: 'تم إنشاء كود التحقق (Verification Code Ready)',
        description: `أرسل الكود من رقم واتساب المسجل (${data.maskedPhone}) لتأكيد ملكية الحساب.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'تعذر بدء استرجاع الحساب',
        description: error.message || 'تأكد من كود الطالب وحاول مرة أخرى.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> Poll / Check server whether WhatsApp bot confirmed exact registered phone match
  const checkVerificationStatus = useCallback(
    async (manualTrigger = false) => {
      if (!challengeId || step !== 2 || checkingRef.current) return;
      checkingRef.current = true;
      if (manualTrigger) setIsCheckingStatus(true);

      try {
        const res = await fetch('/api/auth/reset-password/check-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId }),
        });

        const data = await res.json();

        if (res.ok && data.status === 'verified' && data.resetToken) {
          setResetToken(data.resetToken);
          setMismatchError(null);
          setStep(3);
          toast({
            title: 'تم تأكيد رقم الهاتف بنجاح! (Phone Verified)',
            description: 'تطابق رقم الواتساب مع الرقم المسجل في حسابك. يمكنك الآن تعيين كلمة مرور جديدة.',
          });
          return;
        }

        if (data.status === 'phone_mismatch') {
          setMismatchError(
            'رقم الواتساب الذي أرسل الكود لا يطابق الرقم المسجل في الحساب! يرجى الإرسال من نفس رقمك المسجل (' +
              maskedPhone +
              ') بالضبط.'
          );
          if (manualTrigger) {
            toast({
              variant: 'destructive',
              title: 'رقم الهاتف غير مطابق (Phone Mismatch)',
              description: data.error,
            });
          }
          return;
        }

        if (data.status === 'expired' || data.status === 'used') {
          toast({
            variant: 'destructive',
            title: 'انتهت صلاحية الجلسة (Session Expired)',
            description: 'يرجى طلب كود تحقق جديد.',
          });
          setStep(1);
          setChallengeId('');
          return;
        }

        if (manualTrigger) {
          toast({
            title: 'في انتظار رسالة الواتساب (Waiting...)',
            description: 'لم يتم استلام رسالة التحقق بعد. تأكد من إرسال الرسالة من رقمك المسجل.',
          });
        }
      } catch {
        // Ignore transient network errors during background polling
      } finally {
        checkingRef.current = false;
        if (manualTrigger) setIsCheckingStatus(false);
      }
    },
    [challengeId, step, maskedPhone, toast]
  );

  // Automatic 3-second polling + window focus/visibility check during Step 2
  useEffect(() => {
    if (step !== 2 || !challengeId) return;

    const pollInterval = setInterval(() => {
      checkVerificationStatus(false);
    }, 3000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkVerificationStatus(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [step, challengeId, checkVerificationStatus]);

  // Countdown timer during Step 2
  useEffect(() => {
    if (step !== 2 || !expiresAt) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, expiresAt]);

  const verifyCommand = `VERIFY-${verificationCode}`;
  const whatsappUrl = `https://wa.me/${botPhone}?text=${encodeURIComponent(verifyCommand)}`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(verifyCommand);
    setCopiedCode(true);
    toast({ title: 'تم النسخ (Copied)', description: `تم نسخ ${verifyCommand} إلى الحافظة.` });
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Step 3 -> Submit Brand-New Password
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'كلمة مرور ضعيفة',
        description: 'يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'عدم تطابق',
        description: 'كلمتا المرور غير متطابقتين (Passwords do not match).',
      });
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword,
          website: honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث كلمة المرور.');
      }

      setStep(4);
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      toast({
        title: 'تم تغيير كلمة المرور بنجاح!',
        description: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ في تحديث كلمة المرور',
        description: error.message || 'يرجى إعادة المحاولة.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const formattedTime = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <Card className="mx-auto w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl">
        <CardHeader>
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild className="pl-0 gap-1 text-zinc-400 hover:text-white">
              <Link href="/login">
                <ArrowLeft className="w-4 h-4" /> العودة لتسجيل الدخول (Back)
              </Link>
            </Button>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
              {step <= 3 ? `Step ${step} / 3` : 'Done'}
            </span>
          </div>

          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-emerald-400" />
            إعادة تعيين كلمة المرور
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {step === 1 && 'أدخل كود الطالب للبدء في التحقق عبر رقم الواتساب المسجل في حسابك.'}
            {step === 2 && 'أرسل كود التحقق عبر واتساب من نفس رقم الهاتف المسجل في حسابك بالضبط.'}
            {step === 3 && 'تم تأكيد هويتك بنجاح. اختر كلمة مرور جديدة قوية لحسابك.'}
            {step === 4 && 'تم تحديث كلمة المرور الخاصة بك بأمان.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* STEP 1: Enter Student Code */}
          {step === 1 && (
            <form onSubmit={handleStartReset} className="space-y-4">
              {/* Hidden bot honeypot */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <div className="space-y-2">
                <Label htmlFor="studentCode" className="text-zinc-200 font-semibold">
                  كود الطالب (Student Code)
                </Label>
                <Input
                  id="studentCode"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="مثال: 2026-94 أو 123456"
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500 h-11"
                />
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  لحماية حسابك، يجب تأكيد ملكيتك عبر إرسال كود تحقق من نفس رقم الواتساب المسجل في الحساب تماماً قبل تعيين كلمة مرور جديدة.
                </span>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 text-base shadow-lg shadow-emerald-500/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> جاري البحث والتحقق...
                  </span>
                ) : (
                  'المتابعة للتحقق عبر واتساب (Continue)'
                )}
              </Button>
            </form>
          )}

          {/* STEP 2: Strict Registered WhatsApp Phone Verification */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    الرقم المسجل المطلوب الإرسال منه:
                  </span>
                  <span className="font-mono text-zinc-400">{formattedTime}</span>
                </div>
                <p className="text-lg font-mono font-bold text-white tracking-wider" dir="ltr">
                  {maskedPhone}
                </p>
                <p className="text-[11px] text-zinc-400">
                  يجب إرسال الرسالة من هذا الرقم بالضبط؛ أي رقم آخر سيتم رفضه تلقائياً.
                </p>
              </div>

              {mismatchError && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{mismatchError}</span>
                </div>
              )}

              {/* Verification Code Box */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-center">
                <p className="text-xs text-zinc-400 font-medium">
                  كود التحقق الخاص بك (أرسله كما هو):
                </p>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/40">
                  <span className="font-mono text-xl font-black text-emerald-400 tracking-widest mx-auto" dir="ltr">
                    {verifyCommand}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyCommand}
                    className="h-8 px-2.5 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                {/* Desktop QR Code */}
                <div className="hidden sm:flex flex-col items-center pt-2">
                  <div className="p-2.5 bg-white rounded-xl">
                    <QRCodeSVG value={whatsappUrl} size={132} />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    امسح الكود بهاتفك المسجل لفتح واتساب مباشرة
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button
                  asChild
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 text-sm shadow-lg shadow-emerald-500/20"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    إرسال كود التحقق عبر واتساب الآن (Open WhatsApp)
                  </a>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => checkVerificationStatus(true)}
                  disabled={isCheckingStatus}
                  className="w-full border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 h-10 text-xs"
                >
                  {isCheckingStatus ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-2" />
                  )}
                  لقد أرسلت الرسالة — تحقق الآن (Check Verification)
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setChallengeId('');
                    setMismatchError(null);
                  }}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 pt-1 cursor-pointer"
                >
                  تغيير كود الطالب / طلب كود جديد
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleCompleteReset} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>تم تأكيد رقم واتساب المسجل بنجاح. اختر كلمة المرور الجديدة الآن.</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-zinc-200 font-semibold">
                  كلمة المرور الجديدة (New Password)
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="6 أحرف أو أرقام على الأقل"
                    className="bg-zinc-950 border-zinc-800 text-white pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-200 font-semibold">
                  تأكيد كلمة المرور الجديدة (Confirm Password)
                </Label>
                <Input
                  id="confirmPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  className="bg-zinc-950 border-zinc-800 text-white h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={isResetting || !newPassword || !confirmPassword}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 text-base"
              >
                {isResetting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> جاري حفظ كلمة المرور...
                  </span>
                ) : (
                  'حفظ كلمة المرور الجديدة (Save New Password)'
                )}
              </Button>
            </form>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">تم تحديث كلمة المرور بنجاح!</h3>
                <p className="text-xs text-zinc-400">
                  حسابك محمي الآن بكلمة المرور الجديدة. يمكنك تسجيل الدخول فوراً باستخدام كود الطالب.
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  router.push(`/login?role=student&identifier=${encodeURIComponent(studentCode.trim())}`)
                }
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11"
              >
                تسجيل الدخول الآن (Go to Login)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
