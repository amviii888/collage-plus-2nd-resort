'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase, useStudent, useCollection } from '@/firebase';
import { doc, runTransaction, serverTimestamp, setDoc, arrayUnion, Timestamp, increment, updateDoc, collection, query, where } from 'firebase/firestore';
import type { Course, CourseRating, Teacher, WatchHistory, Video, CourseAccess, Unit, CourseRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect, lazy, Suspense, useRef } from 'react';
import { Star, Download, FileText, Info, User, BookOpen, Clock, CheckCircle, ArrowLeft, Lock, ClipboardList, ShoppingCart, KeyRound, Play, Layers } from 'lucide-react';
import { cn, toJsDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { UnlockCourseDialog } from '@/components/UnlockCourseDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { parseVideoSource, type ParsedVideoSource } from '@/lib/bunnyStream';


const CourseComments = lazy(() => import('@/components/CourseComments').then(module => ({ default: module.CourseComments })));

function CourseRatingSection({ courseId, teacherId }: { courseId: string, teacherId: string }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();

    const ratingRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !courseId || !teacherId) return null;
        return doc(firestore, `teachers/${teacherId}/courses/${courseId}/ratings`, user.uid);
    }, [firestore, teacherId, courseId, user?.uid]);

    const { data: userRating, isLoading: isRatingLoading } = useDoc<CourseRating>(ratingRef);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleRate = async (rating: number) => {
        if (!user || !firestore || !teacherId || !courseId) {
            toast({ title: t("You must be logged in to rate."), variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const courseRef = doc(firestore, `teachers/${teacherId}/courses`, courseId);

        try {
            await runTransaction(firestore, async (transaction) => {
                const courseDoc = await transaction.get(courseRef);
                if (!courseDoc.exists()) {
                    throw new Error("Course not found");
                }

                const currentCourseData = courseDoc.data() as Course;
                const studentRatingRef = doc(firestore, `teachers/${teacherId}/courses/${courseId}/ratings`, user.uid);
                const studentRatingDoc = await transaction.get(studentRatingRef);

                let newTotalRating = currentCourseData.totalRating || 0;
                let newRatingCount = currentCourseData.ratingCount || 0;

                if (studentRatingDoc.exists()) {
                    const oldRating = studentRatingDoc.data().rating;
                    newTotalRating = newTotalRating - oldRating + rating;
                    transaction.update(studentRatingRef, { rating, createdAt: serverTimestamp() });
                } else {
                    newTotalRating = newTotalRating + rating;
                    newRatingCount = newRatingCount + 1;
                    transaction.set(studentRatingRef, { rating, createdAt: serverTimestamp() });
                }
                
                const newAverageRating = newTotalRating / newRatingCount;

                transaction.update(courseRef, {
                    totalRating: newTotalRating,
                    ratingCount: newRatingCount,
                    averageRating: newAverageRating
                });
            });
             toast({ title: t("Thank you for your feedback!"), description: `${t('You rated this course')} ${rating} ${t('star(s).')}` });
        } catch (e: any) {
            console.error("Course rating submission failed: ", e);
            toast({ title: t("Rating Failed"), description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading || !user?.isAnonymous) {
        return null;
    }
    
    return (
        <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-medium text-text-secondary">{t('Rate this course', {lng: 'ar'})}</h3>
            {isRatingLoading ? (
                <Skeleton className="h-7 w-40 bg-zinc-800" />
            ) : (
                <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, index) => {
                        const ratingValue = index + 1;
                        return (
                        <button
                            key={ratingValue}
                            onClick={() => handleRate(ratingValue)}
                            disabled={isSubmitting}
                            className="transition-colors disabled:cursor-not-allowed text-muted-foreground/50 hover:text-brand-gold"
                        >
                            <Star
                            className={cn("h-7 w-7 transition-all", ratingValue <= (userRating?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-muted-foreground/20')}
                            />
                        </button>
                        );
                    })}
                </div>
            )}
        </div>
    )
}

function getVideoEmbedUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
        return null;
    }
    const parsed = parseVideoSource(url);
    if (parsed?.embedUrl) {
        return parsed.embedUrl;
    }
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname === 'youtu.be') {
            const videoId = urlObj.hostname === 'youtu.be'
                ? urlObj.pathname.slice(1)
                : urlObj.searchParams.get('v');
            if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
        }
        if (urlObj.hostname.includes('drive.google.com')) {
            const match = url.match(/file\/d\/([^/]+)/);
            if (match && match[1]) {
                return `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        }
    } catch(e) {
        console.warn("Could not construct URL:", url, e);
    }
    return null;
}

const CourseContentList = ({ 
    units, 
    currentVideoId, 
    setCurrentVideoId, 
    watchedVideoIds, 
    handleMarkAsComplete, 
    videoNote,
    isCourseLocked,
    hasFullAccess,
    unlockedUnitIds,
    onUnlockUnit
}: { 
    units: Unit[], 
    currentVideoId: string | null, 
    setCurrentVideoId: (id: string) => void, 
    watchedVideoIds: Set<string>, 
    handleMarkAsComplete: (id: string) => void, 
    videoNote: string | undefined,
    isCourseLocked: boolean,
    hasFullAccess: boolean,
    unlockedUnitIds: Set<string>,
    onUnlockUnit: (unitId: string) => void
}) => {
    const { t } = useTranslation();

    const allVideos = useMemo(() => units?.flatMap((unit) => unit.videos) || [], [units]);
    const progress = allVideos.length > 0 ? (watchedVideoIds.size / allVideos.length) * 100 : 0;
    
    // Determine the default open unit based on the current video
    const defaultOpenUnit = useMemo(() => {
        if (!units || !currentVideoId) return [];
        const unit = units.find((u) => u.videos.some((v) => v.id === currentVideoId));
        return unit ? [unit.id] : [];
    }, [units, currentVideoId]);

    return (
        <div className="flex flex-col h-full bg-background/50">
            <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg">{t('Course Content', {lng: 'ar'})}</h3>
                <div className="space-y-1 mt-2">
                    <Label className="text-xs">{t('Your Progress', {lng: 'ar'})}</Label>
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% complete</p>
                </div>
            </div>
            <ScrollArea className="flex-grow">
               <Accordion type="multiple" defaultValue={defaultOpenUnit} className="w-full p-2">
                 {units?.map((unit, unitIndex) => {
                    const isUnitUnlocked = hasFullAccess || !isCourseLocked || unlockedUnitIds.has(unit.id);
                    return (
                    <AccordionItem value={unit.id} key={unit.id} className="border-b border-border/60">
                        <AccordionTrigger className="font-semibold hover:no-underline py-3 px-2">
                            <div className="flex items-center justify-between gap-2 w-full pr-2">
                                <span className="text-left">{unit.title}</span>
                                {!isUnitUnlocked ? (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-bold shrink-0 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Locked Unit
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                                        {unit.videos?.length || 0} Lessons
                                    </Badge>
                                )}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="space-y-1 pl-4 pr-1">
                                {!isUnitUnlocked && (
                                    <div className="p-3 mb-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-2">
                                        <p className="text-xs text-amber-300/90">
                                            This unit is locked. Unlock this unit to access all its {unit.videos?.length || 0} lessons.
                                        </p>
                                        <Button 
                                            size="sm" 
                                            onClick={() => onUnlockUnit(unit.id)}
                                            className="h-8 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl w-full"
                                        >
                                            <Lock className="w-3.5 h-3.5 mr-1.5" /> Unlock Unit
                                        </Button>
                                    </div>
                                )}

                                {unit.videos.map((video: Video, videoIndex: number) => {
                                    const isWatched = watchedVideoIds.has(video.id);
                                    const isActive = video.id === currentVideoId;
                                    return (
                                        <div key={video.id} className={cn("p-2 rounded-lg hover:bg-muted/80 transition-colors", !isUnitUnlocked && "opacity-60")}>
                                            <button
                                                onClick={() => {
                                                    if (!isUnitUnlocked) {
                                                        onUnlockUnit(unit.id);
                                                    } else {
                                                        setCurrentVideoId(video.id);
                                                    }
                                                }}
                                                className={cn("w-full text-left flex items-start gap-3 cursor-pointer", isActive ? "font-bold text-primary" : "text-foreground")}
                                            >
                                                <span className="text-sm font-mono mt-1">{String(videoIndex + 1).padStart(2, '0')}</span>
                                                <span className="flex-grow flex items-center gap-1.5">
                                                    {video.title}
                                                    {!isUnitUnlocked && <Lock className="w-3 h-3 text-amber-400 shrink-0 inline ml-1" />}
                                                </span>
                                            </button>
                                            {isUnitUnlocked && (
                                                <div className="pl-8 mt-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant={isWatched ? 'secondary' : 'outline'} 
                                                        className="h-8 w-full cursor-pointer" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsComplete(video.id);
                                                        }}
                                                    >
                                                        <CheckCircle className={cn("mr-2 h-4 w-4", isWatched ? "text-emerald-500" : "text-muted-foreground")} />
                                                        {isWatched ? t('Completed', {lng: 'ar'}) : t('Mark as Complete', {lng: 'ar'})}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                    );
                 })}
               </Accordion>
            </ScrollArea>
            {videoNote && (
                <div className="p-4 border-t border-border mt-auto">
                    <Alert className="bg-muted/50 border-border">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-foreground">{t('Note from your teacher', {lng: 'ar'})}</AlertTitle>
                        <AlertDescription className="whitespace-pre-wrap text-muted-foreground">{videoNote}</AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
}

function VideoWatermark({ studentId }: { studentId: string }) {
    const { student } = useStudent(studentId);
    const [corner, setCorner] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCorner(prev => (prev + 1) % 4);
        }, 10 * 60 * 1000); // Rotate corners every 10 minutes

        return () => clearInterval(interval);
    }, []);

    const displayCode = student?.barcodeId || studentId;
    const displayName = student?.name || 'Student';

    // Positions: 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right
    const positionClasses = [
        "top-4 left-4",
        "top-4 right-4",
        "bottom-16 left-4",
        "bottom-16 right-4"
    ];

    return (
        <div 
            className={cn(
                "absolute z-50 pointer-events-none select-none font-mono text-[11px] md:text-sm font-bold uppercase tracking-wider text-white/50 bg-black/40 backdrop-blur-[1px] px-2.5 py-1.5 rounded-md border border-white/10 transition-all duration-1000 ease-in-out",
                positionClasses[corner]
            )}
            style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)'
            }}
        >
            <span className="opacity-95">{displayName}</span>
            <span className="mx-2 text-white/20">|</span>
            <span className="text-amber-400/80">{displayCode}</span>
        </div>
    );
}

// Main component
export default function CoursePlayerClient({ teacherId, courseId }: { teacherId: string, courseId: string }) {
    const { t } = useTranslation();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { student: currentStudentProfile } = useStudent(user?.uid);

    const [isUnlockOpen, setUnlockOpen] = useState(false);
    const [isHomeworkOpen, setIsHomeworkOpen] = useState(false);
    const viewCountIncremented = useRef(false);
    
    // Realtime data hooks
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `teachers/${teacherId}/courses/${courseId}`);
    }, [firestore, teacherId, courseId]));

    // Homework Hook
    const homeworkRef = useMemoFirebase(() => {
        if (!firestore || !teacherId || !course?.homeworkId) return null;
        return doc(firestore, `teachers/${teacherId}/homework`, course.homeworkId);
    }, [firestore, teacherId, course?.homeworkId]);
    const { data: homework } = useDoc<any>(homeworkRef);
    
    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `teachers`, teacherId);
    }, [firestore, teacherId]));

    const activeStudentId = typeof window !== 'undefined' 
        ? (localStorage.getItem('viewingStudentId') || user?.uid) 
        : user?.uid;

    const { data: courseAccess, isLoading: isAccessLoading } = useDoc<CourseAccess>(useMemoFirebase(() => {
        const targetId = activeStudentId || user?.uid;
        if (!firestore || !targetId || !courseId) return null;
        return doc(firestore, `students/${targetId}/courseAccess/${courseId}`);
    }, [firestore, activeStudentId, user?.uid, courseId]));

    // Check local storage fallback for immediate client response
    const localCachedAccess = useMemo(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(`student_course_access_${courseId}`);
            return raw ? JSON.parse(raw) : null;
        } catch(e) {
            return null;
        }
    }, [courseId]);

    const effectiveCourseAccess = courseAccess || localCachedAccess;

    // Query pending requests for this student and course
    const studentRequestsQuery = useMemoFirebase(() => {
        const targetId = activeStudentId || user?.uid;
        if (!firestore || !teacherId || !targetId || !courseId) return null;
        return query(
            collection(firestore, `teachers/${teacherId}/course_requests`),
            where('studentId', '==', targetId),
            where('courseId', '==', courseId),
            where('status', '==', 'pending')
        );
    }, [firestore, teacherId, activeStudentId, user?.uid, courseId]);
    const { data: pendingRequests } = useCollection<CourseRequest>(studentRequestsQuery);

    const isFullCoursePending = useMemo(() => {
        return pendingRequests?.some(r => r.requestType === 'course') || false;
    }, [pendingRequests]);

    const isUnitPending = (unitId: string) => {
        return pendingRequests?.some(r => r.requestType === 'unit' && r.unitId === unitId) || false;
    };
    
    const displayCourse = course;

    const units = useMemo(() => {
        const currentCourse = course;
        if (currentCourse?.units && currentCourse.units.length > 0) return currentCourse.units;
        // Backward compatibility for old `videos` structure
        if (currentCourse?.videos && currentCourse.videos.length > 0) return [{ id: 'legacy-unit', title: currentCourse.title, videos: currentCourse.videos }];
        // Backward compatibility for old `videoUrl` structure
        if (currentCourse?.videoUrl) return [{ id: 'legacy-unit', title: currentCourse.title, videos: [{ id: 'legacy-video', title: currentCourse.title, url: currentCourse.videoUrl }] }];
        return [];
    }, [course]);

    const flatVideos = useMemo(() => units.flatMap(unit => unit.videos), [units]);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

    const isOwner = user && !user.isAnonymous && user.uid === teacherId;
    const [selectedUnitForUnlock, setSelectedUnitForUnlock] = useState<string | undefined>(undefined);
    
    // Check if user has full access to the entire course
    const hasFullAccess = useMemo(() => {
        const currentCourse = course;
        if (!currentCourse) return false;
        if (isOwner || !currentCourse?.locked) return true;
        
        if (effectiveCourseAccess) {
            if (effectiveCourseAccess.fullAccess || effectiveCourseAccess.granted) {
                const limit = effectiveCourseAccess.viewLimit ?? 3;
                if (limit === 0) return true;
                return (effectiveCourseAccess.viewCount ?? 0) < limit;
            }
        }
        return false;
    }, [course, isOwner, effectiveCourseAccess]);

    // Unlocked unit IDs
    const unlockedUnitIdsSet = useMemo(() => {
        if (hasFullAccess || !course?.locked) {
            return new Set((units || []).map(u => u.id));
        }
        const uIds = effectiveCourseAccess?.unlockedUnitIds || [];
        return new Set(uIds);
    }, [hasFullAccess, course, units, effectiveCourseAccess]);

    // Initialize or adapt current video to an unlocked unit video
    useEffect(() => {
        if (flatVideos.length > 0) {
            if (!currentVideoId) {
                // If user has specific unlocked units, pick the first video from an unlocked unit!
                const firstUnlockedVideo = flatVideos.find(v => {
                    const u = units.find(unit => unit.videos.some(vid => vid.id === v.id));
                    return u && (hasFullAccess || unlockedUnitIdsSet.has(u.id));
                });
                setCurrentVideoId(firstUnlockedVideo ? firstUnlockedVideo.id : flatVideos[0].id);
            } else {
                // If current video is from a locked unit, but user has another unlocked unit, auto-switch to unlocked unit
                const currentUnit = units.find(u => u.videos.some(v => v.id === currentVideoId));
                if (currentUnit && !hasFullAccess && !unlockedUnitIdsSet.has(currentUnit.id) && unlockedUnitIdsSet.size > 0) {
                    const availableVideo = flatVideos.find(v => {
                        const u = units.find(unit => unit.videos.some(vid => vid.id === v.id));
                        return u && unlockedUnitIdsSet.has(u.id);
                    });
                    if (availableVideo) {
                        setCurrentVideoId(availableVideo.id);
                    }
                }
            }
        }
    }, [flatVideos, currentVideoId, units, hasFullAccess, unlockedUnitIdsSet]);

    const currentVideo = useMemo(() => flatVideos.find(v => v.id === currentVideoId) || flatVideos[0] || null, [flatVideos, currentVideoId]);
    const embedUrl = getVideoEmbedUrl(currentVideo?.url || '');

    const { data: history, isLoading: isHistoryLoading } = useDoc<WatchHistory>(useMemoFirebase(() => {
        const targetId = activeStudentId || user?.uid;
        if (!firestore || !targetId) return null;
        return doc(firestore, `students/${targetId}/watchHistory`, courseId);
    }, [firestore, activeStudentId, user?.uid, courseId]));

    const watchedVideoIds = useMemo(() => new Set(history?.watchedVideoIds || []), [history]);

    // Check which unit the current video belongs to
    const activeVideoUnit = useMemo(() => {
        if (!units || !currentVideoId) return null;
        return units.find(u => u.videos.some(v => v.id === currentVideoId)) || null;
    }, [units, currentVideoId]);

    const hasAccess = useMemo(() => {
        if (hasFullAccess) return true;
        if (!activeVideoUnit) return false;
        return unlockedUnitIdsSet.has(activeVideoUnit.id);
    }, [hasFullAccess, activeVideoUnit, unlockedUnitIdsSet]);

    const handleUnlockUnit = (unitId: string) => {
        setSelectedUnitForUnlock(unitId);
        setUnlockOpen(true);
    };

    const handleSwitchToUnlockedUnits = () => {
        const availableVideo = flatVideos.find(v => {
            const u = units.find(unit => unit.videos.some(vid => vid.id === v.id));
            return u && unlockedUnitIdsSet.has(u.id);
        });
        if (availableVideo) {
            setCurrentVideoId(availableVideo.id);
            setUnlockOpen(false);
        }
    };

    useEffect(() => {
        const currentCourse = course;
        if (!isCourseLoading && !isAccessLoading && currentCourse?.locked) {
            // Only auto-open if student has ZERO access (neither full nor any unit)
            const hasAnyAccess = hasFullAccess || unlockedUnitIdsSet.size > 0;
            if (!hasAnyAccess && user && !isOwner) {
                setUnlockOpen(true);
            } else {
                setUnlockOpen(false);
            }
        } else {
            setUnlockOpen(false);
        }

        // Grant 20 XP for free / public course access (once per course)
        if (currentCourse && !currentCourse.locked && user?.uid) {
            const xpClaimedKey = `claimed_course_xp_${user.uid}_${courseId}`;
            const hasClaimed = localStorage.getItem(xpClaimedKey) === 'true';
            if (!hasClaimed) {
                localStorage.setItem(xpClaimedKey, 'true');
                if (firestore) {
                    try {
                        const studentRef = doc(firestore, 'students', user.uid);
                        updateDoc(studentRef, {
                            xp: increment(20),
                            [`claimedCourseXp.${courseId}`]: true
                        }).catch(() => {});
                    } catch (e) {}
                }
                const curXp = parseInt(localStorage.getItem('student-xp-' + user.uid) || '0', 10);
                localStorage.setItem('student-xp-' + user.uid, (curXp + 20).toString());

                toast({
                    title: "🎉 Free Course Access (+20 XP)",
                    description: "You earned 20 XP for exploring this course!",
                });
            }
        }
    }, [isCourseLoading, isAccessLoading, course, hasAccess, user, courseId, firestore, toast]);


    useEffect(() => {
        // Log course viewer analytics for teacher
        if (!firestore || !user?.uid || !teacherId || !courseId || !course) return;

        let unitTitle = '';
        let lessonTitle = '';
        let uIdx = 1;
        let lIdx = 1;

        if (course.units && course.units.length > 0) {
            let found = false;
            for (let u = 0; u < course.units.length; u++) {
                const unit = course.units[u];
                if (unit.videos) {
                    for (let v = 0; v < unit.videos.length; v++) {
                        if (unit.videos[v].id === currentVideoId) {
                            unitTitle = unit.title || `Unit ${u + 1}`;
                            lessonTitle = unit.videos[v].title || `Lesson ${v + 1}`;
                            uIdx = u + 1;
                            lIdx = v + 1;
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
            }
            if (!found && course.units[0]) {
                unitTitle = course.units[0].title || 'Unit 1';
                lessonTitle = course.units[0].videos?.[0]?.title || 'Lesson 1';
            }
        }

        const studentCode = currentStudentProfile?.barcodeId || (user.email?.includes('@universe.student') ? user.email.split('@')[0] : '');
        const displayName = currentStudentProfile?.name || user.displayName || (studentCode ? `Student (${studentCode})` : (user.email?.split('@')[0] || 'Student'));
        const viewerRef = doc(firestore, `teachers/${teacherId}/courses/${courseId}/viewers`, user.uid);
        
        setDoc(viewerRef, {
            studentId: user.uid,
            studentName: displayName,
            studentCode: studentCode,
            studentEmail: user.email || '',
            lastWatchedVideoId: currentVideoId || '',
            lastWatchedUnitTitle: unitTitle,
            lastWatchedLessonTitle: lessonTitle,
            lastWatchedUnitIndex: uIdx,
            lastWatchedLessonIndex: lIdx,
            lastWatchedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
    }, [firestore, user, teacherId, courseId, currentVideoId, course, currentStudentProfile]);

    useEffect(() => {
        // This effect runs when the component mounts or dependencies change.
        // It's designed to increment the view count once per session for a student accessing a locked course.
        if (
            hasAccess &&
            course?.locked &&
            user?.isAnonymous &&
            firestore &&
            courseId &&
            !viewCountIncremented.current // Prevents incrementing multiple times in one session
        ) {
            const accessRef = doc(firestore, `students/${user.uid}/courseAccess`, courseId);

            // Increment the view count in Firestore
            updateDoc(accessRef, {
                viewCount: increment(1)
            }).then(() => {
                // Set the ref to true so we don't increment again on re-renders
                viewCountIncremented.current = true;
            }).catch(e => {
                console.error("Failed to update view count:", e);
                // Optionally notify the user if the count update fails,
                // but for now, we'll fail silently to not disrupt the viewing experience.
            });
        }
    }, [hasAccess, course, user, firestore, courseId]);

    const handleMarkAsComplete = async (videoId: string) => {
        const targetStudentId = activeStudentId || user?.uid;
        if (!firestore || !targetStudentId || !courseId) return;
        const isAlreadyWatched = watchedVideoIds.has(videoId);

        const historyRef = doc(firestore, `students/${targetStudentId}/watchHistory`, courseId);

        try {
            await setDoc(historyRef, { 
                id: courseId,
                watchedVideoIds: isAlreadyWatched 
                    ? Array.from(watchedVideoIds).filter(id => id !== videoId)
                    : arrayUnion(videoId),
                lastWatched: serverTimestamp(),
            }, { merge: true });

            if (teacherId) {
                const viewerRef = doc(firestore, `teachers/${teacherId}/courses/${courseId}/viewers`, targetStudentId);
                const updatedList = isAlreadyWatched 
                    ? Array.from(watchedVideoIds).filter(id => id !== videoId)
                    : Array.from(new Set([...Array.from(watchedVideoIds), videoId]));
                setDoc(viewerRef, {
                    watchedVideoIds: updatedList,
                    updatedAt: serverTimestamp(),
                }, { merge: true }).catch(() => {});
            }
            
            toast({ title: isAlreadyWatched ? "Progress Reset" : "Progress Saved!" });
        } catch (e: any) {
            console.error("Failed to update watch history:", e);
            toast({ title: "Error saving progress", variant: "destructive"});
        }
    };
    
    const isLoadingInitialData = isCourseLoading || isTeacherLoading;
    const isLoading = isLoadingInitialData || isHistoryLoading || isUserLoading;

    if (isLoadingInitialData) {
        return <div className='h-screen w-full flex items-center justify-center'><p>Loading...</p></div>;
    }

    if (!displayCourse) {
        return <div className='h-screen w-full flex items-center justify-center'><p>Course not found.</p></div>;
    }

    const { title, description, attachmentUrl, videoNote } = displayCourse;
    const courseContentProps = { 
        units, 
        currentVideoId, 
        setCurrentVideoId, 
        watchedVideoIds, 
        handleMarkAsComplete, 
        videoNote,
        isCourseLocked: Boolean(displayCourse.locked),
        hasFullAccess,
        unlockedUnitIds: unlockedUnitIdsSet,
        onUnlockUnit: handleUnlockUnit
    };
    
    const progress = flatVideos.length > 0 ? (watchedVideoIds.size / flatVideos.length) * 100 : 0;
    
    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex-shrink-0 h-16 flex items-center px-4 border-b bg-background z-20">
                <Button variant="ghost" asChild>
                    <Link href={`/teacher?id=${teacherId}`}>
                        <ArrowLeft className="mr-2"/> Back to Teacher Profile
                    </Link>
                </Button>
             </header>

            <UnlockCourseDialog 
                isOpen={isUnlockOpen}
                setIsOpen={setUnlockOpen}
                courseId={courseId}
                teacherId={teacherId}
                targetUnitId={selectedUnitForUnlock}
            />

            <div className="lg:grid lg:grid-cols-3">
                {/* Main content: Video player and details */}
                <div className="lg:col-span-2 flex flex-col">
                    {displayCourse.locked && !hasAccess ? (
                        <div className="w-full aspect-video bg-black flex flex-col items-center justify-center text-center p-4">
                            <Lock className="w-16 h-16 text-emerald-400 mb-4" />
                            <h2 className="text-2xl font-bold text-white">
                                {activeVideoUnit ? `Unit: ${activeVideoUnit.title} is Locked` : 'This Course is Locked'}
                            </h2>
                            <p className="text-muted-foreground mt-2 max-w-md">
                                Request access to this specific unit or the whole course directly from your professor, or redeem a share code.
                            </p>
                             <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                {unlockedUnitIdsSet.size > 0 && (
                                    <Button 
                                        onClick={handleSwitchToUnlockedUnits}
                                        className="font-bold text-xs sm:text-sm h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                    >
                                        <Layers className="w-4 h-4" />
                                        <span>مشاهدة الوحدات المفتوحة لك (View Unlocked Units)</span>
                                    </Button>
                                )}
                                {activeVideoUnit && (
                                    <Button 
                                        onClick={() => { setSelectedUnitForUnlock(activeVideoUnit.id); setUnlockOpen(true); }}
                                        disabled={isUnitPending(activeVideoUnit.id) || isFullCoursePending}
                                        className={cn(
                                            "font-bold text-xs sm:text-sm h-11 px-5 rounded-xl shadow-lg",
                                            isUnitPending(activeVideoUnit.id)
                                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed"
                                                : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                                        )}
                                    >
                                        <Lock className="w-4 h-4 mr-1.5" />
                                        {isUnitPending(activeVideoUnit.id) ? (
                                            'طلب الوحدة قيد المراجعة'
                                        ) : (
                                            `طلب فتح هذه الوحدة: ${activeVideoUnit.title}`
                                        )}
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => { setSelectedUnitForUnlock(undefined); setUnlockOpen(true); }} 
                                    disabled={isFullCoursePending}
                                    className={cn(
                                        "font-bold text-xs sm:text-sm h-11 px-6 rounded-xl shadow-lg flex items-center gap-2",
                                        isFullCoursePending 
                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed" 
                                            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black shadow-emerald-500/20"
                                    )}
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    {isFullCoursePending ? (
                                        'طلب الكورس قيد المراجعة (Pending)'
                                    ) : (
                                        displayCourse.price ? `شراء / طلب فتح الكورس كاملاً (${displayCourse.price} EGP)` : 'شراء / فتح الكورس كاملاً'
                                    )}
                                </Button>
                                <Button 
                                    onClick={() => { setSelectedUnitForUnlock(undefined); setUnlockOpen(true); }}
                                    variant="outline"
                                    className="font-bold text-xs sm:text-sm h-11 px-5 rounded-xl border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                                >
                                    <KeyRound className="w-4 h-4 text-amber-400" />
                                    <span>إدخال كود الوصول (Redeem Code)</span>
                                </Button>
                             </div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Watch Now Bar */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-300">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="font-bold text-emerald-400">مشاهدة المحاضرة الآن (Watch Now)</span>
                                    <span className="text-zinc-600">|</span>
                                    <span className="font-medium text-white truncate max-w-[200px] sm:max-w-md">{currentVideo?.title}</span>
                                </div>
                                {displayCourse.price && displayCourse.price > 0 ? (
                                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-[10px]">
                                        {hasFullAccess ? 'مفتوح بالكامل (Full Access)' : `وحدة مفعلة (${activeVideoUnit?.title || 'Unit'})`}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-[10px]">
                                        مجاني Free
                                    </Badge>
                                )}
                            </div>
                            <div className="relative w-full aspect-video bg-black flex-shrink-0 overflow-hidden">
                                {embedUrl ? (
                                    <>
                                        <iframe
                                            className="relative z-0"
                                            width="100%"
                                            height="100%"
                                            src={embedUrl}
                                            title={title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                        {user?.uid && <VideoWatermark studentId={user.uid} />}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-destructive-foreground bg-destructive">Invalid Video URL</div>
                                )}
                            </div>
                        </div>
                    )}

                    {hasAccess && displayCourse.locked && effectiveCourseAccess && (effectiveCourseAccess.viewLimit ?? 0) > 0 && (
                        <Alert className="m-4 md:m-6 bg-primary/10 border-primary/30">
                            <Info className="h-4 w-4 !text-primary" />
                            <AlertTitle>مشاهدات محدودة (Max 3 Views)</AlertTitle>
                            <AlertDescription>
                                لديك {Math.max(0, (effectiveCourseAccess.viewLimit || 3) - (effectiveCourseAccess.viewCount || 0))} مشاهدات متبقية من أصل {effectiveCourseAccess.viewLimit || 3} لهذا المحتوى.
                            </AlertDescription>
                        </Alert>
                    )}

                     <div className="flex-grow">
                        <div className="p-6 space-y-6 text-text-primary">
                            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
                            {teacher && (
                                <div className="flex justify-between items-center">
                                    <Link href={`/teacher?id=${teacher.id}`} className="flex items-center gap-3 group">
                                        <Avatar className="h-12 w-12 border-2 border-border">
                                            <AvatarImage src={teacher.profilePictureUrl} />
                                            <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">{teacher.name}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground"><span>⭐ {teacher.averageRating?.toFixed(1) || 'N/A'}</span></div>
                                        </div>
                                    </Link>
                                    {attachmentUrl && (
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={attachmentUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>{t('Attachment', {lng: 'ar'})}</Link>
                                        </Button>
                                    )}
                                </div>
                            )}
                            <div>
                                <h3 className="font-semibold mb-2">{t('About this course', {lng: 'ar'})}</h3>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                            {(displayCourse.testId || displayCourse.homeworkId) && (
                                <div className="flex items-center gap-4 pt-4 border-t border-border">
                                    {displayCourse.testId && (
                                        <Button asChild>
                                            <Link href={`/test?id=${displayCourse.testId}`}><FileText className="mr-2 h-4 w-4"/> Go to Test</Link>
                                        </Button>
                                    )}
                                    {displayCourse.homeworkId && (
                                        <Button variant="secondary" onClick={() => setIsHomeworkOpen(true)}>
                                            <ClipboardList className="mr-2 h-4 w-4" /> View Homework
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="lg:hidden border-t border-b">
                           <CourseContentList {...courseContentProps} />
                        </div>
                        <div className='p-6'>
                            <Separator/>
                            {courseId && teacherId && (
                                <Suspense fallback={
                                    <div className="space-y-4 pt-6">
                                        <Skeleton className="h-6 w-1/4" />
                                        <div className="max-h-[500px] overflow-hidden space-y-4">
                                            <Skeleton className="h-20 w-full" />
                                            <Skeleton className="h-20 w-full" />
                                        </div>
                                    </div>
                                }>
                                    <CourseComments 
                                        courseId={courseId} 
                                        teacherId={teacherId} 
                                        isLocked={Boolean(displayCourse.locked && !hasAccess)}
                                        onUnlockRequest={() => setUnlockOpen(true)}
                                    />
                                </Suspense>
                            )}
                        </div>
                        <div className="p-6 border-t border-border bg-card/50">
                            {courseId && teacherId && <CourseRatingSection courseId={courseId} teacherId={teacherId} />}
                        </div>
                    </div>
                </div>

                {/* Sidebar for Desktop View */}
                <div className="hidden lg:block lg:col-span-1">
                    <div>
                        <CourseContentList {...courseContentProps} />
                    </div>
                </div>
            </div>
            {homework && (
                <Dialog open={isHomeworkOpen} onOpenChange={setIsHomeworkOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{homework.title || "Homework"}</DialogTitle>
                            <DialogDescription>
                                {homework.planName} {homework.grade ? `- ${homework.grade}` : ''}
                                {(() => {
                                  const expDate = toJsDate(homework.expiresAt);
                                  return expDate ? <p className="text-destructive text-sm mt-1">Expires: {format(expDate, "PPP")}</p> : null;
                                })()}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                            <p className="whitespace-pre-wrap">{homework.content}</p>
                            {homework.resourceLink && (
                                <Button asChild variant="outline" className="mt-4 w-full">
                                    <Link href={homework.resourceLink} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/> View Resource</Link>
                                </Button>
                            )}
                            
                            <div className="pt-4 border-t border-border">
                                <Button 
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    onClick={() => {
                                        if (!user?.uid) {
                                            toast({ title: "Please sign in to submit homework", variant: "destructive" });
                                            return;
                                        }
                                        const hwKey = `claimed_homework_xp_${user.uid}_${homework.id}`;
                                        if (localStorage.getItem(hwKey) === 'true') {
                                            toast({ title: "Already Submitted", description: "You have already completed this homework and received your +15 XP!" });
                                            setIsHomeworkOpen(false);
                                            return;
                                        }

                                        localStorage.setItem(hwKey, 'true');
                                        if (firestore) {
                                            try {
                                                const studentRef = doc(firestore, 'students', user.uid);
                                                updateDoc(studentRef, { xp: increment(15) }).catch(() => {});
                                            } catch (e) {}
                                        }
                                        const curXp = parseInt(localStorage.getItem('student-xp-' + user.uid) || '0', 10);
                                        localStorage.setItem('student-xp-' + user.uid, (curXp + 15).toString());

                                        toast({ title: "📝 Homework Completed! (+15 XP)", description: "Great job! You earned +15 XP for finishing your assignment." });
                                        setIsHomeworkOpen(false);
                                    }}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Submit & Claim Homework (+15 XP)
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
