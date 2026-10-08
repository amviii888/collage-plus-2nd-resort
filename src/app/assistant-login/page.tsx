'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Globe, Users, BookOpen, ShieldCheck } from 'lucide-react';
import { useFirestore, useAuth } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
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
            {isArabic ? 'ملخصاتي' : 'Mola5saty'}
          </span>
          <span className="text-[9px] text-[#2563eb] font-bold tracking-wider uppercase">
            {isArabic ? 'بوابة المساعدين' : 'ASSISTANT PORTAL'}
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

export default function AssistantLoginPage() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const isArabic = i18next.language === 'ar';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !auth || !code.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      let currentUser = auth.currentUser;
      if (currentUser && !currentUser.isAnonymous) {
        try {
          await auth.signOut();
          currentUser = null;
        } catch (signOutErr) {
          console.error("Error signing out existing session:", signOutErr);
        }
      }

      if (!currentUser) {
        try {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        } catch (authError: any) {
          console.error("Auth error:", authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
      }

      let querySnapshot;
      try {
        const teachersRef = collection(firestore, 'teachers');
        const q = query(teachersRef, where("assistantCode", "==", code.trim()), limit(1));
        querySnapshot = await getDocs(q);
      } catch (queryError: any) {
        console.error("Teacher query error:", queryError);
        throw new Error(`Failed to find teacher: ${queryError.message}`);
      }
      
      if (querySnapshot.empty) {
        toast({ 
          variant: 'destructive', 
          title: isArabic ? 'فشل تسجيل الدخول' : 'Login Failed', 
          description: isArabic ? 'كود المساعد غير صحيح، تأكد من كود الدكتور الخاص بك.' : 'Invalid Assistant Code.' 
        });
      } else {
        const teacherDoc = querySnapshot.docs[0];
        const teacherData = teacherDoc.data();
        
        const assistantId = currentUser.uid;
        try {
          await setDoc(doc(firestore, 'assistants', assistantId), {
            assistantId,
            teacherId: teacherDoc.id,
            name: name.trim(),
            joinedAt: new Date().toISOString()
          });
        } catch (writeError: any) {
          console.error("Assistant registration write error:", writeError);
          throw new Error(`Failed to register assistant: ${writeError.message}`);
        }

        localStorage.setItem('assistantForTeacherId', teacherDoc.id);
        localStorage.setItem('assistantTeacherName', teacherData.name || 'Professor');
        
        toast({ title: isArabic ? `مرحباً بك يا ${name}` : `Welcome, ${name}` });
        router.replace('/assistant/dashboard');
      }
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: isArabic ? 'خطأ في الدخول' : 'Login Error', 
        description: error.message || 'An unexpected error occurred.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-[#f0f4f9] text-[#0f172a] selection:bg-[#2563eb] selection:text-white flex flex-col justify-between", isArabic ? 'rtl' : 'ltr')}>
      <AuthHeader />
      <div className="flex flex-1 items-center justify-center p-4 py-12 max-w-md mx-auto w-full">
        <Card className="w-full bg-white border-2 border-slate-200 shadow-xl shadow-blue-900/5 rounded-3xl p-4 sm:p-6">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] shadow-xs">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-[#0f172a]">
                  {isArabic ? 'دخول المساعد الأكاديمي' : 'Teaching Assistant Login'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600 mt-1">
                  {isArabic ? 'أدخل اسمك وكود المساعد الخاص بالدكتور المشرف.' : 'Enter your name and Assistant Code to manage lecture hall tasks.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="assistantName" className="text-xs font-bold text-slate-700">
                  {isArabic ? 'اسم المساعد *' : 'Your Name *'}
                </Label>
                <Input 
                  id="assistantName" 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder={isArabic ? 'مثال: محمد مصطفى' : 'e.g. John Doe'} 
                  className="h-11 rounded-xl border-slate-300 focus:border-[#2563eb] text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assistantCode" className="text-xs font-bold text-slate-700">
                  {isArabic ? 'كود المساعد (من حساب الدكتور) *' : 'Assistant Code *'}
                </Label>
                <Input 
                  id="assistantCode" 
                  type="text" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  required 
                  placeholder="e.g. ASST1234" 
                  className="h-11 rounded-xl border-slate-300 focus:border-[#2563eb] text-center font-mono tracking-widest text-base font-bold text-[#0f172a]" 
                  dir="ltr"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all mt-2" 
                disabled={isSubmitting || !code.trim() || !name.trim()}
              >
                {isSubmitting ? (isArabic ? 'جاري التحقق...' : 'Verifying...') : (isArabic ? 'دخول لوحة التحكم' : 'Access Assistant Dashboard')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs max-w-md mx-auto w-full text-center text-slate-500 font-mono">
        MOLA5SATY // ASSISTANT_GATE_2026
      </footer>
    </div>
  );
}
