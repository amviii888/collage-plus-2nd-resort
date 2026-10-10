

'use client';

import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { AppCache } from '@/lib/cache';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Teacher, Grade } from '@/lib/types';
import { useState } from 'react';
import { subjects } from '@/lib/subjects';
import { grades } from '@/lib/data';
import { Checkbox } from './ui/checkbox';
import { CldUploadButton } from 'next-cloudinary';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UploadCloud } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { saveTeacherCodeMappingToCloudAndLocal } from '@/lib/professors-registry';
import { Key, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().optional(),
  bio: z.string().max(300, { message: 'Bio cannot be longer than 300 characters.' }).optional(),
  profilePictureUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  heroImageUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  subjects: z.array(z.string()).min(1, 'Please select at least one subject.'),
  gradesTaught: z.array(z.string()).min(1, 'Please select at least one grade.'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface TeacherProfileFormProps {
  teacher: Teacher;
}

export function TeacherProfileForm({ teacher }: TeacherProfileFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Doctor 2-4 Letter Code State
  const initialDoctorCode = (teacher as any).code || (teacher as any).teacherCode || (teacher.id && teacher.id.length <= 4 ? teacher.id.toUpperCase() : '');
  const [doctorCodeInput, setDoctorCodeInput] = useState(initialDoctorCode);
  const [isSavingDoctorCode, setIsSavingDoctorCode] = useState(false);
  const [doctorCodeSaved, setDoctorCodeSaved] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: teacher.name || '',
      phoneNumber: teacher.phoneNumber || '',
      bio: teacher.bio || '',
      profilePictureUrl: teacher.profilePictureUrl || '',
      heroImageUrl: teacher.heroImageUrl || '',
      subjects: teacher.subjects || [],
      gradesTaught: teacher.gradesTaught || [],
    },
    mode: 'onChange',
  });

  // Handle explicit doctor code save
  const handleSaveDoctorCode = async () => {
    const cleanCode = (doctorCodeInput || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 4) {
      toast({
        variant: 'destructive',
        title: 'كود الدكتور غير صالح',
        description: 'يجب أن يتكون كود الدكتور من 2 إلى 4 أحرف إنجليزية كبيرة (مثل VV أو PHYS أو MATH).',
      });
      return;
    }

    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'غير مسجل',
        description: 'يجب تسجيل الدخول لحفظ كود الدكتور.',
      });
      return;
    }

    setIsSavingDoctorCode(true);

    try {
      const teacherName = form.getValues('name') || teacher.name || 'أستاذ المادة';
      const teacherSubject = form.getValues('subjects')?.[0] || teacher.subjects?.[0] || 'المقررات الجامعية';
      const teacherAvatar = form.getValues('profilePictureUrl') || teacher.profilePictureUrl || '';
      const teacherHero = form.getValues('heroImageUrl') || teacher.heroImageUrl || '';
      const teacherThemeId = (teacher as any).assignedThemeId || (teacher as any).customTheme?.themeClass || 'default';

      await saveTeacherCodeMappingToCloudAndLocal({
        id: user.uid,
        code: cleanCode,
        name: teacherName,
        titleAr: `أستاذ ${teacherSubject}`,
        titleEn: `Professor of ${teacherSubject}`,
        subjectAr: teacherSubject,
        subjectEn: 'University Courses',
        facultyAr: 'الجامعة والكلية',
        facultyEn: 'Faculty & University',
        avatarUrl: teacherAvatar,
        heroImageUrl: teacherHero,
        appIconPath: (teacher as any).appIconPath || '/icons/professors/vv.svg',
        appIconEmoji: (teacher as any).appIconEmoji || '⚡',
        appNameAr: `منصة ${teacherName} [${cleanCode}]`,
        appNameEn: `${teacherName} Portal [${cleanCode}]`,
        themeColor: (teacher as any).themeColor || '#2563eb',
        coursesCount: 4,
        studentsCount: 200,
        descriptionAr: form.getValues('bio') || teacher.bio || `البوابة الأكاديمية الرسمية لمحاضرات ${teacherName}.`,
        descriptionEn: `Official academic portal for ${teacherName}.`,
        assignedThemeId: teacherThemeId,
      }, firestore);

      AppCache.clear(`doc_teachers/${user.uid}`);
      setDoctorCodeSaved(true);

      toast({
        title: '🎉 تم حفظ واعتماد كود الدكتور بنجاح!',
        description: `تم ربط حسابك بالكود [ ${cleanCode} ] في السحابة. يستطيع أي طالب الآن كتابة هذا الكود عند التسجيل وسيتم ربطه بك وتفعيل ثيمك فوراً.`,
      });

      setTimeout(() => setDoctorCodeSaved(false), 5000);
    } catch (err: any) {
      console.error('Error saving doctor code:', err);
      toast({
        variant: 'destructive',
        title: 'فشل حفظ الكود',
        description: err.message || 'حدث خطأ أثناء حفظ كود الدكتور في السحابة.',
      });
    } finally {
      setIsSavingDoctorCode(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to update your profile.',
      });
      return;
    }

    setIsSubmitting(true);
    const teacherRef = doc(firestore, 'teachers', user.uid);
    
    const defaultPfp = PlaceHolderImages.find(p => p.id === 'teacher-profile')?.imageUrl || '';
    const defaultHero = PlaceHolderImages.find(p => p.id === 'teacher-hero')?.imageUrl || '';

    const payload = {
        ...data,
        profilePictureUrl: data.profilePictureUrl || defaultPfp,
        heroImageUrl: data.heroImageUrl || defaultHero,
    };

    try {
      updateDocumentNonBlocking(teacherRef, payload);
      // Evict memory cache to reflect changes immediately
      AppCache.clear(`doc_teachers/${user.uid}`);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully saved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update your profile.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handlePfpUpload = (result: any) => {
    form.setValue('profilePictureUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
  }

  const handleHeroUpload = (result: any) => {
    form.setValue('heroImageUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
  }

  const pfpUrl = form.watch('profilePictureUrl');

  return (
    <Card className="profile-content-card">
      <CardHeader>
        <CardTitle>Edit Your Profile</CardTitle>
        <CardDescription>
            Update your public teacher profile information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Doctor 2-4 Letter Code Section */}
        <div className="mb-6 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-sm font-bold text-slate-900 dark:text-white">
                  كود الدكتور الأكاديمي للطلاب (من 2 إلى 4 أحرف)
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  الكود الذي يكتبه طلابك عند إنشاء حساباتهم لربطهم بمنصتك تلقائياً وتفعيل ثيمك المخصص.
                </p>
              </div>
            </div>
            {initialDoctorCode && (
              <span className="text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                الكود المعتمد: [{initialDoctorCode}]
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Input 
              value={doctorCodeInput}
              onChange={(e) => setDoctorCodeInput(e.target.value.toUpperCase())}
              placeholder="مثال: VV أو PHYS أو MATH"
              maxLength={4}
              className="h-11 rounded-xl font-mono font-black text-sm uppercase tracking-widest text-center sm:text-right bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            />
            <Button
              type="button"
              onClick={handleSaveDoctorCode}
              disabled={isSavingDoctorCode || !doctorCodeInput.trim()}
              className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 flex items-center gap-2 px-5 shadow-md shadow-blue-600/20"
            >
              {doctorCodeSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>تم الحفظ والاعتماد السحابي!</span>
                </>
              ) : isSavingDoctorCode ? (
                <span>جارٍ الحفظ في السحابة...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>حفظ واعتماد كود الدكتور</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register('name')} placeholder="e.g. Dr. Evelyn Reed" />
                    {form.formState.errors.name && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.name.message}</p>
                    )}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                    <Input id="phoneNumber" {...form.register('phoneNumber')} placeholder="e.g. 01234567890" />
                    {form.formState.errors.phoneNumber && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.phoneNumber.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                className="min-h-[100px]"
                placeholder="Tell us a little about yourself and your teaching philosophy."
              />
              {form.formState.errors.bio && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.bio.message}</p>
              )}
            </div>

            {teacher.approved && (
              <>
                <div className='flex items-center gap-4'>
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={pfpUrl} />
                        <AvatarFallback>{teacher.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 w-full">
                        <Label>Profile Picture (Optional)</Label>
                        <CldUploadButton
                            uploadPreset="unsigned_pfp_upload"
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium h-9 px-3 w-full flex items-center justify-center gap-2"
                            onSuccess={handlePfpUpload}
                        >
                          <UploadCloud /> Upload an Image
                        </CldUploadButton>
                        {form.formState.errors.profilePictureUrl && (
                            <p className="text-sm font-medium text-destructive">{form.formState.errors.profilePictureUrl.message}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Hero Banner Image (Optional)</Label>
                    {form.watch('heroImageUrl') && <img src={form.watch('heroImageUrl')} alt="Hero preview" className="rounded-md mt-2 object-cover aspect-[3/1]" />}
                    <CldUploadButton
                        uploadPreset="unsigned_pfp_upload"
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium h-9 px-3 w-full flex items-center justify-center gap-2"
                        onSuccess={handleHeroUpload}
                    >
                        <UploadCloud /> Upload a Banner
                    </CldUploadButton>
                    <p className="text-xs text-muted-foreground">Recommended size: 1200x400px.</p>
                    {form.formState.errors.heroImageUrl && (
                        <p className="text-sm font-medium text-destructive">{form.formState.errors.heroImageUrl.message}</p>
                     )}
                </div>
              </>
            )}
            
            <div className="space-y-2">
                <Label>Subjects You Teach</Label>
                <Controller
                    name="subjects"
                    control={form.control}
                    render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-lg border p-2 mt-1 max-h-60 overflow-y-auto">
                            {subjects.map(subject => (
                                <div key={subject} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`subject-${subject}`}
                                        checked={field.value?.includes(subject)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...field.value, subject])
                                                : field.onChange(field.value?.filter(s => s !== subject))
                                        }}
                                    />
                                    <Label htmlFor={`subject-${subject}`} className="font-normal">{subject}</Label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                 {form.formState.errors.subjects && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.subjects.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Grades You Teach</Label>
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

            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
