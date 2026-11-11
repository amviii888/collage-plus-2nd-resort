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
  arrayUnion
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import type { Course, ShareCode } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { KeyRound, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface UnlockCourseDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  courseId: string;
  teacherId: string;
  targetUnitId?: string; // Optional pre-selected unit
}

export function UnlockCourseDialog({ isOpen, setIsOpen, courseId, teacherId }: UnlockCourseDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { student: profile } = useStudent(user?.uid);

  // Fetch course details
  const courseDocRef = useMemoFirebase(() => {
    if (!firestore || !teacherId || !courseId) return null;
    return doc(firestore, 'teachers', teacherId, 'courses', courseId);
  }, [firestore, teacherId, courseId]);
  const { data: courseData } = useDoc<Course>(courseDocRef);

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setError(null);
    }
  }, [isOpen]);

  // Handle Share Code Redemption
  const handleRedeemCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    if (!firestore || !auth) {
      setError("النظام غير جاهز، يرجى المحاولة بعد لحظات.");
      setIsSubmitting(false);
      return;
    }

    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode) {
      setError("يرجى إدخال كود الوصول.");
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
        throw new Error("لم يتم العثور على بيانات المحتوى.");
      }

      // Query Share Codes for this teacher
      const shareCodesRef = collection(firestore, 'teachers', teacherId, 'share_codes');
      const q = query(
        shareCodesRef, 
        where("code", "==", cleanCode), 
        where("used", "==", false), 
        limit(1)
      );
      
      let querySnapshot = await getDocs(q);

      // If empty, fallback to root share_codes collection
      if (querySnapshot.empty) {
        const rootShareCodesRef = collection(firestore, 'share_codes');
        const qRoot = query(
          rootShareCodesRef,
          where("code", "==", cleanCode),
          where("used", "==", false),
          limit(1)
        );
        const rootSnap = await getDocs(qRoot);
        if (!rootSnap.empty) {
          querySnapshot = rootSnap;
        }
      }

      if (querySnapshot.empty) {
        setError("كود الوصول غير صحيح أو تم استخدامه مسبقاً.");
        setIsSubmitting(false);
        return;
      }

      const shareCodeDoc = querySnapshot.docs[0];
      const codeData = shareCodeDoc.data() as ShareCode;

      // Verify the code matches either this course, unit, or a collection
      const targetCourseId = codeData.courseId || courseId;
      const viewLimit = codeData.viewLimit ?? courseData?.viewLimit ?? 3;

      const realStudentBarcode = profile?.barcodeId || 
        (typeof window !== 'undefined' ? (localStorage.getItem('student_barcode') || localStorage.getItem('studentBarcode')) : null) || 
        currentUser.uid;
      const studentName = profile?.name || currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Student');

      const batch = writeBatch(firestore);
      
      // Mark code as used with student's real barcode ID, UID, and name
      batch.update(shareCodeDoc.ref, { 
        used: true, 
        usedBy: realStudentBarcode, 
        usedByUid: currentUser.uid,
        usedByName: studentName,
        usedAt: serverTimestamp() 
      });

      const accessRef = doc(firestore, `students/${currentUser.uid}/courseAccess`, targetCourseId);

      if (codeData.type === 'unit' && codeData.unitId) {
        // Specific unit redemption
        batch.set(accessRef, { 
          courseId: targetCourseId, 
          teacherId: teacherId, 
          unlockedUnitIds: arrayUnion(codeData.unitId),
          unlockedAt: serverTimestamp(),
          viewCount: 0,
          viewLimit: viewLimit,
          grantedVia: 'code',
        }, { merge: true });
      } else {
        // Full course or collection redemption
        batch.set(accessRef, { 
          courseId: targetCourseId, 
          teacherId: teacherId, 
          fullAccess: true,
          unlockedAt: serverTimestamp(),
          viewCount: 0,
          viewLimit: viewLimit,
          grantedVia: 'code',
        }, { merge: true });
      }

      // Grant 70 XP once per course unlock
      const xpClaimedKey = `claimed_course_xp_${currentUser.uid}_${targetCourseId}`;
      const hasClaimedLocal = localStorage.getItem(xpClaimedKey) === 'true';
      
      if (!hasClaimedLocal) {
        localStorage.setItem(xpClaimedKey, 'true');
        const studentRef = doc(firestore, 'students', currentUser.uid);
        batch.set(studentRef, {
          xp: increment(70),
          [`claimedCourseXp.${targetCourseId}`]: true
        }, { merge: true });

        const curXp = parseInt(localStorage.getItem('student-xp-' + currentUser.uid) || '0', 10);
        localStorage.setItem('student-xp-' + currentUser.uid, (curXp + 70).toString());
      }
      
      await batch.commit();

      // Mirror locally for instant update
      try {
        const cacheKey = `student_course_access_${targetCourseId}`;
        const existingRaw = localStorage.getItem(cacheKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const prevUnits = Array.isArray(existing.unlockedUnitIds) ? existing.unlockedUnitIds : [];
        const updatedUnits = (codeData.type === 'unit' && codeData.unitId)
          ? Array.from(new Set([...prevUnits, codeData.unitId]))
          : prevUnits;

        localStorage.setItem(cacheKey, JSON.stringify({
          ...existing,
          courseId: targetCourseId,
          teacherId,
          fullAccess: codeData.type !== 'unit',
          unlockedUnitIds: updatedUnits,
          viewCount: 0,
          viewLimit,
          unlockedAt: new Date().toISOString()
        }));
        window.dispatchEvent(new Event('course_access_updated'));
      } catch (e) {}

      toast({ 
        title: "🔓 تم تفعيل الكود بنجاح! (+70 XP)", 
        description: codeData.type === 'unit' 
          ? `تم فتح الوحدة (${codeData.unitTitle || 'الوحدة المختارة'}) بـ ${viewLimit} مشاهدات متاحة.`
          : `تم فتح الكورس كاملاً بـ ${viewLimit} مشاهدات متاحة.`
      });
      
      setIsOpen(false);
      window.location.reload();

    } catch (e: any) {
      console.error("Unlock error: ", e);
      setError("حدث خطأ أثناء تفعيل كود الوصول.");
      toast({ variant: 'destructive', title: 'خطأ', description: e.message || "تعذر تفعيل الكود." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> إدخال كود الوصول (Redeem Code)
            </DialogTitle>
            {courseData?.price ? (
              <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-xl font-mono font-bold text-xs">
                {courseData.price} EGP
              </span>
            ) : null}
          </div>
          <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs mt-1">
            أدخل كود الوصول الخاص بك الذي حصلت عليه من الأستاذ لتفعيل المحتوى فوراً.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRedeemCode} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs font-semibold text-slate-800 dark:text-zinc-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-500" />
              <span>كود الوصول (Share Code)</span>
            </Label>
            <Input
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: SHARE123 أو CODE2026"
              required
              autoComplete="off"
              className="font-mono tracking-widest uppercase bg-slate-50 dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl h-11 text-base text-center"
            />
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>كل كود يتيح لك 3 مشاهدات للمحتوى المختار وفقاً لسياسة حماية المحاضرات.</span>
            </div>
          </div>

          {error && <p className="text-xs font-medium text-rose-500 text-center">{error}</p>}

          <DialogFooter className="pt-2 flex items-center gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white text-xs rounded-xl">
              إلغاء / Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="bg-emerald-600 hover:bg-emerald-700 !text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 px-6 h-10 flex-1"
            >
              {isSubmitting ? 'جاري التحقق والتفعيل...' : 'تفعيل الكود وفتح المحتوى'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
