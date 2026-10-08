'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  UploadCloud, 
  CheckCircle, 
  Sparkles, 
  GraduationCap, 
  Smartphone, 
  Link2, 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Check, 
  Search, 
  FolderGit2, 
  Layers, 
  ShieldCheck, 
  Image as ImageIcon 
} from 'lucide-react';
import { useAuth, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { subjects } from '@/lib/subjects';
import { grades } from '@/lib/data';
import { teacherPlans } from '@/lib/teacher-plans';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CldUploadButton } from 'next-cloudinary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { 
  ProfessorItem, 
  BUILTIN_APP_ICONS, 
  REGISTERED_PROFESSORS, 
  getActiveRegisteredProfessors,
  getAdminCustomTeacherCodes, 
  saveAdminTeacherCodeMapping, 
  saveTeacherCodeMappingToCloudAndLocal,
  deleteAdminTeacherCodeMapping,
  deleteProfessorCompletely
} from '@/lib/professors-registry';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Teacher } from '@/lib/types';

const UNIVERSITY_GRADES = [
  'الفرقة الأولى (Year 1)',
  'الفرقة الثانية (Year 2)',
  'الفرقة الثالثة (Year 3)',
  'الفرقة الرابعة (Year 4)',
  'الفرقة الخامسة (Year 5)',
  'الدراسات العليا / الماجستير (Postgraduate)',
  'دكتوراة / أطباء الامتياز (PhD / Internship)'
];

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  bio: z.string().max(300, { message: 'Bio cannot be longer than 300 characters.' }).optional(),
  profilePictureUrl: z.string().optional().or(z.literal('')),
  heroImageUrl: z.string().optional().or(z.literal('')),
  subjects: z.array(z.string()).min(1, 'Please select or enter at least one subject.'),
  gradesTaught: z.array(z.string()).min(1, 'Please select at least one university year.'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function AdminTeacherManagementPage() {
    const { t, i18n } = useTranslation();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const [activeTab, setActiveTab] = useState<'codes' | 'create'>('codes');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Code mappings state
    const [customCodes, setCustomCodes] = useState<Record<string, ProfessorItem>>({});
    const [selectedTeacherForMapping, setSelectedTeacherForMapping] = useState<any | null>(null);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [mappingCode, setMappingCode] = useState('');
    const [mappingAppNameAr, setMappingAppNameAr] = useState('');
    const [mappingAppNameEn, setMappingAppNameEn] = useState('');
    const [mappingSelectedIconPath, setMappingSelectedIconPath] = useState('/professors-custom/dr-farouk.svg');
    const [mappingCustomIconInput, setMappingCustomIconInput] = useState('');
    const [mappingHeroUrl, setMappingHeroUrl] = useState('');
    const [mappingError, setMappingError] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState('');

    const [libraryThemes, setLibraryThemes] = useState<any[]>([]);
    const [mappingAssignedThemeId, setMappingAssignedThemeId] = useState('default');

    // Fetch published themes from library_themes collection
    useEffect(() => {
        if (!firestore) return;
        const fetchThemes = async () => {
            try {
                const themesSnap = await getDocs(collection(firestore, 'library_themes'));
                const loaded: any[] = [];
                themesSnap.forEach((docSnap) => {
                    loaded.push({ id: docSnap.id, ...docSnap.data() });
                });
                setLibraryThemes(loaded);
            } catch (err) {
                console.error("Failed to fetch library themes for doctor management:", err);
            }
        };
        fetchThemes();
    }, [firestore, isMappingModalOpen]);

    // Fetch teachers from Firestore
    const teachersColRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'teachers');
    }, [firestore]);
    const { data: cloudTeachers } = useCollection<Teacher>(teachersColRef);

    // Admins only guard
    useEffect(() => {
        if (!isUserLoading) {
            const sessionData = localStorage.getItem('admin-session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.role !== 'S Admin' && session.role !== 'Manager') {
                     router.replace('/admin/dashboard');
                }
            } else {
                 router.replace('/admin/access');
            }
        }
    }, [isUserLoading, router]);

    // Load admin custom codes on mount
    useEffect(() => {
        const loadCodes = () => {
            setCustomCodes(getAdminCustomTeacherCodes());
        };
        loadCodes();
        window.addEventListener('admin_teacher_codes_updated', loadCodes);
        return () => window.removeEventListener('admin_teacher_codes_updated', loadCodes);
    }, []);

    // Combine cloud teachers + preset professors for comprehensive management
    const allManageableTeachers = useMemo(() => {
        const list: Array<{ id: string; name: string; email?: string; pfp?: string; hero?: string; subject?: string }> = [];
        
        // Add cloud registered teachers
        if (cloudTeachers) {
            cloudTeachers.forEach(t => {
                list.push({
                    id: t.id,
                    name: t.name,
                    email: t.email,
                    pfp: t.profilePictureUrl,
                    hero: t.heroImageUrl,
                    subject: t.subjects?.join(', ') || 'General'
                });
            });
        }

        // Add active built-in professors as manageable entries if not existing
        getActiveRegisteredProfessors().forEach(p => {
            if (!list.some(item => item.name === p.name || item.id === p.id || item.id === p.code)) {
                list.push({
                    id: p.id || p.code,
                    name: p.name,
                    email: `${p.code.toLowerCase()}@faculty.mola5saty.com`,
                    pfp: p.avatarUrl,
                    hero: p.heroImageUrl,
                    subject: p.subjectAr
                });
            }
        });

        if (searchFilter) {
            const q = searchFilter.toLowerCase();
            return list.filter(item => 
                item.name.toLowerCase().includes(q) || 
                item.subject?.toLowerCase().includes(q) ||
                item.email?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [cloudTeachers, searchFilter]);

    // Open link modal for specific teacher
    const handleOpenMappingForTeacher = (teacher: any) => {
        setSelectedTeacherForMapping(teacher);
        
        // Check if already mapped
        const existingEntry = Object.values(customCodes).find(c => c.id === teacher.id || c.name === teacher.name);
        if (existingEntry) {
            setMappingCode(existingEntry.code);
            setMappingAppNameAr(existingEntry.appNameAr);
            setMappingAppNameEn(existingEntry.appNameEn);
            setMappingSelectedIconPath(existingEntry.appIconPath);
            setMappingHeroUrl(existingEntry.heroImageUrl || teacher.hero || '');
            setMappingAssignedThemeId(existingEntry.assignedThemeId || 'default');
        } else {
            // Suggest 2-4 letter uppercase code from name or defaults
            const suggestedCode = teacher.name.includes('فاروق') ? 'VV' : 
                                  teacher.name.includes('خليل') ? 'VX' : 
                                  teacher.name.includes('أحمد') ? 'PHYS' : 
                                  'PROF';
            setMappingCode(suggestedCode);
            setMappingAppNameAr(`منصة ${teacher.name} [${suggestedCode}]`);
            setMappingAppNameEn(`${teacher.name} Portal [${suggestedCode}]`);
            setMappingSelectedIconPath('/professors-custom/dr-farouk.svg');
            setMappingHeroUrl(teacher.hero || PlaceHolderImages.find(p => p.id === 'teacher-hero')?.imageUrl || '');
            setMappingAssignedThemeId('default');
        }

        setMappingCustomIconInput('');
        setMappingError('');
        setIsMappingModalOpen(true);
    };

    // Save mapping logic
    const handleSaveMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        setMappingError('');

        const cleanCode = (mappingCode || '').trim().toUpperCase();
        if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 4) {
            setMappingError('الكود يجب أن يتكون من 2 إلى 4 أحرف إنجليزية كبيرة حصراً (مثل VV أو VX أو PHYS أو MATH).');
            return;
        }

        const effectiveIconPath = (mappingSelectedIconPath || '').trim();
        const teacherSubject = selectedTeacherForMapping?.subject || 'التخصص الجامعي';

        const updatedItem: ProfessorItem = {
            id: selectedTeacherForMapping?.id || `teacher_${cleanCode.toLowerCase()}`,
            code: cleanCode,
            name: selectedTeacherForMapping?.name || 'أستاذ معتمد',
            titleAr: `أستاذ ${teacherSubject}`,
            titleEn: `Professor of ${teacherSubject}`,
            subjectAr: teacherSubject,
            subjectEn: teacherSubject,
            facultyAr: 'الكلية والجامعة',
            facultyEn: 'Faculty Department',
            avatarUrl: selectedTeacherForMapping?.pfp || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
            heroImageUrl: mappingHeroUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200',
            appIconPath: effectiveIconPath,
            appIconEmoji: '',
            appNameAr: mappingAppNameAr || `منصة ${selectedTeacherForMapping?.name} [${cleanCode}]`,
            appNameEn: mappingAppNameEn || `${selectedTeacherForMapping?.name} Portal [${cleanCode}]`,
            themeColor: '#2563eb',
            coursesCount: 3,
            studentsCount: 150,
            descriptionAr: `البوابة الأكاديمية الرسمية لمحاضرات وبنوك أسئلة ${selectedTeacherForMapping?.name}.`,
            descriptionEn: `Official academic portal for ${selectedTeacherForMapping?.name}.`,
            assignedThemeId: mappingAssignedThemeId // Store assigned theme
        };

        await saveTeacherCodeMappingToCloudAndLocal(updatedItem, firestore);
        const current = getAdminCustomTeacherCodes();
        setCustomCodes(current);

        toast({
            title: 'تم ربط الكود والأيقونة بنجاح! 🎓',
            description: `تم ربط الدكتور ${updatedItem.name} بالكود [${cleanCode}] والأيقونة (${effectiveIconPath}) وحفظه في السحابة.`,
        });

        setIsMappingModalOpen(false);
    };

    const handleDeleteMapping = async (code: string, teacherId?: string) => {
        if (!window.confirm(`هل أنت متأكد من حذف الدكتور وكوده [${code}] نهائياً من النظام وقاعدة البيانات؟`)) {
            return;
        }

        try {
            await deleteProfessorCompletely(code, firestore);
            if (teacherId && teacherId !== code) {
                await deleteProfessorCompletely(teacherId, firestore);
            }
            const current = getAdminCustomTeacherCodes();
            setCustomCodes(current);
            toast({
                title: 'تم حذف الدكتور والكود نهائياً 🗑️',
                description: `تم إزالة الدكتور وكوده [${code}] من النظام وقاعدة البيانات.`,
            });
        } catch (e: any) {
            toast({
                title: 'خطأ أثناء الحذف',
                description: e.message || 'فشل حذف الدكتور.',
                variant: 'destructive',
            });
        }
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast({ title: 'تم النسخ!', description: `تم نسخ الكود [${code}].` });
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Account creation form
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: '', email: '', password: '', bio: '', profilePictureUrl: '', heroImageUrl: '', subjects: [], gradesTaught: [],
        },
    });

    const onSubmitNewTeacher = async (data: ProfileFormValues) => {
        if (!auth || !firestore) {
            toast({ variant: 'destructive', title: t('Error'), description: t('Firebase not available.') });
            return;
        }
        setIsSubmitting(true);
        const basicPlan = teacherPlans.find(p => p.id === 'basic');

        try {
            // To prevent signing out the current S-Admin user on the client,
            // we initialize a temporary secondary Firebase app instance to register the teacher account.
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
            const { firebaseConfig } = await import('@/firebase/config');

            let secondaryApp;
            let secondaryAuth;
            const appName = `temp-teacher-register-${Date.now()}`;
            
            try {
                secondaryApp = initializeApp(firebaseConfig, appName);
                secondaryAuth = getAuth(secondaryApp);
            } catch (initErr) {
                console.error("Secondary app init failed, falling back", initErr);
            }

            let teacherId;
            if (secondaryAuth) {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
                teacherId = userCredential.user.uid;
                await signOut(secondaryAuth);
                await deleteApp(secondaryApp);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
                teacherId = userCredential.user.uid;
            }

            const assistantCode = 'ASST' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const defaultPfp = PlaceHolderImages.find(p => p.id === 'teacher-profile')?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400';
            const defaultHero = PlaceHolderImages.find(p => p.id === 'teacher-hero')?.imageUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200';

            const teacherRef = doc(firestore, 'teachers', teacherId);
            await setDoc(teacherRef, {
                id: teacherId, 
                name: data.name, 
                email: data.email, 
                bio: data.bio || '',
                profilePictureUrl: data.profilePictureUrl || defaultPfp,
                heroImageUrl: data.heroImageUrl || defaultHero,
                subjects: data.subjects || ['General'], 
                gradesTaught: data.gradesTaught || ['Year 1'],
                approved: true,
                assistantCode,
                planId: basicPlan?.id || 'basic', 
                planName: basicPlan?.title || 'Basic',
                createdAt: new Date().toISOString()
            });

            // Set role in users collection for role check
            const userRef = doc(firestore, 'users', teacherId);
            await setDoc(userRef, {
                uid: teacherId,
                email: data.email,
                name: data.name,
                role: 'teacher',
                createdAt: new Date().toISOString()
            });

            const credsRef = doc(firestore, 'teachers', teacherId, 'private', 'credentials');
            await setDoc(credsRef, {
                password: data.password,
                email: data.email,
                updatedAt: new Date().toISOString(),
            });

            // Restore admin session if present
            if (existingAdminSession) {
                localStorage.setItem('admin-session', existingAdminSession);
            }
            
            toast({ title: t('Success'), description: `${t('Teacher account created successfully:')} ${data.name}` });
            form.reset();
            setActiveTab('codes');
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('Registration Failed'), description: error.message || t('An unknown error occurred.') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePfpUpload = (result: any) => form.setValue('profilePictureUrl', result.info.secure_url, { shouldValidate: true });
    const pfpUrl = form.watch('profilePictureUrl');

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <GraduationCap className="w-8 h-8 text-blue-600" />
                        <span>{t('Doctor Codes & App Branding Management')}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {t('Link doctor accounts with 2-4 letter codes and codebase icons.')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={activeTab === 'codes' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('codes')}
                        className={activeTab === 'codes' ? 'bg-blue-600 text-white font-bold' : ''}
                    >
                        <Link2 className="w-4 h-4 ml-1.5" />
                        <span>{t('Link Codes & Icons')}</span>
                    </Button>
                    <Button
                        variant={activeTab === 'create' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('create')}
                        className={activeTab === 'create' ? 'bg-blue-600 text-white font-bold' : ''}
                    >
                        <Plus className="w-4 h-4 ml-1.5" />
                        <span>{t('Create New Account')}</span>
                    </Button>
                </div>
            </div>

            {/* TAB 1: Doctor Codes & App Branding Mapping */}
            {activeTab === 'codes' && (
                <div className="space-y-6">
                    {/* Information Banner on Custom Code Folder */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm">
                                <FolderGit2 className="w-4 h-4" />
                                <span>{t('Custom Icon Codebase Folder:')}</span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                                {t('Project folder path:')} <code className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-bold">/public/professors-custom/</code>
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                {t('Upload or place custom images inside /public/professors-custom/ to link with doctors immediately.')}
                            </p>
                        </div>

                        <Badge className="bg-blue-600 text-white font-mono text-xs px-3 py-1">
                            {Object.keys(customCodes).length} {t('active code(s)')}
                        </Badge>
                    </div>

                    {/* Active Mapped Codes Grid */}
                    <div className="space-y-3">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            <span>{t('Currently Mapped Doctor Codes:')}</span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Dynamic active default + custom codes */}
                            {Object.entries({
                                ...getActiveRegisteredProfessors().reduce((acc, p) => ({ ...acc, [p.code]: p }), {} as Record<string, ProfessorItem>),
                                ...customCodes
                            }).map(([code, prof]) => {
                                if (!prof) return null;
                                return (
                                    <Card key={code} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900/60 overflow-hidden">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                                                        <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{prof.name}</h3>
                                                        <p className="text-[11px] text-slate-500">{prof.subjectAr}</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleCopy(code)}
                                                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono font-black text-xs flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                    title={t('Copy Doctor Code')}
                                                >
                                                    {copiedCode === code ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    <span>{code}</span>
                                                </button>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
                                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                                    <span>{t('App Icon:')}</span>
                                                    <span className="font-mono text-slate-900 dark:text-white font-bold text-[10px] truncate max-w-[150px]">
                                                        {prof.appIconPath}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                                    <span>{t('App Name for Students:')}</span>
                                                    <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[150px]">
                                                        {prof.appNameAr}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenMappingForTeacher({ id: prof.id, name: prof.name, pfp: prof.avatarUrl, hero: prof.heroImageUrl, subject: prof.subjectAr })}
                                                    className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-700"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                    <span>{t('Edit Link')}</span>
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteMapping(code, prof.id)}
                                                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                    title={t('Delete Doctor & Code')}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* Teacher Enrolled Roster - Select Teacher to Link Code & Icon */}
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600" />
                                    <span>{t('Registered Faculty (Select a professor to link code & icon):')}</span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {t("Click 'Link Code & Icon' to assign a 2-4 letter code and custom codebase icon.")}
                                </p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    placeholder={t('Search professor by name...')}
                                    className="pr-9 h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {allManageableTeachers.map((tItem) => {
                                    const linkedCode = Object.entries(customCodes).find(([c, val]) => val.name === tItem.name || val.id === tItem.id)?.[0] || 
                                                       (tItem.name.includes('فاروق') ? 'VV' : tItem.name.includes('خليل') ? 'VX' : null);
                                    return (
                                        <div key={tItem.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-12 w-12 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <AvatarImage src={tItem.pfp} />
                                                    <AvatarFallback className="font-bold text-xs">{tItem.name.slice(0, 2)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white">{tItem.name}</span>
                                                        {linkedCode ? (
                                                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0">
                                                                {t('Code:')} {linkedCode}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-500 text-[10px] px-2 py-0">
                                                                {t('Unlinked')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">{tItem.subject} • {tItem.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={() => handleOpenMappingForTeacher(tItem)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 px-4 rounded-xl shadow-xs"
                                                >
                                                    <Link2 className="w-3.5 h-3.5" />
                                                    <span>{linkedCode ? t('Edit Link') : t('Link Code & Icon')}</span>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleDeleteMapping(linkedCode || tItem.id, tItem.id)}
                                                    className="h-9 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl"
                                                    title={t('Delete Doctor & Facility Account')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Create Teacher Account */}
            {activeTab === 'create' && (
                <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/60">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{t('New Professor Account Details')}</CardTitle>
                        <CardDescription className="text-xs text-slate-500">{t('Create and activate a new faculty account in the database.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormProvider {...form}>
                            <form onSubmit={form.handleSubmit(onSubmitNewTeacher)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Full Doctor Name')}</Label>
                                        <Input {...form.register('name')} placeholder="Dr. Mohamed Abdallah" className="h-10 text-xs" />
                                        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Academic Email')}</Label>
                                        <Input type="email" {...form.register('email')} placeholder="dr.mohamed@university.edu" className="h-10 text-xs" />
                                        {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Password')}</Label>
                                        <Input type="password" {...form.register('password')} placeholder="6+ characters" className="h-10 text-xs" />
                                        {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
                                    </div>

                                    {/* Profile Picture & Hero Cover Image Inputs */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Profile Picture (URL or Upload)')}</Label>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-11 w-11 rounded-xl border border-slate-200 shrink-0"><AvatarImage src={pfpUrl} /><AvatarFallback>PFP</AvatarFallback></Avatar>
                                            <Input 
                                                value={pfpUrl} 
                                                onChange={(e) => {
                                                    setPfpUrl(e.target.value);
                                                    form.setValue('profilePictureUrl', e.target.value);
                                                }}
                                                placeholder="/professors-custom/photo.png or https://..."
                                                className="h-10 text-xs font-mono"
                                                dir="ltr"
                                            />
                                            <CldUploadButton uploadPreset="teachers_preset" onSuccess={handlePfpUpload} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 h-10 px-3 shrink-0 inline-flex items-center justify-center rounded-xl text-xs font-bold transition-colors">
                                                <UploadCloud className="w-3.5 h-3.5 ml-1" /> {t('Upload')}
                                            </CldUploadButton>
                                        </div>
                                    </div>
                                </div>

                                {/* Hero Cover Banner */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Hero Cover Banner (URL)')}</Label>
                                    <Input 
                                        {...form.register('heroImageUrl')}
                                        placeholder="/professors-custom/hero-banner.png or https://images.unsplash.com/..."
                                        className="h-10 text-xs font-mono"
                                        dir="ltr"
                                    />
                                </div>
                                
                                {/* Custom Subject */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Subject & Specialization')}</Label>
                                    <Controller name="subjects" control={form.control} render={({ field }) => (
                                        <div className="space-y-2">
                                            <Input
                                                value={field.value.join(', ')}
                                                onChange={(e) => {
                                                    const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                    field.onChange(vals.length > 0 ? vals : [e.target.value]);
                                                }}
                                                placeholder="e.g. Biophysics, Medical Anatomy..."
                                                className="h-10 text-xs"
                                            />
                                        </div>
                                    )} />
                                </div>

                                {/* University Academic Stage / Year */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Target University Years / Grades')}</Label>
                                    <Controller name="gradesTaught" control={form.control} render={({ field }) => (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-xs border-slate-200 dark:border-slate-800">
                                                    {field.value.length > 0 ? `${field.value.length} selected` : t('Target University Years / Grades')}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-72 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" align="start">
                                                {UNIVERSITY_GRADES.map(g => (
                                                    <DropdownMenuCheckboxItem key={g} checked={field.value.includes(g)} onCheckedChange={(c) => {
                                                        const newVals = c ? [...field.value, g] : field.value.filter(v => v !== g);
                                                        field.onChange(newVals);
                                                    }}>{g}</DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )} />
                                </div>

                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-sm rounded-xl shadow-md shadow-blue-600/20" disabled={isSubmitting}>
                                    {isSubmitting ? t('Submitting...') : t('Create Faculty Account')}
                                </Button>
                            </form>
                        </FormProvider>
                    </CardContent>
                </Card>
            )}

            {/* MODAL: Link Doctor Account to 2-4 Letter Code & Codebase Custom Icon */}
            <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    <DialogHeader className="space-y-2 text-start">
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-blue-600" />
                            <span>{t('Link Professor to Code & Custom Icon')}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {t('Selected Professor:')} <strong className="text-slate-900 dark:text-white">{selectedTeacherForMapping?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveMapping} className="space-y-4 py-2">
                        {/* 1. Code Input (2-4 uppercase characters) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                <span>{t('Doctor Code (2-4 Uppercase Letters)')}</span>
                                <span className="text-[10px] text-blue-600 font-mono">2-4 Capital Letters (e.g. VV / VX / PHYS / MATH)</span>
                            </Label>
                            <Input
                                value={mappingCode}
                                maxLength={4}
                                onChange={(e) => {
                                    setMappingCode(e.target.value.toUpperCase());
                                    setMappingError('');
                                }}
                                required
                                placeholder="PHYS"
                                className="h-12 text-xl font-mono font-black uppercase tracking-widest text-center border-slate-300 dark:border-slate-700 focus:border-blue-600"
                                style={{ textTransform: 'uppercase' }}
                            />
                            {mappingError && <p className="text-xs text-red-600 font-bold text-center">{mappingError}</p>}
                        </div>

                        {/* 2. App Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">{t('Platform Name for Students')}</Label>
                            <Input
                                value={mappingAppNameAr}
                                onChange={(e) => setMappingAppNameAr(e.target.value)}
                                placeholder="Dr. Waleed Farouk Portal [VV]"
                                className="text-xs h-10"
                            />
                        </div>

                        {/* 3. Custom Codebase Image Path Input ONLY */}
                        <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                <span>{t('Custom Image Icon Path (/public/professors-custom/filename.svg or URL):')}</span>
                            </Label>
                            <Input
                                value={mappingSelectedIconPath}
                                onChange={(e) => setMappingSelectedIconPath(e.target.value)}
                                placeholder="/professors-custom/dr-khalil.svg"
                                className="h-11 text-sm font-mono text-left bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                                dir="ltr"
                            />
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                {t('Enter path of any image or icon placed inside /public/professors-custom/filename.png')}
                            </p>
                        </div>

                        {/* 4. Assign Custom Theme Option */}
                        <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-500" />
                                <span>{t('Assign Automatically Unlocked Theme:')}</span>
                            </Label>
                            <select
                                value={mappingAssignedThemeId}
                                onChange={(e) => setMappingAssignedThemeId(e.target.value)}
                                className="h-11 text-xs w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-3 text-slate-900 dark:text-white font-sans"
                            >
                                <option value="default">{t('Mola5saty Royal Blue (Default)')}</option>
                                <option value="theme_emerald">{t('Academic Emerald Green (Default)')}</option>
                                {libraryThemes.map((theme) => (
                                    <option key={theme.id} value={theme.themeClass || theme.id}>
                                        {theme.themeTitle || theme.title || theme.id} ({theme.themeClass || theme.id})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                {t('When students add or click on this doctor, their profile theme will change automatically to this selection.')}
                            </p>
                        </div>

                        <DialogFooter className="pt-2 gap-2 flex-col-reverse sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsMappingModalOpen(false)}
                                className="text-xs px-4"
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 shadow-md shadow-blue-600/20"
                            >
                                {t('Save & Confirm Branding')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
