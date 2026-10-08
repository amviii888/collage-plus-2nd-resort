
'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import type { Teacher } from '@/lib/types';
import { subjects } from '@/lib/subjects';
import { grades } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { CldUploadButton } from 'next-cloudinary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/icons';
import { teacherPlans } from '@/lib/teacher-plans';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LoginHeaderV2 } from '@/components/login-header';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  bio: z.string().max(300, { message: 'Bio cannot be longer than 300 characters.' }).optional(),
  profilePictureUrl: z.string().url({ message: 'Please upload a profile picture.' }).optional().or(z.literal('')),
  heroImageUrl: z.string().url({ message: 'Please upload a hero banner.' }).optional().or(z.literal('')),
  subjects: z.array(z.string()).min(1, 'Please select at least one subject.'),
  gradesTaught: z.array(z.string()).min(1, 'Please select at least one grade.'),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;


export function TeacherSignupForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      bio: '',
      profilePictureUrl: '',
      heroImageUrl: '',
      subjects: [],
      gradesTaught: [],
      terms: false,
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: t('teacher_signup.toast_fail_title'),
        description: 'Firebase not available.',
      });
      return;
    }
    setIsSubmitting(true);
    
    const basicPlan = teacherPlans.find(p => p.id === 'basic');

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const teacherId = userCredential.user.uid;
      
      const assistantCode = 'ASST' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const defaultPfp = PlaceHolderImages.find(p => p.id === 'teacher-profile')?.imageUrl || '';
      const defaultHero = PlaceHolderImages.find(p => p.id === 'teacher-hero')?.imageUrl || '';

      // 2. Create teacher document in Firestore
      const teacherRef = doc(firestore, 'teachers', teacherId);
      await setDoc(teacherRef, {
        id: teacherId,
        name: data.name,
        email: data.email,
        bio: data.bio,
        profilePictureUrl: data.profilePictureUrl || defaultPfp,
        heroImageUrl: data.heroImageUrl || defaultHero,
        subjects: data.subjects,
        gradesTaught: data.gradesTaught,
        approved: false, // Account is pending approval by default
        assistantCode,
        planId: basicPlan?.id || 'basic', // Default to basic plan
        planName: basicPlan?.title || 'Basic',
        password: data.password,
      });

      // Also create role record in 'users' collection for the main login check
      const userRef = doc(firestore, 'users', teacherId);
      await setDoc(userRef, {
        uid: teacherId,
        email: data.email,
        name: data.name,
        role: 'teacher',
        createdAt: new Date().toISOString()
      });

      // 3. Store private credentials subcollection for S-Admin inspection
      const credsRef = doc(firestore, 'teachers', teacherId, 'private', 'credentials');
      await setDoc(credsRef, {
        password: data.password,
        email: data.email,
        updatedAt: new Date().toISOString(),
      });
      
      toast({
          title: t('teacher_signup.toast_success_title'),
          description: t('teacher_signup.toast_success_desc')
      });

      router.push('/profile');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teacher_signup.toast_fail_title'),
        description: error.message || 'An unknown error occurred.',
      });
       setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && user) {
        router.push('/profile');
    }
  }, [user, isUserLoading, router]);
  
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
          <p>Loading...</p>
      </div>
    );
  }

  const handlePfpUpload = (result: any) => {
    form.setValue('profilePictureUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
  }

  const handleHeroUpload = (result: any) => {
    form.setValue('heroImageUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
  }

  const pfpUrl = form.watch('profilePictureUrl');
  const watchedSubjects = form.watch('subjects');


  return (
        <Card className="mx-auto w-full max-w-2xl shadow-2xl">
            <CardHeader>
            <div className="relative flex flex-col items-center justify-center gap-4">
                <Button variant="ghost" size="icon" className="absolute left-0 top-0" asChild>
                    <Link href="/"><ArrowLeft/></Link>
                </Button>
                <LoginHeaderV2 />
                <div>
                    <CardTitle className="mt-4 text-center text-2xl font-headline">{t('teacher_signup.title')}</CardTitle>
                    <CardDescription className="text-center">{t('teacher_signup.desc')}</CardDescription>
                </div>
            </div>
            </CardHeader>
            <CardContent>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('Name')}</Label>
                            <Input id="name" {...form.register('name')} />
                            {form.formState.errors.name && (
                                <p className="text-sm font-medium text-destructive">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('teacher_login.email')}</Label>
                            <Input id="email" type="email" {...form.register('email')} />
                            {form.formState.errors.email && (
                                <p className="text-sm font-medium text-destructive">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">{t('teacher_login.password')}</Label>
                        <Input id="password" type="password" {...form.register('password')} />
                        {form.formState.errors.password && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">{t('teacher_signup.bio')}</Label>
                        <Textarea
                            id="bio"
                            {...form.register('bio')}
                            className="min-h-[100px]"
                        />
                        {form.formState.errors.bio && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.bio.message}</p>
                        )}
                    </div>

                    <div className='flex items-center gap-4'>
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={pfpUrl} />
                            <AvatarFallback><UploadCloud/></AvatarFallback>
                        </Avatar>
                        <div className="space-y-2 w-full">
                            <Label>{t('teacher_signup.pfp')}</Label>
                            <CldUploadButton
                                uploadPreset="unsigned_pfp_upload"
                                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium h-9 px-3 w-full flex items-center justify-center gap-2"
                                onSuccess={handlePfpUpload}
                            >
                            <UploadCloud /> {t('teacher_signup.pfp_button')}
                            </CldUploadButton>
                            {form.formState.errors.profilePictureUrl && (
                                <p className="text-sm font-medium text-destructive">{form.formState.errors.profilePictureUrl.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('teacher_signup.hero')}</Label>
                        {form.watch('heroImageUrl') && <img src={form.watch('heroImageUrl')} alt="Hero preview" className="rounded-md mt-2 object-cover aspect-[3/1]" />}
                        <CldUploadButton
                            uploadPreset="unsigned_pfp_upload"
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium h-9 px-3 w-full flex items-center justify-center gap-2"
                            onSuccess={handleHeroUpload}
                        >
                            <UploadCloud /> {t('teacher_signup.hero_button')}
                        </CldUploadButton>
                        <p className="text-xs text-muted-foreground">{t('teacher_signup.hero_desc')}</p>
                        {form.formState.errors.heroImageUrl && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.heroImageUrl.message}</p>
                         )}
                    </div>
                    
                    <div className="space-y-2">
                        <Label>{t('teacher_signup.subjects')}</Label>
                         <Controller
                            name="subjects"
                            control={form.control}
                            render={({ field }) => (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start font-normal">
                                            {watchedSubjects.length > 0 ? `${watchedSubjects.length} selected` : 'Select subjects'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="start">
                                        <DropdownMenuLabel>Available Subjects</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {subjects.map(subject => (
                                            <DropdownMenuCheckboxItem
                                                key={subject}
                                                checked={field.value?.includes(subject)}
                                                onCheckedChange={(checked) => {
                                                    const newValue = checked
                                                        ? [...field.value, subject]
                                                        : field.value?.filter(s => s !== subject);
                                                    field.onChange(newValue);
                                                }}
                                                onSelect={(e) => e.preventDefault()} // Prevent closing on select
                                            >
                                                {subject}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                            {watchedSubjects.map(subject => (
                                <Badge key={subject} variant="secondary">{subject}</Badge>
                            ))}
                        </div>
                        {form.formState.errors.subjects && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.subjects.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('teacher_signup.grades')}</Label>
                        <Controller
                            name="gradesTaught"
                            control={form.control}
                            render={({ field }) => (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-lg border p-2 mt-1">
                                    {grades.map(grade => (
                                        <div key={grade} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`grade-${grade}`}
                                                checked={field.value?.includes(grade)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...field.value, grade])
                                                        : field.onChange(field.value?.filter(g => g !== grade))
                                                }}
                                            />
                                            <Label htmlFor={`grade-${grade}`} className="font-normal">{grade}</Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        />
                        {form.formState.errors.gradesTaught && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.gradesTaught.message}</p>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <Controller
                            name="terms"
                            control={form.control}
                            render={({ field }) => (
                                <div className="flex items-start space-x-2">
                                    <Checkbox
                                        id="terms"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                                        {t('By creating an account, you agree to our')}{' '}
                                        <Link href="/terms-of-service" className="underline hover:text-primary">{t('Terms of Service')}</Link> {t('and')}{' '}
                                        <Link href="/privacy-policy" className="underline hover:text-primary">{t('Privacy Policy')}</Link>.
                                    </Label>
                                </div>
                            )}
                        />
                         {form.formState.errors.terms && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.terms.message}</p>
                        )}
                    </div>


                   <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
                        {isSubmitting ? t('teacher_signup.creating_button') : t('teacher_signup.create_button')}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        {t('teacher_signup.have_account')}{' '}
                        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                            {t('teacher_signup.signin_link')}
                        </Link>
                    </p>
                </form>
            </FormProvider>
            </CardContent>
        </Card>
  );
}
