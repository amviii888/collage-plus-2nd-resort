
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useAuth, useStudent, useDoc, useMemoFirebase } from '@/firebase';
import { 
  collection, 
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
import type { Course, Unit, CourseRequest } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KeyRound, Send, Layers, BookOpen, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UnlockCourseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  courseId: string;
  teacherId: string;
  targetUnitId?: string; // Optional pre-selected unit
}

export function UnlockCourseDialog({ isOpen, setIsOpen, courseId, teacherId, targetUnitId }: UnlockCourseDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'request' | 'code'>('request');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  
  // Redeem Code Form
  const [code, setCode] = useState('');

  // Request Form
  const [requestScope, setRequestScope] = useState<'full' | 'unit'>('full');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentBarcode, setStudentBarcode] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { student: profile } = useStudent(user?.uid);

  // Fetch course details to list units
  const courseDocRef = useMemoFirebase(() => {
    if (!firestore || !teacherId || !courseId) return null;
    return doc(firestore, 'teachers', teacherId, 'courses', courseId);
  }, [firestore, teacherId, courseId]);
  const { data: courseData } = useDoc<Course>(courseDocRef);

  const lockMode = courseData?.lockMode || 'both';

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

    if (targetUnitId) {
      setRequestScope('unit');
      setSelectedUnitId(targetUnitId);
    }
  }, [profile, targetUnitId, isOpen, user]);

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

    if (!code) {
        setError("Please enter a share code.");
        setIsSubmitting(false);
        return;
    }

    try {
        let currentUser = user;

        if (!currentUser) {
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
        }
        
        const courseRef = doc(firestore, 'teachers', teacherId, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) {
            throw new Error("Course data could not be found.");
        }
        const course = courseSnap.data() as Course;
        const viewLimit = course.viewLimit ?? 3;

        const shareCodesRef = collection(firestore, 'teachers', teacherId, 'share_codes');
        const q = query(shareCodesRef, where("code", "==", code.toUpperCase().trim()), where("courseId", "==", courseId), where("used", "==", false), limit(1));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setError("Invalid or already used share code for this course.");
            setIsSubmitting(false);
            return;
        }

        const batch = writeBatch(firestore);
        const shareCodeDoc = querySnapshot.docs[0];
        
        batch.update(shareCodeDoc.ref, { used: true, usedBy: currentUser.uid, usedAt: serverTimestamp() });

        const accessRef = doc(firestore, `students/${currentUser.uid}/courseAccess`, courseId);
        batch.set(accessRef, { 
            courseId: courseId, 
            teacherId: teacherId, 
            fullAccess: true,
            unlockedAt: serverTimestamp(),
            viewCount: 0,
            viewLimit: viewLimit,
            grantedVia: 'code',
        }, { merge: true });

        // Anti-exploit check: grant 70 XP once per course unlock
        const xpClaimedKey = `claimed_course_xp_${currentUser.uid}_${courseId}`;
        const hasClaimedLocal = localStorage.getItem(xpClaimedKey) === 'true';
        
        if (!hasClaimedLocal) {
            localStorage.setItem(xpClaimedKey, 'true');
            const studentRef = doc(firestore, 'students', currentUser.uid);
            batch.set(studentRef, {
                xp: increment(70),
                [`claimedCourseXp.${courseId}`]: true
            }, { merge: true });

            const curXp = parseInt(localStorage.getItem('student-xp-' + currentUser.uid) || '0', 10);
            localStorage.setItem('student-xp-' + currentUser.uid, (curXp + 70).toString());
        }
        
        await batch.commit();
        
        toast({ title: "🔓 Course Unlocked! (+70 XP)", description: "You earned 70 XP for unlocking this course!" });
        
        window.location.reload();

    } catch (e: any) {
        console.error("Unlock error: ", e);
        setError("An error occurred while unlocking the course.");
        toast({ variant: 'destructive', title: 'Error', description: e.message || "Could not unlock course." });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Handle Sending Course / Unit Request to Teacher
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
      const units = courseData?.units || [];
      const selectedUnit = requestScope === 'unit' 
        ? (units.find(u => u.id === selectedUnitId) || units[0])
        : null;

      const requestsCollection = collection(firestore, `teachers/${teacherId}/course_requests`);
      
      const effectiveStudentId = profile?.id || 
        (typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null) || 
        uid;

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
        teacherId: teacherId,
        requestType: requestScope === 'unit' ? 'unit' : 'course',
        courseId: courseId,
        courseTitle: courseData?.title || 'Academic Course',
        unitId: requestScope === 'unit' && selectedUnit ? selectedUnit.id : 'FULL_COURSE',
        unitTitle: requestScope === 'unit' && selectedUnit ? selectedUnit.title : 'Full Course',
        status: 'pending',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
      };

      if (requestScope === 'unit' && selectedUnit) {
        const uIdx = units.findIndex(u => u.id === selectedUnit.id);
        if (uIdx !== -1) newRequestData.unitIndex = uIdx + 1;
      }

      const addedReq = await addDoc(requestsCollection, newRequestData);
      const reqId = addedReq.id;

      // Also sync to access_requests subcollection
      try {
        const accessReqCol = collection(firestore, `teachers/${teacherId}/access_requests`);
        await setDoc(doc(accessReqCol, reqId), newRequestData);
      } catch (e) {}

      // Critical: Also sync to student's own subcollection so student profile immediately displays this pending request!
      try {
        const studentReqRef = doc(firestore, `students/${effectiveStudentId}/course_requests`, reqId);
        await setDoc(studentReqRef, { ...newRequestData, id: reqId });
        if (uid !== effectiveStudentId) {
          const authStudentReqRef = doc(firestore, `students/${uid}/course_requests`, reqId);
          await setDoc(authStudentReqRef, { ...newRequestData, id: reqId });
        }
      } catch (e) {}

      // Cache locally for instant UI update on student profile
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
        description: `Your request for ${requestScope === 'unit' ? `Unit: ${selectedUnit?.title || 'Selected Unit'}` : courseData?.title || 'this Course'} has been sent to your professor.`,
      });
    } catch (e: any) {
      console.error("Request submit error:", e);
      setError("Failed to submit request. Please try again.");
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const courseUnits = courseData?.units || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Unlock & Access Content
            </DialogTitle>
            {courseData?.price ? (
              <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-xl font-mono font-bold text-xs">
                {courseData.price} EGP
              </span>
            ) : null}
          </div>
          <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
            {lockMode === 'codes_only'
              ? 'Enter your single-use student share code to unlock this content.'
              : lockMode === 'requests_only'
              ? 'Send an activation request directly to your professor to unlock access.'
              : 'Send an instant request directly to your professor, or enter your share code.'}
          </DialogDescription>
        </DialogHeader>

        {isRequestSent ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in-50">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Request Sent to Professor!</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Your professor has received your request. Once approved, the content will immediately appear in your Unlocked Courses on your profile.
              </p>
            </div>
            <Button 
              onClick={() => { setIsOpen(false); setIsRequestSent(false); }}
              className="bg-emerald-600 hover:bg-emerald-700 !text-white font-bold px-6 rounded-xl shadow-md"
            >
              Done / إغلاق
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2">
            {lockMode === 'both' ? (
              <TabsList className="grid grid-cols-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-2xl">
                <TabsTrigger 
                  value="request" 
                  className="rounded-xl data-[state=active]:bg-emerald-600 dark:data-[state=active]:bg-emerald-500 data-[state=active]:!text-white dark:data-[state=active]:!text-zinc-950 font-bold flex items-center gap-1.5 text-xs py-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="code" 
                  className="rounded-xl data-[state=active]:bg-emerald-600 dark:data-[state=active]:bg-emerald-500 data-[state=active]:!text-white dark:data-[state=active]:!text-zinc-950 font-bold flex items-center gap-1.5 text-xs py-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Redeem Code</span>
                </TabsTrigger>
              </TabsList>
            ) : lockMode === 'requests_only' ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold">
                <Send className="w-4 h-4" />
                <span>Request Only Mode: Submit an access request directly to your professor</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 text-blue-800 dark:text-blue-400 text-xs font-semibold">
                <KeyRound className="w-4 h-4" />
                <span>Share Code Only Mode: Enter your access code below to unlock</span>
              </div>
            )}

            {/* TAB 1: SEND REQUEST */}
            <TabsContent value="request" className="space-y-4 pt-4 animate-in fade-in-50">
              <form onSubmit={handleSendRequest} className="space-y-4">
                {/* Scope Selection: Whole Course or Specific Unit */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">Choose What You Want to Unlock</Label>
                  <RadioGroup 
                    value={requestScope} 
                    onValueChange={(val: any) => setRequestScope(val)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div>
                      <RadioGroupItem value="full" id="req-full" className="peer sr-only" />
                      <Label 
                        htmlFor="req-full" 
                        className={cn(
                          "cursor-pointer p-3 border rounded-xl flex flex-col items-center justify-center gap-1 text-center transition-all",
                          requestScope === 'full' 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs" 
                            : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs">Whole Course</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-normal">All units & lessons</span>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="unit" id="req-unit" className="peer sr-only" />
                      <Label 
                        htmlFor="req-unit" 
                        className={cn(
                          "cursor-pointer p-3 border rounded-xl flex flex-col items-center justify-center gap-1 text-center transition-all",
                          requestScope === 'unit' 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs" 
                            : "border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <Layers className="w-4 h-4" />
                        <span className="text-xs">Specific Unit Only</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-normal">Single unit lessons</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Specific Unit Picker if Unit mode selected */}
                {requestScope === 'unit' && (
                  <div className="space-y-1.5 animate-in fade-in-50">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Select Unit to Unlock</Label>
                    <Select 
                      value={selectedUnitId || (courseUnits[0]?.id || '')} 
                      onValueChange={setSelectedUnitId}
                    >
                      <SelectTrigger className="bg-slate-50 dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl text-xs h-10">
                        <SelectValue placeholder="Choose a unit" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                        {courseUnits.map((u, i) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            Unit {i + 1}: {u.title} ({u.videos?.length || 0} lessons)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Student Contact Info Inputs - Strictly Fetched & Read-Only */}
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>بيانات الطالب المعتمدة (تم الجلب تلقائياً - للقراءة فقط)</span>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded-md font-bold">Read-Only</span>
                </div>

                {(!studentName || !studentPhone) ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-right space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">
                      يرجى تسجيل الدخول بحساب الطالب لجلب بياناتك الرسمية تلقائياً.
                    </p>
                    <div className="flex gap-2">
                      <Button asChild size="sm" className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 !text-white text-xs font-bold">
                        <a href="/login">تسجيل الدخول</a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-xl border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs">
                        <a href="/student-signup">حساب جديد</a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label htmlFor="req-name" className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                          <span>اسم الطالب</span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> موثق
                          </span>
                        </Label>
                        <Input
                          id="req-name"
                          value={studentName}
                          readOnly
                          disabled
                          className="bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs h-9 rounded-xl font-bold cursor-not-allowed select-none opacity-90"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="req-phone" className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                          <span>رقم الهاتف (الواتساب)</span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> موثق
                          </span>
                        </Label>
                        <Input
                          id="req-phone"
                          value={studentPhone}
                          readOnly
                          disabled
                          className="bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 text-xs h-9 rounded-xl font-mono font-bold cursor-not-allowed select-none opacity-90"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="req-barcode" className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                        <span>كود الطالب / الباركود</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> ثابت
                        </span>
                      </Label>
                      <Input
                        id="req-barcode"
                        value={studentBarcode || 'N/A'}
                        readOnly
                        disabled
                        className="bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-blue-700 dark:text-blue-400 text-xs h-9 rounded-xl font-mono font-bold cursor-not-allowed select-none opacity-90"
                      />
                    </div>
                  </>
                )}

                {error && <p className="text-xs font-medium text-rose-500">{error}</p>}

                <DialogFooter className="pt-2">
                  <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white text-xs">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 px-5"
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Access Request'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* TAB 2: REDEEM CODE */}
            <TabsContent value="code" className="space-y-4 pt-4 animate-in fade-in-50">
              <form onSubmit={handleRedeemCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs font-semibold text-slate-800 dark:text-zinc-300">{t('unlock.code_label')}</Label>
                  <Input
                    id="code"
                    name="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g., SHARE123 or CUSTOMCODE"
                    required
                    autoComplete="off"
                    className="font-mono tracking-widest uppercase bg-slate-50 dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                    Codes can be obtained directly from your instructor.
                  </p>
                </div>

                {error && <p className="text-xs font-medium text-rose-500">{error}</p>}

                <DialogFooter className="pt-2">
                  <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white text-xs">
                    {t('Cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-emerald-600 hover:bg-emerald-700 !text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 px-5"
                  >
                    {isSubmitting ? t('unlock.verifying_button') : t('unlock.submit_button')}
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

