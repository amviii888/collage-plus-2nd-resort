'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { BookOpen, ShoppingBag, ShieldCheck, CheckCircle2, Clock, Lock, UserCheck } from 'lucide-react';
import type { LibraryBook } from '@/lib/library-types';
import Link from 'next/link';

interface RequestBookDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  book: LibraryBook | null;
  onSuccess?: () => void;
}

export function RequestBookDialog({
  isOpen,
  setIsOpen,
  book,
  onSuccess
}: RequestBookDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentBarcode, setStudentBarcode] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Auto-fetch verified student information from local storage & Firestore
  useEffect(() => {
    if (!isOpen) return;

    const loadStudentData = async () => {
      let name = '';
      let phone = '';
      let barcode = '';

      try {
        const cachedProfile = localStorage.getItem('mol5saty_active_student_profile');
        if (cachedProfile) {
          const p = JSON.parse(cachedProfile);
          if (p.name) name = p.name;
          if (p.phoneNumber || p.phone || p.phone_number) phone = p.phoneNumber || p.phone || p.phone_number;
          if (p.barcodeId || p.barcode || p.code) barcode = p.barcodeId || p.barcode || p.code;
        }

        if (!phone) {
          phone = localStorage.getItem('student_phone') || localStorage.getItem('last_entered_phone') || '';
        }
        if (!barcode) {
          barcode = localStorage.getItem('studentBarcode') || localStorage.getItem('student_barcode') || localStorage.getItem('studentCode') || '';
        }
        if (!name && user?.displayName) {
          name = user.displayName;
        }

        const effectiveStudentId = localStorage.getItem('viewingStudentId') || user?.uid;
        if (effectiveStudentId && (!phone || !name || !barcode) && firestore) {
          try {
            const snap = await getDoc(doc(firestore, 'students', effectiveStudentId));
            if (snap.exists()) {
              const data = snap.data();
              if (!name && data.name) name = data.name;
              if (!phone && (data.phoneNumber || data.phone)) phone = data.phoneNumber || data.phone;
              if (!barcode && (data.barcodeId || data.barcode)) barcode = data.barcodeId || data.barcode;
            }
          } catch (e) {}
        }
      } catch (e) {
        // Ignore
      }

      setStudentName(name);
      setStudentPhone(phone);
      setStudentBarcode(barcode);
      setIsDataLoaded(true);
    };

    loadStudentData();
  }, [isOpen, user, firestore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!book) return;

    if (!studentName.trim() || !studentPhone.trim()) {
      toast({
        variant: 'destructive',
        title: 'يرجى تسجيل الدخول بحساب الطالب',
        description: 'يجب أن تكون مسجلاً ولديك رقم هاتف معتمد في حسابك لإرسال طلب الكتاب.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const effectiveStudentId = 
        (typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null) ||
        user?.uid ||
        `student_${Date.now()}`;

      const requestData = {
        bookId: book.id,
        bookTitle: book.title,
        bookPrice: book.price || 0,
        studentId: effectiveStudentId,
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim(),
        studentBarcode: studentBarcode.trim() || 'N/A',
        note: note.trim() || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      if (firestore) {
        await addDoc(collection(firestore, 'library_requests'), requestData);
      }

      // Cache request in localStorage for instant UI feedback
      try {
        const cacheKey = `student_pending_book_requests_${effectiveStudentId}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const updated = [{ ...requestData, id: `local_${Date.now()}` }, ...existing];
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch (err) {}

      toast({
        title: '🎉 تم إرسال طلب الكتاب بنجاح',
        description: `تم إرسال طلب (${book.title}) إلى أمين المكتبة للمراجعة والموافقة.`,
      });

      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error submitting book request:', error);
      toast({
        variant: 'destructive',
        title: 'فشل إرسال الطلب',
        description: error.message || 'حدث خطأ أثناء إرسال طلب الكتاب. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!book) return null;

  const isMissingProfile = isDataLoaded && (!studentName || !studentPhone);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md bg-[#0c101c] border-zinc-800 text-white rounded-3xl p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="text-right space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <BookOpen className="w-4 h-4" />
            <span>طلب نسخة من الكتاب الأكاديمي</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white leading-snug">
            {book.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            يتم جلب بياناتك تلقائياً وبشكل حصري من حسابك المعتمد وإرسالها لأمين المكتبة لتفعيل الكتاب.
          </DialogDescription>
        </DialogHeader>

        {/* Book summary card */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between text-xs">
          <div>
            <div className="text-zinc-400 text-[11px]">سعر النسخة الرقمية:</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">
              {book.price > 0 ? `${book.price} EGP` : 'مجاني Free'}
            </div>
          </div>
          <div className="text-left text-zinc-400 text-[11px]">
            <div>المؤلف: {book.author || 'معتمد'}</div>
            <div>{book.pageCount ? `${book.pageCount} صفحة` : 'نسخة كاملة'}</div>
          </div>
        </div>

        {/* Missing Profile Warning */}
        {isMissingProfile ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right space-y-2">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>يجب تسجيل الدخول بحساب الطالب</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              بيانات الطالب (الاسم، الهاتف، والكود) تُجلب حصرياً من ملفك الجامعي المعتمد وهي غير قابلة للتعديل اليدوي لمنع انتحال الشخصية.
            </p>
            <div className="pt-1 flex gap-2">
              <Button asChild size="sm" className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-xl border-zinc-700 text-zinc-300 text-xs">
                <Link href="/student-signup">حساب جديد</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-[11px] text-blue-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>بيانات الطالب الرسمية (تم الجلب تلقائياً - للقراءة فقط)</span>
              </div>
              <span className="font-mono text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-md font-bold">Read-Only</span>
            </div>

            {/* Read-only Student Name */}
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>اسم الطالب المعتمد</span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> ثابت
                </span>
              </Label>
              <Input
                value={studentName || 'جارٍ الجلب من الحساب...'}
                readOnly
                disabled
                className="h-10 bg-zinc-950/90 border-zinc-800 text-white text-xs rounded-xl font-bold cursor-not-allowed select-none opacity-90"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Read-only Phone Number */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>رقم الهاتف المعتمد</span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> ثابت
                  </span>
                </Label>
                <Input
                  value={studentPhone || 'غير متوفر'}
                  readOnly
                  disabled
                  className="h-10 bg-zinc-950/90 border-zinc-800 text-emerald-400 text-xs rounded-xl font-mono font-bold text-left cursor-not-allowed select-none opacity-90"
                />
              </div>

              {/* Read-only Barcode / Student Code */}
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>كود الطالب / الباركود</span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> ثابت
                  </span>
                </Label>
                <Input
                  value={studentBarcode || 'N/A'}
                  readOnly
                  disabled
                  className="h-10 bg-zinc-950/90 border-zinc-800 text-blue-400 text-xs rounded-xl font-mono font-bold text-left cursor-not-allowed select-none opacity-90"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-zinc-300">ملاحظات إضافية لأمين المكتبة (اختياري)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="أي تفاصيل أو ملاحظات بخصوص عملية الدفع أو الاستلام..."
                rows={2}
                className="bg-zinc-950/70 border-zinc-800 text-white text-xs rounded-xl resize-none focus:border-blue-500"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>سيتم تفعيل القراءة المحمية المشفرة فور اعتماد الطلب من أمين المكتبة.</span>
            </div>

            <DialogFooter className="flex-row items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !studentPhone.trim() || !studentName.trim()}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'جارٍ الإرسال...' : 'تأكيد إرسال الطلب'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
