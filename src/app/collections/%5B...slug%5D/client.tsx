'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useStudent, useCollection } from '@/firebase';
import { 
  doc, 
  getDoc, 
  collection as firestoreCollection, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import type { Course, Teacher, CourseCollection, CourseCollectionAccess, CourseRequest, CollectionCustomItem } from '@/lib/types';
import type { LibraryBook } from '@/lib/library-types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CourseCard } from '@/components/CourseCard';
import { 
  ArrowLeft, 
  BookOpen, 
  Library, 
  Lock, 
  Phone, 
  Sparkles, 
  KeyRound, 
  Send, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Film, 
  FileText, 
  Eye, 
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UnlockCollectionDialog } from '@/components/UnlockCollectionDialog';
import { ProtectedBookReader } from '@/components/library/ProtectedBookReader';

export default function CollectionClient({ teacherId, collectionId }: { teacherId: string, collectionId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading, userError } = useUser();
  const { student: profile } = useStudent(user?.uid);
  const { toast } = useToast();

  const [isUnlockOpen, setUnlockOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [areCoursesLoading, setAreCoursesLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [forceLoadTimeout, setForceLoadTimeout] = useState(false);

  // Fallback timer so page never gets stuck in infinite loading skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceLoadTimeout(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Active protected reader state for collection PDFs / Lecture materials
  const [activeReadingItem, setActiveReadingItem] = useState<CollectionCustomItem | null>(null);

  // 1. Fetch Collection details
  const { data: collection, isLoading: isCollectionLoading, error: collectionError } = useDoc<CourseCollection>(useMemoFirebase(() => {
    if (!firestore || !teacherId || !collectionId) return null;
    return doc(firestore, `teachers/${teacherId}/courseCollections/${collectionId}`);
  }, [firestore, teacherId, collectionId]));

  // 2. Fetch Teacher details
  const { data: teacher, isLoading: isTeacherLoading, error: teacherError } = useDoc<Teacher>(useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return doc(firestore, `teachers`, teacherId);
  }, [firestore, teacherId]));

  // Effective Student Identity
  const effectiveStudentId = useMemo(() => {
    if (profile?.id) return profile.id;
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('viewingStudentId');
      if (storedId) return storedId;
    }
    return user?.uid || '';
  }, [profile, user]);

  const studentName = useMemo(() => {
    if (profile?.name) return profile.name;
    if (typeof window !== 'undefined') {
      const n = localStorage.getItem('student_name');
      if (n) return n;
    }
    return user?.displayName || 'Student';
  }, [profile, user]);

  const studentBarcode = useMemo(() => {
    if (profile?.barcodeId) return profile.barcodeId;
    if (typeof window !== 'undefined') {
      const b = localStorage.getItem('student_barcode') || localStorage.getItem('studentBarcode');
      if (b) return b;
    }
    return '';
  }, [profile]);

  // 3. Fetch Courses in Collection
  useEffect(() => {
    if (collection && firestore && teacherId) {
      setAreCoursesLoading(true);
      setFetchError(null);
      const allCourseIds = Array.from(new Set([
        ...(collection.courseIds || []),
        ...((collection.customItems || []).map(i => i.courseId).filter(Boolean) as string[])
      ]));

      if (allCourseIds.length === 0) {
        setCourses([]);
        setAreCoursesLoading(false);
        return;
      }

      const fetchCourses = async () => {
        try {
          const coursePromises = allCourseIds.map(cId => 
            getDoc(doc(firestore, 'teachers', teacherId, 'courses', cId))
          );
          const courseDocs = await Promise.all(coursePromises);
          const fetchedCourses = courseDocs
            .filter(d => d.exists())
            .map(d => ({ id: d.id, ...d.data() }) as Course);
          setCourses(fetchedCourses);
        } catch (e: any) {
          console.error("Error fetching collection courses:", e);
          setFetchError(e?.message || String(e) || "Failed to load collection courses");
        } finally {
          setAreCoursesLoading(false);
        }
      };
      fetchCourses();
    } else if (!isCollectionLoading && !collection) {
      setAreCoursesLoading(false);
    }
  }, [collection, firestore, teacherId, isCollectionLoading]);

  // 4. Check Collection Access
  const collectionAccessQuery = useMemoFirebase(() => {
    if (!effectiveStudentId || !firestore || !collectionId) return null;
    return doc(firestore, `students/${effectiveStudentId}/courseCollectionAccess/${collectionId}`);
  }, [effectiveStudentId, firestore, collectionId]);
  const { data: directCollectionAccess } = useDoc<CourseCollectionAccess>(collectionAccessQuery);

  const firstCourseId = collection?.courseIds?.[0];
  const firstCourseAccessQuery = useMemoFirebase(() => {
    if (!effectiveStudentId || !firestore || !firstCourseId) return null;
    return doc(firestore, `students/${effectiveStudentId}/courseAccess/${firstCourseId}`);
  }, [effectiveStudentId, firestore, firstCourseId]);
  const { data: firstCourseAccess } = useDoc(firstCourseAccessQuery);

  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId || !collectionId || !effectiveStudentId) return null;
    return query(
      firestoreCollection(firestore, `teachers/${teacherId}/course_requests`),
      where("studentId", "==", effectiveStudentId),
      where("collectionId", "==", collectionId),
      where("status", "==", "pending"),
      limit(1)
    );
  }, [firestore, teacherId, collectionId, effectiveStudentId]);
  const { data: pendingRequests } = useCollection<CourseRequest>(pendingRequestsQuery);

  const hasAccess = useMemo(() => {
    if (user?.uid && teacherId && user.uid === teacherId) return true;
    if (collection && collection.locked === false) return true;
    if (directCollectionAccess) return true;
    if (firstCourseAccess) return true;
    if (typeof window !== 'undefined' && collectionId) {
      if (localStorage.getItem(`student_collection_access_${collectionId}`)) return true;
      if (firstCourseId && localStorage.getItem(`student_course_access_${firstCourseId}`)) return true;
    }
    return false;
  }, [user, teacherId, collection, directCollectionAccess, firstCourseAccess, collectionId, firstCourseId]);

  const hasPendingRequest = useMemo(() => {
    if (pendingRequests && pendingRequests.length > 0) return true;
    if (typeof window !== 'undefined' && effectiveStudentId && collectionId) {
      try {
        const local = localStorage.getItem(`student_local_course_requests_${effectiveStudentId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.some((r: any) => r.collectionId === collectionId && (r.status || 'pending') === 'pending')) {
            return true;
          }
        }
      } catch (e) {}
    }
    return false;
  }, [pendingRequests, effectiveStudentId, collectionId]);

  const isLoading = (isUserLoading || isCollectionLoading || isTeacherLoading || areCoursesLoading) && !forceLoadTimeout;

  const anyError = userError || collectionError || teacherError || fetchError;

  if (anyError) {
    return (
      <div className="container mx-auto p-6 max-w-2xl mt-12">
        <Card className="p-6 bg-red-950/40 border border-red-500/50 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Failed to Load Collection Data</h3>
            <p className="text-xs font-mono text-red-300 bg-red-900/40 p-3 rounded-xl border border-red-500/30 break-all text-left">
              {typeof anyError === 'string' ? anyError : (anyError as any)?.message || JSON.stringify(anyError)}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold gap-2">
              <RefreshCw className="w-4 h-4" /> Retry Page
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold">
              <Link href={`/teacher?id=${teacherId}`}>Back to Teacher Profile</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading && !collection && !teacher) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const safeCollection = collection || {
    id: collectionId,
    title: 'Course Bundle',
    description: 'Collection details',
    courseIds: [],
    customItems: [],
    locked: true
  } as any;

  const safeTeacher = teacher || {
    id: teacherId,
    name: 'Professor',
    profilePictureUrl: '',
  } as any;

  const customItems = safeCollection.customItems || [];
  const lessonItems = customItems.filter((i: any) => i.type === 'lesson');
  const unitItems = customItems.filter((i: any) => i.type === 'unit');
  const fileItems = customItems.filter((i: any) => i.type === 'file');

  const activeReadingBook: LibraryBook | null = activeReadingItem ? {
    id: activeReadingItem.id,
    title: activeReadingItem.fileTitle || 'Lecture Document',
    author: safeTeacher.name,
    description: `Lecture resource inside bundle "${safeCollection.title}"`,
    coverUrl: safeCollection.thumbnailUrl,
    pdfUrl: activeReadingItem.fileUrl,
    pages: activeReadingItem.fileUrl ? [activeReadingItem.fileUrl] : [],
    totalPages: 1,
    subject: 'Study Material',
    grade: 'General',
    publishedYear: new Date().getFullYear(),
    downloadable: false,
  } : null;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8 max-w-7xl">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" className="text-zinc-400 hover:text-white -ml-2 rounded-xl">
          <Link href={`/teacher?id=${safeTeacher.id}`}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Professor Profile
          </Link>
        </Button>

        {hasAccess ? (
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Unlocked & Active</span>
          </Badge>
        ) : (
          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Locked Collection</span>
          </Badge>
        )}
      </div>

      {/* Hero Banner */}
      <Card className="overflow-hidden border border-zinc-800 bg-zinc-950 rounded-3xl shadow-2xl relative">
        <CardHeader className="p-0 relative min-h-[280px] sm:min-h-[320px] flex items-end p-6 sm:p-8 text-white">
          <Image 
            src={safeCollection.thumbnailUrl || 'https://picsum.photos/seed/bundle/1200/600'} 
            alt={safeCollection.title} 
            fill 
            className="object-cover" 
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          
          <div className="relative z-10 space-y-3 w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl backdrop-blur-md">
                <Library className="w-4 h-4 text-emerald-400" />
                <span>Curated Course Bundle</span>
              </div>

              {safeCollection.price ? (
                <div className="bg-emerald-500 text-black px-3.5 py-1 rounded-xl font-mono font-black text-sm shadow-md">
                  {safeCollection.price} EGP
                </div>
              ) : null}
            </div>

            <CardTitle className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {safeCollection.title}
            </CardTitle>

            {safeCollection.description && (
              <CardDescription className="text-zinc-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
                {safeCollection.description}
              </CardDescription>
            )}

            <div className="flex items-center flex-wrap gap-4 pt-2 text-xs text-zinc-300">
              <Link href={`/teacher?id=${safeTeacher.id}`} className="flex items-center gap-2 group hover:text-white transition-colors">
                <Avatar className="h-7 w-7 border border-white/20">
                  <AvatarImage src={safeTeacher.profilePictureUrl} />
                  <AvatarFallback className="bg-zinc-800 text-xs">{safeTeacher.name?.charAt(0) || 'T'}</AvatarFallback>
                </Avatar>
                <span className="font-bold group-hover:underline">{safeTeacher.name}</span>
              </Link>

              <div className="flex items-center gap-1.5 text-zinc-400">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>{courses.length} Courses</span>
              </div>

              {customItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{customItems.length} Handpicked Resources</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Body */}
      {hasAccess ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {courses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" /> Courses in this Collection
                </h3>
                <span className="text-xs text-zinc-400 font-semibold">{courses.length} Available</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <CourseCard key={course.id} course={course} teacher={safeTeacher} />
                ))}
              </div>
            </div>
          )}

          {(unitItems.length > 0 || lessonItems.length > 0) && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" /> Specific Units & Lessons Included
                </h3>
                <span className="text-xs text-zinc-400 font-semibold">{unitItems.length + lessonItems.length} Lessons/Units</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitItems.map((item: any) => (
                  <Card key={item.id} className="p-4 bg-zinc-950/80 border border-blue-500/30 rounded-2xl space-y-2 hover:border-blue-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Selected Unit
                      </Badge>
                      <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[140px]">{item.courseTitle}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.unitTitle}</h4>
                    {item.courseId && (
                      <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs font-bold rounded-xl border-blue-500/40 text-blue-300 hover:bg-blue-500/10">
                        <Link href={`/courses/${safeTeacher.id}/${item.courseId}`}>Open Unit in Course</Link>
                      </Button>
                    )}
                  </Card>
                ))}

                {lessonItems.map((item: any) => (
                  <Card key={item.id} className="p-4 bg-zinc-950/80 border border-emerald-500/30 rounded-2xl space-y-2 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                        <Film className="w-3 h-3" /> Specific Lesson
                      </Badge>
                      <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[140px]">{item.courseTitle}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.videoTitle}</h4>
                    {item.courseId && (
                      <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs font-bold rounded-xl border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                        <Link href={`/courses/${safeTeacher.id}/${item.courseId}`}>Watch Lesson</Link>
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {fileItems.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" /> Protected Lecture Files & PDFs
                </h3>
                <span className="text-xs text-zinc-400 font-semibold">{fileItems.length} Documents</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fileItems.map((item: any) => (
                  <Card key={item.id} className="p-4 bg-zinc-950/80 border border-amber-500/30 rounded-2xl space-y-3 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Protected PDF
                      </Badge>
                      <span className="text-[10px] text-zinc-500 font-mono">In-App Watermark</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white line-clamp-2">{item.fileTitle || 'Lecture Document'}</h4>
                      <p className="text-[11px] text-zinc-400">Protected against screenshots and direct downloads.</p>
                    </div>

                    <Button 
                      size="sm" 
                      onClick={() => setActiveReadingItem(item)}
                      className="w-full h-9 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 shadow-md shadow-amber-600/20"
                    >
                      <Eye className="w-3.5 h-3.5" /> Read Inside App
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {hasPendingRequest && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-950 to-zinc-950 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">Access Request Under Review</h4>
                  <p className="text-xs text-zinc-400">
                    Your request for &quot;{safeCollection.title}&quot; has been submitted and is awaiting your professor&apos;s approval.
                  </p>
                </div>
              </div>

              {safeTeacher.phoneNumber && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs font-bold rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20">
                    <a href={`tel:${safeTeacher.phoneNumber}`} className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Contact: {safeTeacher.phoneNumber}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="p-8 sm:p-12 border-2 border-dashed border-zinc-800 bg-zinc-950/60 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shadow-inner">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2 max-w-lg">
              <h3 className="text-2xl font-black text-white tracking-tight">This Collection is Locked</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Unlock all {courses.length} courses {customItems.length > 0 ? `and ${customItems.length} learning resources` : ''} inside this collection package using a share code or by sending an instant access request to your professor.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md pt-2">
              <Button 
                onClick={() => setUnlockOpen(true)} 
                size="lg"
                className="w-full sm:flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Request Access / Share Code
              </Button>
              <Button 
                onClick={() => setUnlockOpen(true)} 
                variant="outline"
                size="lg"
                className="w-full sm:flex-1 h-12 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-emerald-400" /> Redeem Code
              </Button>
            </div>

            {safeTeacher.phoneNumber && (
              <p className="text-xs text-zinc-500 flex items-center gap-1.5 pt-2">
                <Phone className="w-3.5 h-3.5 text-zinc-600" />
                <span>Or contact professor directly at <span className="font-mono text-zinc-400">{safeTeacher.phoneNumber}</span></span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Unlock / Request Modal */}
      <UnlockCollectionDialog
        isOpen={isUnlockOpen}
        setIsOpen={setUnlockOpen}
        collectionData={safeCollection}
        teacher={safeTeacher}
        courses={courses}
        onUnlocked={() => {
          setUnlockOpen(false);
        }}
      />

      {/* Protected Reader Modal for Collection PDFs */}
      {activeReadingBook && (
        <ProtectedBookReader
          book={activeReadingBook}
          studentId={effectiveStudentId}
          studentName={studentName}
          studentBarcode={studentBarcode}
          teacherId={safeTeacher.id}
          forceCanvasStamp={true}
          onClose={() => setActiveReadingItem(null)}
        />
      )}
    </div>
  );
}
