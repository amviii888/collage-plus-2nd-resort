'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Copy, KeyRound, MessageCircle, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1 states (Only Student Code and Student Phone Number)
    const [studentCode, setStudentCode] = useState('');
    const [studentPhone, setStudentPhone] = useState('');
    const [studentDocId, setStudentDocId] = useState<string | null>(null);

    // Verified details & received password
    const [verifiedStudentName, setVerifiedStudentName] = useState<string>('');
    const [receivedPassword, setReceivedPassword] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Optional Step 2 state (Set new password)
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const handleValidationStep = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const cleanCode = studentCode.trim();
        const cleanPhone = studentPhone.trim();

        if (!cleanCode || !cleanPhone) {
            toast({
                variant: 'destructive',
                title: 'تنبيه (Notice)',
                description: 'يرجى إدخال كود الطالب ورقم هاتفه (Please enter student code and phone number).'
            });
            setIsLoading(false);
            return;
        }

        try {
            // 1. Attempt API verification first
            let verifiedViaApi = false;
            try {
                const res = await fetch('/api/auth/verify-reset-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentCode: cleanCode,
                        phoneNumber: cleanPhone
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.verified) {
                        setStudentDocId(data.studentId || null);
                        setVerifiedStudentName(data.studentName || '');
                        setReceivedPassword(data.currentPassword || cleanPhone);
                        verifiedViaApi = true;
                        setStep(2);
                        toast({ 
                            title: 'تم التحقق بنجاح (Identity Verified)', 
                            description: `مرحباً بك ${data.studentName || ''}. تم استرجاع كلمة المرور.` 
                        });
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn('API verification fallback to client:', apiErr);
            }

            // 2. Client-side Firestore verification fallback
            if (firestore) {
                const studentsRef = collection(firestore, 'students');
                const q = query(studentsRef, where("barcodeId", "==", cleanCode), limit(1));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error("كود الطالب غير موجود. يرجى التأكد من الكود المدخل.");
                }

                const studentDoc = querySnapshot.docs[0];
                const sData = studentDoc.data();

                const recordPhone = (sData.phoneNumber || '').trim();
                if (recordPhone !== cleanPhone) {
                    throw new Error("رقم الهاتف غير مطابق لكود الطالب في السجلات.");
                }

                const resolvedPassword = sData.password || sData.phoneNumber || cleanPhone;
                setStudentDocId(studentDoc.id);
                setVerifiedStudentName(sData.name || '');
                setReceivedPassword(resolvedPassword);
                setStep(2);
                toast({ 
                    title: 'تم التحقق بنجاح (Identity Verified)', 
                    description: `مرحباً بك ${sData.name || ''}. تم استرجاع كلمة المرور الخاصة بك.` 
                });
            } else if (!verifiedViaApi) {
                throw new Error("تعذر الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت.");
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'فشل استرجاع الحساب (Failed)', 
                description: error.message || 'البيانات المدخلة غير صحيحة.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyPassword = () => {
        if (!receivedPassword) return;
        navigator.clipboard.writeText(receivedPassword);
        setCopied(true);
        toast({ title: 'تم النسخ (Copied)', description: 'تم نسخ كلمة المرور إلى الحافظة.' });
        setTimeout(() => setCopied(false), 3000);
    };

    const handleOpenWhatsApp = () => {
        const phone = studentPhone.trim().replace(/^0+/, '');
        const text = encodeURIComponent(
            `مرحباً، تم استرجاع كلمة المرور الخاصة بحسابي في منصة ملخصاتي:\nاسم الطالب: ${verifiedStudentName}\nكود الطالب: ${studentCode}\nرقم الهاتف: ${studentPhone}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'كلمتا المرور غير متطابقتين.' });
            return;
        }

        setIsResetting(true);
        try {
            // Update via API
            try {
                await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentCode: studentCode.trim(),
                        newPassword: newPassword,
                        phoneNumber: studentPhone.trim()
                    })
                });
            } catch {}

            // Update in Firestore student document directly
            if (firestore && studentDocId) {
                await updateDoc(doc(firestore, 'students', studentDocId), {
                    password: newPassword,
                    updatedAt: new Date().toISOString()
                });
            }

            setReceivedPassword(newPassword);
            setShowChangePassword(false);
            toast({ 
                title: 'تم تغيير كلمة المرور بنجاح!', 
                description: 'تم تحديث كلمة المرور الجديدة. يمكنك الدخول بها الآن.' 
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ', description: error.message || 'حدث خطأ أثناء حفظ كلمة المرور.' });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-zinc-950 text-zinc-100">
            <Card className="mx-auto w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl">
                <CardHeader>
                    <div className="mb-2">
                        <Button variant="ghost" size="sm" asChild className="pl-0 gap-1 text-zinc-400 hover:text-white">
                            <Link href="/login"><ArrowLeft className="w-4 h-4"/> العودة لتسجيل الدخول (Back to Login)</Link>
                        </Button>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <KeyRound className="w-6 h-6 text-emerald-400" />
                        استرجاع كلمة المرور
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        {step === 1 
                            ? 'أدخل كود الطالب ورقم هاتفك لاسترجاع كلمة المرور فوراً.' 
                            : 'تم تأكيد هويتك واسترجاع كلمة المرور بنجاح.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 ? (
                        <form onSubmit={handleValidationStep} className="space-y-4">
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
                                    className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studentPhone" className="text-zinc-200 font-semibold">
                                    رقم هاتف الطالب (Student Phone Number)
                                </Label>
                                <Input 
                                    id="studentPhone" 
                                    type="tel" 
                                    required 
                                    value={studentPhone} 
                                    onChange={(e) => setStudentPhone(e.target.value)} 
                                    placeholder="01xxxxxxxxx" 
                                    className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                                />
                            </div>
                            <Button 
                                type="submit" 
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 text-base shadow-lg shadow-emerald-500/20" 
                                disabled={isLoading}
                            >
                                {isLoading ? 'جاري التحقق والاسترجاع...' : 'استرجاع كلمة المرور (Receive Password)'}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Verified Student Badge */}
                            <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                    <UserCheck className="w-5 h-5 shrink-0" />
                                    <span>تم التحقق من بيانات الطالب:</span>
                                </div>
                                <div className="text-white text-base font-bold">
                                    {verifiedStudentName || 'طالب مسجل'}
                                </div>
                                <div className="text-xs text-zinc-400 font-mono">
                                    كود الطالب: <span className="text-amber-400 font-bold">{studentCode}</span> • الهاتف: {studentPhone}
                                </div>

                                {/* Received Password Display Box */}
                                <div className="pt-2 border-t border-zinc-800/80">
                                    <div className="text-xs text-zinc-400 mb-1 font-semibold">
                                        كلمة المرور الخاصة بحسابك (Your Password):
                                    </div>
                                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-700">
                                        <span className="font-mono text-lg font-bold text-emerald-400 tracking-wider">
                                            {receivedPassword}
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleCopyPassword}
                                            variant="outline"
                                            className="h-8 px-3 border-zinc-600 text-zinc-200 hover:bg-zinc-800 flex items-center gap-1.5"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span className="text-xs">{copied ? 'تم النسخ' : 'نسخ'}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions: Log In & WhatsApp Verification */}
                            <div className="space-y-2.5">
                                <Button
                                    type="button"
                                    onClick={() => router.push(`/login?role=student&identifier=${encodeURIComponent(studentCode)}`)}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 text-sm shadow-md"
                                >
                                    تسجيل الدخول الآن بهذه الكلمة (Log In Now)
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleOpenWhatsApp}
                                    variant="outline"
                                    className="w-full border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 font-semibold h-10 text-xs flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                                    مشاركة وتأكيد عبر واتساب (WhatsApp)
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setShowChangePassword(!showChangePassword)}
                                    className="w-full text-center text-xs text-zinc-400 hover:text-white underline pt-1 cursor-pointer"
                                >
                                    {showChangePassword ? 'إلغاء تغيير كلمة المرور' : 'أو تعيين كلمة مرور جديدة مخصصة؟'}
                                </button>
                            </div>

                            {/* Optional: Change Password Section */}
                            {showChangePassword && (
                                <form onSubmit={handlePasswordReset} className="pt-3 border-t border-zinc-800 space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="newPassword" className="text-xs text-zinc-300">كلمة المرور الجديدة</Label>
                                        <Input 
                                            id="newPassword" 
                                            type="password" 
                                            required 
                                            value={newPassword} 
                                            onChange={(e) => setNewPassword(e.target.value)} 
                                            placeholder="أدخل كلمة مرور جديدة" 
                                            className="bg-zinc-950 border-zinc-800 text-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="confirmPassword" className="text-xs text-zinc-300">تأكيد كلمة المرور</Label>
                                        <Input 
                                            id="confirmPassword" 
                                            type="password" 
                                            required 
                                            value={confirmPassword} 
                                            onChange={(e) => setConfirmPassword(e.target.value)} 
                                            placeholder="أعد إدخال كلمة المرور" 
                                            className="bg-zinc-950 border-zinc-800 text-white"
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-10 text-xs" 
                                        disabled={isResetting || !newPassword}
                                    >
                                        {isResetting ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
