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
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { subjects as defaultSubjects } from '@/lib/subjects';
import { grades as defaultGrades } from '@/lib/data';
import { Checkbox } from './ui/checkbox';
import { CldUploadButton } from 'next-cloudinary';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UploadCloud, Key, CheckCircle, ShieldCheck, Plus, Sparkles, BookOpen, GraduationCap } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { saveTeacherCodeMappingToCloudAndLocal, normalizeImagePath, DEFAULT_CUSTOM_PROFESSOR_IMAGE, getTeacherCustomAvatar } from '@/lib/professors-registry';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().optional(),
  bio: z.string().max(500, { message: 'Bio cannot be longer than 500 characters.' }).optional(),
  profilePictureUrl: z.string().optional().or(z.literal('')),
  heroImageUrl: z.string().optional().or(z.literal('')),
  subjects: z.array(z.string()).min(1, 'Please select or add at least one subject.'),
  gradesTaught: z.array(z.string()).min(1, 'Please select or add at least one grade.'),
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

  // Custom Subject & Custom Grade Inputs
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [customGradeInput, setCustomGradeInput] = useState('');

  // Dynamic Subjects & Grades Lists (Merging Defaults + Teacher Existing + Custom User Inputs)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(() => {
    const combined = Array.from(new Set([...defaultSubjects, ...(teacher.subjects || [])]));
    return combined;
  });

  const [availableGrades, setAvailableGrades] = useState<string[]>(() => {
    const combined = Array.from(new Set([...defaultGrades, ...(teacher.gradesTaught || [])]));
    return combined;
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: teacher.name || '',
      phoneNumber: teacher.phoneNumber || '',
      bio: teacher.bio || '',
      profilePictureUrl: normalizeImagePath(teacher.profilePictureUrl || (teacher as any).avatarUrl || (teacher as any).appIconPath || (teacher.id ? getTeacherCustomAvatar(teacher.id) : '')),
      heroImageUrl: teacher.heroImageUrl || '',
      subjects: teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects : ['المقررات الجامعية'],
      gradesTaught: teacher.gradesTaught && teacher.gradesTaught.length > 0 ? teacher.gradesTaught : ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
    },
    mode: 'onChange',
  });

  // Re-synchronize form inputs whenever teacher data updates from Firestore
  useEffect(() => {
    if (teacher) {
      const currentTeacherId = teacher.id || user?.uid;
      const pfp = normalizeImagePath(
        teacher.profilePictureUrl || 
        (teacher as any).avatarUrl || 
        (teacher as any).appIconPath || 
        (currentTeacherId ? localStorage.getItem(`custom_teacher_avatar_${currentTeacherId}`) : '') ||
        (teacher.id ? getTeacherCustomAvatar(teacher.id) : '')
      );
      const hero = normalizeImagePath(
        teacher.heroImageUrl || 
        (currentTeacherId ? localStorage.getItem(`custom_teacher_hero_${currentTeacherId}`) : '') || 
        ''
      );

      const tSubjects = teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects : ['المقررات الجامعية'];
      const tGrades = teacher.gradesTaught && teacher.gradesTaught.length > 0 ? teacher.gradesTaught : ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'];

      // Ensure lists contain all saved teacher subjects & grades
      setAvailableSubjects(prev => Array.from(new Set([...prev, ...tSubjects])));
      setAvailableGrades(prev => Array.from(new Set([...prev, ...tGrades])));

      form.reset({
        name: teacher.name || '',
        phoneNumber: teacher.phoneNumber || '',
        bio: teacher.bio || '',
        profilePictureUrl: pfp,
        heroImageUrl: hero,
        subjects: tSubjects,
        gradesTaught: tGrades,
      });

      const code = (teacher as any).code || (teacher as any).teacherCode || (teacher.id && teacher.id.length <= 4 ? teacher.id.toUpperCase() : '');
      if (code) {
        setDoctorCodeInput(code);
      }
    }
  }, [teacher, form, user]);

  // Handle adding custom subject
  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!availableSubjects.includes(trimmed)) {
      setAvailableSubjects(prev => [...prev, trimmed]);
    }
    const currentSubjects = form.getValues('subjects') || [];
    if (!currentSubjects.includes(trimmed)) {
      form.setValue('subjects', [...currentSubjects, trimmed], { shouldDirty: true, shouldValidate: true });
    }
    setCustomSubjectInput('');
    toast({
      title: 'تمت إضافة المادة المخصصة بنجاح',
      description: `تمت إضافة "${trimmed}" إلى قائمة المواد المتاحة لك.`,
    });
  };

  // Handle adding custom grade
  const handleAddCustomGrade = () => {
    const trimmed = customGradeInput.trim();
    if (!trimmed) return;
    if (!availableGrades.includes(trimmed)) {
      setAvailableGrades(prev => [...prev, trimmed]);
    }
    const currentGrades = form.getValues('gradesTaught') || [];
    if (!currentGrades.includes(trimmed)) {
      form.setValue('gradesTaught', [...currentGrades, trimmed], { shouldDirty: true, shouldValidate: true });
    }
    setCustomGradeInput('');
    toast({
      title: 'تمت إضافة الفرقة/الصف المخصص بنجاح',
      description: `تمت إضافة "${trimmed}" إلى قائمة المراحل المتاحة لك.`,
    });
  };

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
    const currentTeacherId = user?.uid || teacher.id || (typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null);
    
    if (!currentTeacherId) {
      toast({
        variant: 'destructive',
        title: 'غير مسجل الدخول',
        description: 'يجب تسجيل الدخول لتحديث ملفك الأكاديمي.',
      });
      return;
    }

    setIsSubmitting(true);
    const defaultPfp = PlaceHolderImages.find(p => p.id === 'teacher-profile')?.imageUrl || DEFAULT_CUSTOM_PROFESSOR_IMAGE;
    const defaultHero = PlaceHolderImages.find(p => p.id === 'teacher-hero')?.imageUrl || '';

    const finalPfp = normalizeImagePath(data.profilePictureUrl || defaultPfp);
    const finalHero = normalizeImagePath(data.heroImageUrl || defaultHero);

    const payload = {
        ...data,
        id: currentTeacherId,
        profilePictureUrl: finalPfp,
        avatarUrl: finalPfp,
        heroImageUrl: finalHero,
        updatedAt: new Date().toISOString(),
    };

    try {
      if (firestore) {
        const teacherRef = doc(firestore, 'teachers', currentTeacherId);
        updateDocumentNonBlocking(teacherRef, payload);

        // Sync name & pfp to users collection as well
        const userRef = doc(firestore, 'users', currentTeacherId);
        updateDocumentNonBlocking(userRef, {
          name: data.name,
          profilePictureUrl: finalPfp,
          updatedAt: new Date().toISOString(),
        });
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`custom_teacher_avatar_${currentTeacherId}`, finalPfp);
        localStorage.setItem(`custom_teacher_hero_${currentTeacherId}`, finalHero);
        localStorage.setItem(`custom_teacher_icon_${currentTeacherId}`, finalPfp);

        // Update stored teacher accounts list for multi-account switcher
        const stored = localStorage.getItem('teacher_accounts');
        if (stored) {
          try {
            const accounts = JSON.parse(stored);
            const updatedAccs = accounts.map((acc: any) => {
              if (acc.id === currentTeacherId) {
                return { ...acc, name: data.name, profilePictureUrl: finalPfp };
              }
              return acc;
            });
            localStorage.setItem('teacher_accounts', JSON.stringify(updatedAccs));
          } catch (e) {}
        }
      }

      // Evict memory cache to reflect changes immediately
      AppCache.clear(`doc_teachers/${currentTeacherId}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('connected_professors_updated'));
        window.dispatchEvent(new Event('admin_teacher_codes_updated'));
      }

      toast({
        title: '🎉 تم تحديث الملف الأكاديمي بنجاح!',
        description: 'تم حفظ بياناتك وصورتك الشخصية والمواد بنجاح في السحابة.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'فشل التحديث',
        description: error.message || 'حدث خطأ أثناء حفظ التغييرات.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handlePfpUpload = (result: any) => {
    if (result?.info?.secure_url) {
      form.setValue('profilePictureUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleHeroUpload = (result: any) => {
    if (result?.info?.secure_url) {
      form.setValue('heroImageUrl', result.info.secure_url, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handlePfpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          form.setValue('profilePictureUrl', reader.result, { shouldValidate: true, shouldDirty: true });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          form.setValue('heroImageUrl', reader.result, { shouldValidate: true, shouldDirty: true });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const watchedPfp = form.watch('profilePictureUrl');
  const watchedHero = form.watch('heroImageUrl');
  const currentTeacherId = user?.uid || teacher.id;
  const pfpUrl = normalizeImagePath(
    watchedPfp || 
    (teacher as any).avatarUrl || 
    (teacher as any).appIconPath || 
    (currentTeacherId ? localStorage.getItem(`custom_teacher_avatar_${currentTeacherId}`) : '') ||
    DEFAULT_CUSTOM_PROFESSOR_IMAGE
  );

  return (
    <Card className="profile-content-card border-slate-800 bg-slate-950/80 backdrop-blur-xl shadow-2xl rounded-3xl">
      <CardHeader dir="rtl" className="border-b border-slate-800/80 pb-5">
        <CardTitle className="text-xl font-black text-white flex items-center gap-2">
          <span>تعديل الملف الأكاديمي للمعلم/الدكتور</span>
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          تحديث معلوماتك الشخصية، المواد والصفوف التي تدرسها، كود الدكتور والصورة الشخصية وصورة البانر.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6" dir="rtl">
        {/* Doctor 2-4 Letter Code Section */}
        <div className="mb-6 p-4 rounded-2xl bg-blue-950/30 border border-blue-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-sm font-bold text-white">
                  كود الدكتور الأكاديمي للطلاب (من 2 إلى 4 أحرف)
                </Label>
                <p className="text-[11px] text-slate-400">
                  الكود الذي يكتبه طلابك عند إنشاء حساباتهم لربطهم بمنصتك تلقائياً وتفعيل ثيمك المخصص.
                </p>
              </div>
            </div>
            {initialDoctorCode && (
              <span className="text-xs font-mono font-bold bg-blue-900/60 text-blue-300 px-2.5 py-1 rounded-xl self-start sm:self-auto border border-blue-700/50">
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
              className="h-11 rounded-xl font-mono font-black text-sm uppercase tracking-widest text-center sm:text-right bg-slate-900 border-slate-700 text-white"
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
                <Label htmlFor="name" className="text-xs font-bold text-slate-300">الاسم الكامل للمعلم / الدكتور</Label>
                <Input id="name" {...form.register('name')} placeholder="مثال: د. أحمد المحمدي" className="bg-slate-900 border-slate-700 text-white h-11 text-sm rounded-xl" />
                {form.formState.errors.name && (
                  <p className="text-xs font-medium text-red-400">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-xs font-bold text-slate-300">رقم الهاتف / الواتساب (اختياري)</Label>
                <Input id="phoneNumber" {...form.register('phoneNumber')} placeholder="01012345678" className="bg-slate-900 border-slate-700 text-white h-11 text-sm rounded-xl" />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs font-medium text-red-400">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-xs font-bold text-slate-300">النبذة التعريفية (Bio)</Label>
              <Textarea
                id="bio"
                {...form.register('bio')}
                className="min-h-[100px] bg-slate-900 border-slate-700 text-white text-xs rounded-xl"
                placeholder="اكتب نبذة مختصرة عن مؤهلاتك ورؤيتك التعليمية..."
              />
              {form.formState.errors.bio && (
                <p className="text-xs font-medium text-red-400">{form.formState.errors.bio.message}</p>
              )}
            </div>

            {/* Profile Picture Section */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <Label className="text-sm font-bold text-white flex items-center gap-2">
                <span>الصورة الشخصية للدكتور (Profile Picture)</span>
              </Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-20 w-20 shrink-0 border-2 border-primary/50 shadow-md">
                    <AvatarImage src={pfpUrl} />
                    <AvatarFallback>{teacher.name?.charAt(0) || '👨‍🏫'}</AvatarFallback>
                </Avatar>
                <div className="space-y-3 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">رفع صورة مباشرة من الجهاز</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePfpFileChange}
                        className="bg-slate-950 text-xs border-slate-700 h-9 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">أو رابط صورة مباشرة (URL)</Label>
                      <Input
                        type="text"
                        placeholder="https://..."
                        {...form.register('profilePictureUrl')}
                        className="bg-slate-950 text-xs border-slate-700 h-9 rounded-xl text-white"
                      />
                    </div>
                  </div>
                  <CldUploadButton
                      uploadPreset="unsigned_pfp_upload"
                      className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium h-9 px-3 w-full flex items-center justify-center gap-2 border border-slate-700"
                      onSuccess={handlePfpUpload}
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-400" /> رفع عبر Cloudinary
                  </CldUploadButton>
                </div>
              </div>
            </div>

            {/* Hero Banner Section */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <Label className="text-sm font-bold text-white flex items-center gap-2">
                <span>صورة البانر العلوي للمنصة (Hero Banner)</span>
              </Label>
              {watchedHero && (
                <img src={watchedHero} alt="Hero preview" className="rounded-xl mt-2 object-cover aspect-[3/1] w-full border border-slate-700 shadow-sm" />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">رفع صورة بنر من الجهاز</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroFileChange}
                    className="bg-slate-950 text-xs border-slate-700 h-9 rounded-xl text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">أو رابط صورة مباشرة (URL)</Label>
                  <Input
                    type="text"
                    placeholder="https://..."
                    {...form.register('heroImageUrl')}
                    className="bg-slate-950 text-xs border-slate-700 h-9 rounded-xl text-white"
                  />
                </div>
              </div>
              <CldUploadButton
                  uploadPreset="unsigned_pfp_upload"
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium h-9 px-3 w-full flex items-center justify-center gap-2 border border-slate-700"
                  onSuccess={handleHeroUpload}
              >
                  <UploadCloud className="w-3.5 h-3.5 text-blue-400" /> رفع البانر عبر Cloudinary
              </CldUploadButton>
            </div>
            
            {/* Subjects Selection & Custom Subject Creation */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>المواد والمقررات التي تدرسها</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">حدد المواد أو أضف مادة مخصصة</span>
                </div>

                {/* Add Custom Subject Bar */}
                <div className="flex gap-2">
                  <Input 
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    placeholder="أدخل اسم مادة مخصصة جديد (مثل: الفيزياء الطبية، التشريح، ...)"
                    className="h-10 text-xs bg-slate-950 border-slate-700 text-white rounded-xl"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddCustomSubject}
                    disabled={!customSubjectInput.trim()}
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shrink-0 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مادة مخصصة</span>
                  </Button>
                </div>

                <Controller
                    name="subjects"
                    control={form.control}
                    render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 max-h-60 overflow-y-auto">
                            {availableSubjects.map(subject => (
                                <div key={subject} className="flex items-center space-x-2 space-x-reverse bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                                    <Checkbox 
                                        id={`subject-${subject}`}
                                        checked={field.value?.includes(subject)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), subject])
                                                : field.onChange(field.value?.filter(s => s !== subject))
                                        }}
                                    />
                                    <Label htmlFor={`subject-${subject}`} className="text-xs text-slate-200 font-medium cursor-pointer truncate">{subject}</Label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                {form.formState.errors.subjects && (
                    <p className="text-xs font-medium text-red-400">{form.formState.errors.subjects.message}</p>
                )}
            </div>

            {/* Grades Selection & Custom Grade Creation */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span>الصفوف والفرق الدراسية التي تدرس لها</span>
                  </Label>
                  <span className="text-[11px] text-slate-400">حدد المراحل أو أضف فرقة مخصصة</span>
                </div>

                {/* Add Custom Grade Bar */}
                <div className="flex gap-2">
                  <Input 
                    value={customGradeInput}
                    onChange={(e) => setCustomGradeInput(e.target.value)}
                    placeholder="أدخل اسم فرقة/صف مخصص جديد (مثل: الفرقة الخامسة، المستوى الثالث، ...)"
                    className="h-10 text-xs bg-slate-950 border-slate-700 text-white rounded-xl"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddCustomGrade}
                    disabled={!customGradeInput.trim()}
                    className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shrink-0 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة فرقة مخصصة</span>
                  </Button>
                </div>

                <Controller
                    name="gradesTaught"
                    control={form.control}
                    render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 max-h-60 overflow-y-auto">
                            {availableGrades.map(grade => (
                                <div key={grade} className="flex items-center space-x-2 space-x-reverse bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                                    <Checkbox 
                                        id={`grade-${grade}`}
                                        checked={field.value?.includes(grade)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), grade])
                                                : field.onChange(field.value?.filter(g => g !== grade))
                                        }}
                                    />
                                    <Label htmlFor={`grade-${grade}`} className="text-xs text-slate-200 font-medium cursor-pointer truncate">{grade}</Label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                {form.formState.errors.gradesTaught && (
                    <p className="text-xs font-medium text-red-400">{form.formState.errors.gradesTaught.message}</p>
                )}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-sm shadow-lg shadow-blue-600/20" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ حفظ التغييرات...' : 'حفظ التغييرات في الملف الأكاديمي'}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
