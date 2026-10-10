'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser, useAuth } from '@/firebase';
import { doc, collection, query, serverTimestamp, runTransaction, increment, updateDoc, where, Timestamp, getDocs, limit } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

import type { Teacher, Course, TeacherRating, Assistant } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/CourseCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, BookOpen, Calendar, Shield, Info, Edit, Settings, Star, Eye, ArrowLeft, Library, FileText, Clock, HelpCircle, Copy, Check, Share2, Award, Sparkles, GraduationCap, Palette, Key } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn, toJsDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGISTERED_PROFESSORS, getAdminCustomTeacherCodes, findProfessorByCode } from '@/lib/professors-registry';


import { CalendarView } from '@/components/CalendarView';
import { ManageCalendar } from '@/components/ManageCalendar';
import TeacherCoursesList from '@/components/teacher/TeacherCoursesList';
import TeacherCollectionsList from '@/components/teacher/TeacherCollectionsList';
import { StudentQuestionsBankView } from '@/components/teacher/StudentQuestionsBankView';



function useTeacherId() {
    const params = useSearchParams();
    const [id, setId] = useState<string | null>(null);

    useEffect(() => {
        // The path is expected to be /teacher?id=...
        const teacherId = params.get('id');
        setId(teacherId);
    }, [params]);

    return id;
}

function StarRating({ currentRating, maxRating = 5, onRate, disabled }: { currentRating: number, maxRating?: number, onRate: (rating: number) => void, disabled: boolean }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button
            key={ratingValue}
            onClick={() => onRate(ratingValue)}
            onMouseEnter={() => !disabled && setHoverRating(ratingValue)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            className={cn("transition-colors disabled:cursor-not-allowed", disabled ? "text-muted-foreground/50" : "text-muted-foreground/50 hover:text-amber-400")}
            disabled={disabled}
          >
            <Star
              className={cn("h-7 w-7 transition-all", ratingValue <= (hoverRating || currentRating) ? 'fill-amber-400 text-amber-400' : 'fill-muted-foreground/20 text-muted-foreground/20')}
            />
          </button>
        );
      })}
    </div>
  );
}

function TeacherRatingSection({ teacherId }: { teacherId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();

    const ratingRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return doc(firestore, `teachers/${teacherId}/ratings`, user.uid);
    }, [firestore, teacherId, user?.uid]);

    const { data: userRating, isLoading: isRatingLoading } = useDoc<TeacherRating>(ratingRef);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleRate = async (rating: number) => {
        if (!firestore || !auth) {
            toast({ title: "System not ready.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        try {
            let currentUser = user;
            if (!currentUser) {
                const userCredential = await signInAnonymously(auth);
                currentUser = userCredential.user;
            }
            
            if (!currentUser) {
                throw new Error("Could not authenticate user.");
            }

            const teacherRef = doc(firestore, 'teachers', teacherId);

            await runTransaction(firestore, async (transaction) => {
                const teacherDoc = await transaction.get(teacherRef);
                if (!teacherDoc.exists()) {
                    throw new Error("Teacher not found");
                }

                const currentTeacherData = teacherDoc.data() as Teacher;
                const studentRatingRef = doc(firestore, `teachers/${teacherId}/ratings`, currentUser!.uid);
                const studentRatingDoc = await transaction.get(studentRatingRef);

                let newTotalRating = currentTeacherData.totalRating || 0;
                let newRatingCount = currentTeacherData.ratingCount || 0;

                if (studentRatingDoc.exists()) {
                    // Student is updating their rating
                    const oldRating = studentRatingDoc.data().rating;
                    newTotalRating = newTotalRating - oldRating + rating;
                    transaction.update(studentRatingRef, { rating, createdAt: serverTimestamp() });
                } else {
                    // Student is rating for the first time
                    newTotalRating = newTotalRating + rating;
                    newRatingCount = newRatingCount + 1;
                    transaction.set(studentRatingRef, { rating, createdAt: serverTimestamp() });
                }
                
                const newAverageRating = newTotalRating / newRatingCount;

                transaction.update(teacherRef, {
                    totalRating: newTotalRating,
                    ratingCount: newRatingCount,
                    averageRating: newAverageRating
                });
            });
             toast({ title: "Thank you for your feedback!", description: `You rated this teacher ${rating} star(s).` });
        } catch (e: any) {
            console.error("Rating submission failed: ", e);
            toast({ title: "Rating Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('Rate this teacher')}</h3>
            {isRatingLoading ? (
                <Skeleton className="h-7 w-40 bg-zinc-800" />
            ) : (
                <StarRating 
                    currentRating={userRating?.rating || 0}
                    onRate={handleRate}
                    disabled={isSubmitting}
                />
            )}
        </div>
    )
}

function ApprovalWall({ isExpired, isOwner }: { isExpired: boolean, isOwner: boolean }) {
    const { t } = useTranslation();
    const { toast } = useToast();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: t('payment.expired.copied') || "Copied to clipboard" });
    };

    if (isOwner) {
        return (
            <div className="absolute inset-0 z-20 backdrop-blur-lg bg-background/80 rounded-2xl flex flex-col items-center justify-center text-center p-4 sm:p-8">
                <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold">
                    {isExpired ? t('payment.expired.title') : t('profile.teacher.pendingApprovalTitle')}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm sm:text-base">
                    {isExpired 
                        ? t('payment.expired.desc')
                        : t('profile.teacher.pendingApprovalDesc')
                    }
                </p>
                {isExpired && (
                    <Card className="mt-6 text-left w-full max-w-sm bg-background/50">
                        <CardHeader>
                            <CardTitle>{t('Payment Information')}</CardTitle>
                            <CardDescription>{t('payment.expired.proof')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label>{t('payment.expired.bankName')}</Label>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono p-2 bg-muted rounded-md text-sm flex-grow">THE BANK</p>
                                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('THE BANK')}>{t('payment.expired.copy')}</Button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('payment.expired.accountNumber')}</Label>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono p-2 bg-muted rounded-md text-sm flex-grow">1234567890</p>
                                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('1234567890')}>{t('payment.expired.copy')}</Button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('payment.expired.supportNumber')}</Label>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono p-2 bg-muted rounded-md text-sm flex-grow">0123456789</p>
                                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('0123456789')}>{t('payment.expired.copy')}</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // For public viewers (students, etc.)
    return (
        <div className="absolute inset-0 z-20 backdrop-blur-lg bg-background/80 rounded-2xl flex flex-col items-center justify-center text-center p-8">
            <Info className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold">{t('Profile Not Active')}</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
                {t("This teacher's profile is not currently active. Please check back later.")}
            </p>
        </div>
    );
}

function StudentTestView({ teacherId }: { teacherId: string }) {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [testCode, setTestCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStartTest = async () => {
        if (!testCode.trim()) return;
        if (!firestore || !auth) {
            toast({ title: "System not ready", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        try {
            let currentUser = user;
            if (!currentUser) {
                const userCredential = await signInAnonymously(auth);
                currentUser = userCredential.user;
            }

            if (!currentUser) {
                throw new Error("Could not authenticate user.");
            }

            const testsRef = collection(firestore, 'tests');
            const q = query(testsRef, where('testCode', '==', testCode.trim().toUpperCase()), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ title: "Invalid Code", description: "No test found with that code. Please check the code and try again.", variant: "destructive" });
            } else {
                const testId = querySnapshot.docs[0].id;
                router.push(`/test?id=${testId}`);
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-2xl min-h-[300px] profile-content-card">
            <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold">Have a Test Code?</h3>
            <p className="text-muted-foreground mt-2 mb-4">Enter the code provided by your teacher to begin your test.</p>
            <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                    type="text"
                    placeholder="Enter Test Code"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    className="font-mono text-center tracking-widest text-lg h-12"
                    disabled={isSubmitting || isUserLoading}
                />
                <Button onClick={handleStartTest} size="lg" className="h-12" disabled={isSubmitting || isUserLoading}>
                    {isSubmitting ? "Searching..." : "Start Test"}
                </Button>
            </div>
        </div>
    );
}

export default function TeacherProfilePage() {
    const teacherIdFromUrl = useTeacherId();
    const firestore = useFirestore();
    const { user, isUserLoading: isAuthLoading } = useUser();
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();

    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Resolve teacher ID from query parameter or fall back to logged-in user if they are a teacher
    const teacherId = teacherIdFromUrl || (isClient && !isAuthLoading && user && !user.isAnonymous ? user.uid : null);

    useEffect(() => {
        if (!firestore || !teacherId) return;

        const recordView = async () => {
            const viewedTeachersKey = 'viewedTeachers';
            let viewed: string[] = [];
            try {
                viewed = JSON.parse(localStorage.getItem(viewedTeachersKey) || '[]');
            } catch (e) {
                console.error("Could not parse viewed teachers from localStorage", e);
                localStorage.setItem(viewedTeachersKey, '[]');
                viewed = [];
            }
            
            if (!viewed.includes(teacherId)) {
                const teacherRef = doc(firestore, 'teachers', teacherId);
                try {
                    await updateDoc(teacherRef, {
                        viewCount: increment(1)
                    });
                    viewed.push(teacherId);
                    localStorage.setItem(viewedTeachersKey, JSON.stringify(viewed));
                } catch (error) {
                    console.error("Error incrementing view count:", error);
                }
            }
        };

        recordView();
    }, [firestore, teacherId]);

    
    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !teacherId) return null;
        return doc(firestore, 'teachers', teacherId);
    }, [firestore, teacherId]);
    const { data: cloudTeacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);
    const isOwner = user && !user.isAnonymous && user.uid === teacherId;

    const matchedProf = useMemo(() => {
        if (!teacherId) return null;
        return REGISTERED_PROFESSORS.find(p => p.id === teacherId || p.code.toLowerCase() === teacherId.toLowerCase() || p.code === teacherId) || 
               Object.values(getAdminCustomTeacherCodes()).find(p => p.id === teacherId || p.code.toLowerCase() === teacherId.toLowerCase() || p.code === teacherId) || 
               findProfessorByCode(teacherId) || null;
    }, [teacherId]);

    const teacher: Teacher | null = useMemo(() => {
        if (cloudTeacher) return cloudTeacher;
        if (matchedProf) {
            return {
                id: matchedProf.id || teacherId!,
                name: matchedProf.name,
                email: `${matchedProf.code.toLowerCase()}@faculty.mol5saty.com`,
                bio: matchedProf.descriptionAr || matchedProf.descriptionEn || 'الأستاذ الجامعي المعتمد بالمنصة.',
                profilePictureUrl: matchedProf.avatarUrl,
                heroImageUrl: matchedProf.heroImageUrl,
                subjects: [matchedProf.subjectAr],
                gradesTaught: ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
                approved: true,
                averageRating: 4.9,
                ratingCount: matchedProf.studentsCount || 120,
                viewCount: (matchedProf.studentsCount || 120) * 8,
                createdAt: new Date().toISOString() as any
            };
        }
        return null;
    }, [cloudTeacher, matchedProf, teacherId]);

    const isLoading = isAuthLoading || (isTeacherLoading && !matchedProf) || !isClient || !teacherId;

    const isExpired = useMemo(() => {
        if (!teacher || matchedProf) return false;
        const now = new Date();

        const approvalDate = teacher.approvalExpiresAt;
        const paymentDate = teacher.paymentDueDate;

        const isApprovalExpired = approvalDate && (typeof approvalDate === 'string' ? new Date(approvalDate) : (approvalDate as any).toDate()) < now;
        const isPaymentDue = paymentDate && (typeof paymentDate === 'string' ? new Date(paymentDate) : (paymentDate as any).toDate()) < now;

        return isApprovalExpired || isPaymentDue;
    }, [teacher, matchedProf]);

    const showApprovalWall = !matchedProf && isOwner && ((teacher && !teacher.approved) || isExpired);

    const [copiedCode, setCopiedCode] = useState(false);
    const doctorCode = matchedProf?.code || (teacher as any)?.code || (teacherId && teacherId.length <= 4 ? teacherId : '');

    const handleCopyDoctorCode = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!doctorCode) return;
        navigator.clipboard.writeText(doctorCode);
        setCopiedCode(true);
        toast({
            title: "تم نسخ كود الدكتور! 📋",
            description: `كود الدكتور [${doctorCode}] منسوخ في الحافظة.`,
        });
        setTimeout(() => setCopiedCode(false), 2500);
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                <Skeleton className="h-64 sm:h-80 w-full rounded-3xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <Skeleton className="h-80 w-full rounded-3xl" />
                    <Skeleton className="h-80 w-full rounded-3xl" />
                    <Skeleton className="h-80 w-full rounded-3xl" />
                    <Skeleton className="h-80 w-full rounded-3xl" />
                </div>
            </div>
        );
    }
    
    if (!teacher) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <GraduationCap className="w-16 h-16 text-slate-400 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">لم يتم العثور على ملف الدكتور</h2>
                <p className="text-sm text-slate-500 mt-2 mb-6">يرجى التأكد من كود الدكتور أو الرابط وإعادة المحاولة.</p>
                <Button asChild className="rounded-xl">
                    <Link href="/discover">العودة لدليل الأساتذة</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="w-full min-h-screen bg-slate-50/60 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-28">
            {showApprovalWall && <ApprovalWall isExpired={isExpired} isOwner={isOwner} />}
            
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
                {/* Top Quick Bar */}
                <div className="flex items-center justify-between gap-4">
                    <Link 
                        href="/discover" 
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2.5 px-4 rounded-2xl bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400"
                    >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180"/> 
                        <span>العودة لدليل الأساتذة (Discover)</span>
                    </Link>

                    <div className="flex items-center gap-2 flex-wrap">
                        {isOwner && (
                            <>
                                <Button asChild size="sm" variant="outline" className="rounded-2xl border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-bold gap-2">
                                    <Link href={`/teacher/theme?id=${teacher.id}`}>
                                        <Palette className="w-3.5 h-3.5" />
                                        <span>استوديو الثيم المخصص</span>
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="outline" className="rounded-2xl border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-bold gap-2">
                                    <Link href="/teacher/profile-edit">
                                        <Key className="w-3.5 h-3.5" />
                                        <span>{doctorCode ? 'تعديل كود الدكتور' : 'تعيين كود الدكتور للطلاب'}</span>
                                    </Link>
                                </Button>
                            </>
                        )}

                        {doctorCode && (
                            <button
                                type="button"
                                onClick={handleCopyDoctorCode}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                                title="نسخ كود الدكتور"
                            >
                                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>كود الدكتور: [{doctorCode}]</span>
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Clean Modern Academic Profile Header */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-center md:items-start justify-between gap-5 text-center md:text-right">
                    <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-5">
                        <div className="relative shrink-0">
                            <img 
                                src={teacher.profilePictureUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400"} 
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 object-cover shadow-sm" 
                                alt={teacher.name}
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-md bg-blue-600 text-[10px] text-white font-bold shadow-xs">
                                معتمد
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {teacher.name}
                                </h1>
                                {doctorCode && (
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                        [{doctorCode}]
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {matchedProf?.titleAr || 'أستاذ المادة والمنظومة الأكاديمية'}
                            </p>

                            {teacher.subjects && teacher.subjects.length > 0 && (
                                <div className="flex items-center gap-1.5 pt-1 justify-center md:justify-start flex-wrap">
                                    {teacher.subjects.map(sub => (
                                        <span key={sub} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                            {t(sub)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                        <div className="text-center px-2">
                            <span className="text-base font-black text-blue-600 dark:text-blue-400 block">
                                {teacher.averageRating?.toFixed(1) || '4.9'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500 font-mono">
                                التقييم ({teacher.ratingCount || 1})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Profile Tabs Navigation (Full Screen Style, Homework tab removed!) */}
                <div className="w-full">
                    <Tabs defaultValue="courses" className="w-full space-y-6">
                        <div className="sticky top-20 z-30 bg-slate-50/90 dark:bg-[#070b14]/90 backdrop-blur-md pb-2 pt-1">
                            <ScrollArea className="w-full whitespace-nowrap">
                                <TabsList className="p-1.5 h-auto rounded-2xl bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 shadow-xs flex gap-1.5">
                                    <TabsTrigger 
                                        value="courses" 
                                        className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
                                    >
                                        <BookOpen className="w-4 h-4"/> 
                                        <span>المقررات والمحاضرات (Courses)</span>
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="collections" 
                                        className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
                                    >
                                        <Library className="w-4 h-4"/> 
                                        <span>السلاسل والمجموعات (Collections)</span>
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="questions-bank" 
                                        className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
                                    >
                                        <HelpCircle className="w-4 h-4"/> 
                                        <span>بنك الأسئلة</span>
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="tests" 
                                        className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
                                    >
                                        <FileText className="w-4 h-4"/> 
                                        <span>الاختبارات الإلكترونية</span>
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="calendar" 
                                        className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
                                    >
                                        <Calendar className="w-4 h-4"/> 
                                        <span>الجدول الدراسي والتقويم</span>
                                    </TabsTrigger>

                                    <TabsTrigger 
                                        value="about" 
                                        className="rounded-xl px-4 py-2.5 text-xs font-bold data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
                                    >
                                        <Info className="w-4 h-4"/> 
                                        <span>نبذة الأستاذ والتقييم</span>
                                    </TabsTrigger>
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                        
                        {/* 1. Courses Tab Content */}
                        <TabsContent value="courses" className="mt-0 focus-visible:outline-none">
                            <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] shadow-xs">
                                <TeacherCoursesList teacher={teacher} />
                            </div>
                        </TabsContent>
                        
                        {/* 2. Collections Tab Content */}
                        <TabsContent value="collections" className="mt-0 focus-visible:outline-none">
                            <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] shadow-xs">
                                <TeacherCollectionsList teacherId={teacher.id} />
                            </div>
                        </TabsContent>
                        
                        {/* 3. Questions Bank Content */}
                        <TabsContent value="questions-bank" className="mt-0 focus-visible:outline-none">
                            <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] shadow-xs">
                                <StudentQuestionsBankView teacherId={teacher.id} />
                            </div>
                        </TabsContent>
                        
                        {/* 4. Tests Content */}
                        <TabsContent value="tests" className="mt-0 focus-visible:outline-none">
                            <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] shadow-xs">
                                <StudentTestView teacherId={teacher.id} />
                            </div>
                        </TabsContent>
                        
                        {/* 5. Calendar Content */}
                        <TabsContent value="calendar" className="mt-0 focus-visible:outline-none">
                            <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] shadow-xs">
                                {isOwner ? (
                                    <ManageCalendar teacherId={teacher.id} />
                                ) : (
                                    <CalendarView teacherId={teacher.id} />
                                )}
                            </div>
                        </TabsContent>

                        {/* 6. About Tab Content */}
                        <TabsContent value="about" className="mt-0 focus-visible:outline-none">
                            <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] shadow-sm space-y-6">
                                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                    {t('Academic Profile')}
                                </span>
                                
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                                    {teacher.bio || 'لا توجد نبذة تعريفية مسجلة حالياً.'}
                                </p>
                                
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('Subjects')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {teacher.subjects?.map(subject => (
                                            <div key={subject} className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300">
                                                {t(subject)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('Grades Taught')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {teacher.gradesTaught?.map(grade => (
                                            <div key={grade} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                                {t(grade)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
                                    {teacherId && <TeacherRatingSection teacherId={teacherId} />}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
