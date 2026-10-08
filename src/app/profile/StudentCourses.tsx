'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, collectionGroup, limit, getDoc } from 'firebase/firestore';
import type { Course, Teacher, CourseAccess, WatchHistory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/CourseCard';
import { Sparkles, Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function StudentCourses({ studentId }: { studentId: string }) {
    const firestore = useFirestore();
    const { t } = useTranslation();

    const courseAccessQuery = useMemoFirebase(
        () => collection(firestore, `students/${studentId}/courseAccess`),
        [firestore, studentId]
    );
    const { data: courseAccess, isLoading: isAccessLoading } = useCollection<CourseAccess>(courseAccessQuery);

    const watchHistoryQuery = useMemoFirebase(
        () => collection(firestore, `students/${studentId}/watchHistory`),
        [firestore, studentId]
    );
    const { data: watchHistory, isLoading: isHistoryLoading } = useCollection<WatchHistory>(watchHistoryQuery);

    const [courses, setCourses] = useState<(Course & { teacher?: Teacher; progress?: number })[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);

    useEffect(() => {
        if (!courseAccess || !firestore) {
            setCourses([]);
            return;
        }

        if (courseAccess.length === 0) {
            setIsLoadingCourses(false);
            setCourses([]);
            return;
        }

        const fetchCourseDetails = async () => {
            setIsLoadingCourses(true);
            const coursePromises = courseAccess.map(async (access) => {
                try {
                    const courseRef = doc(firestore, 'teachers', access.teacherId, 'courses', access.courseId);
                    const courseSnap = await getDoc(courseRef);
                    
                    if (courseSnap.exists()) {
                        const courseData = { ...courseSnap.data(), id: courseSnap.id } as Course;
                        
                        // Check if the student still has views left
                        if (courseData.locked && access.viewLimit) {
                            if ((access.viewCount || 0) >= access.viewLimit) {
                                return null; // Don't show the course if views are exhausted
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

                        return { ...courseData, teacher: teacherData, progress };
                    }
                } catch (e) {
                    console.error("Error fetching course detail: ", e);
                }
                return null;
            });
            const resolvedCourses = (await Promise.all(coursePromises)).filter((c): c is Course & { teacher?: Teacher, progress?: number } => c !== null);
            setCourses(resolvedCourses);
            setIsLoadingCourses(false);
        };

        fetchCourseDetails();
    }, [courseAccess, watchHistory, firestore]);

    const isLoading = isAccessLoading || isLoadingCourses || isHistoryLoading;

    const inProgressCourses = useMemo(() => courses.filter(c => c.progress && c.progress > 0 && c.progress < 95).sort((a,b) => (b.progress || 0) - (a.progress || 0)), [courses]);
    const completedCourses = useMemo(() => courses.filter(c => c.progress && c.progress >= 95), [courses]);
    const newCourses = useMemo(() => courses.filter(c => !c.progress || c.progress === 0), [courses]);

    if (isLoading) {
        return (
            <div className="profile-grid">
                <Skeleton className="profile-card h-80" />
                <Skeleton className="profile-card h-80" />
            </div>
        )
    }

    if (courses.length === 0) {
        return (
            <div className="profile-empty-state">
                <Sparkles className="w-24 h-24" />
                <h3 className="text-lg font-bold mt-4">{t('No Unlocked Courses')}</h3>
                <p className="text-sm mt-2">{t('Use a share code from a teacher to unlock a course.')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {inProgressCourses.length > 0 && (
                <div className="space-y-4">
                    <h3 className="profile-section-title"><Clock/>{t('Continue Watching')}</h3>
                    <div className="profile-grid">
                        {inProgressCourses.map(course => <CourseCard key={course.id} course={course} teacher={course.teacher || null} progress={course.progress} />)}
                    </div>
                </div>
            )}
             {newCourses.length > 0 && (
                <div className="space-y-4">
                    <h3 className="profile-section-title"><Sparkles/>{t('My Courses')}</h3>
                    <div className="profile-grid">
                        {newCourses.map(course => <CourseCard key={course.id} course={course} teacher={course.teacher || null} progress={0} />)}
                    </div>
                </div>
            )}
             {completedCourses.length > 0 && (
                <div className="space-y-4">
                    <h3 className="profile-section-title completed"><CheckCircle/>{t('Completed Courses')}</h3>
                    <div className="profile-grid">
                        {completedCourses.map(course => <CourseCard key={course.id} course={course} teacher={course.teacher || null} progress={100} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
