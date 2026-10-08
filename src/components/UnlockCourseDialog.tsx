
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
    if (profile) {
      if (profile.name) setStudentName(profile.name);
      if (profile.phoneNumber) setStudentPhone(profile.phoneNumber);
      if (profile.barcodeId) setStudentBarcode(profile.barcodeId);
    } else if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('student_phone') || localStorage.getItem('last_entered_phone') || '';
      const savedName = localStorage.getItem('student_name') || '';
      const savedBarcode = localStorage.getItem('student_barcode') || localStorage.getItem('viewingStudentId') || '';
      if (savedPhone) setStudentPhone(savedPhone);
      if (savedName) setStudentName(savedName);
      if (savedBarcode) setStudentBarcode(savedBarcode);
    }

    if (targetUnitId) {
      setRequestScope('unit');
      setSelectedUnitId(targetUnitId);
    }
  }, [profile, targetUnitId, isOpen]);

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
      
      const newRequestData: any = {
        studentId: uid,
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

      await addDoc(requestsCollection, newRequestData);
      // Also sync to access_requests subcollection
      try {
        const accessReqCol = collection(firestore, `teachers/${teacherId}/access_requests`);
        await addDoc(accessReqCol, newRequestData);
      } catch (e) {}

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
      <DialogContent className="max-w-lg bg-zinc-950 border border-zinc-800 text-white p-6 rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Unlock & Access Content
            </DialogTitle>
            {courseData?.price ? (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl font-mono font-bold text-xs">
                {courseData.price} EGP
              </span>
            ) : null}
          </div>
          <DialogDescription className="text-zinc-400 text-xs">
            {lockMode === 'codes_only'
              ? 'Enter your single-use student share code to unlock this content.'
              : lockMode === 'requests_only'
              ? 'Send an activation request directly to your professor to unlock access.'
              : 'Send an instant request directly to your professor, or enter your share code.'}
          </DialogDescription>
        </DialogHeader>

        {isRequestSent ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in-50">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg text-white">Request Sent to Professor!</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Your professor has received your request. Once approved, the content will immediately appear in your Unlocked Courses on your profile.
              </p>
            </div>
            <Button 
              onClick={() => { setIsOpen(false); setIsRequestSent(false); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 rounded-xl"
            >
              Done / إغلاق
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2">
            {lockMode === 'both' ? (
              <TabsList className="grid grid-cols-2 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
                <TabsTrigger 
                  value="request" 
                  className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold flex items-center gap-1.5 text-xs py-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="code" 
                  className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold flex items-center gap-1.5 text-xs py-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Redeem Code</span>
                </TabsTrigger>
              </TabsList>
            ) : lockMode === 'requests_only' ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Send className="w-4 h-4" />
                <span>Request Only Mode: Submit an access request directly to your professor</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                <KeyRound className="w-4 h-4" />
                <span>Share Code Only Mode: Enter your access code below to unlock</span>
              </div>
            )}

            {/* TAB 1: SEND REQUEST */}
            <TabsContent value="request" className="space-y-4 pt-4 animate-in fade-in-50">
              <form onSubmit={handleSendRequest} className="space-y-4">
                {/* Scope Selection: Whole Course or Specific Unit */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-300">Choose What You Want to Unlock</Label>
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
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold" 
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs">Whole Course</span>
                        <span className="text-[10px] text-zinc-500 font-normal">All units & lessons</span>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="unit" id="req-unit" className="peer sr-only" />
                      <Label 
                        htmlFor="req-unit" 
                        className={cn(
                          "cursor-pointer p-3 border rounded-xl flex flex-col items-center justify-center gap-1 text-center transition-all",
                          requestScope === 'unit' 
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold" 
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        <Layers className="w-4 h-4" />
                        <span className="text-xs">Specific Unit Only</span>
                        <span className="text-[10px] text-zinc-500 font-normal">Single unit lessons</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Specific Unit Picker if Unit mode selected */}
                {requestScope === 'unit' && (
                  <div className="space-y-1.5 animate-in fade-in-50">
                    <Label className="text-xs text-zinc-300">Select Unit to Unlock</Label>
                    <Select 
                      value={selectedUnitId || (courseUnits[0]?.id || '')} 
                      onValueChange={setSelectedUnitId}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl text-xs h-10">
                        <SelectValue placeholder="Choose a unit" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                        {courseUnits.map((u, i) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            Unit {i + 1}: {u.title} ({u.videos?.length || 0} lessons)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Student Contact Info Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="req-name" className="text-xs text-zinc-300">Your Full Name</Label>
                    <Input
                      id="req-name"
                      placeholder="e.g., Ahmed Mohamed"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-800 text-white text-xs h-9 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="req-phone" className="text-xs text-zinc-300">Phone Number (WhatsApp)</Label>
                    <Input
                      id="req-phone"
                      placeholder="010XXXXXXXX"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-800 text-white text-xs h-9 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="req-barcode" className="text-xs text-zinc-300">Student ID / Barcode (Optional)</Label>
                  <Input
                    id="req-barcode"
                    placeholder="e.g., ST-8829"
                    value={studentBarcode}
                    onChange={(e) => setStudentBarcode(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-white text-xs h-9 rounded-xl font-mono"
                  />
                </div>

                {error && <p className="text-xs font-medium text-rose-400">{error}</p>}

                <DialogFooter className="pt-2">
                  <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white text-xs">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 px-5"
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
                  <Label htmlFor="code" className="text-xs text-zinc-300">{t('unlock.code_label')}</Label>
                  <Input
                    id="code"
                    name="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g., SHARE123 or CUSTOMCODE"
                    required
                    autoComplete="off"
                    className="font-mono tracking-widest uppercase bg-zinc-900 border-zinc-800 text-white rounded-xl"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Codes can be obtained directly from your instructor.
                  </p>
                </div>

                {error && <p className="text-xs font-medium text-rose-400">{error}</p>}

                <DialogFooter className="pt-2">
                  <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white text-xs">
                    {t('Cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 px-5"
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

