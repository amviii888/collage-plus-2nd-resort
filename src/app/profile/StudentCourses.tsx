'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, collectionGroup, limit, getDoc } from 'firebase/firestore';
import type { Course, Teacher, CourseAccess, WatchHistory, CourseRequest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/CourseCard';
import { Sparkles, Clock, CheckCircle, Hourglass, Layers, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StudentCourses({ studentId }: { studentId: string }) {
    const firestore = useFirestore();
    const { t } = useTranslation();

    const courseAccessQuery = useMemoFirebase(
        () => {
            if (!firestore || !studentId) return null;
            return collection(firestore, `students/${studentId}/courseAccess`);
        },
        [firestore, studentId]
    );
    const { data: courseAccess, isLoading: isAccessLoading } = useCollection<CourseAccess>(courseAccessQuery);

    const watchHistoryQuery = useMemoFirebase(
        () => {
            if (!firestore || !studentId) return null;
            return collection(firestore, `students/${studentId}/watchHistory`);
        },
        [firestore, studentId]
    );
    const { data: watchHistory, isLoading: isHistoryLoading } = useCollection<WatchHistory>(watchHistoryQuery);

    // Query pending course requests for this student
    const studentRequestsQuery = useMemoFirebase(
        () => {
            if (!firestore || !studentId) return null;
            return collection(firestore, `students/${studentId}/course_requests`);
        },
        [firestore, studentId]
    );
    const { data: cloudRequests, isLoading: isRequestsLoading } = useCollection<CourseRequest>(studentRequestsQuery);

    // Merge cloud requests with local cache for immediate feedback
    const pendingRequests = useMemo(() => {
        const localList: CourseRequest[] = [];
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(`student_local_course_requests_${studentId}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) localList.push(...parsed);
                }
            } catch (e) {}
        }

        const map = new Map<string, CourseRequest>();
        (cloudRequests || []).forEach(r => map.set(r.id, r));
        localList.forEach(r => {
            if (!map.has(r.id)) map.set(r.id, r);
        });

        const all = Array.from(map.values());
        return all.filter(r => (r.status || 'pending') === 'pending');
    }, [cloudRequests, studentId]);

    const [courses, setCourses] = useState<(Course & { teacher?: Teacher; progress?: number; access?: CourseAccess })[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);

    useEffect(() => {
        if (!firestore) {
            setCourses([]);
            return;
        }

        const accessItems = courseAccess || [];

        // Check if there are local unlocked course accesses
        const localAccessItems: CourseAccess[] = [];
        if (typeof window !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('student_course_access_')) {
                    try {
                        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
                        if (parsed.courseId && !accessItems.some(a => a.courseId === parsed.courseId)) {
                            localAccessItems.push(parsed);
                        }
                    } catch (e) {}
                }
            }
        }

        const combinedAccess = [...accessItems, ...localAccessItems];

        if (combinedAccess.length === 0) {
            setIsLoadingCourses(false);
            setCourses([]);
            return;
        }

        const fetchCourseDetails = async () => {
            setIsLoadingCourses(true);
            const coursePromises = combinedAccess.map(async (access) => {
                try {
                    const courseRef = doc(firestore, 'teachers', access.teacherId, 'courses', access.courseId);
                    const courseSnap = await getDoc(courseRef);
                    
                    if (courseSnap.exists()) {
                        const courseData = { ...courseSnap.data(), id: courseSnap.id } as Course;
                        
                        // Check if views are exhausted
                        if (courseData.locked && access.viewLimit) {
                            if ((access.viewCount || 0) >= access.viewLimit) {
                                return null;
                            }
                        }
                        
                        const teacherRef = doc(firestore, 'teachers', courseData.teacherId);
                        const teacherSnap = await getDoc(teacherRef);

                        let teacherData: Teacher | undefined = undefined;
                        if (teacherSnap.exists()) {
                            teacherData = { ...teacherSnap.data(), id: teacherSnap.id } as Teacher;
                        }
                        
                        const history = watchHistory?.find(h => h.id === courseData.id);
                        let progress = 0;
                        const totalVideos = courseData.units?.flatMap(u => u.videos).length || courseData.videos?.length || 0;
                        if (history && totalVideos > 0 && history.watchedVideoIds) {
                            progress = (history.watchedVideoIds.length / totalVideos) * 100;
                        }

                        return { ...courseData, teacher: teacherData, progress, access };
                    }
                } catch (e) {
                    console.error("Error fetching course detail: ", e);
                }
                return null;
            });
            const resolvedCourses = (await Promise.all(coursePromises)).filter((c): c is Course & { teacher?: Teacher; progress?: number; access?: CourseAccess } => c !== null);
            setCourses(resolvedCourses);
            setIsLoadingCourses(false);
        };

        fetchCourseDetails();
    }, [courseAccess, watchHistory, firestore]);

    const isLoading = isAccessLoading || isLoadingCourses || isHistoryLoading;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-64 rounded-2xl bg-zinc-900/60" />
                <Skeleton className="h-64 rounded-2xl bg-zinc-900/60" />
            </div>
        );
    }

    const hasAnyContent = courses.length > 0 || pendingRequests.length > 0;

    if (!hasAnyContent) {
        return (
            <div className="text-center py-12 px-4 rounded-3xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-md space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">{t('No Unlocked Courses or Requests')}</h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        {t('Use a share code from your professor, or request access to any course or unit to start studying.')}
                    </p>
                </div>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20">
                    <Link href="/discover">تصفح الأساتذة والمقررات</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* 1. Pending Requests Section (طلب قيد المراجعة) */}
            {pendingRequests.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <Hourglass className="w-4 h-4 text-amber-400" />
                                <span>طلبات قيد المراجعة (Pending Requests)</span>
                            </h3>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold text-[11px] px-2.5 py-0.5">
                            {pendingRequests.length} طلب قيد الانتظار
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingRequests.map((req) => (
                            <div 
                                key={req.id}
                                className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-950/80 to-zinc-950 text-white relative overflow-hidden space-y-3 shadow-md"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                            ⏳ قيد المراجعة (Pending Review)
                                        </Badge>
                                        <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                                            {req.courseTitle || 'مقرر دراسي'}
                                        </h4>
                                    </div>
                                    {req.requestType === 'unit' ? (
                                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] flex items-center gap-1 shrink-0 font-bold">
                                            <Layers className="w-3 h-3" />
                                            طلب وحدة
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 shrink-0 font-bold">
                                            <BookOpen className="w-3 h-3" />
                                            الكورس كاملاً
                                        </Badge>
                                    )}
                                </div>

                                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-1 text-zinc-300">
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-400">نوع الطلب:</span>
                                        <span className="font-bold text-amber-200">
                                            {req.requestType === 'unit' 
                                                ? `الوحدة المطلوبة: ${req.unitTitle || (req.unitIndex ? `الوحدة ${req.unitIndex}` : 'وحدة دراسية')}`
                                                : 'الكورس الأكاديمي بالكامل'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                                        <span>الحالة: بانتظار موافقة أستاذ المادة</span>
                                        <span className="text-emerald-400 font-mono text-[10px]">متاح كود أو تفعيل</span>
                                    </div>
                                </div>

                                {req.courseId && req.teacherId && (
                                    <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs font-bold rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 flex items-center justify-center gap-1.5">
                                        <Link href={`/courses/${req.teacherId}/${req.courseId}`}>
                                            <span>معاينة صفحة المقرر</span>
                                            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. Unlocked Courses & Units Section */}
            {courses.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <span>المقررات والوحدات المفتوحة (Unlocked Content)</span>
                            </h3>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold text-[11px] px-2.5 py-0.5">
                            {courses.length} مقرر متاح
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {courses.map((course) => {
                            const isFullAccess = course.access?.fullAccess;
                            const hasUnitAccess = course.access?.unlockedUnitIds && course.access.unlockedUnitIds.length > 0;
                            const viewLimit = course.access?.viewLimit || 3;
                            const viewCount = course.access?.viewCount || 0;
                            const remainingViews = Math.max(0, viewLimit - viewCount);

                            return (
                                <div key={course.id} className="relative group flex flex-col">
                                    <CourseCard 
                                        course={course} 
                                        teacher={course.teacher || null} 
                                        progress={course.progress || 0} 
                                    />
                                    
                                    {/* Overlay Status Bar */}
                                    <div className="mt-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between text-zinc-300">
                                        <div className="flex items-center gap-1.5">
                                            {isFullAccess ? (
                                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                                    🔓 مفتوح بالكامل
                                                </Badge>
                                            ) : hasUnitAccess ? (
                                                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1">
                                                    <Layers className="w-3 h-3" />
                                                    وحدات مفعّلة ({course.access?.unlockedUnitIds?.length || 1})
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-zinc-800 text-zinc-300 text-[10px]">
                                                    متاح
                                                </Badge>
                                            )}
                                        </div>

                                        <span className="font-mono text-[11px] text-amber-400 font-bold">
                                            المشاهدات: {remainingViews} من {viewLimit}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
