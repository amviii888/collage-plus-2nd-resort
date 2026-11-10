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
  getDocs, 
  query, 
  where, 
  limit, 
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Course, CourseCollection, Teacher, ShareCode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  Download, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Layers, 
  BookOpen, 
  Library, 
  UserCheck, 
  DollarSign,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Filter,
  PlusCircle,
  Tag,
  Trash2,
  RefreshCw,
  Coins
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { BadgeHelp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const generateCodeSchema = z.object({
  scopeType: z.enum(['course', 'collection']),
  targetId: z.string().min(1, 'يرجى اختيار الكورس أو الباقة.'),
  unitScope: z.string().default('all_course'),
  count: z.coerce.number().min(1, 'العدد لا يقل عن 1').max(500, 'يمكنك إنشاء حتى 500 كود دفعة واحدة.'),
  customPrice: z.coerce.number().min(0, 'السعر لا يقل عن 0').optional(),
  generationMode: z.enum(['auto', 'manual']).default('auto'),
  customCode: z.string().optional(),
});

type GenerateCodeFormValues = z.infer<typeof generateCodeSchema>;

export function ManageShareCodes({ teacher }: { teacher: Teacher }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Search & Filter state for generated codes grid & analytics timeframe
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'course' | 'unit' | 'collection'>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [financialTimeframe, setFinancialTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>('all');
  const [historyFilterMode, setHistoryFilterMode] = useState<'all' | 'past10months' | 'custom'>('all');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [selectedPast10Month, setSelectedPast10Month] = useState<string>('all');

  const past10MonthsList = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      list.push({ value, label });
    }
    return list;
  }, []);
  
  const teacherId = teacher.id;

  // 1. Fetch Teacher Courses
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, 'teachers', teacherId, 'courses');
  }, [firestore, teacherId]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  // 2. Fetch Teacher Collections
  const collectionsQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, `teachers/${teacherId}/courseCollections`);
  }, [firestore, teacherId]);
  const { data: collections, isLoading: collectionsLoading } = useCollection<CourseCollection>(collectionsQuery);
  
  // 3. Fetch Generated Share Codes
  const shareCodesQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, `teachers/${teacherId}/share_codes`);
  }, [firestore, teacherId]);
  const { data: rawShareCodes, isLoading: codesLoading } = useCollection<ShareCode>(shareCodesQuery);

  const todayStr = new Date().toISOString().split('T')[0];
  const usage = teacher.codeUsage;
  const isLimitReached = usage?.date === todayStr && usage?.count >= usage?.limit;
  const hasRequestedExtra = usage?.date === todayStr && usage?.extraRequested;

  const { handleSubmit, formState: { errors }, control, watch, reset, register, setValue } = useForm<GenerateCodeFormValues>({
    resolver: zodResolver(generateCodeSchema),
    defaultValues: {
      count: 10,
      scopeType: 'course',
      unitScope: 'all_course',
      generationMode: 'auto',
      customCode: '',
      customPrice: 0,
    }
  });

  const selectedScopeType = watch('scopeType');
  const selectedTargetId = watch('targetId');
  const selectedUnitScope = watch('unitScope');
  const selectedGenerationMode = watch('generationMode') || 'auto';

  // Find currently selected course or collection
  const selectedCourse = useMemo(() => {
    if (selectedScopeType !== 'course' || !selectedTargetId) return null;
    return courses?.find(c => c.id === selectedTargetId) || null;
  }, [selectedScopeType, selectedTargetId, courses]);

  const selectedCollection = useMemo(() => {
    if (selectedScopeType !== 'collection' || !selectedTargetId) return null;
    return collections?.find(c => c.id === selectedTargetId) || null;
  }, [selectedScopeType, selectedTargetId, collections]);

  // Update default custom price when target content changes
  useEffect(() => {
    if (selectedScopeType === 'course' && selectedCourse) {
      setValue('customPrice', selectedCourse.price || 0);
    } else if (selectedScopeType === 'collection' && selectedCollection) {
      setValue('customPrice', selectedCollection.price || 0);
    }
  }, [selectedScopeType, selectedCourse, selectedCollection, setValue]);

  // Course Units list
  const availableUnits = useMemo(() => {
    return selectedCourse?.units || [];
  }, [selectedCourse]);

  // --------------------------------------------------------------------------
  // Financial Metrics & Analytics Computations (with Timeframe Filter)
  const analytics = useMemo(() => {
    if (!rawShareCodes || !Array.isArray(rawShareCodes)) {
      return { totalCodes: 0, activatedCount: 0, unusedCount: 0, activatedEarnings: 0, pendingRevenue: 0, totalPotential: 0 };
    }

    const now = new Date();
    const codesToAnalyze = rawShareCodes.filter(Boolean).filter(item => {
      try {
        const created = item.createdAt?.toDate ? item.createdAt.toDate() : (item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000) : null);
        if (!created) return true;
        if (financialTimeframe === 'today') {
          return created.toISOString().split('T')[0] === todayStr;
        }
        if (financialTimeframe === 'week') {
          const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
          return diffDays <= 7;
        }
        if (financialTimeframe === 'month') {
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }
      } catch (e) {
        return true;
      }
      return true;
    });

    let totalCodes = 0;
    let activatedCount = 0;
    let unusedCount = 0;
    let activatedEarnings = 0;
    let pendingRevenue = 0;

    codesToAnalyze.forEach(item => {
      totalCodes++;
      const itemPrice = typeof item.price === 'number' ? item.price : 0;

      if (item.used) {
        activatedCount++;
        activatedEarnings += itemPrice;
      } else {
        unusedCount++;
        pendingRevenue += itemPrice;
      }
    });

    return {
      totalCodes,
      activatedCount,
      unusedCount,
      activatedEarnings,
      pendingRevenue,
      totalPotential: activatedEarnings + pendingRevenue
    };
  }, [rawShareCodes, financialTimeframe, todayStr]);

  // Code Generation History Audit Trail Batches (with Custom Date Range & Past 10 Months Filter)
  const generationBatches = useMemo(() => {
    if (!rawShareCodes || !Array.isArray(rawShareCodes)) return [];
    
    const map = new Map<string, { date: string; month: string; title: string; type: string; count: number; price: number; codes: string[]; timestamp: any }>();

    rawShareCodes.filter(Boolean).forEach(c => {
      try {
        const created = c.createdAt?.toDate ? c.createdAt.toDate() : (c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : new Date());
        const dateStr = created.toISOString().split('T')[0];
        const monthStr = dateStr.substring(0, 7);
        const title = c.unitTitle || c.courseTitle || c.collectionTitle || 'مقرر عام';
        const key = `${dateStr}_${title}_${c.price || 0}`;

        if (!map.has(key)) {
          map.set(key, {
            date: dateStr,
            month: monthStr,
            title,
            type: c.type || 'course',
            count: 0,
            price: c.price || 0,
            codes: [],
            timestamp: created
          });
        }
        const entry = map.get(key)!;
        entry.count++;
        entry.codes.push(c.code);
      } catch (e) {}
    });

    let batches = Array.from(map.values());
    const now = new Date();

    if (historyFilterMode === 'past10months') {
      if (selectedPast10Month !== 'all') {
        batches = batches.filter(b => b.month === selectedPast10Month);
      } else {
        const tenMonthsAgo = new Date();
        tenMonthsAgo.setMonth(now.getMonth() - 10);
        batches = batches.filter(b => b.timestamp >= tenMonthsAgo);
      }
    } else if (historyFilterMode === 'custom') {
      if (historyStartDate) {
        batches = batches.filter(b => b.date >= historyStartDate);
      }
      if (historyEndDate) {
        batches = batches.filter(b => b.date <= historyEndDate);
      }
    } else if (selectedHistoryMonth !== 'all') {
      batches = batches.filter(b => b.month === selectedHistoryMonth);
    }

    batches.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return batches;
  }, [rawShareCodes, historyFilterMode, historyStartDate, historyEndDate, selectedHistoryMonth, selectedPast10Month]);

  // Filtered Codes List for 2-Column Grid
  const filteredCodes = useMemo(() => {
    if (!rawShareCodes || !Array.isArray(rawShareCodes)) return [];

    let list = rawShareCodes.filter(Boolean);

    // Status Filter
    if (statusFilter === 'used') {
      list = list.filter(c => c.used);
    } else if (statusFilter === 'unused') {
      list = list.filter(c => !c.used);
    }

    // Scope Filter
    if (scopeFilter === 'course') {
      list = list.filter(c => (c.type === 'course' || (!c.type && c.courseId && !c.unitId)));
    } else if (scopeFilter === 'unit') {
      list = list.filter(c => c.type === 'unit' || Boolean(c.unitId));
    } else if (scopeFilter === 'collection') {
      list = list.filter(c => c.type === 'collection' || Boolean(c.collectionId));
    }

    // Timeframe Filter
    if (timeframeFilter !== 'all') {
      const now = new Date();
      list = list.filter(c => {
        try {
          const created = c.createdAt?.toDate ? c.createdAt.toDate() : (c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : null);
          if (!created) return true;
          if (timeframeFilter === 'month') {
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          }
          if (timeframeFilter === 'week') {
            const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
            return diffDays <= 7;
          }
        } catch (e) {
          return true;
        }
        return true;
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        (c.code || '').toLowerCase().includes(q) ||
        (c.courseTitle || '').toLowerCase().includes(q) ||
        (c.unitTitle || '').toLowerCase().includes(q) ||
        (c.collectionTitle || '').toLowerCase().includes(q) ||
        (c.usedByName || '').toLowerCase().includes(q)
      );
    }

    // Sort newest first
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });

    return list;
  }, [rawShareCodes, statusFilter, scopeFilter, timeframeFilter, searchQuery]);

  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCopyCode = (codeStr: string) => {
    try {
      navigator.clipboard.writeText(codeStr);
      setCopiedCode(codeStr);
      toast({ title: "📋 تم نسخ الكود!", description: `الكود [${codeStr}] جاهز للنسخ والإرسال للطالب.` });
      setTimeout(() => setCopiedCode(null), 2500);
    } catch (e) {}
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
        title: 'تم تجاوز الحد اليومي',
        description: `يمكنك إنتاج ${ (usage?.limit || 300) - (usage?.date === todayStr ? usage.count : 0) } أكواد إضافية فقط اليوم.`,
      });
      setIsSubmitting(false);
      return;
    }

    let codeType: 'course' | 'unit' | 'collection' = 'course';
    let targetCourseTitle = '';
    let targetUnitTitle = '';
    let targetCollectionTitle = '';
    let targetUnitId = '';

    if (data.scopeType === 'course') {
      if (!selectedCourse) {
        toast({ variant: 'destructive', title: 'الكورس غير موجود' });
        setIsSubmitting(false);
        return;
      }
      targetCourseTitle = selectedCourse.title;

      if (data.unitScope && data.unitScope !== 'all_course') {
        codeType = 'unit';
        targetUnitId = data.unitScope;
        const uObj = availableUnits.find(u => u.id === data.unitScope);
        targetUnitTitle = uObj?.title || 'الوحدة المختارة';
      } else {
        codeType = 'course';
      }
    } else {
      if (!selectedCollection) {
        toast({ variant: 'destructive', title: 'الباقة غير موجودة' });
        setIsSubmitting(false);
        return;
      }
      codeType = 'collection';
      targetCollectionTitle = selectedCollection.title;
    }

    const priceToSet = typeof data.customPrice === 'number' 
      ? data.customPrice 
      : (codeType === 'collection' ? (selectedCollection?.price || 0) : (selectedCourse?.price || 0));

    if (isManual) {
      const customCodeClean = data.customCode?.trim().toUpperCase();
      if (!customCodeClean || customCodeClean.length < 3) {
        toast({
          variant: 'destructive',
          title: 'كود غير صالحة',
          description: 'يرجى إدخال كود يدوي يتكون من 3 رموز على الأقل.',
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
            title: 'الكود مستخدم مسبقاً',
            description: 'هذا الكود موجود بالفعل في سجلاتك. يرجى اختيار رمز آخر.',
          });
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        console.error("Uniqueness check error:", error);
      }
    }

    try {
      const teacherRef = doc(firestore, 'teachers', teacherId);
      const shareCodeCollection = collection(firestore, 'teachers', teacherId, 'share_codes');
      
      const codesToExport: { code: string; type: string; item: string; price: number; status: string }[] = [];
      const batch = writeBatch(firestore);

      const scopeNameLabel = codeType === 'unit' 
        ? `وحدة: ${targetUnitTitle} (${targetCourseTitle})` 
        : codeType === 'collection' 
        ? `باقة: ${targetCollectionTitle}` 
        : `كورس: ${targetCourseTitle}`;

      for (let i = 0; i < countToGenerate; i++) {
        const code = isManual 
          ? data.customCode!.trim().toUpperCase() 
          : generateUniqueCode();

        codesToExport.push({ 
          code, 
          type: codeType === 'unit' ? 'الوحدة' : codeType === 'collection' ? 'الباقة' : 'كورس كامل',
          item: scopeNameLabel,
          price: priceToSet,
          status: 'غير مفعل (جاهز)'
        });

        const newCodeRef = doc(shareCodeCollection);
        
        const codeData: ShareCode = {
          id: newCodeRef.id,
          code,
          type: codeType,
          used: false,
          createdAt: serverTimestamp(),
          teacherId,
          price: priceToSet,
          viewLimit: 3,
          hidden: false,
        };

        if (codeType === 'course') {
          codeData.courseId = data.targetId;
          codeData.courseTitle = targetCourseTitle;
        } else if (codeType === 'unit') {
          codeData.courseId = data.targetId;
          codeData.courseTitle = targetCourseTitle;
          codeData.unitId = targetUnitId;
          codeData.unitTitle = targetUnitTitle;
        } else {
          codeData.collectionId = data.targetId;
          codeData.collectionTitle = targetCollectionTitle;
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
      
      const sanitizedTitle = scopeNameLabel.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
      const fileName = `${sanitizedTitle}_share_codes.xlsx`;
      
      const ws = XLSX.utils.json_to_sheet(codesToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Share Codes");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      
      saveAs(blob, fileName);
      
      toast({ 
        title: "🎉 تم إنشاء الأكواد وتصدير ملف Excel!",
        description: isManual 
          ? `تم إنشاء الكود اليدوي "${data.customCode!.trim().toUpperCase()}" بقيمة ${priceToSet} EGP.` 
          : `تم إنشاء ${data.count} كود وصول بقيمة ${priceToSet} EGP للكود الواحد.` 
      });
      reset({ ...data, count: 10, customCode: '' });
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'خطأ أثناء إنشاء الأكواد', description: error.message });
    }
    setIsSubmitting(false);
  };

  const handleExportFilteredExcel = () => {
    if (!filteredCodes || filteredCodes.length === 0) {
      toast({ variant: 'destructive', title: 'لا توجد أكواد مطابقة للتصدير' });
      return;
    }

    const exportData = filteredCodes.map(c => {
      const typeLabel = c.type === 'unit' ? 'وحدة دراسية' : c.type === 'collection' ? 'باقة مقررات' : 'كورس كامل';
      const itemLabel = c.type === 'unit' 
        ? `${c.unitTitle || 'الوحدة'} (${c.courseTitle || 'الكورس'})` 
        : c.type === 'collection' 
        ? (c.collectionTitle || 'الباقة') 
        : (c.courseTitle || 'الكورس');

      return {
        'كود الوصول (Share Code)': c.code,
        'النوع (Type)': typeLabel,
        'المحتوى (Content)': itemLabel,
        'السعر (Price EGP)': c.price || 0,
        'الحالة (Status)': c.used ? 'مُفعل (Used)' : 'غير مُفعل (Available)',
        'تاريخ الإنشاء (Created At)': c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('ar-EG') : '',
        'اسم الطالب المفعّل (Used By)': c.usedByName || c.usedBy || '—'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filtered Share Codes");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    saveAs(blob, `share_codes_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "📥 تم تصدير ملف Excel بنجاح!", description: `تم تصدير ${filteredCodes.length} كود.` });
  };

  const handleDeleteUnusedCode = async (codeItem: ShareCode) => {
    if (!firestore || codeItem.used) return;
    try {
      const codeRef = doc(firestore, `teachers/${teacherId}/share_codes`, codeItem.id);
      await deleteDoc(codeRef);
      toast({ title: "تم حذف الكود بنجاح" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
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
      toast({ title: "تم إرسال الطلب", description: "تم إرسال طلب زيادة الحد اليومي للأدمن." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <KeyRound className="w-7 h-7 text-emerald-400" /> 
            <span>منظومة أكواد الوصول والتحليل المالي (Advanced Share Codes)</span>
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            أنشئ أكواد وصول للكورسات والوحدات والباقات وتابع الأرباح المحققة مع إمكانية التصدير الفوري لملفات Excel.
          </p>
        </div>

        <Button
          onClick={handleExportFilteredExcel}
          disabled={!filteredCodes || filteredCodes.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl px-5 h-11 text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>تصدير القائمة لـ Excel ({filteredCodes.length})</span>
        </Button>
      </div>

      {/* 1. FINANCIAL ANALYTICS TOP CARDS & TIMEFRAME FILTER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">فلترة المؤشرات والأرباح حسب الفترة الزمنية:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'كل الأوقات' },
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'هذا الأسبوع' },
              { id: 'month', label: 'هذا الشهر' },
            ].map(tf => (
              <Button
                key={tf.id}
                type="button"
                variant={financialTimeframe === tf.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFinancialTimeframe(tf.id as any)}
                className={cn(
                  "text-xs rounded-xl h-8 px-3 font-bold cursor-pointer",
                  financialTimeframe === tf.id 
                    ? "bg-emerald-500 text-black hover:bg-emerald-600" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                )}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Activated Realized Earnings */}
          <Card className="bg-gradient-to-br from-emerald-950/60 to-zinc-950 border-emerald-500/30 p-5 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">الأرباح المحققة (Activated)</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-mono font-black text-white flex items-baseline gap-1.5">
                <span>{analytics.activatedEarnings.toLocaleString()}</span>
                <span className="text-xs font-sans text-emerald-400 font-bold">EGP</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                عائد {analytics.activatedCount} كود تم تفعيله بواسطة الطلاب.
              </p>
            </div>
          </Card>

          {/* Card 2: Pending Revenue */}
          <Card className="bg-gradient-to-br from-amber-950/40 to-zinc-950 border-amber-500/20 p-5 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">أرباح متوقعة (Pending)</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300 flex items-baseline gap-1.5">
                <span>{analytics.pendingRevenue.toLocaleString()}</span>
                <span className="text-xs font-sans text-amber-400 font-bold">EGP</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                قيمة {analytics.unusedCount} كود صادر متداول لم يُفعل بعد.
              </p>
            </div>
          </Card>

          {/* Card 3: Total Potential Catalog Value */}
          <Card className="bg-zinc-950 border-zinc-800 p-5 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 tracking-wide uppercase">إجمالي القيمة الصادرة</span>
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <TrendingUp className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-mono font-black text-white flex items-baseline gap-1.5">
                <span>{analytics.totalPotential.toLocaleString()}</span>
                <span className="text-xs font-sans text-zinc-400 font-bold">EGP</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                إجمالي القيمة المالية لجميع الأكواد ({analytics.totalCodes} كود).
              </p>
            </div>
          </Card>

          {/* Card 4: Daily Limit & Usage */}
          <Card className="bg-zinc-950 border-zinc-800 p-5 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 tracking-wide uppercase">الحد اليومي لإنشاء الأكواد</span>
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-mono font-black text-white flex items-baseline gap-1">
                <span>{usage?.date === todayStr ? usage.count : 0}</span>
                <span className="text-sm text-zinc-500 font-mono">/ {usage?.limit || 300}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                المتبقي لك اليوم: {Math.max(0, (usage?.limit || 300) - (usage?.date === todayStr ? usage.count : 0))} كود.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* CODE GENERATION HISTORY & AUDIT TRAIL */}
      <Card className="bg-zinc-950 border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800/80 p-6 flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-white text-lg sm:text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>سجل وتاريخ عمليات إنشاء الأكواد (Generation History Audit)</span>
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs mt-1">
              تتبع جميع دفعات توليد الأكواد السابقة، عدد الأكواد، التاريخ، والمحتوى المرتبط عبر أي شهر أو فترة.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <Button
                type="button"
                variant={historyFilterMode === 'all' && selectedHistoryMonth === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setHistoryFilterMode('all'); setSelectedHistoryMonth('all'); }}
                className={cn("text-xs h-8 px-3 font-bold cursor-pointer", (historyFilterMode === 'all' && selectedHistoryMonth === 'all') ? "bg-emerald-500 text-black hover:bg-emerald-600" : "text-zinc-300")}
              >
                كل الأوقات
              </Button>
              <Button
                type="button"
                variant={historyFilterMode === 'past10months' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setHistoryFilterMode('past10months'); setSelectedHistoryMonth('all'); }}
                className={cn("text-xs h-8 px-3 font-bold cursor-pointer", historyFilterMode === 'past10months' ? "bg-emerald-500 text-black hover:bg-emerald-600" : "text-zinc-300")}
              >
                آخر 10 شهور
              </Button>
              <Button
                type="button"
                variant={historyFilterMode === 'custom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHistoryFilterMode('custom')}
                className={cn("text-xs h-8 px-3 font-bold cursor-pointer", historyFilterMode === 'custom' ? "bg-emerald-500 text-black hover:bg-emerald-600" : "text-zinc-300")}
              >
                تاريخ مخصص
              </Button>
            </div>

            {historyFilterMode === 'custom' ? (
              <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-400 font-bold">من:</span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="bg-black border border-zinc-800 text-white text-xs rounded-lg px-2.5 py-1 font-mono cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-400 font-bold">إلى:</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="bg-black border border-zinc-800 text-white text-xs rounded-lg px-2.5 py-1 font-mono cursor-pointer"
                  />
                </div>
              </div>
            ) : historyFilterMode === 'past10months' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-bold">اختر الشهر:</span>
                <Select value={selectedPast10Month} onValueChange={setSelectedPast10Month}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl h-9 w-[170px]">
                    <SelectValue placeholder="اختر شهراً" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                    <SelectItem value="all">جميع الشهور (آخر 10)</SelectItem>
                    {past10MonthsList.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-bold">شهر محدد:</span>
                <input
                  type="month"
                  value={selectedHistoryMonth === 'all' ? '' : selectedHistoryMonth}
                  onChange={(e) => {
                    setSelectedHistoryMonth(e.target.value || 'all');
                    if (e.target.value) setHistoryFilterMode('all');
                  }}
                  className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono cursor-pointer"
                  title="اختر أي شهر في السنة"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {generationBatches.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              لا توجد سجلات لعمليات توليد سابقة في هذه الفترة.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {generationBatches.map((batch, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                      {batch.count}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm">{batch.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        تم إنشاء <span className="font-bold text-emerald-400">{batch.count} كود</span> بتاريخ {batch.date} بقيمة {batch.price} EGP للكود.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] font-mono">
                    دفعة ناجحة
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. CODE GENERATION STUDIO PANEL */}
      <Card className="bg-zinc-950 border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800/80 p-6">
          <CardTitle className="text-white text-lg sm:text-xl font-bold flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <span>إنشاء أكواد وصول جديدة (Generate Share Codes)</span>
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            حدد نوع نطاق الوصول (كورس كامل، وحدة معينة، أو باقة مقررات) وحدد العدد أو الكود اليدوي والسعر المخصص.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {coursesLoading || collectionsLoading ? (
            <Skeleton className="h-48 w-full bg-zinc-900 rounded-2xl" />
          ) : (
            <form onSubmit={handleSubmit(handleGenerateAndExport)} className="space-y-6 max-w-2xl mx-auto">
              {/* Step A: Select Scope Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-200">1. اختر نوع النطاق (Entitlement Scope)</Label>
                <Controller
                  name="scopeType"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-3">
                      <div>
                        <RadioGroupItem value="course" id="r-course" className="peer sr-only" />
                        <Label htmlFor="r-course" className={cn("cursor-pointer p-3.5 border rounded-2xl flex items-center justify-center gap-2 text-center transition-all", selectedScopeType === 'course' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold shadow-lg shadow-emerald-500/5' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700')}>
                          <BookOpen className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs sm:text-sm">لكورس أو وحدة معينة</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="collection" id="r-collection" className="peer sr-only" />
                        <Label htmlFor="r-collection" className={cn("cursor-pointer p-3.5 border rounded-2xl flex items-center justify-center gap-2 text-center transition-all", selectedScopeType === 'collection' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold shadow-lg shadow-emerald-500/5' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700')}>
                          <Library className="w-4 h-4 text-purple-400" />
                          <span className="text-xs sm:text-sm">لباقة مقررات (Collection)</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Step B: Select Target Content */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="targetId" className="text-xs font-bold text-zinc-200">
                    2. اختر {selectedScopeType === 'course' ? 'الكورس' : 'الباقة'}
                  </Label>
                  <Controller
                    name="targetId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={(selectedScopeType === 'course' ? !courses?.length : !collections?.length)}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-11 text-xs">
                          <SelectValue placeholder={`اختر ${selectedScopeType === 'course' ? 'الكورس' : 'الباقة'}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                          {selectedScopeType === 'course' ?
                            courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title} ({course.price || 0} EGP)</SelectItem>) :
                            collections?.map(col => <SelectItem key={col.id} value={col.id}>{col.title} ({col.price || 0} EGP)</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.targetId && <p className="text-rose-500 text-xs mt-1">{errors.targetId.message}</p>}
                </div>

                {/* Dynamic Unit Dropdown when Course is selected */}
                {selectedScopeType === 'course' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="unitScope" className="text-xs font-bold text-zinc-200">
                      نطاق الفتح داخل الكورس
                    </Label>
                    <Controller
                      name="unitScope"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCourse}>
                          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-11 text-xs">
                            <SelectValue placeholder="الكورس كاملاً أم وحدة فقط؟" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
                            <SelectItem value="all_course">
                              ✨ الكورس كاملاً بالكامل (Full Course)
                            </SelectItem>
                            {availableUnits.map((u, i) => (
                              <SelectItem key={u.id} value={u.id}>
                                📖 الوحدة {i + 1}: {u.title} ({u.videos?.length || 0} دروس)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-[11px] text-zinc-500">اختر &quot;الكورس كاملاً&quot; أو وحدة محددة فقط.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="customPrice" className="text-xs font-bold text-zinc-200">
                      السعر المحدد للباك الأكواد (EGP)
                    </Label>
                    <Input
                      id="customPrice"
                      type="number"
                      min="0"
                      className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-11 text-xs font-mono font-bold"
                      {...register('customPrice')}
                    />
                  </div>
                )}
              </div>

              {/* Price Override for Course Scope */}
              {selectedScopeType === 'course' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customPrice" className="text-xs font-bold text-zinc-200">
                      سعر الكود المحسوب مالياً (EGP)
                    </Label>
                    <Input
                      id="customPrice"
                      type="number"
                      min="0"
                      className="bg-zinc-900 border-zinc-800 text-emerald-400 rounded-xl h-11 text-xs font-mono font-bold"
                      {...register('customPrice')}
                    />
                    <p className="text-[11px] text-zinc-500">يُستخدم لحساب الأرباح المحققة عند تفعيل الكود.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-200">طريقة التوليد</Label>
                    <Controller
                      name="generationMode"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-2">
                          <div>
                            <RadioGroupItem value="auto" id="gm-auto" className="peer sr-only" />
                            <Label htmlFor="gm-auto" className={cn("cursor-pointer py-2.5 px-3 border rounded-xl block text-center text-xs transition-all", selectedGenerationMode === 'auto' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-400')}>
                              تلقائي أوتوماتيك
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="manual" id="gm-manual" className="peer sr-only" />
                            <Label htmlFor="gm-manual" className={cn("cursor-pointer py-2.5 px-3 border rounded-xl block text-center text-xs transition-all", selectedGenerationMode === 'manual' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold' : 'border-zinc-800 text-zinc-400')}>
                              كود يدوي مخصص
                            </Label>
                          </div>
                        </RadioGroup>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Quantity or Custom Code input */}
              {selectedGenerationMode === 'manual' ? (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <Label htmlFor="customCode" className="text-xs font-bold text-zinc-200">أدخل الكود اليدوي المخصص</Label>
                  <Input 
                    id="customCode" 
                    placeholder="مثال: MATH2026SPECIAL" 
                    className="font-mono uppercase tracking-widest text-base bg-zinc-900 border-zinc-800 text-emerald-400 rounded-xl h-11 text-center font-bold"
                    {...register('customCode')} 
                  />
                  {errors.customCode && <p className="text-rose-500 text-xs">{errors.customCode.message}</p>}
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <Label htmlFor="count" className="text-xs font-bold text-zinc-200">عدد الأكواد المطلوب إنشاؤها وتصديرها</Label>
                  <Input 
                    id="count" 
                    type="number" 
                    min="1" 
                    max="500" 
                    className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-11 text-xs font-mono font-bold" 
                    {...register('count')} 
                  />
                  {errors.count && <p className="text-rose-500 text-xs">{errors.count.message}</p>}
                </div>
              )}

              {isLimitReached ? (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-300 rounded-2xl">
                  <BadgeHelp className="h-4 w-4" />
                  <AlertTitle className="font-bold">تم الوصول للحد اليومي</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    لقد استنفدت الحد اليومي المتاح لك وهو {usage?.limit || 300} كود. يمكنك طلب رفع الحد اليومي من الأدمن.
                    <Button onClick={handleRequestMore} disabled={hasRequestedExtra} className="w-full mt-3 bg-amber-500 text-black font-bold text-xs h-10 rounded-xl">
                      {hasRequestedExtra ? "تم إرسال طلب الزيادة" : "طلب زيادة الحد اليومي +300"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  size="lg" 
                  className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting 
                    ? 'جاري إنشاء الأكواد والتصدير...' 
                    : <><Download className="h-5 w-5" /> إنشاء وتصدير الأكواد إلى Excel</>
                  }
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* 3. REIMAGINED 2-COLUMN SHARE CODES VAULT GRID & FILTERS */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <span>سجل الأكواد الصادرة ({filteredCodes.length})</span>
          </h3>

          <div className="flex items-center gap-2">
            {/* Export Filtered Excel */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFilteredExcel}
              disabled={filteredCodes.length === 0}
              className="border-zinc-800 bg-zinc-900 text-zinc-200 text-xs rounded-xl h-9 hover:bg-zinc-800"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              <span>تصدير المفلتر</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="بحث بالكود، الكورس، أو الطالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl h-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl h-10">
              <SelectValue placeholder="حالة التفعيل" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
              <SelectItem value="all">جميع الحالات ({rawShareCodes?.length || 0})</SelectItem>
              <SelectItem value="used">المُفعلة فقط ({analytics.activatedCount})</SelectItem>
              <SelectItem value="unused">المتاحة غير المُفعلة ({analytics.unusedCount})</SelectItem>
            </SelectContent>
          </Select>

          {/* Scope Filter */}
          <Select value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl h-10">
              <SelectValue placeholder="نوع النطاق" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
              <SelectItem value="all">جميع النطاقات (All Scopes)</SelectItem>
              <SelectItem value="course">كورسات كاملة (Full Courses)</SelectItem>
              <SelectItem value="unit">وحدات دراسية (Specific Units)</SelectItem>
              <SelectItem value="collection">باقات مقررات (Collections)</SelectItem>
            </SelectContent>
          </Select>

          {/* Timeframe Filter */}
          <Select value={timeframeFilter} onValueChange={(v: any) => setTimeframeFilter(v)}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs rounded-xl h-10">
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white text-xs">
              <SelectItem value="all">كل الأوقات (All Time)</SelectItem>
              <SelectItem value="month">هذا الشهر (This Month)</SelectItem>
              <SelectItem value="week">هذا الأسبوع (This Week)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 2-COLUMN RESPONSIVE CODE GRID */}
        {codesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-3xl space-y-3 bg-zinc-950/40">
            <KeyRound className="mx-auto h-12 w-12 text-zinc-600" />
            <h4 className="text-base font-bold text-zinc-300">لا توجد أكواد مطابقة</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              لم نجد أي أكواد طالبت بها التصفية الحالية. قم بإنشاء دفعة جديدة أو غيّر خيارات البحث.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCodes.map((c) => {
              let formattedDate = 'مؤخراً';
              try {
                const d = c.createdAt?.toDate ? c.createdAt.toDate() : (c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : null);
                if (d) {
                  formattedDate = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' });
                }
              } catch (e) {}

              const isUnitCode = c.type === 'unit' || Boolean(c.unitId);
              const isCollectionCode = c.type === 'collection' || Boolean(c.collectionId);

              return (
                <div
                  key={c.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative overflow-hidden group",
                    c.used 
                      ? "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700" 
                      : "bg-zinc-950 border-emerald-500/20 hover:border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                  )}
                >
                  {/* Top Bar: Code string + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl font-mono text-base font-black text-emerald-400 tracking-wider">
                      <span>{c.code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(c.code)}
                        className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="نسخ الكود"
                      >
                        {copiedCode === c.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {c.used ? (
                      <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-bold px-2.5 py-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>مُفعل (Used)</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1">
                        جاهز للتفعيل (Available)
                      </Badge>
                    )}
                  </div>

                  {/* Body Info: Scope & Course Metadata */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold">
                      {isUnitCode ? (
                        <>
                          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-blue-300">وحدة: {c.unitTitle || 'وحدة دراسية'}</span>
                          <span className="text-zinc-500">({c.courseTitle || 'الكورس'})</span>
                        </>
                      ) : isCollectionCode ? (
                        <>
                          <Library className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="text-purple-300">باقة: {c.collectionTitle || 'باقة مقررات'}</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300">كورس كامل: {c.courseTitle || 'الكورس كاملاً'}</span>
                        </>
                      )}
                    </div>

                    {/* Redeemed Student Info */}
                    {c.used && (
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-[11px] text-zinc-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تفعيل الطالب: <strong>{c.usedByName || c.usedBy || 'طالب مسجل'}</strong></span>
                        </div>
                        <span className="text-zinc-500 font-mono text-[10px]">مُفعل</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Details: Price & Creation Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
                    <div className="flex items-center gap-1 font-mono font-bold text-white">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{c.price || 0} EGP</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>

                      {!c.used && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUnusedCode(c)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="حذف الكود غير المستخدم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}