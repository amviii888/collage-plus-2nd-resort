'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Course, CourseViewer, CourseRating, Student } from '@/lib/types';
import { useLocalData } from '@/context/LocalDataContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Users, 
  Star, 
  PlayCircle, 
  CheckCircle2, 
  BarChart3, 
  BookOpen, 
  Search, 
  Clock, 
  Layers, 
  Eye, 
  Award,
  Sparkles,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import Image from 'next/image';
import Link from 'next/link';

interface CourseAnalyticsProps {
  teacherId: string;
  initialCourseId?: string;
}

export function CourseAnalytics({ teacherId, initialCourseId }: CourseAnalyticsProps) {
  const firestore = useFirestore();
  const { localStudents } = useLocalData();
  const { toast } = useToast();

  // State for revoking access & kicking student from course
  const [revokeTarget, setRevokeTarget] = useState<any>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Fetch all registered students in Firestore to enrich viewer records with their real profile names
  const allStudentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'students');
  }, [firestore]);
  const { data: remoteStudents } = useCollection<Student>(allStudentsQuery);

  // Fetch all courses owned by this teacher
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, `teachers/${teacherId}/courses`);
  }, [firestore, teacherId]);

  const { data: courses, isLoading: isCoursesLoading } = useCollection<Course>(coursesQuery);

  // Selected course state
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Set initial selected course once loaded
  useEffect(() => {
    if (courses && courses.length > 0) {
      if (initialCourseId && courses.some(c => c.id === initialCourseId)) {
        setSelectedCourseId(initialCourseId);
      } else if (!selectedCourseId) {
        setSelectedCourseId(courses[0].id);
      }
    }
  }, [courses, initialCourseId, selectedCourseId]);

  const currentCourse = useMemo(() => {
    return courses?.find(c => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Fetch viewers of the selected course
  const viewersQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId || !selectedCourseId) return null;
    return collection(firestore, `teachers/${teacherId}/courses/${selectedCourseId}/viewers`);
  }, [firestore, teacherId, selectedCourseId]);

  const { data: viewers, isLoading: isViewersLoading } = useCollection<CourseViewer>(viewersQuery);

  // Fetch ratings of the selected course
  const ratingsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId || !selectedCourseId) return null;
    return collection(firestore, `teachers/${teacherId}/courses/${selectedCourseId}/ratings`);
  }, [firestore, teacherId, selectedCourseId]);

  const { data: ratings, isLoading: isRatingsLoading } = useCollection<CourseRating>(ratingsQuery);

  // Search filter & sorting for viewers
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'name'>('recent');

  // Compute total videos in current course
  const totalCourseVideos = useMemo(() => {
    if (!currentCourse?.units) return 0;
    return currentCourse.units.reduce((acc, u) => acc + (u.videos?.length || 0), 0);
  }, [currentCourse]);

  // Rating breakdown calculation
  const ratingStats = useMemo(() => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!ratings || ratings.length === 0) {
      return {
        count: currentCourse?.ratingCount || 0,
        average: currentCourse?.averageRating || 0,
        breakdown,
        percentages: breakdown
      };
    }
    ratings.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      breakdown[star as keyof typeof breakdown]++;
    });
    const total = ratings.length;
    const percentages = {
      5: total ? Math.round((breakdown[5] / total) * 100) : 0,
      4: total ? Math.round((breakdown[4] / total) * 100) : 0,
      3: total ? Math.round((breakdown[3] / total) * 100) : 0,
      2: total ? Math.round((breakdown[2] / total) * 100) : 0,
      1: total ? Math.round((breakdown[1] / total) * 100) : 0,
    };
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const avg = total > 0 ? sum / total : (currentCourse?.averageRating || 0);

    return {
      count: total,
      average: avg,
      breakdown,
      percentages
    };
  }, [ratings, currentCourse]);

  // Handler to revoke course access and kick student out of the course
  const handleRevokeAccess = async () => {
    if (!firestore || !teacherId || !selectedCourseId || !revokeTarget) return;
    setIsRevoking(true);
    try {
      const studentId = revokeTarget.studentId || revokeTarget.id;

      // 1. Delete course access from the student's personal courseAccess subcollection
      const accessRef = doc(firestore, 'students', studentId, 'courseAccess', selectedCourseId);
      await deleteDoc(accessRef).catch((err) => {
        console.warn("Could not delete student courseAccess:", err);
      });

      // 2. Delete the viewer document from the course's viewers list
      const viewerRef = doc(firestore, `teachers/${teacherId}/courses/${selectedCourseId}/viewers`, studentId);
      await deleteDoc(viewerRef);

      toast({
        title: "Access Revoked",
        description: `${revokeTarget.displayName} has been kicked from this course and must enter a new share code to access it again.`,
      });

      setRevokeTarget(null);
    } catch (err: any) {
      console.error("Error revoking student course access:", err);
      toast({
        variant: "destructive",
        title: "Revocation Failed",
        description: err.message || "Failed to remove student from course.",
      });
    } finally {
      setIsRevoking(false);
    }
  };

  // Process viewers list with Firestore profile & local student data enrichment
  const processedViewers = useMemo(() => {
    if (!viewers) return [];

    return viewers.map(v => {
      const vStudentName = typeof v?.studentName === 'string' ? v.studentName.trim() : '';
      const vStudentEmail = typeof v?.studentEmail === 'string' ? v.studentEmail.trim() : '';

      // 1. Extract possible barcode / student code
      const rawCode = (v as any)?.studentCode || 
        (vStudentEmail.includes('@universe.student') ? vStudentEmail.split('@')[0] : '') ||
        (/^\d{4,8}$/.test(vStudentName) ? vStudentName : '');

      // 2. Look up in remote Firestore students
      const remoteMatch = remoteStudents?.find(rs => 
        (v?.studentId && rs.id === v.studentId) ||
        (rawCode && rs.barcodeId === rawCode) ||
        (vStudentName && typeof rs.name === 'string' && rs.name.trim().toLowerCase() === vStudentName.toLowerCase())
      );

      // 3. Look up in local device students
      const localMatch = localStudents.find(ls => 
        (v?.studentId && ls.id === v.studentId) ||
        (rawCode && ls.barcodeId === rawCode) ||
        (vStudentName && typeof ls.name === 'string' && ls.name.trim().toLowerCase() === vStudentName.toLowerCase()) ||
        (vStudentEmail && typeof ls.email === 'string' && ls.email.toLowerCase() === vStudentEmail.toLowerCase())
      );

      // 4. Resolve real student profile name (instead of raw code!)
      let realName = (typeof remoteMatch?.name === 'string' ? remoteMatch.name.trim() : '') || 
                     (typeof localMatch?.name === 'string' ? localMatch.name.trim() : '');
      if (!realName) {
        // If vStudentName is NOT a numeric code and not generic 'Student', use it
        if (vStudentName && !/^\d{4,8}$/.test(vStudentName) && vStudentName.toLowerCase() !== 'student') {
          realName = vStudentName;
        } else if (rawCode) {
          realName = `Student (#${rawCode})`;
        } else {
          realName = vStudentName || 'Student';
        }
      }

      // 5. Resolve student barcode/code
      const studentCode = remoteMatch?.barcodeId || localMatch?.barcodeId || rawCode || '';
      const phone = (remoteMatch as any)?.phoneNumber || localMatch?.phone || '';
      const grade = remoteMatch?.grade || localMatch?.grade || '';

      const watchedCount = v?.watchedVideoIds?.length || 0;
      const progressPercent = totalCourseVideos > 0 
        ? Math.min(100, Math.round((watchedCount / totalCourseVideos) * 100))
        : 0;

      // Determine human readable progress location (e.g. Unit 2, Lesson 1)
      let locationText = 'Started course';
      if (v?.lastWatchedUnitIndex && v?.lastWatchedLessonIndex) {
        locationText = `Unit ${v.lastWatchedUnitIndex}, Lesson ${v.lastWatchedLessonIndex}`;
        if (v?.lastWatchedLessonTitle) {
          locationText += `: "${v.lastWatchedLessonTitle}"`;
        }
      } else if (v?.lastWatchedUnitTitle || v?.lastWatchedLessonTitle) {
        const uTitle = typeof v.lastWatchedUnitTitle === 'string' ? v.lastWatchedUnitTitle.trim() : '';
        const lTitle = typeof v.lastWatchedLessonTitle === 'string' ? v.lastWatchedLessonTitle.trim() : '';
        locationText = `${uTitle} ${lTitle ? `- ${lTitle}` : ''}`.trim() || 'Started course';
      }

      const dateObj = v?.lastWatchedAt?.toDate ? v.lastWatchedAt.toDate() : (v?.updatedAt?.toDate ? v.updatedAt.toDate() : null);

      return {
        ...v,
        displayName: realName || 'Student',
        studentCode,
        phone,
        grade,
        watchedCount,
        progressPercent,
        locationText: locationText || 'Started course',
        lastActiveDate: dateObj,
      };
    });
  }, [viewers, remoteStudents, localStudents, totalCourseVideos]);

  // Filtered viewers
  const filteredViewers = useMemo(() => {
    return processedViewers
      .filter(v => {
        const query = typeof debouncedSearchQuery === 'string' ? debouncedSearchQuery.trim() : '';
        if (!query) return true;
        const q = query.toLowerCase();
        const dName = (v.displayName || '').toLowerCase();
        const sCode = (v.studentCode || '').toLowerCase();
        const loc = (v.locationText || '').toLowerCase();
        const sEmail = (v.studentEmail || '').toLowerCase();
        return (
          dName.includes(q) ||
          sCode.includes(q) ||
          loc.includes(q) ||
          sEmail.includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'progress') {
          return b.progressPercent - a.progressPercent;
        }
        if (sortBy === 'name') {
          return a.displayName.localeCompare(b.displayName);
        }
        // default recent
        const timeA = a.lastActiveDate?.getTime() || 0;
        const timeB = b.lastActiveDate?.getTime() || 0;
        return timeB - timeA;
      });
  }, [processedViewers, debouncedSearchQuery, sortBy]);

  // Summary statistics
  const averageCompletionRate = useMemo(() => {
    if (processedViewers.length === 0) return 0;
    const sum = processedViewers.reduce((acc, v) => acc + v.progressPercent, 0);
    return Math.round(sum / processedViewers.length);
  }, [processedViewers]);

  if (isCoursesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <Card className="p-8 text-center bg-card/60 border-zinc-800">
        <CardContent className="space-y-4 pt-6">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-xl font-semibold">No Courses Found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You haven&apos;t created any courses yet. Create your first course to track student views, lesson progress, and ratings.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Link href="/teacher/courses">Go to Manage Courses</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Course Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-zinc-800/80 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight">Course Analytics</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Monitor who viewed your lessons, student watch milestones, and privacy-protected ratings.
          </p>
        </div>

        {/* Course Select Dropdown */}
        <div className="w-full md:w-80">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 font-medium">
              <SelectValue placeholder="Select a course..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
              {courses.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{course.title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentCourse && (
        <>
          {/* Selected Course Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-4">
              {currentCourse.thumbnailUrl && (
                <div className="relative h-16 w-24 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                  <Image
                    src={currentCourse.thumbnailUrl}
                    alt={currentCourse.title}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-zinc-100">{currentCourse.title}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    {currentCourse.units?.length || 0} Units
                  </Badge>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                    {totalCourseVideos} Lessons
                  </Badge>
                  <span>•</span>
                  <span>{currentCourse.locked ? 'Locked (Requires Access)' : 'Free Access'}</span>
                </div>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800">
              <Link href={`/courses/${teacherId}/${currentCourse.id}`} target="_blank">
                <Eye className="h-4 w-4 mr-2 text-emerald-400" /> View Course Page
              </Link>
            </Button>
          </div>

          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/75 border-zinc-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Total Viewers</div>
                  <div className="text-3xl font-extrabold text-zinc-100 mt-1">
                    {isViewersLoading ? <Skeleton className="h-8 w-16" /> : processedViewers.length}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Students opened course
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/75 border-zinc-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Avg Progress</div>
                  <div className="text-3xl font-extrabold text-zinc-100 mt-1">
                    {isViewersLoading ? <Skeleton className="h-8 w-16" /> : `${averageCompletionRate}%`}
                  </div>
                  <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <PlayCircle className="h-3 w-3" /> Video completion rate
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <PlayCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/75 border-zinc-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Course Rating</div>
                  <div className="text-3xl font-extrabold text-zinc-100 mt-1 flex items-center gap-1">
                    {ratingStats.average > 0 ? ratingStats.average.toFixed(1) : 'N/A'}
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {ratingStats.count} total rating{ratingStats.count === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <Star className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/75 border-zinc-800 backdrop-blur-xl">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Course Content</div>
                  <div className="text-3xl font-extrabold text-zinc-100 mt-1">
                    {totalCourseVideos}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Across {currentCourse.units?.length || 0} unit(s)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BookOpen className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Student Viewer Progress Table */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-card/75 border-zinc-800 backdrop-blur-xl">
                <CardHeader className="pb-3 border-b border-zinc-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-400" />
                        Student Viewers & Lesson Milestones
                      </CardTitle>
                      <CardDescription>
                        Track who saw the videos and where they stopped watching (e.g. Unit 2, Lesson 1)
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                        <SelectTrigger className="w-32 bg-zinc-900 border-zinc-700 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="progress">Highest Progress</SelectItem>
                          <SelectItem value="name">Student Name</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student by name or lesson..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-sm"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {isViewersLoading ? (
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : filteredViewers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground space-y-2">
                      <Users className="h-8 w-8 mx-auto opacity-50" />
                      <p className="font-medium">No student viewers found</p>
                      <p className="text-xs">
                        {searchQuery ? 'Try adjusting your search query.' : 'Students who view or play lessons will appear here automatically.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60">
                      {filteredViewers.map(viewer => (
                        <div key={viewer.id} className="p-4 hover:bg-zinc-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Student Info */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-sm">
                              {(viewer.displayName || 'Student').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-zinc-100 truncate">{viewer.displayName}</span>
                                {viewer.studentCode && (
                                  <Badge variant="outline" className="text-[10px] font-mono py-0 border-amber-500/30 text-amber-400 bg-amber-500/10">
                                    Code: #{viewer.studentCode}
                                  </Badge>
                                )}
                                {viewer.grade && (
                                  <Badge variant="outline" className="text-[10px] py-0 border-zinc-700">
                                    {viewer.grade}
                                  </Badge>
                                )}
                              </div>

                              {/* Progress Location Pill */}
                              <div className="flex items-center gap-1.5 mt-1 text-xs">
                                <span className="text-amber-400 font-medium">Stopped at:</span>
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs py-0.5 px-2">
                                  {viewer.locationText}
                                </Badge>
                              </div>

                              {viewer.lastActiveDate && (
                                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last active: {viewer.lastActiveDate.toLocaleDateString()} at {viewer.lastActiveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar & Actions */}
                          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                            <div className="sm:text-right min-w-36 space-y-1.5">
                              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                                <span className="text-zinc-400 font-medium">
                                  {viewer.watchedCount} / {totalCourseVideos} Lessons
                                </span>
                                <span className="font-bold text-emerald-400">{viewer.progressPercent}%</span>
                              </div>
                              <Progress value={viewer.progressPercent} className="h-2 bg-zinc-800" />
                            </div>

                            {/* Revoke / Trash Action */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRevokeTarget(viewer)}
                              className="h-9 w-9 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                              title="Revoke course access & kick student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Course Rating Breakdown (Privacy-Preserving) */}
            <div className="space-y-4">
              <Card className="bg-card/75 border-zinc-800 backdrop-blur-xl">
                <CardHeader className="pb-3 border-b border-zinc-800/60">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    Course Rating Breakdown
                  </CardTitle>
                  <CardDescription>
                    Aggregated rating feedback submitted by students for this course.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 space-y-6">
                  {/* Rating Overall Score Box */}
                  <div className="flex items-center justify-center p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center flex-col gap-2">
                    <span className="text-4xl font-black text-zinc-100">
                      {ratingStats.average > 0 ? ratingStats.average.toFixed(1) : '0.0'}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(ratingStats.average)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      Based on {ratingStats.count} rating{ratingStats.count === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Distribution Bars */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Rating Distribution
                    </h4>
                    {[5, 4, 3, 2, 1].map(starNum => {
                      const count = ratingStats.breakdown[starNum as keyof typeof ratingStats.breakdown] || 0;
                      const pct = ratingStats.percentages[starNum as keyof typeof ratingStats.percentages] || 0;

                      return (
                        <div key={starNum} className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1 w-12 font-medium text-zinc-300 shrink-0">
                            <span>{starNum}</span>
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          </div>
                          <Progress value={pct} className="h-2 bg-zinc-800 flex-grow" />
                          <div className="w-16 text-right text-muted-foreground text-[11px] shrink-0">
                            {count} ({pct}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Ratings are anonymized to encourage honest student feedback.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Revoke / Kick Student Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 text-lg">
              <Trash2 className="h-5 w-5 text-red-400" />
              Revoke Course Access
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm pt-1">
              Are you sure you want to revoke access for <strong className="text-zinc-100 font-semibold">{revokeTarget?.displayName}</strong>
              {revokeTarget?.studentCode ? ` (Student Code #${revokeTarget?.studentCode})` : ''}?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-300 space-y-1.5 mt-2">
            <p className="font-semibold flex items-center gap-1.5 text-red-200">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              What will happen:
            </p>
            <p className="leading-relaxed">
              The student will be kicked out of this course and removed from this analytics list. If the course is locked, their access is revoked and they will need a brand new share code to access it again.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={isRevoking}
              className="border-zinc-700 hover:bg-zinc-900 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAccess}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {isRevoking ? 'Revoking Access...' : 'Revoke & Kick Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
