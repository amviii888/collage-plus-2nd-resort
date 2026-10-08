
'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { doc, getDoc } from 'firebase/firestore';
import type { Teacher } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

type StoredTeacherAccount = Pick<Teacher, 'id' | 'name' | 'email' | 'profilePictureUrl'>;

export function TeacherLoginForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [accounts, setAccounts] = useState<StoredTeacherAccount[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('teacher_accounts');
        if (stored) {
            try {
                setAccounts(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing stored accounts:", e);
                setAccounts([]);
            }
        }
    }
  }, []);

  useEffect(() => {
      const emailFromQuery = searchParams.get('email');
      if (emailFromQuery) {
          setEmail(decodeURIComponent(emailFromQuery));
          passwordInputRef.current?.focus();
      }
  }, [searchParams]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    const formEmail = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!auth || !firestore) {
        setError('Firebase not available.');
        setIsSubmitting(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formEmail, password);
      
      const teacherRef = doc(firestore, 'teachers', userCredential.user.uid);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
          const teacherData = teacherSnap.data() as Teacher;
          const newAccount: StoredTeacherAccount = {
              id: userCredential.user.uid,
              name: teacherData.name,
              email: teacherData.email,
              profilePictureUrl: teacherData.profilePictureUrl
          };

          const stored = localStorage.getItem('teacher_accounts');
          let accounts: StoredTeacherAccount[] = stored ? JSON.parse(stored) : [];
          
          accounts = accounts.filter(acc => acc.id !== newAccount.id);
          accounts.unshift(newAccount);

          if (accounts.length > 5) {
              accounts.pop();
          }

          localStorage.setItem('teacher_accounts', JSON.stringify(accounts));
      }
      
      router.push('/profile');

    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      }
      setError(message);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleAccountClick = (account: StoredTeacherAccount) => {
      setEmail(account.email);
      passwordInputRef.current?.focus();
  }

  return (
            <div className="mx-auto grid w-[350px] gap-6">
                 <div className="grid gap-2 text-center">
                    <h1 className="text-3xl font-bold">{t("teacher_login.title")}</h1>
                    <p className="text-balance text-muted-foreground">
                        {t("teacher_login.desc")}
                    </p>
                </div>
                 {isClient && accounts.length > 0 && (
                    <div className="space-y-2">
                        <Label>{t('teacher_login.quick_switch')}</Label>
                        <div className="space-y-2">
                        {accounts.map(acc => (
                            <button
                                key={acc.id}
                                onClick={() => handleAccountClick(acc)}
                                className="w-full p-2 border rounded-lg flex items-center gap-4 text-left hover:bg-muted/50 transition-colors"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={acc.profilePictureUrl} />
                                    <AvatarFallback>{acc.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-sm">{acc.name}</p>
                                    <p className="text-xs text-muted-foreground">{acc.email}</p>
                                </div>
                            </button>
                        ))}
                        </div>
                    </div>
                )}
                <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('teacher_login.email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="m@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                        <Label htmlFor="password">{t('teacher_login.password')}</Label>
                        <Link
                            href="/forgot-password"
                            className="ml-auto inline-block text-sm underline"
                        >
                            {t('teacher_login.forgot_password')}
                        </Link>
                        </div>
                        <Input id="password" name="password" type="password" required ref={passwordInputRef} />
                    </div>
                     <div className="flex items-start space-x-2">
                        <Checkbox
                            id="terms"
                            checked={agreed}
                            onCheckedChange={() => setAgreed(!agreed)}
                        />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                            {t('By signing in, you agree to our')}{' '}
                            <Link href="/terms-of-service" className="underline hover:text-primary">{t('Terms of Service')}</Link> {t('and')}{' '}
                            <Link href="/privacy-policy" className="underline hover:text-primary">{t('Privacy Policy')}</Link>.
                        </Label>
                    </div>
                     {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isSubmitting || !agreed}>
                      {isSubmitting ? t('teacher_login.signing_in_button') : t('teacher_login.signin_button')}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                    {t("teacher_login.no_account")}{" "}
                    <Link href="/teacher-signup" className="underline">
                        {t('teacher_login.signup_link')}
                    </Link>
                </div>
            </div>
  );
}

