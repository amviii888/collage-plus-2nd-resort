
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  collection, 
  doc, 
  serverTimestamp, 
  writeBatch, 
  runTransaction, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy, 
  updateDoc, 
  setDoc, 
  arrayUnion, 
  getDoc 
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Course, CourseCollection, Teacher, CourseRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  PlusCircle, 
  Download, 
  KeyRound, 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Layers, 
  BookOpen, 
  Library, 
  UserCheck, 
  Phone, 
  GraduationCap, 
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { BadgeHelp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const generateCodeSchema = z.object({
  type: z.enum(['course', 'collection']),
  targetId: z.string().min(1, 'Please select a course or collection.'),
  count: z.coerce.number().min(1, 'Count must be at least 1').max(500, 'You can generate a maximum of 500 codes at a time.'),
  generationMode: z.enum(['auto', 'manual']).default('auto'),
  customCode: z.string().optional(),
});

type GenerateCodeFormValues = z.infer<typeof generateCodeSchema>;

export function ManageShareCodes({ teacher }: { teacher: Teacher }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'generate' | 'requests'>('requests');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grantingRequestId, setGrantingRequestId] = useState<string | null>(null);
  const [requestViewLimits, setRequestViewLimits] = useState<Record<string, number>>({});

  // Search & Filters for Requests
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'granted' | 'rejected'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  const teacherId = teacher.id;

  // 1. Fetch Courses
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, 'teachers', teacherId, 'courses');
  }, [firestore, teacherId]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);
  const lockedCourses = useMemo(() => courses?.filter(c => c.locked) || [], [courses]);

  // 2. Fetch Collections
  const collectionsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, `teachers/${teacherId}/courseCollections`);
  }, [firestore, teacherId]);
  const { data: collections, isLoading: collectionsLoading } = useCollection<CourseCollection>(collectionsQuery);
  
  // 3. Fetch Student Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, `teachers/${teacherId}/course_requests`);
  }, [firestore, teacherId]);
  const { data: rawRequests, isLoading: requestsLoading } = useCollection<CourseRequest>(requestsQuery);

  const requests = useMemo(() => {
    if (!rawRequests) return [];
    let list = [...rawRequests];

    // Filter by status
    if (statusFilter !== 'all') {
      list = list.filter(r => (r.status || 'pending') === statusFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.studentPhone || '').toLowerCase().includes(q) ||
        (r.studentBarcode || '').toLowerCase().includes(q) ||
        (r.courseTitle || '').toLowerCase().includes(q) ||
        (r.unitTitle || '').toLowerCase().includes(q) ||
        (r.collectionTitle || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [rawRequests, statusFilter, searchQuery, sortOrder]);

  const pendingCount = useMemo(() => {
    return rawRequests?.filter(r => (r.status || 'pending') === 'pending').length || 0;
  }, [rawRequests]);

  const todayStr = new Date().toISOString().split('T')[0];
  const usage = teacher.codeUsage;
  const isLimitReached = usage?.date === todayStr && usage?.count >= usage?.limit;
  const hasRequestedExtra = usage?.date === todayStr && usage?.extraRequested;

  const { handleSubmit, formState: { errors }, control, watch, reset, register } = useForm<GenerateCodeFormValues>({
    resolver: zodResolver(generateCodeSchema),
    defaultValues: {
        count: 10,
        type: 'course',
        generationMode: 'auto',
        customCode: '',
    }
  });

  const selectedType = watch('type');
  const selectedGenerationMode = watch('generationMode') || 'auto';

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateAndExport = async (data: GenerateCodeFormValues) => {
    if (!firestore || isLimitReached) return;
    setIsSubmitting(true);
    
    const isManual = data.generationMode === 'manual';
    const countToGenerate = isManual ? 1 : data.count;
    let newDailyCount = (usage?.date === todayStr ? usage.count : 0) + countToGenerate;
    if (newDailyCount > (usage?.limit || 300)) {
        toast({
            variant: 'destructive',
            title: 'Limit Exceeded',
            description: `You can only generate ${ (usage?.limit || 300) - (usage?.date === todayStr ? usage.count : 0) } more codes today.`,
        });
        setIsSubmitting(false);
        return;
    }

    const selectedItem = data.type === 'course'
        ? courses?.find(c => c.id === data.targetId)
        : collections?.find(c => c.id === data.targetId);

    if (!selectedItem) {
        toast({ variant: 'destructive', title: 'Item not found' });
        setIsSubmitting(false);
        return;
    }

    if (isManual) {
      const customCodeClean = data.customCode?.trim().toUpperCase();
      if (!customCodeClean || customCodeClean.length < 3) {
        toast({
          variant: 'destructive',
          title: 'Invalid Code',
          description: 'Please enter a custom manual code of at least 3 characters.',
        });
        setIsSubmitting(false);
        return;
      }
      
      try {
        const shareCodeCollection = collection(firestore, 'teachers', teacherId, 'share_codes');
        const q = query(shareCodeCollection, where("code", "==", customCodeClean), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          toast({
            variant: 'destructive',
            title: 'Code Already Exists',
            description: 'This custom manual code already exists. Please choose a different one.',
          });
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        console.error("Uniqueness check failed", error);
      }
    }

    try {
      const teacherRef = doc(firestore, 'teachers', teacherId);
      const shareCodeCollection = collection(firestore, 'teachers', teacherId, 'share_codes');
      
      const codesToExport: { code: string }[] = [];
      const batch = writeBatch(firestore);

      for (let i = 0; i < countToGenerate; i++) {
        const code = isManual 
          ? data.customCode!.trim().toUpperCase() 
          : generateUniqueCode();
        codesToExport.push({ code });

        const newCodeRef = doc(shareCodeCollection);
        
        const codeData: any = {
          code,
          used: false,
          createdAt: serverTimestamp(),
          teacherId,
          hidden: false,
        };

        if (data.type === 'course') {
          codeData.courseId = data.targetId;
        } else {
          codeData.collectionId = data.targetId;
        }

        batch.set(newCodeRef, codeData);
      }
      
      batch.set(teacherRef, { 
        codeUsage: { 
            date: todayStr, 
            count: newDailyCount,
            limit: usage?.limit || 300,
            extraRequested: hasRequestedExtra,
        }
      }, { merge: true });

      await batch.commit();
      
      const sanitizedTitle = selectedItem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${sanitizedTitle}_${data.type}_codes.xlsx`;
      
      const ws = XLSX.utils.json_to_sheet(codesToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Share Codes");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      
      saveAs(blob, fileName);
      
      toast({ 
        title: isManual 
          ? `Custom code "${data.customCode!.trim().toUpperCase()}" created & exported!` 
          : `${data.count} codes generated and exported!` 
      });
      reset({ ...data, count: 10, customCode: '' });
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error generating codes', description: error.message });
    }
    setIsSubmitting(false);
  };
  
  const handleRequestMore = async () => {
    if (!firestore || hasRequestedExtra) return;
    setIsSubmitting(true);
    const teacherRef = doc(firestore, 'teachers', teacherId);
    try {
        await runTransaction(firestore, async (transaction) => {
            const teacherDoc = await transaction.get(teacherRef);
            if (!teacherDoc.exists()) throw new Error("Teacher not found");
            
            transaction.set(teacherRef, { 
                codeUsage: {
                    date: todayStr,
                    count: usage?.count || 0,
                    limit: usage?.limit || 300,
                    extraRequested: true
                }
            }, { merge: true });
        });
        toast({ title: "Request Sent", description: "Your request for more codes has been sent to the admin." });
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Grant Access for a Student Request (Full Course, Unit, or Collection)
  const handleGrantAccess = async (req: CourseRequest, explicitLimit?: number) => {
    if (!firestore || !req.studentId) return;
    setGrantingRequestId(req.id);
    // User constraint: Maximum views allowed is 3. Unlimited (0) is strictly disabled.
    const rawLimit = explicitLimit !== undefined ? explicitLimit : (requestViewLimits[req.id] ?? 3);
    const chosenLimit = Math.min(3, Math.max(1, rawLimit));

    try {
      const batch = writeBatch(firestore);

      // 1. Update Request Document
      const reqRef = doc(firestore, `teachers/${teacherId}/course_requests`, req.id);
      batch.update(reqRef, {
        status: 'granted',
        grantedAt: serverTimestamp(),
        viewLimit: chosenLimit,
      });

      try {
        const altReqRef = doc(firestore, `teachers/${teacherId}/access_requests`, req.id);
        batch.set(altReqRef, {
          status: 'granted',
          grantedAt: serverTimestamp(),
          viewLimit: chosenLimit,
        }, { merge: true });
      } catch (e) {}

      // 1.1 Also update student's own course_requests subcollection for real-time profile sync
      try {
        const studentReqRef = doc(firestore, `students/${req.studentId}/course_requests`, req.id);
        batch.set(studentReqRef, {
          status: 'granted',
          grantedAt: serverTimestamp(),
          viewLimit: chosenLimit,
        }, { merge: true });
      } catch (e) {}

      // 2. Grant Access in Student Subcollection
      if (req.requestType === 'collection' && req.collectionId) {
        const collectionAccessRef = doc(firestore, `students/${req.studentId}/courseCollectionAccess`, req.collectionId);
        batch.set(collectionAccessRef, {
          collectionId: req.collectionId,
          teacherId: teacherId,
          unlockedAt: serverTimestamp(),
        }, { merge: true });

        // Also grant access to each course within collection if known
        const coll = collections?.find(c => c.id === req.collectionId);
        if (coll?.courseIds) {
          for (const cId of coll.courseIds) {
            const cAccessRef = doc(firestore, `students/${req.studentId}/courseAccess`, cId);
            batch.set(cAccessRef, {
              courseId: cId,
              teacherId: teacherId,
              fullAccess: true,
              unlockedAt: serverTimestamp(),
              viewCount: 0,
              viewLimit: chosenLimit,
              grantedVia: 'request',
            }, { merge: true });
          }
        }
      } else if (req.courseId) {
        const courseAccessRef = doc(firestore, `students/${req.studentId}/courseAccess`, req.courseId);
        
        if (req.requestType === 'unit' && req.unitId) {
          // Grant specific unit access
          const unitAccessPayload = {
            courseId: req.courseId,
            teacherId: teacherId,
            unlockedUnitIds: arrayUnion(req.unitId),
            unlockedAt: serverTimestamp(),
            viewCount: 0,
            viewLimit: chosenLimit,
            grantedVia: 'request',
          };
          batch.set(courseAccessRef, unitAccessPayload, { merge: true });

          // Also sync to auth UID if different
          const authUid = (req as any).studentAuthUid;
          if (authUid && authUid !== req.studentId) {
            const altAccessRef = doc(firestore, `students/${authUid}/courseAccess`, req.courseId);
            batch.set(altAccessRef, unitAccessPayload, { merge: true });
          }
        } else {
          // Grant full course access
          const fullAccessPayload = {
            courseId: req.courseId,
            teacherId: teacherId,
            fullAccess: true,
            unlockedAt: serverTimestamp(),
            viewCount: 0,
            viewLimit: chosenLimit,
            grantedVia: 'request',
          };
          batch.set(courseAccessRef, fullAccessPayload, { merge: true });

          // Also sync to auth UID if different
          const authUid = (req as any).studentAuthUid;
          if (authUid && authUid !== req.studentId) {
            const altAccessRef = doc(firestore, `students/${authUid}/courseAccess`, req.courseId);
            batch.set(altAccessRef, fullAccessPayload, { merge: true });
          }
        }
      }

      await batch.commit();

      // Mirror locally for instant reactive updates in student UI
      if (typeof window !== 'undefined' && req.courseId) {
        try {
          const cachedAccess = {
            courseId: req.courseId,
            teacherId: teacherId,
            fullAccess: req.requestType !== 'unit',
            unlockedUnitIds: req.requestType === 'unit' && req.unitId ? [req.unitId] : [],
            viewLimit: chosenLimit,
            viewCount: 0,
            unlockedAt: new Date().toISOString()
          };
          localStorage.setItem(`student_course_access_${req.courseId}`, JSON.stringify(cachedAccess));
          localStorage.setItem(`student_req_status_${req.id}`, 'granted');
        } catch (e) {}
      }
      toast({
        title: "✅ Access Granted Successfully!",
        description: `Unlocked ${req.requestType === 'unit' ? `Unit (${req.unitTitle || 'Unit'})` : req.courseTitle || 'Content'} with ${chosenLimit} views (Max 3) for ${req.studentName}.`,
      });
    } catch (e: any) {
      console.error("Grant access error:", e);
      toast({
        variant: "destructive",
        title: "Failed to Grant Access",
        description: e.message || "An error occurred while granting student access.",
      });
    } finally {
      setGrantingRequestId(null);
    }
  };

  // Reject / Cancel Request
  const handleRejectRequest = async (req: CourseRequest) => {
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);
      const reqRef = doc(firestore, `teachers/${teacherId}/course_requests`, req.id);
      batch.update(reqRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      try {
        const altReqRef = doc(firestore, `teachers/${teacherId}/access_requests`, req.id);
        batch.set(altReqRef, {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {}
      try {
        const studentReqRef = doc(firestore, `students/${req.studentId}/course_requests`, req.id);
        batch.set(studentReqRef, {
          status: 'rejected',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {}
      await batch.commit();
      toast({ title: "Request Marked as Rejected" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-emerald-400" /> Access Management & Codes
            </h2>
            <p className="text-zinc-400 text-sm mt-0.5">
              Review and grant student course/unit requests, or generate instant bulk redemption codes.
            </p>
          </div>

          <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <TabsTrigger 
              value="requests" 
              className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold flex items-center gap-2 px-4 py-2"
            >
              <Inbox className="w-4 h-4" />
              <span>Student Requests</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-black text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="generate" 
              className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold flex items-center gap-2 px-4 py-2"
            >
              <Download className="w-4 h-4" />
              <span>Generate Share Codes</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: STUDENT REQUESTS QUEUE */}
        <TabsContent value="requests" className="mt-6 space-y-5 animate-in fade-in duration-200">
          {/* Filter and Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search by student, phone, ID, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-950 border-zinc-800 text-white rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white rounded-xl">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="all">All Requests ({rawRequests?.length || 0})</SelectItem>
                  <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                  <SelectItem value="granted">Granted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white rounded-xl">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectItem value="newest">Newest to Oldest</SelectItem>
                  <SelectItem value="oldest">Oldest to Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requests Content List */}
          {requestsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl bg-zinc-900 border border-zinc-800" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-3xl space-y-3">
              <Inbox className="mx-auto h-12 w-12 text-zinc-600" />
              <h4 className="text-base font-bold text-zinc-300">No Access Requests Found</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                When students request to buy full courses, specific units, or collections, their requests will appear here for instant 1-click granting.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {requests.map((req) => {
                const isPending = (req.status || 'pending') === 'pending';
                const isGranted = req.status === 'granted';
                const isRejected = req.status === 'rejected';

                let formattedDate = 'Recently';
                try {
                  const d = req.createdAt?.toDate ? req.createdAt.toDate() : (req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000) : null);
                  if (d) {
                    formattedDate = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  }
                } catch (e) {}

                return (
                  <div
                    key={req.id}
                    className={cn(
                      "p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                      isPending ? "bg-zinc-950 border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5" :
                      isGranted ? "bg-zinc-950/60 border-emerald-500/20" :
                      "bg-zinc-950/40 border-zinc-800/80 opacity-75"
                    )}
                  >
                    {/* Left Info Column */}
                    <div className="space-y-2 flex-grow">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-base text-white">{req.studentName || 'Anonymous Student'}</span>
                        
                        {req.studentBarcode && (
                          <Badge variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-300 font-mono text-[11px]">
                            ID: {req.studentBarcode}
                          </Badge>
                        )}

                        {req.requestType === 'unit' ? (
                          <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs flex items-center gap-1 font-bold px-2.5 py-0.5">
                            <Layers className="w-3.5 h-3.5" /> طلب فتح وحدة: {req.unitTitle || (req.unitIndex ? `الوحدة ${req.unitIndex}` : 'وحدة دراسية')}
                          </Badge>
                        ) : req.requestType === 'collection' ? (
                          <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs flex items-center gap-1 font-semibold">
                            <Library className="w-3 h-3" /> باقة مقررات (Collection)
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs flex items-center gap-1 font-semibold">
                            <BookOpen className="w-3 h-3" /> الكورس كاملاً (Full Course)
                          </Badge>
                        )}

                        {isPending && (
                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                            Pending Review
                          </Badge>
                        )}
                        {isGranted && (
                          <Badge className="bg-emerald-500 text-black text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Granted & Active
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="outline" className="text-rose-400 border-rose-500/30 text-[11px]">
                            Declined
                          </Badge>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="text-zinc-200 font-medium truncate">
                            {req.requestType === 'unit' 
                              ? `الوحدة: ${req.unitTitle || 'Unit'} — من كورس: (${req.courseTitle || 'الكورس'})`
                              : req.requestType === 'collection'
                              ? req.collectionTitle || 'Course Collection'
                              : req.courseTitle || 'Academic Course'
                            }
                          </span>
                        </div>

                        {req.studentPhone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <a href={`tel:${req.studentPhone}`} className="hover:text-emerald-400 font-mono text-zinc-300">
                              {req.studentPhone}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {(req.studentGrade || req.studentFaculty || req.studentUniversity) && (
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                          <GraduationCap className="w-3 h-3 text-zinc-600" />
                          <span>
                            {[req.studentGrade, req.studentFaculty, req.studentUniversity].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Actions Column */}
                    <div className="flex items-center flex-wrap gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                      {isPending ? (
                        <>
                          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-xl">
                            <span className="text-[10px] text-zinc-400 font-medium">مشاهدات (أقصى 3):</span>
                            <Select
                              value={String(Math.min(3, Math.max(1, requestViewLimits[req.id] ?? 3)))}
                              onValueChange={(val) => setRequestViewLimits(prev => ({ ...prev, [req.id]: Math.min(3, Math.max(1, Number(val))) }))}
                            >
                              <SelectTrigger className="h-7 w-[86px] bg-zinc-950 border-zinc-700 text-[11px] text-emerald-400 font-bold rounded-lg px-2">
                                <SelectValue placeholder="Views" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                                <SelectItem value="1">مشاهدة 1</SelectItem>
                                <SelectItem value="2">مشاهدتان (2)</SelectItem>
                                <SelectItem value="3">3 مشاهدات (الحد الأقصى)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectRequest(req)}
                            className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs rounded-xl h-9"
                          >
                            <XCircle className="w-4 h-4 mr-1 text-rose-500" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGrantAccess(req)}
                            disabled={grantingRequestId === req.id}
                            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl px-4 h-9 shadow-md shadow-emerald-500/20"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            {grantingRequestId === req.id ? 'Granting...' : 'Grant Access'}
                          </Button>
                        </>
                      ) : isGranted ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Active on Student Account</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGrantAccess(req)}
                          className="border-zinc-700 text-zinc-300 text-xs rounded-xl hover:bg-zinc-800"
                        >
                          Re-Grant Access
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CODE GENERATOR */}
        <TabsContent value="generate" className="mt-6 animate-in fade-in duration-200">
          <Card className="profile-content-card border-zinc-800 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-white">Generate Share Codes</CardTitle>
              <CardDescription className="text-zinc-400">
                Select a course or collection, specify the number of codes, and an Excel file will be downloaded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading || collectionsLoading ? (
                <Skeleton className="h-48 w-full bg-zinc-900" />
              ) : (
                <form onSubmit={handleSubmit(handleGenerateAndExport)} className="space-y-6 max-w-md mx-auto">
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                        <div>
                          <RadioGroupItem value="course" id="r-course" className="peer sr-only" />
                          <Label htmlFor="r-course" className={cn("radio-label cursor-pointer text-center py-2.5 border rounded-xl block transition-all", selectedType === 'course' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-400')}>
                            For a Course
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="collection" id="r-collection" className="peer sr-only" />
                          <Label htmlFor="r-collection" className={cn("radio-label cursor-pointer text-center py-2.5 border rounded-xl block transition-all", selectedType === 'collection' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-400')}>
                            For a Collection
                          </Label>
                        </div>
                      </RadioGroup>
                    )}
                  />

                  <div>
                    <Label htmlFor="targetId" className="text-white">Select Content</Label>
                    <Controller
                      name="targetId"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={(selectedType === 'course' ? lockedCourses.length === 0 : collections?.length === 0)}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white rounded-xl mt-1.5">
                            <SelectValue placeholder={`Select a ${selectedType}`} />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                            {selectedType === 'course' ?
                              lockedCourses.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>) :
                              collections?.map(collection => <SelectItem key={collection.id} value={collection.id}>{collection.title}</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.targetId && <p className="text-destructive text-sm mt-1">{errors.targetId.message}</p>}
                    {(selectedType === 'course' && lockedCourses.length === 0) && <p className="text-sm text-zinc-500 mt-2">You have no locked courses to generate codes for.</p>}
                    {(selectedType === 'collection' && collections?.length === 0) && <p className="text-sm text-zinc-500 mt-2">You have no collections to generate codes for.</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Code Generation Mode</Label>
                    <Controller
                      name="generationMode"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                          <div>
                            <RadioGroupItem value="auto" id="gm-auto" className="peer sr-only" />
                            <Label htmlFor="gm-auto" className={cn("radio-label cursor-pointer text-center py-2.5 border rounded-xl block transition-all", selectedGenerationMode === 'auto' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-400')}>
                              Auto-Generated
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="manual" id="gm-manual" className="peer sr-only" />
                            <Label htmlFor="gm-manual" className={cn("radio-label cursor-pointer text-center py-2.5 border rounded-xl block transition-all", selectedGenerationMode === 'manual' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-400')}>
                              Custom Code
                            </Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>

                  {selectedGenerationMode === 'manual' ? (
                    <div className="space-y-2 animate-in fade-in-50 duration-200">
                      <Label htmlFor="customCode" className="text-white">Custom Manual Code</Label>
                      <Input 
                        id="customCode" 
                        placeholder="e.g., GEOMETRY101" 
                        className="font-mono uppercase tracking-widest text-lg bg-zinc-950 border-zinc-800 text-white rounded-xl"
                        {...register('customCode')} 
                      />
                      {errors.customCode && <p className="text-destructive text-sm">{errors.customCode.message}</p>}
                      <p className="text-xs text-zinc-500">The system will verify this code is unique before saving.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in-50 duration-200">
                      <Label htmlFor="count" className="text-white">Number of Codes to Generate</Label>
                      <Input id="count" type="number" min="1" max="500" className="bg-zinc-950 border-zinc-800 text-white rounded-xl" {...register('count')} />
                      {errors.count && <p className="text-destructive text-sm">{errors.count.message}</p>}
                    </div>
                  )}

                  {isLimitReached ? (
                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                      <BadgeHelp className="h-4 w-4" />
                      <AlertTitle>Daily Limit Reached</AlertTitle>
                      <AlertDescription>
                        You have reached your daily limit of {usage?.limit || 300} codes. You can request more for today.
                        <Button onClick={handleRequestMore} disabled={hasRequestedExtra} className="w-full mt-4 bg-amber-500 text-black font-bold">
                          {hasRequestedExtra ? "Request Sent" : "Request 300 More"}
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} size="lg" className="w-full text-base h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-lg shadow-emerald-500/20">
                      {isSubmitting 
                        ? 'Generating...' 
                        : <><Download className="mr-2 h-5 w-5" /> Generate & Export</>
                      }
                    </Button>
                  )}
                  <p className="text-xs text-zinc-500 text-center">
                    Today&apos;s usage: {usage?.date === todayStr ? usage.count : 0} / {usage?.limit || 300} codes.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


    