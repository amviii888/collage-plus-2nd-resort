'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useAuth, useStudent } from '@/firebase';
import { 
  collection as firestoreCollection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc, 
  limit, 
  serverTimestamp, 
  getDoc, 
  increment,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import type { Course, CourseCollection, Teacher, CourseRequest, CollectionCustomItem } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KeyRound, Send, Layers, BookOpen, CheckCircle2, ShieldCheck, Sparkles, Library, Film, FileText, Phone } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface UnlockCollectionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  collectionData: CourseCollection;
  teacher: Teacher;
  courses?: Course[];
  onUnlocked?: () => void;
}

export function UnlockCollectionDialog({ 
  isOpen, 
  setIsOpen, 
  collectionData, 
  teacher,
  courses = [],
  onUnlocked
}: UnlockCollectionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'request' | 'code'>('request');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  
  // Redeem Code Form
  const [code, setCode] = useState('');

  // Request Form
  const [requestScope, setRequestScope] = useState<'full' | 'item'>('full');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentBarcode, setStudentBarcode] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { student: profile } = useStudent(user?.uid);

  const lockMode = collectionData?.lockMode || 'both';

  useEffect(() => {
    if (lockMode === 'codes_only') {
      setActiveTab('code');
    } else if (lockMode === 'requests_only') {
      setActiveTab('request');
    }
  }, [lockMode]);

  useEffect(() => {
    let name = '';
    let phone = '';
    let barcode = '';

    if (profile) {
      if (profile.name) name = profile.name;
      if (profile.phoneNumber || (profile as any).phone) phone = profile.phoneNumber || (profile as any).phone;
      if (profile.barcodeId || (profile as any).barcode) barcode = profile.barcodeId || (profile as any).barcode;
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mol5saty_active_student_profile');
        if (cached) {
          const p = JSON.parse(cached);
          if (!name && p.name) name = p.name;
          if (!phone && (p.phoneNumber || p.phone || p.phone_number)) phone = p.phoneNumber || p.phone || p.phone_number;
          if (!barcode && (p.barcodeId || p.barcode || p.code)) barcode = p.barcodeId || p.barcode || p.code;
        }
      } catch (e) {}

      if (!phone) {
        phone = localStorage.getItem('student_phone') || localStorage.getItem('last_entered_phone') || '';
      }
      if (!name) {
        name = localStorage.getItem('student_name') || '';
      }
      if (!barcode) {
        barcode = localStorage.getItem('student_barcode') || localStorage.getItem('studentBarcode') || localStorage.getItem('studentCode') || '';
      }
    }

    if (!name && user?.displayName) {
      name = user.displayName;
    }

    setStudentName(name);
    setStudentPhone(phone);
    setStudentBarcode(barcode);
  }, [profile, isOpen, user]);

  // Handle Share Code Redemption
  const handleRedeemCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    if (!firestore || !auth) {
      setError("System not ready. Please try again in a moment.");
      setIsSubmitting(false);
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) {
      setError("Please enter a valid share code.");
      setIsSubmitting(false);
      return;
    }

    try {
      let currentUser = user;
      if (!currentUser) {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      }

      const effectiveStudentId = profile?.id || 
        (typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null) || 
        currentUser.uid;

      // Query share codes collection for this teacher
      const shareCodesRef = firestoreCollection(firestore, 'teachers', teacher.id, 'share_codes');
      
      // First try matching code specifically tagged for this collection
      const qSpecific = query(
        shareCodesRef, 
        where("code", "==", cleanCode), 
        where("collectionId", "==", collectionData.id), 
        where("used", "==", false), 
        limit(1)
      );
      let querySnapshot = await getDocs(qSpecific);

      // If not found with collectionId, check if it's a general code with this exact string
      if (querySnapshot.empty) {
        const qGeneral = query(
          shareCodesRef, 
          where("code", "==", cleanCode), 
          where("used", "==", false), 
          limit(1)
        );
        const generalSnap = await getDocs(qGeneral);
        if (!generalSnap.empty) {
          const docData = generalSnap.docs[0].data();
          // Allow if explicitly for this collection, or if untargeted/universal
          if (!docData.courseId && (!docData.collectionId || docData.collectionId === collectionData.id)) {
            querySnapshot = generalSnap;
          }
        }
      }

      if (querySnapshot.empty) {
        setError("Invalid, expired, or already used share code for this collection.");
        setIsSubmitting(false);
        return;
      }

      const batch = writeBatch(firestore);
      const shareCodeDoc = querySnapshot.docs[0];
      
      batch.update(shareCodeDoc.ref, { 
        used: true, 
        usedBy: effectiveStudentId, 
        usedByUid: currentUser.uid,
        usedAt: serverTimestamp() 
      });

      // 1. Grant direct collection access in student subcollection
      const collectionAccessRef = doc(firestore, `students/${effectiveStudentId}/courseCollectionAccess`, collectionData.id);
      batch.set(collectionAccessRef, {
        collectionId: collectionData.id,
        teacherId: teacher.id,
        fullAccess: true,
        unlockedAt: serverTimestamp(),
        grantedVia: 'code',
      }, { merge: true });

      // If auth UID is different from student ID, also mirror to auth UID
      if (currentUser.uid !== effectiveStudentId) {
        const altCollectionAccessRef = doc(firestore, `students/${currentUser.uid}/courseCollectionAccess`, collectionData.id);
        batch.set(altCollectionAccessRef, {
          collectionId: collectionData.id,
          teacherId: teacher.id,
          fullAccess: true,
          unlockedAt: serverTimestamp(),
          grantedVia: 'code',
        }, { merge: true });
      }

      // 2. Grant access to all courses in the collection
      const allCourseIds = Array.from(new Set([
        ...(collectionData.courseIds || []),
        ...((collectionData.customItems || []).map(i => i.courseId).filter(Boolean) as string[])
      ]));

      for (const cId of allCourseIds) {
        const accessRef = doc(firestore, `students/${effectiveStudentId}/courseAccess`, cId);
        const payload = {
          courseId: cId,
          teacherId: teacher.id,
          fullAccess: true,
          unlockedAt: serverTimestamp(),
          viewCount: 0,
          viewLimit: 3,
          grantedVia: 'collection_code',
        };
        batch.set(accessRef, payload, { merge: true });

        if (currentUser.uid !== effectiveStudentId) {
          const altCourseRef = doc(firestore, `students/${currentUser.uid}/courseAccess`, cId);
          batch.set(altCourseRef, payload, { merge: true });
        }
      }

      // 3. Anti-exploit check: grant 70 XP once per collection unlock
      const xpClaimedKey = `claimed_collection_xp_${effectiveStudentId}_${collectionData.id}`;
      const hasClaimedLocal = typeof window !== 'undefined' ? localStorage.getItem(xpClaimedKey) === 'true' : false;
      
      if (!hasClaimedLocal) {
        if (typeof window !== 'undefined') localStorage.setItem(xpClaimedKey, 'true');
        const studentRef = doc(firestore, 'students', effectiveStudentId);
        batch.set(studentRef, {
          xp: increment(70),
          [`claimedCollectionXp.${collectionData.id}`]: true
        }, { merge: true });

        if (typeof window !== 'undefined') {
          const curXp = parseInt(localStorage.getItem('student-xp-' + effectiveStudentId) || '0', 10);
          localStorage.setItem('student-xp-' + effectiveStudentId, (curXp + 70).toString());
        }
      }

      await batch.commit();

      // Mirror to local cache for instant reactive updates without network lag
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`student_collection_access_${collectionData.id}`, JSON.stringify({
            collectionId: collectionData.id,
            teacherId: teacher.id,
            fullAccess: true,
            unlockedAt: new Date().toISOString()
          }));

          for (const cId of allCourseIds) {
            localStorage.setItem(`student_course_access_${cId}`, JSON.stringify({
              courseId: cId,
              teacherId: teacher.id,
              fullAccess: true,
              viewLimit: 3,
              viewCount: 0,
              unlockedAt: new Date().toISOString()
            }));
          }

          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('course_access_updated'));
        } catch (e) {}
      }

      toast({ 
        title: "🔓 Collection Unlocked! (+70 XP)", 
        description: `All courses and materials in "${collectionData.title}" are now fully accessible.` 
      });

      if (onUnlocked) {
        onUnlocked();
      }
      setIsOpen(false);
      window.location.reload();

    } catch (e: any) {
      console.error("Collection unlock error:", e);
      setError("An error occurred while unlocking the collection.");
      toast({ variant: 'destructive', title: 'Error', description: e.message || "Could not unlock collection." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sending Collection Access Request to Teacher
  const handleSendRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!studentName.trim() || !studentPhone.trim()) {
      setError("Please provide your name and phone number so your professor can verify your request.");
      setIsSubmitting(false);
      return;
    }

    if (!firestore || !auth) {
      setError("System not ready. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      let currentUser = user;
      if (!currentUser) {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      }

      const uid = currentUser.uid;
      const effectiveStudentId = profile?.id || 
        (typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null) || 
        uid;

      // Resolve selected item if specific scope
      let targetedItem: CollectionCustomItem | null = null;
      let targetedCourse: Course | null = null;

      if (requestScope === 'item' && selectedItemId) {
        targetedItem = collectionData.customItems?.find(i => i.id === selectedItemId) || null;
        if (!targetedItem) {
          targetedCourse = courses.find(c => c.id === selectedItemId) || null;
        }
      }

      const requestsCollection = firestoreCollection(firestore, `teachers/${teacher.id}/course_requests`);

      const newRequestData: any = {
        studentId: effectiveStudentId,
        studentAuthUid: uid,
        name: studentName.trim(),
        studentName: studentName.trim(),
        phoneNumber: studentPhone.trim(),
        studentPhone: studentPhone.trim(),
        studentBarcode: studentBarcode.trim() || profile?.barcodeId || '',
        schoolName: (profile as any)?.schoolName || profile?.university || 'University',
        studentUniversity: profile?.university || '',
        studentFaculty: profile?.facultyLabel || profile?.facultyCategory || '',
        grade: profile?.grade || profile?.academicYear || '',
        studentGrade: profile?.grade || profile?.academicYear || '',
        teacherId: teacher.id,
        
        // Scope identifiers
        requestType: 'collection',
        collectionId: collectionData.id,
        collectionTitle: collectionData.title,
        status: 'pending',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
      };

      if (requestScope === 'item') {
        if (targetedItem) {
          newRequestData.subItemId = targetedItem.id;
          newRequestData.subItemType = targetedItem.type;
          newRequestData.note = `Requested item inside collection: ${targetedItem.type === 'lesson' ? targetedItem.videoTitle : targetedItem.type === 'unit' ? targetedItem.unitTitle : targetedItem.fileTitle}`;
          if (targetedItem.courseId) newRequestData.courseId = targetedItem.courseId;
          if (targetedItem.courseTitle) newRequestData.courseTitle = targetedItem.courseTitle;
          if (targetedItem.unitId) newRequestData.unitId = targetedItem.unitId;
          if (targetedItem.unitTitle) newRequestData.unitTitle = targetedItem.unitTitle;
        } else if (targetedCourse) {
          newRequestData.courseId = targetedCourse.id;
          newRequestData.courseTitle = targetedCourse.title;
          newRequestData.note = `Requested single course from collection: ${targetedCourse.title}`;
        }
      } else {
        newRequestData.note = `Full Collection Access Request for "${collectionData.title}"`;
      }

      const addedReq = await addDoc(requestsCollection, newRequestData);
      const reqId = addedReq.id;

      // 1. Also sync to access_requests subcollection for backup
      try {
        const accessReqCol = firestoreCollection(firestore, `teachers/${teacher.id}/access_requests`);
        await setDoc(doc(accessReqCol, reqId), newRequestData);
      } catch (e) {}

      // 2. Critical: Also sync to student's own subcollection so student profile immediately displays this pending request!
      try {
        const studentReqRef = doc(firestore, `students/${effectiveStudentId}/course_requests`, reqId);
        await setDoc(studentReqRef, { ...newRequestData, id: reqId });
        if (uid !== effectiveStudentId) {
          const authStudentReqRef = doc(firestore, `students/${uid}/course_requests`, reqId);
          await setDoc(authStudentReqRef, { ...newRequestData, id: reqId });
        }
      } catch (e) {}

      // 3. Cache locally for instant UI update on student profile
      if (typeof window !== 'undefined') {
        try {
          const localReqsKey = `student_local_course_requests_${effectiveStudentId}`;
          const existing = JSON.parse(localStorage.getItem(localReqsKey) || '[]');
          const item = {
            ...newRequestData,
            id: reqId,
            createdAt: new Date().toISOString()
          };
          localStorage.setItem(localReqsKey, JSON.stringify([item, ...existing.filter((x: any) => x.id !== reqId)]));
        } catch (e) {}
      }

      setIsRequestSent(true);
      toast({
        title: "📬 Request Submitted Successfully!",
        description: `Your access request for "${collectionData.title}" has been sent to your professor.`,
      });
    } catch (e: any) {
      console.error("Request submit error:", e);
      setError("Failed to submit request. Please try again.");
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const customItems = collectionData?.customItems || [];
  const hasSpecificItems = courses.length > 0 || customItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Unlock & Access Collection
            </DialogTitle>
            {collectionData?.price ? (
              <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-xl font-mono font-bold text-xs">
                {collectionData.price} EGP
              </span>
            ) : null}
          </div>
          <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
            {collectionData?.title} — {courses.length} Courses {customItems.length > 0 ? `+ ${customItems.length} Handpicked Resources` : ''}
          </DialogDescription>
        </DialogHeader>

        {isRequestSent ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Request Dispatched!</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Your professor has received your request for <span className="font-semibold text-slate-800 dark:text-zinc-200">{collectionData?.title}</span>. Access will be unlocked automatically as soon as it is approved.
              </p>
            </div>

            {teacher?.phoneNumber && (
              <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs space-y-1 max-w-xs mx-auto">
                <span className="text-slate-400 dark:text-zinc-500 block text-[11px]">Direct Professor Contact:</span>
                <a href={`tel:${teacher.phoneNumber}`} className="font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center justify-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{teacher.phoneNumber}</span>
                </a>
              </div>
            )}

            <Button 
              onClick={() => { setIsOpen(false); setIsRequestSent(false); }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-6"
            >
              Done
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2">
            {lockMode === 'both' && (
              <TabsList className="grid grid-cols-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-2xl mb-4">
                <TabsTrigger 
                  value="request" 
                  className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-xs font-bold flex items-center gap-1.5 py-2"
                >
                  <Send className="w-3.5 h-3.5" /> Request Access
                </TabsTrigger>
                <TabsTrigger 
                  value="code" 
                  className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black text-xs font-bold flex items-center gap-1.5 py-2"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Redeem Code
                </TabsTrigger>
              </TabsList>
            )}

            {/* TAB 1: REQUEST ACCESS */}
            <TabsContent value="request" className="space-y-4">
              <form onSubmit={handleSendRequest} className="space-y-4">
                {/* Scope Selection */}
                {hasSpecificItems && (
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Choose Request Scope</Label>
                    <RadioGroup 
                      value={requestScope} 
                      onValueChange={(val: any) => setRequestScope(val)}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
                    >
                      <div className={cn(
                        "flex items-center space-x-2 border rounded-xl p-2.5 cursor-pointer transition-all",
                        requestScope === 'full' 
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-300" 
                          : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                      )}>
                        <RadioGroupItem value="full" id="scope-full" />
                        <Label htmlFor="scope-full" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                          <Library className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Full Collection Bundle</span>
                        </Label>
                      </div>

                      <div className={cn(
                        "flex items-center space-x-2 border rounded-xl p-2.5 cursor-pointer transition-all",
                        requestScope === 'item' 
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-300" 
                          : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                      )}>
                        <RadioGroupItem value="item" id="scope-item" />
                        <Label htmlFor="scope-item" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Specific Item / Course</span>
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Specific Item dropdown if item scope chosen */}
                    {requestScope === 'item' && (
                      <div className="pt-2 animate-in fade-in-50 duration-150">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1 block">
                          Select Specific Course, Unit, or Resource
                        </Label>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                          <SelectTrigger className="h-9 text-xs bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 rounded-xl">
                            <SelectValue placeholder="Choose an item..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 max-h-56">
                            {courses.map(course => (
                              <SelectItem key={course.id} value={course.id} className="text-xs">
                                📚 Course: {course.title}
                              </SelectItem>
                            ))}
                            {customItems.map(item => (
                              <SelectItem key={item.id} value={item.id} className="text-xs">
                                {item.type === 'lesson' ? `🎬 Lesson: ${item.videoTitle}` :
                                 item.type === 'unit' ? `📑 Unit: ${item.unitTitle}` :
                                 `📄 File: ${item.fileTitle}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Verification Info */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="req-name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Full Student Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="req-name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g., Mohamed Ahmed"
                      required
                      className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl text-xs h-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="req-phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Phone / WhatsApp <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="req-phone"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        placeholder="010XXXXXXXX"
                        required
                        className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="req-barcode" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Student ID / Barcode
                      </Label>
                      <Input
                        id="req-barcode"
                        value={studentBarcode}
                        onChange={(e) => setStudentBarcode(e.target.value)}
                        placeholder="Optional Barcode or Center ID"
                        className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

                <DialogFooter className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 !text-white font-bold text-xs h-10 rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting Request...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Send Access Request to Professor
                      </span>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB 2: REDEEM SHARE CODE */}
            <TabsContent value="code" className="space-y-4">
              <form onSubmit={handleRedeemCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code-input" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Collection Share Code
                  </Label>
                  <Input
                    id="code-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. COL-8924 OR UNIQUE-CODE"
                    required
                    autoComplete="off"
                    className="font-mono text-center tracking-widest text-base uppercase font-bold bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl h-11"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500 text-center">
                    Share codes are generated and provided directly by your course instructor.
                  </p>
                </div>

                {error && <p className="text-xs text-rose-500 font-medium text-center">{error}</p>}

                <DialogFooter className="pt-2 sm:justify-between items-center gap-2">
                  {teacher?.phoneNumber ? (
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Inquiries: {teacher.phoneNumber}</span>
                    </div>
                  ) : <div />}

                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? 'Verifying...' : 'Unlock Collection'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
