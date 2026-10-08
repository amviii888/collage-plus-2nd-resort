
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { setDoc, doc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Logo } from '@/components/icons';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import { grades } from '@/lib/data';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

const studentSignupSchema = z.object({
    name: z.string().min(2, "Name is too short"),
    phone: z.string().min(10, "Invalid phone number"),
    parentPhoneNumber: z.string().min(1, "Parent's phone number is required."),
    schoolName: z.string().min(1, "School name is required."),
    grade: z.string().min(1, "Grade is required."),
});

// Helper to generate a unique 6-digit numeric barcode
const generateUniqueBarcode = async (firestore: any): Promise<string> => {
    const studentsRef = collection(firestore, 'students');
    let barcode: string;
    let isUnique = false;

    while (!isUnique) {
        barcode = Math.floor(100000 + Math.random() * 900000).toString();
        const q = query(studentsRef, where("barcodeId", "==", barcode));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            isUnique = true;
        }
    }
    return barcode!;
};


export function StudentSignupForm() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);


  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const parentPhoneNumber = formData.get('parentPhoneNumber') as string;
    const schoolName = formData.get('schoolName') as string;
    const grade = formData.get('grade') as string;
    
    const validation = studentSignupSchema.safeParse({ name, phone, parentPhoneNumber, schoolName, grade });
    if (!validation.success) {
      setErrors(validation.error.flatten().fieldErrors);
      setIsSubmitting(false);
      return;
    }
    setErrors({});

    if(!firestore) {
        toast({
            variant: 'destructive',
            title: t('Sign Up Failed'),
            description: 'Firebase not available.',
        });
        setIsSubmitting(false);
        return;
    }

    try {
      const studentId = uuidv4();
      const barcodeId = await generateUniqueBarcode(firestore);

      const studentRef = doc(firestore, 'students', studentId);
      await setDoc(studentRef, {
        id: studentId,
        barcodeId: barcodeId,
        name,
        phoneNumber: phone,
        parentPhoneNumber,
        schoolName,
        grade,
        activeSubscriptions: [],
        xp: 0,
        streak: 1,
        equippedAvatar: '👦',
        createdAt: serverTimestamp(),
      });

      toast({
        title: t('student_signup.toast_success_title'),
        description: t('student_signup.toast_success_desc', { barcodeId }),
        duration: 15000,
      });
      
      localStorage.setItem('viewingStudentId', studentId);
      router.push('/profile');
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('Sign Up Failed'),
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
        <Card className="mx-auto w-full max-w-sm shadow-2xl">
            <CardHeader>
            <div className="relative flex flex-col items-center justify-center gap-4">
                <Button variant="ghost" size="icon" className="absolute left-0 top-0" asChild>
                    <Link href="/"><ArrowLeft/></Link>
                </Button>
                <Logo width={80} height={80} className="rounded-lg" iconSrc="icon.png"/>
                <div>
                    <CardTitle className="mt-4 text-center text-2xl font-headline">{t('student_signup.title')}</CardTitle>
                    <CardDescription className="text-center">{t('student_signup.desc')}</CardDescription>
                </div>
            </div>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('Full Name')}</Label>
                    <Input id="name" name="name" required />
                    {errors?.name && <p className="text-sm font-medium text-destructive">{errors.name[0]}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="grade">{t('Grade')}</Label>
                     <Select name="grade">
                        <SelectTrigger>
                            <SelectValue placeholder={t('Select your grade')} />
                        </SelectTrigger>
                        <SelectContent>
                            {grades.map(grade => (
                                <SelectItem key={grade} value={grade}>{t(grade)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors?.grade && <p className="text-sm font-medium text-destructive">{errors.grade[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">{t('student_signup.phone')}</Label>
                    <Input id="phone" name="phone" required />
                    {errors?.phone && <p className="text-sm font-medium text-destructive">{errors.phone[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="parentPhoneNumber">{t('student_signup.parent_phone')}</Label>
                    <Input id="parentPhoneNumber" name="parentPhoneNumber" required />
                     {errors?.parentPhoneNumber && <p className="text-sm font-medium text-destructive">{errors.parentPhoneNumber[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="schoolName">{t('student_signup.school')}</Label>
                    <Input id="schoolName" name="schoolName" required />
                    {errors?.schoolName && <p className="text-sm font-medium text-destructive">{errors.schoolName[0]}</p>}
                </div>
                 <div className="flex items-start space-x-2">
                    <Checkbox
                        id="terms"
                        checked={agreed}
                        onCheckedChange={() => setAgreed(!agreed)}
                    />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                        {t('By creating an account, you agree to our')}{' '}
                        <Link href="/terms-of-service" className="underline hover:text-primary">{t('Terms of Service')}</Link> {t('and')}{' '}
                        <Link href="/privacy-policy" className="underline hover:text-primary">{t('Privacy Policy')}</Link>.
                    </Label>
                </div>
                 <Button type="submit" className="w-full" disabled={isSubmitting || !agreed}>
                    {isSubmitting ? t('student_signup.creating_button') : t('student_signup.button')}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    {t('Already have an account?')}{' '}
                    <Link href="/student-login" className="font-semibold text-primary underline-offset-4 hover:underline">
                        {t('student_login.signin_link')}
                    </Link>
                </p>
            </form>
            </CardContent>
        </Card>
  );
}

