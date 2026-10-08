'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, Controller, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { AppCache } from '@/lib/cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Course, Teacher, Grade, Unit, Video, Test } from '@/lib/types';
import { grades as defaultCollegeGrades } from '@/lib/data';
import { subjects as defaultSubjects } from '@/lib/subjects';
import {
  PlusCircle,
  Edit,
  Trash2,
  Download,
  BookOpen,
  GripVertical,
  FileText,
  BarChart3,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Video as VideoIcon,
  Sparkles,
  Layers,
  GraduationCap,
  Lock,
  ExternalLink,
  Plus,
  X,
  Check,
  Film,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Checkbox } from './ui/checkbox';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { isBunnyStreamUrl } from '@/lib/bunnyStream';

const videoSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Video title is required'),
  url: z.string().min(1, 'Video URL or Bunny Video ID is required'),
});

const unitSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Unit title is required'),
  videos: z.array(videoSchema).min(1, 'Each unit must have at least one video/lesson.'),
});

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  units: z.array(unitSchema).min(1, 'Course must have at least one unit.'),
  thumbnailUrl: z.string().min(1, 'Thumbnail image is required'),
  attachmentUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  videoNote: z.string().max(1000, 'Note must be 1000 characters or less.').optional(),
  grades: z.array(z.string()).min(1, 'At least one academic year/grade must be selected'),
  subjects: z.array(z.string()).min(1, 'At least one subject must be selected'),
  locked: z.boolean(),
  lockMode: z.enum(['requests_only', 'codes_only', 'both']).default('both').optional(),
  price: z.coerce.number().min(0).optional(),
  viewLimit: z.coerce.number().int().min(0).optional(),
  testId: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

function NestedVideoArray({ unitIndex, control, register, errors, watch }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `units.${unitIndex}.videos`,
  });

  return (
    <div className="space-y-3">
      {fields.map((item, videoIndex) => {
        const videoUrlVal = watch(`units.${unitIndex}.videos.${videoIndex}.url`);
        const isBunny = isBunnyStreamUrl(videoUrlVal || '');

        return (
          <div
            key={item.id}
            className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 transition-all hover:border-zinc-700"
          >
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs shrink-0">
              <Film className="w-4 h-4 text-emerald-400" />
              <span>#{videoIndex + 1}</span>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
              <div>
                <Input
                  {...register(`units.${unitIndex}.videos.${videoIndex}.title`)}
                  placeholder={`Lecture / Lesson ${videoIndex + 1} Title`}
                  className="bg-white dark:bg-zinc-950/60 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-sm h-9"
                />
                {errors.units?.[unitIndex]?.videos?.[videoIndex]?.title && (
                  <p className="text-rose-500 text-xs mt-1">
                    {errors.units[unitIndex]!.videos![videoIndex]!.title!.message}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Input
                    {...register(`units.${unitIndex}.videos.${videoIndex}.url`)}
                    placeholder="Bunny Video ID, Bunny Stream URL, or YouTube"
                    className="bg-white dark:bg-zinc-950/60 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-sm h-9 pr-24"
                  />
                  {videoUrlVal && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      {isBunny ? (
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] py-0 px-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Bunny DRM
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700 text-[10px] py-0 px-1.5">
                          External
                        </Badge>
                      )}
                    </span>
                  )}
                </div>
                {errors.units?.[unitIndex]?.videos?.[videoIndex]?.url && (
                  <p className="text-rose-500 text-xs mt-1">
                    {errors.units[unitIndex]!.videos![videoIndex]!.url!.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0 self-end md:self-center"
              onClick={() => remove(videoIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/30 hover:bg-slate-50 dark:hover:bg-zinc-900 text-xs text-slate-700 dark:text-zinc-300"
        onClick={() => append({ id: uuidv4(), title: '', url: '' })}
      >
        <PlusCircle className="mr-2 h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> Add Video / Lecture
      </Button>

      {errors.units?.[unitIndex]?.videos && typeof errors.units[unitIndex].videos !== 'string' && (
        <p className="text-rose-500 text-xs">{errors.units[unitIndex].videos?.message}</p>
      )}
    </div>
  );
}

function CourseForm({
  onFinished,
  teacherId,
  courseToEdit,
  teacher,
  tests,
}: {
  onFinished: () => void;
  teacherId: string;
  courseToEdit?: Course;
  teacher: Teacher;
  tests: Test[];
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'audience' | 'content' | 'access'>('info');

  // Custom subjects and grades state
  const [allSubjects, setAllSubjects] = useState<string[]>(() => {
    const combined = Array.from(new Set([...defaultSubjects, ...(courseToEdit?.subjects || [])]));
    return combined;
  });
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const [allGrades, setAllGrades] = useState<string[]>(() => {
    const combined = Array.from(new Set([...defaultCollegeGrades, ...(courseToEdit?.grades || [])]));
    return combined;
  });
  const [newGradeInput, setNewGradeInput] = useState('');

  // Thumbnail upload state
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultValues: CourseFormValues = courseToEdit
    ? {
        title: courseToEdit.title || '',
        description: courseToEdit.description || '',
        thumbnailUrl: courseToEdit.thumbnailUrl || '',
        attachmentUrl: courseToEdit.attachmentUrl || '',
        videoNote: courseToEdit.videoNote || '',
        subjects: courseToEdit.subjects || [],
        grades: courseToEdit.grades || [],
        locked: courseToEdit.locked || false,
        lockMode: courseToEdit.lockMode || 'both',
        price: courseToEdit.price ?? 0,
        viewLimit: courseToEdit.viewLimit ?? 3,
        units:
          courseToEdit.units ||
          (courseToEdit.videos ? [{ id: uuidv4(), title: 'Unit 1', videos: courseToEdit.videos }] : []),
        testId: courseToEdit.testId || 'none',
      }
    : {
        title: '',
        description: '',
        units: [
          {
            id: uuidv4(),
            title: 'Unit 1: Course Overview & Introduction',
            videos: [{ id: uuidv4(), title: 'Lesson 1: Introduction', url: '' }],
          },
        ],
        thumbnailUrl: 'https://picsum.photos/seed/course-thumb/800/450',
        attachmentUrl: '',
        videoNote: '',
        grades: ['Year 1 (First Year)'],
        subjects: ['Computer Science'],
        locked: false,
        lockMode: 'both',
        price: 0,
        viewLimit: 3,
        testId: 'none',
      };

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: defaultValues,
  });

  const { register, handleSubmit, formState: { errors }, control, watch, setValue, reset } = form;

  useEffect(() => {
    if (courseToEdit) {
      reset({
        title: courseToEdit.title || '',
        description: courseToEdit.description || '',
        thumbnailUrl: courseToEdit.thumbnailUrl || '',
        attachmentUrl: courseToEdit.attachmentUrl || '',
        videoNote: courseToEdit.videoNote || '',
        subjects: courseToEdit.subjects || [],
        grades: courseToEdit.grades || [],
        locked: courseToEdit.locked || false,
        lockMode: courseToEdit.lockMode || 'both',
        price: courseToEdit.price ?? 0,
        viewLimit: courseToEdit.viewLimit ?? 3,
        units:
          courseToEdit.units ||
          (courseToEdit.videos ? [{ id: uuidv4(), title: 'Unit 1', videos: courseToEdit.videos }] : []),
        testId: courseToEdit.testId || 'none',
      });
      if (courseToEdit.subjects) {
        setAllSubjects((prev) => Array.from(new Set([...prev, ...courseToEdit.subjects])));
      }
      if (courseToEdit.grades) {
        setAllGrades((prev) => Array.from(new Set([...prev, ...courseToEdit.grades])));
      }
    }
  }, [courseToEdit, reset]);

  const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control,
    name: 'units',
  });

  const thumbnailUrlValue = watch('thumbnailUrl');
  const isLocked = watch('locked');

  const handleAddCustomSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (!allSubjects.includes(trimmed)) {
      setAllSubjects((prev) => [...prev, trimmed]);
    }
    const currentSelected = form.getValues('subjects') || [];
    if (!currentSelected.includes(trimmed)) {
      setValue('subjects', [...currentSelected, trimmed]);
    }
    setNewSubjectInput('');
  };

  const handleAddCustomGrade = () => {
    const trimmed = newGradeInput.trim();
    if (!trimmed) return;
    if (!allGrades.includes(trimmed)) {
      setAllGrades((prev) => [...prev, trimmed]);
    }
    const currentSelected = form.getValues('grades') || [];
    if (!currentSelected.includes(trimmed)) {
      setValue('grades', [...currentSelected, trimmed]);
    }
    setNewGradeInput('');
  };

  const handlePopulateTestCourse = () => {
    reset({
      title: 'مقرر المحاضرات الإكلينيكية المتقدمة (تجريبي)',
      description: 'كورس تجريبي متكامل لاختبار وحدات الفيديو، نظام القفل المزدوج (كود + طلبات)، وبنك الأسئلة التفاعلي.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200',
      attachmentUrl: 'https://drive.google.com',
      videoNote: 'يرجى مراجعة ملخص الوحدة الأولى والحلول النموذجية قبل الاختبار.',
      grades: ['الفرقة الأولى (Year 1)', 'الفرقة الثانية (Year 2)'],
      subjects: ['الفيزياء الطبية الحيوية', 'العلوم السريرية'],
      locked: true,
      lockMode: 'both',
      price: 250,
      viewLimit: 3,
      testId: 'none',
      units: [
        {
          id: uuidv4(),
          title: 'الوحدة الأولى: الأساسيات والمفاهيم الكبرى',
          videos: [
            { id: uuidv4(), title: 'المحاضرة 1: مقدمة وشرح عملي', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
            { id: uuidv4(), title: 'المحاضرة 2: تطبيق إكلينيكي', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
          ]
        },
        {
          id: uuidv4(),
          title: 'الوحدة الثانية: التحليل المتقدم وبنك الأسئلة',
          videos: [
            { id: uuidv4(), title: 'المحاضرة 3: حل النماذج الشاملة', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
          ]
        }
      ]
    });
    toast({
      title: '🧪 تم تعبئة الكورس التجريبي!',
      description: 'تم تجهيز الوحدات والفيديوهات وتفعيل نظام القفل المزدوج للتجربة السريعة.',
    });
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumb(true);
    setUploadProgress(10);

    try {
      const uploadedUrl = await uploadImageToCloudinary(file, (percent) => {
        setUploadProgress(percent);
      });

      setValue('thumbnailUrl', uploadedUrl, { shouldValidate: true });
      toast({
        title: 'Thumbnail Uploaded',
        description: 'Course thumbnail has been set.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'Could not upload thumbnail.',
      });
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const onSubmit = async (data: CourseFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const courseData: Record<string, any> = {
        ...data,
        teacherId,
        teacherName: teacher?.name || '',
        teacherProfilePictureUrl: teacher?.profilePictureUrl || null,
      };

      if (data.testId && data.testId !== 'none') {
        courseData.testId = data.testId;
      } else {
        delete courseData.testId;
      }

      delete courseData.homeworkId;
      delete courseData.videos;
      delete courseData.videoUrl;

      // Strictly purge any undefined values to satisfy Firestore addDoc/updateDoc
      Object.keys(courseData).forEach(key => {
        if (courseData[key] === undefined) {
          delete courseData[key];
        }
      });

      // Save to local offline store first (One-Way Smart Push state-label pattern)
      const saveLocally = (courseId: string, isSynced: boolean) => {
        try {
          const localKey = `offline_teacher_courses_${teacherId}`;
          const existing: any[] = JSON.parse(localStorage.getItem(localKey) || '[]');
          const localCourse = {
            ...courseData,
            id: courseId,
            synced: isSynced,
            updatedAt: new Date().toISOString(),
            createdAt: courseToEdit?.createdAt || new Date().toISOString(),
          };
          const idx = existing.findIndex(c => c.id === courseId);
          if (idx >= 0) {
            existing[idx] = localCourse;
          } else {
            existing.unshift(localCourse);
          }
          localStorage.setItem(localKey, JSON.stringify(existing));
        } catch (e) {
          console.warn('Could not cache course locally:', e);
        }
      };

      try {
        if (courseToEdit) {
          const courseRef = doc(firestore, 'teachers', teacherId, 'courses', courseToEdit.id);
          const batch = writeBatch(firestore);

          batch.update(courseRef, { ...courseData, updatedAt: serverTimestamp() });

          if (courseToEdit.isFeatured) {
            const featuredCourseRef = doc(firestore, 'featuredCourses', courseToEdit.id);
            batch.set(
              featuredCourseRef,
              {
                ...courseData,
                id: courseToEdit.id,
                isFeatured: true,
                teacherName: teacher?.name || courseToEdit.teacherName || '',
                teacherProfilePictureUrl: teacher?.profilePictureUrl || courseToEdit.teacherProfilePictureUrl || null,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }

          await batch.commit();
          saveLocally(courseToEdit.id, true);
          toast({ title: t('Course updated successfully') });
        } else {
          const courseCollection = collection(firestore, 'teachers', teacherId, 'courses');
          const docRef = await addDoc(courseCollection, { ...courseData, createdAt: serverTimestamp() });
          saveLocally(docRef.id, true);
          toast({ title: t('Course added successfully') });
        }
      } catch (cloudErr: any) {
        console.warn('Firestore publish offline/connection error:', cloudErr);
        const isOfflineOrUnavailable = 
          cloudErr?.code === 'unavailable' || 
          cloudErr?.message?.includes('unavailable') ||
          cloudErr?.message?.includes('offline') ||
          cloudErr?.message?.includes('Could not reach Cloud Firestore') ||
          (typeof navigator !== 'undefined' && !navigator.onLine);

        if (isOfflineOrUnavailable) {
          const fallbackId = courseToEdit?.id || ('local_' + Date.now());
          saveLocally(fallbackId, false);
          toast({
            title: 'تم حفظ الكورس محلياً بنجاح (Offline Mode) 💾',
            description: 'الشبكة غير متوفرة حالياً، تم تأمين حفظ الكورس على جهازك وسيتم رفعه للسحابة عند استقرار الاتصال.',
          });
        } else {
          throw cloudErr;
        }
      }

      // Evict cache
      AppCache.clear(`coll_teachers/${teacherId}/courses`);
      AppCache.clear(`doc_teachers/${teacherId}/courses`);
      AppCache.clear(`query_teachers/${teacherId}/courses`);
      AppCache.clear(`coll_featuredCourses`);
      AppCache.clear(`query_featuredCourses`);
      AppCache.clear(`doc_featuredCourses`);

      onFinished();
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('Error saving course'), description: error.message });
    }
    setIsSubmitting(false);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800/80 rounded-2xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'info'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Course Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audience')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'audience'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> College Years & Subjects
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'content'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Units & Lectures ({unitFields.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'access'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Locking, Pricing & Modes (القفل والأسعار)</span>
            {isLocked && (
              <span className="text-[10px] bg-amber-400 text-black font-bold px-1.5 py-0.2 rounded-md">
                Locked
              </span>
            )}
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePopulateTestCourse}
            className="ml-auto text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl gap-1 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Populate Test Course</span>
          </Button>
        </div>

        {/* Tab 1: Course Overview */}
        {activeTab === 'info' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-slate-800 dark:text-zinc-200 text-sm font-semibold">
                    Course Title <span className="text-emerald-500 dark:text-emerald-400">*</span>
                  </Label>
                  <Input
                    id="title"
                    {...register('title')}
                    placeholder="e.g. Advanced Operating Systems & Distributed Architecture"
                    className="bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white mt-1.5 focus-visible:ring-emerald-500"
                  />
                  {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title.message}</p>}
                </div>

                <div>
                  <Label htmlFor="description" className="text-slate-800 dark:text-zinc-200 text-sm font-semibold">
                    Course Description <span className="text-emerald-500 dark:text-emerald-400">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    rows={4}
                    placeholder="Provide a comprehensive breakdown of topics, objectives, and prerequisites..."
                    className="bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white mt-1.5 resize-none focus-visible:ring-emerald-500"
                  />
                  {errors.description && (
                    <p className="text-rose-500 text-xs mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="videoNote" className="text-slate-800 dark:text-zinc-200 text-sm font-semibold">
                    Teacher Lecture Notes / Instructions (Optional)
                  </Label>
                  <Textarea
                    id="videoNote"
                    {...register('videoNote')}
                    rows={3}
                    placeholder="e.g. Please solve Practice Problem 4.2 before attending Thursday lecture."
                    className="bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white mt-1.5 resize-none focus-visible:ring-emerald-500"
                  />
                  {errors.videoNote && (
                    <p className="text-rose-500 text-xs mt-1">{errors.videoNote.message}</p>
                  )}
                </div>
              </div>

              {/* Thumbnail & Attachments */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-800 dark:text-zinc-200 text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      Course Cover Thumbnail
                    </Label>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">16:9 Aspect Ratio</span>
                  </div>

                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 flex items-center justify-center group">
                    {thumbnailUrlValue ? (
                      <Image
                        src={thumbnailUrlValue}
                        alt="Thumbnail preview"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-center text-slate-400 dark:text-zinc-500 p-4">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No thumbnail selected</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleThumbnailUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingThumb}
                      className="flex-1 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      <Upload className="w-3.5 h-3.5 mr-2 text-emerald-500 dark:text-emerald-400" />
                      {isUploadingThumb ? `Uploading (${uploadProgress}%)` : 'Upload Image (Cloudinary)'}
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="thumbnailUrl" className="text-xs text-slate-600 dark:text-zinc-400">
                      Or Direct Image URL:
                    </Label>
                    <Input
                      id="thumbnailUrl"
                      {...register('thumbnailUrl')}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs mt-1 h-8"
                    />
                    {errors.thumbnailUrl && (
                      <p className="text-rose-500 text-xs mt-1">{errors.thumbnailUrl.message}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="attachmentUrl" className="text-slate-800 dark:text-zinc-200 text-xs font-semibold">
                      Lecture Material / PDF Attachment URL
                    </Label>
                    <Link
                      href="https://drive.google.com"
                      target="_blank"
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Google Drive <Download className="w-3 h-3" />
                    </Link>
                  </div>
                  <Input
                    id="attachmentUrl"
                    {...register('attachmentUrl')}
                    placeholder="https://drive.google.com/file/d/... or PDF link"
                    className="bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs h-9"
                  />
                  {errors.attachmentUrl && (
                    <p className="text-rose-500 text-xs mt-1">{errors.attachmentUrl.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: College Years & Subjects */}
        {activeTab === 'audience' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* College Academic Years */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    Applicable College Academic Years & Levels <span className="text-emerald-500 dark:text-emerald-400">*</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Select target university stages or add custom department years.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={newGradeInput}
                    onChange={(e) => setNewGradeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomGrade();
                      }
                    }}
                    placeholder="Add custom year / degree..."
                    className="h-8 text-xs bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 w-48 text-slate-900 dark:text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomGrade}
                    className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <Controller
                name="grades"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {allGrades.map((grade) => {
                      const isChecked = field.value?.includes(grade);
                      return (
                        <div
                          key={grade}
                          onClick={() => {
                            if (isChecked) {
                              field.onChange(field.value?.filter((g) => g !== grade));
                            } else {
                              field.onChange([...(field.value || []), grade]);
                            }
                          }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'bg-white dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-emerald-500 border-emerald-500 text-white dark:text-black' : 'border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-900'
                          }`}>
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{grade}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
              {errors.grades && <p className="text-rose-500 text-xs">{errors.grades.message}</p>}
            </div>

            {/* Applicable Subjects */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    Applicable Subjects & Modules <span className="text-emerald-500 dark:text-emerald-400">*</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Select academic subjects or add custom departmental modules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSubject();
                      }
                    }}
                    placeholder="Add custom subject/module..."
                    className="h-8 text-xs bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-700 w-48 text-slate-900 dark:text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomSubject}
                    className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <Controller
                name="subjects"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {allSubjects.map((subject) => {
                      const isChecked = field.value?.includes(subject);
                      return (
                        <div
                          key={subject}
                          onClick={() => {
                            if (isChecked) {
                              field.onChange(field.value?.filter((s) => s !== subject));
                            } else {
                              field.onChange([...(field.value || []), subject]);
                            }
                          }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'bg-white dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          <div className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-emerald-500 border-emerald-500 text-white dark:text-black' : 'border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-900'
                          }`}>
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{subject}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
              {errors.subjects && <p className="text-rose-500 text-xs">{errors.subjects.message}</p>}
            </div>
          </div>
        )}

        {/* Tab 3: Units & Lectures */}
        {activeTab === 'content' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Course Curriculum Structure
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Organize your course into units and attach lectures using Bunny Stream or YouTube.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() =>
                  appendUnit({
                    id: uuidv4(),
                    title: `Unit ${unitFields.length + 1}: New Unit`,
                    videos: [{ id: uuidv4(), title: 'Lesson 1', url: '' }],
                  })
                }
                className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Add New Unit
              </Button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {unitFields.map((unit, unitIndex) => (
                <Collapsible
                  key={unit.id}
                  className="p-4 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 transition-all"
                  defaultOpen
                >
                  <div className="flex items-center justify-between gap-3">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer flex-grow">
                        <GripVertical className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
                        <Input
                          {...register(`units.${unitIndex}.title`)}
                          placeholder={`Unit ${unitIndex + 1} Title`}
                          className="text-sm font-bold border-0 p-0 h-auto bg-transparent text-slate-900 dark:text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      onClick={() => removeUnit(unitIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors.units?.[unitIndex]?.title && (
                    <p className="text-rose-500 text-xs mt-1 ml-6">
                      {errors.units[unitIndex]!.title!.message}
                    </p>
                  )}

                  <CollapsibleContent className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-zinc-800 space-y-3">
                    <NestedVideoArray
                      unitIndex={unitIndex}
                      control={control}
                      register={register}
                      errors={errors}
                      watch={watch}
                    />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {errors.units && <p className="text-rose-500 text-xs">{errors.units.message}</p>}
            {unitFields.length === 0 && (
              <div className="text-center py-10 text-slate-500 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/40">
                <Layers className="mx-auto h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No units added yet. Click &quot;Add New Unit&quot; to begin.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Access & Testing */}
        {activeTab === 'access' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Lock Course Toggle */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="locked" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    Lock Course with Share Code & View Limit
                  </Label>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    When enabled, students must redeem a generated access code from the Teacher Codes tab to unlock this course.
                  </p>
                </div>
                <Controller
                  name="locked"
                  control={control}
                  render={({ field }) => (
                    <Switch id="locked" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              {isLocked && (
                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      Lock & Unlock Mode (طريقة القفل وإتاحة المحتوى)
                    </Label>
                    <Controller
                      name="lockMode"
                      control={control}
                      defaultValue="both"
                      render={({ field }) => (
                        <Select value={field.value || 'both'} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white h-9 text-xs">
                            <SelectValue placeholder="Select unlock mode" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs">
                            <SelectItem value="both">Both (Either/Or): Student chooses Share Code OR Request (مزدوج: كود أو طلب)</SelectItem>
                            <SelectItem value="requests_only">Requests Only: Student must submit request (طلبات وصول فقط)</SelectItem>
                            <SelectItem value="codes_only">Share Codes Only: Only redeemable by code (أكواد وصول فقط)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Determine how students can purchase or request access to this course.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="price" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Full Course Price (EGP / جنيه مصري)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        {...register('price')}
                        placeholder="e.g. 250"
                        className="bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white h-9 text-xs"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Display price for full course unlock requests.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="viewLimit" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Maximum Allowed Student Opens (View Limit)
                      </Label>
                      <Input
                        id="viewLimit"
                        type="number"
                        min="0"
                        {...register('viewLimit')}
                        className="bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white h-9 text-xs"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        0 means unlimited views after unlock.
                      </p>
                    </div>
                  </div>
                  {errors.viewLimit && (
                    <p className="text-rose-500 text-xs">{errors.viewLimit.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Link Test & Exam */}
            <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 space-y-3">
              <div>
                <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Link Assessment / Test (Optional)
                </Label>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Attach an online quiz or test that students must take alongside this course.
                </p>
              </div>

              <Controller
                name="testId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <SelectTrigger className="bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Select a test to link" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                      <SelectItem value="none">None (No Test Attached)</SelectItem>
                      {tests.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800/80 mt-auto shrink-0">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            {isSubmitting ? 'Syncing...' : 'Changes will be immediately visible.'}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onFinished}
              className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Saving Course...' : courseToEdit ? 'Update Course' : 'Publish Course'}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

export function ManageCourses({ teacherId, teacher }: { teacherId: string; teacher: Teacher }) {
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | undefined>(undefined);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, 'teachers', teacherId, 'courses');
  }, [firestore, teacherId]);
  const { data: cloudCourses, isLoading } = useCollection<Course>(coursesQuery);

  const [offlineCourses, setOfflineCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && teacherId) {
      try {
        const localKey = `offline_teacher_courses_${teacherId}`;
        const stored = JSON.parse(localStorage.getItem(localKey) || '[]');
        setOfflineCourses(stored);
      } catch (e) {}
    }
  }, [teacherId, isFormOpen]);

  const courses = useMemo(() => {
    const list: Course[] = cloudCourses ? [...cloudCourses] : [];
    if (offlineCourses.length > 0) {
      offlineCourses.forEach(oc => {
        const idx = list.findIndex(c => c.id === oc.id);
        if (idx === -1) {
          list.push(oc);
        } else {
          list[idx] = { ...list[idx], ...oc };
        }
      });
    }
    return list;
  }, [cloudCourses, offlineCourses]);

  const testsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return query(collection(firestore, 'tests'), where('teacherId', '==', teacherId));
  }, [firestore, teacherId]);
  const { data: tests, isLoading: testsLoading } = useCollection<Test>(testsQuery);

  const isLoadingData = isLoading || testsLoading;

  const handleEdit = (course: Course) => {
    setCourseToEdit(course);
    setIsFormOpen(true);
  };

  const handleDelete = async (course: Course) => {
    if (!firestore) return;
    const courseRef = doc(firestore, 'teachers', teacherId, 'courses', course.id);
    const featuredCourseRef = doc(firestore, 'featuredCourses', course.id);

    try {
      const batch = writeBatch(firestore);
      batch.delete(courseRef);
      if (course.isFeatured) {
        batch.delete(featuredCourseRef);
      }
      await batch.commit();

      // Also clean from offline cache if present
      try {
        const localKey = `offline_teacher_courses_${teacherId}`;
        const existing: any[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const filtered = existing.filter(c => c.id !== course.id);
        localStorage.setItem(localKey, JSON.stringify(filtered));
        setOfflineCourses(filtered);
      } catch (e) {}

      setDeletingCourseId(null);

      AppCache.clear(`coll_teachers/${teacherId}/courses`);
      AppCache.clear(`doc_teachers/${teacherId}/courses`);
      AppCache.clear(`query_teachers/${teacherId}/courses`);
      AppCache.clear(`coll_featuredCourses`);
      AppCache.clear(`query_featuredCourses`);
      AppCache.clear(`doc_featuredCourses`);

      toast({ title: t('Course deleted.') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Deletion failed'), description: e.message });
    }
  };

  const openNewCourseForm = () => {
    setCourseToEdit(undefined);
    setIsFormOpen(true);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-500 dark:text-emerald-400" /> My Academic Courses
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Publish college lectures, units, DRM-secured videos, and assessments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800">
            <Link href="/teacher/courses/analytics">
              <BarChart3 className="mr-2 h-4 w-4 text-emerald-500 dark:text-emerald-400" /> Course Analytics
            </Link>
          </Button>
          <Button
            onClick={openNewCourseForm}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Course
          </Button>
        </div>
      </div>

      <div>
        {isLoadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-3xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course) => (
              <Card
                key={course.id}
                className="flex flex-col rounded-3xl bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-500/50 dark:hover:border-zinc-700 transition-all"
              >
                <CardHeader className="p-0">
                  <div className="aspect-video w-full overflow-hidden relative bg-slate-100 dark:bg-zinc-900">
                    <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                    
                    {/* Top-Left: Price Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      {course.price && course.price > 0 ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-black text-xs shadow-lg shadow-black/30 px-2.5 py-0.5 border border-emerald-400">
                          {course.price} EGP
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[11px] backdrop-blur-md px-2 py-0.5">
                          مجاني Free
                        </Badge>
                      )}
                    </div>

                    {/* Top-Right: Lock Status & Mode Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      {course.locked ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] flex items-center gap-1 shadow-lg shadow-black/30 px-2.5 py-0.5">
                          <Lock className="w-3 h-3" />
                          <span>
                            {course.lockMode === 'requests_only'
                              ? 'Locked: طلبات فقط'
                              : course.lockMode === 'codes_only'
                              ? 'Locked: كود فقط'
                              : 'Locked: كود أو طلب'}
                          </span>
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40 font-bold text-[11px] backdrop-blur-md px-2 py-0.5">
                          مفتوح للجميع (Public)
                        </Badge>
                      )}
                    </div>

                    {course.isFeatured && (
                      <Badge className="absolute bottom-3 left-3 z-10 bg-blue-500 text-white font-bold text-[10px]">
                        Featured
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow p-5 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {course.grades?.slice(0, 2).map((g) => (
                      <Badge key={g} variant="outline" className="text-[10px] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800">
                        {g}
                      </Badge>
                    ))}
                    {course.subjects?.slice(0, 2).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400/80 border-emerald-500/30">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2">{course.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">{course.description}</p>

                  {/* Course Status Summary Strip */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {course.price && course.price > 0 ? `${course.price} EGP` : 'مجاني (0 EGP)'}
                    </span>
                    <span className="text-slate-300 dark:text-zinc-600">|</span>
                    <span className={course.locked ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400'}>
                      {course.locked ? (course.lockMode === 'requests_only' ? 'طلبات وصول' : course.lockMode === 'codes_only' ? 'أكواد وصول' : 'كود + طلبات') : 'متاح للجميع'}
                    </span>
                    <span className="text-slate-300 dark:text-zinc-600">|</span>
                    <span>{course.units?.length || 1} وحدات</span>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between p-4 pt-0 border-t border-slate-100 dark:border-zinc-900">
                  <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs px-2">
                      <Link href={`/teacher/courses/analytics?courseId=${course.id}`}>
                        <BarChart3 className="mr-1 h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> Analytics
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs px-2">
                      <Link href={`/courses/${teacherId}/${course.id}`} target="_blank">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> معاينة كطالب
                      </Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(course)}
                      className="text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    {deletingCourseId === course.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleDelete(course)}
                        >
                          {t('Confirm')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setDeletingCourseId(null)}
                        >
                          {t('Cancel')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs"
                        onClick={() => setDeletingCourseId(course.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}

            {courses?.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-500 dark:text-zinc-500 space-y-4 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl bg-slate-50/50 dark:bg-zinc-950/40">
                <BookOpen className="mx-auto h-12 w-12 text-slate-400 dark:text-zinc-600" />
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-300">No Courses Published Yet</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                    Click &quot;Add Course&quot; to launch your first university course.
                  </p>
                </div>
                <Button onClick={openNewCourseForm} className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create First Course
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen Pop-Out Modal Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-950/98 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white shadow-2xl overflow-hidden">
          <DialogHeader className="shrink-0 pb-4 border-b border-slate-200 dark:border-zinc-800/80">
            <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              {courseToEdit ? 'Edit Course & Curriculum' : 'Add New Academic Course'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
              Configure course details, Bunny Stream video lectures, college stages, and access controls.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto pt-4 pr-1">
            <CourseForm
              onFinished={() => setIsFormOpen(false)}
              teacherId={teacherId}
              teacher={teacher}
              courseToEdit={courseToEdit}
              tests={tests || []}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
