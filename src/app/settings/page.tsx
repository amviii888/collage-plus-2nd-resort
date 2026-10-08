'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useStudent, useCollection } from '@/firebase';
import { signOut, getAuth } from 'firebase/auth';
import type { Teacher, Course } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Users, FileText, Shield, Info, LifeBuoy, Globe, ChevronRight, ChevronLeft, Bell, Lock, Scale, Copyright, User as UserIcon, RotateCcw, AlertTriangle, Database, Upload, Check, Download, AlertCircle } from 'lucide-react';
import { doc, collection, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { LocalDataProvider, useLocalData } from '@/context/LocalDataContext';
import { useToast } from '@/hooks/use-toast';
import { AppCache } from '@/lib/cache';
import { isStudentEmail, clearAllStudentAuthSessions } from '@/lib/auth-helpers';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function TeacherDisasterRecoveryContent({ teacherId, isArabic }: { teacherId: string; isArabic: boolean }) {
    const firestore = useFirestore();
    const { 
        triggerDisasterRecovery, 
        getDisasterRecoveryRemainingHours, 
        isSyncing,
        localStudents, 
        localPlans, 
        localTransactions, 
        localAttendance,
        setLocalStudents,
        setLocalPlans,
        setLocalTransactions,
        setLocalAttendance,
        triggerTwoWaySync
    } = useLocalData();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [remainingHours, setRemainingHours] = useState(0);
    const [vaultRemainingHours, setVaultRemainingHours] = useState(0);

    const getVaultRemainingHours = useCallback(() => {
        const lastOp = localStorage.getItem(`last_vault_operation_timestamp_${teacherId}`);
        if (!lastOp) return 0;
        const elapsed = Date.now() - Number(lastOp);
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
        if (elapsed >= twoDaysMs) return 0;
        return Math.ceil((twoDaysMs - elapsed) / (1000 * 60 * 60));
    }, [teacherId]);

    const recordVaultOperationSuccess = () => {
        localStorage.setItem(`last_vault_operation_timestamp_${teacherId}`, String(Date.now()));
        setVaultRemainingHours(getVaultRemainingHours());
    };

    const [restoreStep, setRestoreStep] = useState<'idle' | 'confirm' | 'restoring' | 'done'>('idle');
    const [backupToRestore, setBackupToRestore] = useState<any>(null);
    const [isExporting, setIsExporting] = useState(false);

    const coursesQuery = useMemoFirebase(() => {
        if (!firestore || !teacherId) return null;
        return collection(firestore, 'teachers', teacherId, 'courses');
    }, [firestore, teacherId]);
    const { data: courses } = useCollection<Course>(coursesQuery);

    useEffect(() => {
        setRemainingHours(getDisasterRecoveryRemainingHours());
        setVaultRemainingHours(getVaultRemainingHours());
    }, [getDisasterRecoveryRemainingHours, getVaultRemainingHours, teacherId]);

    const handleRunRecovery = async () => {
        setIsLoading(true);
        const res = await triggerDisasterRecovery();
        setIsLoading(false);
        setRemainingHours(getDisasterRecoveryRemainingHours());

        if (res.success) {
            toast({
                title: isArabic ? 'تمت استعادة البيانات بنجاح!' : 'Data Restored Successfully!',
                description: res.message || (isArabic 
                    ? 'تم تنزيل جميع خططك وسجلاتك من السحابة وحفظها في الذاكرة المحلية.'
                    : 'All your plans, student profiles, attendance, and transactions have been restored into local storage.'),
            });
        } else {
            toast({
                variant: 'destructive',
                title: isArabic ? 'فشلت الاستعادة أو تجاوزت الحد' : 'Recovery Error / Rate Limited',
                description: res.error || (isArabic ? 'تعذر استعادة البيانات من السحابة.' : 'Could not restore data from cloud.'),
            });
        }
    };

    const handleExportUABK = () => {
        try {
            setIsExporting(true);
            const backupData = {
                version: "1.0",
                teacherId,
                timestamp: new Date().toISOString(),
                localStudents,
                localPlans,
                localTransactions,
                localAttendance,
                courses: courses || []
            };

            const jsonStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
            saveAs(dataBlob, `universe_academy_vault_backup_${teacherId}.uabk`);
            
            recordVaultOperationSuccess();

            toast({
                title: isArabic ? "اكتمل النسخ الاحتياطي" : "Backup Complete",
                description: isArabic 
                    ? "تم تصدير ملف الأرشيف الخاص بأكاديميتك بنجاح." 
                    : "Your custom .uabk academy archive has been securely downloaded.",
            });
        } catch (err) {
            console.error(err);
            toast({
                title: isArabic ? "فشل النسخ الاحتياطي" : "Backup Failed",
                description: isArabic ? "تعذر إنشاء نسخة احتياطية محلية." : "Could not generate local snapshot archive.",
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportLocalData = () => {
        const wb = XLSX.utils.book_new();
        let hasData = false;

        if (localStudents.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localStudents), "Students");
            hasData = true;
        }
        if (localPlans.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localPlans), "Plans");
            hasData = true;
        }
        if (localTransactions.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localTransactions), "Transactions");
            hasData = true;
        }
        if (localAttendance.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localAttendance), "Attendance");
            hasData = true;
        }

        if (!hasData) {
            toast({
                title: isArabic ? "لا توجد بيانات للتصدير" : "No Data to Export",
                description: isArabic ? "لا توجد أي بيانات محلية لحفظها." : "There is no local data to back up.",
                variant: "destructive"
            });
            return;
        }

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        saveAs(dataBlob, `teacher_local_data_backup_${teacherId}.xlsx`);
        recordVaultOperationSuccess();
        toast({ 
            title: isArabic ? "تم تصدير البيانات" : "Local Data Exported", 
            description: isArabic ? "تم حفظ النسخة الاحتياطية لملف إكسيل بنجاح." : "All your personal offline data has been backed up." 
        });
    };

    const handleImportUABK = (file: File) => {
        if (!file) return;
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    
                    if (!json || json.version !== '1.0' || !json.teacherId) {
                        toast({
                            title: isArabic ? "تنسيق ملف غير صالح" : "Invalid File Format",
                            description: isArabic ? "هذا الملف ليس ملف نسخة احتياطية صالحًا للمنصة." : "This is not a valid Universe Academy (.uabk) file.",
                            variant: "destructive"
                        });
                        return;
                    }

                    setBackupToRestore(json);
                    setRestoreStep('confirm');
                } catch (err) {
                    toast({
                        title: isArabic ? "ملف تالف" : "Corrupted File",
                        description: isArabic ? "تعذر قراءة ملف النسخة الاحتياطية." : "The file could not be parsed as a valid JSON backup.",
                        variant: "destructive"
                    });
                }
            };
            reader.readAsText(file);
        } catch (err) {
            console.error(err);
        }
    };

    const executeRestoreUABK = async () => {
        if (!backupToRestore) return;
        setRestoreStep('restoring');
        try {
            const { 
                localStudents: backupStudents = [], 
                localPlans: backupPlans = [], 
                localTransactions: backupTransactions = [], 
                localAttendance: backupAttendance = [], 
                courses: backupCourses = [] 
            } = backupToRestore;

            // 1. Restore localStudents as dirty (synced: false) for cloud push
            const mappedStudents = backupStudents.map((s: any) => ({
                ...s,
                synced: false,
                updatedAt: new Date().toISOString()
            }));
            setLocalStudents(mappedStudents);

            // 2. Restore localPlans
            const mappedPlans = backupPlans.map((p: any) => ({
                ...p,
                synced: false,
                updatedAt: new Date().toISOString()
            }));
            setLocalPlans(mappedPlans);

            // 3. Restore localTransactions
            const mappedTransactions = backupTransactions.map((t: any) => ({
                ...t,
                synced: false,
                updatedAt: new Date().toISOString()
            }));
            setLocalTransactions(mappedTransactions);

            // 4. Restore localAttendance
            const mappedAttendance = backupAttendance.map((a: any) => ({
                ...a,
                synced: false,
                updatedAt: new Date().toISOString()
            }));
            setLocalAttendance(mappedAttendance);

            // 5. Restore courses directly to Firestore cloud
            if (backupCourses && backupCourses.length > 0) {
                await Promise.all(
                    backupCourses.map((c: any) => {
                        const courseRef = doc(firestore, 'teachers', teacherId, 'courses', c.id);
                        return setDoc(courseRef, {
                            ...c,
                            updatedAt: new Date().toISOString()
                        });
                    })
                );
            }

            // Evict memory caches to reflect changes immediately
            AppCache.clear(`coll_teachers/${teacherId}/courses`);
            AppCache.clear(`doc_teachers/${teacherId}/courses`);
            AppCache.clear(`query_teachers/${teacherId}/courses`);
            AppCache.clear(`coll_featuredCourses`);
            AppCache.clear(`query_featuredCourses`);
            AppCache.clear(`doc_featuredCourses`);

            recordVaultOperationSuccess();
            setRestoreStep('done');
            toast({
                title: isArabic ? "تمت استعادة الملف بنجاح" : "Restoration Successful",
                description: isArabic ? "تم استدعاء السجلات محليًا وتعمل المزامنة حاليًا في الخلفية." : "All records populated locally. Cloud sync is running in the background.",
            });

            // Force background synchronization after a short delay
            setTimeout(() => {
                triggerTwoWaySync().catch(err => console.error("Restore auto-sync failure:", err));
            }, 1500);

        } catch (err) {
            console.error(err);
            toast({
                title: isArabic ? "فشلت الاستعادة" : "Restoration Failed",
                description: isArabic ? "حدث خطأ ما أثناء استبدال قاعدة البيانات المحلية." : "Something went wrong while overwriting the local database.",
                variant: "destructive"
            });
            setRestoreStep('idle');
        }
    };

    const isLocked = remainingHours > 0 || isLoading || isSyncing;

    return (
        <Card className="glass-card overflow-hidden border border-amber-500/30 bg-card/80 shadow-lg">
            <CardContent className="p-6 space-y-6">
                
                {/* 1. Cloud-to-Local Disaster Recovery Section */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                <RotateCcw className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-lg text-foreground">
                                        {isArabic ? 'التعافي من الكوارث (استعادة البيانات)' : 'Cloud Recovery Pipeline'}
                                    </h3>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        {isArabic ? 'مرة واحدة كل 24 ساعة' : '1 Click / 24 Hours'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {isArabic
                                        ? 'يقوم بقراءة وتنزيل جميع خططك، بيانات الطلاب، السجلات المالية، وسجلات الحضور المخزنة في السحابة وإعادتها فوراً إلى ذاكرة الجهاز المحلية.'
                                        : 'Downloads your remote cloud-backed records (plans, students, transaction history, and attendance charts) back into your local storage.'}
                                </p>
                             </div>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40">
                        <p className="text-[11px] text-amber-500/80 font-medium flex items-center gap-1.5 self-start sm:self-center">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {remainingHours > 0
                                ? (isArabic ? `متاح للاستخدام بعد ${remainingHours} ساعة` : `Next recovery available in ${remainingHours} hour(s)`)
                                : (isArabic ? 'جاهز للاستخدام لمسح ذاكرة التصفح أو الانتقال لجهاز جديد' : 'Ready to restore if cache was cleared or using a new device')}
                        </p>

                        <Button
                            onClick={handleRunRecovery}
                            disabled={isLocked}
                            className={cn(
                                "w-full sm:w-auto font-semibold shadow-md transition-all duration-300 cursor-pointer",
                                isLocked
                                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                            )}
                        >
                            {isLoading || isSyncing ? (
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4 animate-spin" />
                                    <span>{isArabic ? 'جاري الاستعادة...' : 'Restoring...'}</span>
                                </div>
                            ) : remainingHours > 0 ? (
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    <span>{isArabic ? `مغلق (${remainingHours}س)` : `Locked (${remainingHours}h)`}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4" />
                                    <span>{isArabic ? 'تشغيل استعادة البيانات' : 'Run Disaster Recovery'}</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>

                {/* 2. Manual Snapshot Vault Section (UABK & Excel) */}
                <div className="pt-4 border-t border-border/40 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <Database className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="space-y-1 flex-grow">
                            <h3 className="font-bold text-lg text-foreground">
                                {isArabic ? 'مستودع النسخ الاحتياطي اليدوي' : 'Manual Backup & Restore Vault'}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {isArabic
                                    ? 'قم بحماية وتصدير سجلاتك بالكامل إلى ملف خارجي واستعادتها في أي وقت بدون استهلاك حصة القراءة للشبكة.'
                                    : 'Safeguard your entire academy roster offline. Download complete data snapshots as custom .uabk files or human-readable Excel ledgers.'}
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40 w-full">
                        <p className="text-[11px] text-primary/80 font-medium flex items-center gap-1.5 self-start sm:self-center">
                            <AlertCircle className="w-4 h-4 shrink-0 text-primary" />
                            {vaultRemainingHours > 0
                                ? (isArabic ? `العملية القادمة متاحة بعد ${vaultRemainingHours} ساعة` : `Next backup/restore available in ${vaultRemainingHours} hour(s)`)
                                : (isArabic ? 'جاهز لحفظ البيانات محلياً' : 'Ready to secure snapshots with zero cloud cost')}
                        </p>

                        <Dialog onOpenChange={(open) => { if (!open) { setRestoreStep('idle'); setBackupToRestore(null); } }}>
                            <DialogTrigger asChild>
                                <Button 
                                    disabled={vaultRemainingHours > 0}
                                    className={cn(
                                        "w-full sm:w-auto font-bold shadow-md transition-all duration-300 cursor-pointer flex items-center gap-2",
                                        vaultRemainingHours > 0 
                                            ? "bg-muted text-muted-foreground border border-zinc-800 cursor-not-allowed opacity-70"
                                            : "bg-primary hover:bg-primary/95 text-zinc-950"
                                    )}
                                >
                                    <Database className="w-4 h-4" />
                                    <span>
                                        {vaultRemainingHours > 0 
                                            ? (isArabic ? `مغلق (${vaultRemainingHours}س)` : `Locked (${vaultRemainingHours}h)`)
                                            : (isArabic ? 'فتح مستودع الملفات' : 'Open Vault Manager')}
                                    </span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-950 border border-zinc-800 text-foreground max-w-lg rounded-2xl shadow-2xl p-6" dir={isArabic ? 'rtl' : 'ltr'}>
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground font-mono">
                                        <Database className="h-5 w-5 text-primary" />
                                        {isArabic ? 'مستودع الأكاديمية والمزود' : 'Enterprise Backup & Vault'}
                                    </DialogTitle>
                                    <DialogDescription className="text-zinc-400 text-xs">
                                        {isArabic
                                            ? 'قم بتنزيل نسخ احتياطية كاملة أو استيرادها بدون استهلاك حصة القراءة من السحابة.'
                                            : 'Safeguard your entire academy\'s operations. Download offline snapshots or execute bulletproof system restorations with zero cloud reads.'}
                                    </DialogDescription>
                                </DialogHeader>

                                <AnimatePresence mode="wait">
                                    {restoreStep === 'idle' && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6 py-4"
                                        >
                                            {/* Section 1: EXPORT */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                                                    {isArabic ? '١. تصدير البيانات' : '1. Export Snapshots'}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button 
                                                        onClick={handleExportUABK} 
                                                        disabled={isExporting}
                                                        className="h-24 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col justify-center gap-1 hover:border-primary/30 group cursor-pointer text-center"
                                                    >
                                                        <Download className="h-5 w-5 text-primary group-hover:scale-110 transition-transform mx-auto" />
                                                        <span className="text-xs font-bold font-mono text-zinc-200">{isArabic ? 'تحميل .uabk' : 'Download .uabk'}</span>
                                                        <span className="text-[9px] text-zinc-500">{isArabic ? 'أرشيف النظام الكامل' : 'System Backup Archive'}</span>
                                                    </Button>
                                                    <Button 
                                                        onClick={handleExportLocalData}
                                                        className="h-24 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col justify-center gap-1 hover:border-amber-500/30 group cursor-pointer text-center"
                                                    >
                                                        <FileText className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform mx-auto" />
                                                        <span className="text-xs font-bold font-mono text-zinc-200">{isArabic ? 'تحميل إكسل' : 'Download Excel'}</span>
                                                        <span className="text-[9px] text-zinc-500">{isArabic ? 'جدول بيانات مقروء' : 'Readable Spreadsheet'}</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Section 2: IMPORT */}
                                            <div className="space-y-3">
                                                <h3 className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
                                                    {isArabic ? '٢. استيراد واستعادة' : '2. System Restoration'}
                                                </h3>
                                                <label className="border border-dashed border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-primary/40 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                                                    <Upload className="h-6 w-6 text-zinc-500 group-hover:text-primary transition-colors" />
                                                    <span className="text-xs font-bold text-zinc-300">{isArabic ? 'رفع ملف أرشيف `.uabk`' : 'Upload `.uabk` Snapshot'}</span>
                                                    <span className="text-[10px] text-zinc-500">{isArabic ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag or click to choose system file'}</span>
                                                    <input 
                                                        type="file" 
                                                        accept=".uabk" 
                                                        className="hidden" 
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleImportUABK(file);
                                                        }} 
                                                    />
                                                </label>
                                            </div>
                                        </motion.div>
                                    )}

                                    {restoreStep === 'confirm' && backupToRestore && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="space-y-4 py-4"
                                        >
                                            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                                                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-xs font-bold text-amber-500 font-mono uppercase">
                                                        {isArabic ? 'تحذير خطر: تأكيد الاستعادة' : 'Danger: Overwrite Confirmation'}
                                                    </h4>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">
                                                        {isArabic 
                                                            ? 'استعادة هذا الملف سيؤدي إلى مسح وتبديل جميع بياناتك الحالية وتحديث السحابة في الخلفية.'
                                                            : 'Restoring this snapshot will merge/overwrite your current local browser state and queue automatic synchronization updates online in the background.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                                                <div className="flex justify-between items-center pb-2 border-b border-zinc-800 text-xs">
                                                    <span className="text-zinc-500 font-mono">{isArabic ? 'تاريخ النسخة الاحتياطية:' : 'Backup Date:'}</span>
                                                    <span className="font-bold text-zinc-300 font-mono">
                                                        {new Date(backupToRestore.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                
                                                <h5 className="text-[10px] font-mono uppercase text-primary font-bold">{isArabic ? 'مكونات الملف المستورد:' : 'Roster Snapshot Inventory:'}</h5>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-zinc-900 p-2 rounded-lg flex justify-between">
                                                        <span className="text-zinc-500">{isArabic ? 'الطلاب:' : 'Students:'}</span>
                                                        <span className="font-mono font-bold text-foreground">{(backupToRestore.localStudents || []).length}</span>
                                                    </div>
                                                    <div className="bg-zinc-900 p-2 rounded-lg flex justify-between">
                                                        <span className="text-zinc-500">{isArabic ? 'الخطط الإضافية:' : 'Plans:'}</span>
                                                        <span className="font-mono font-bold text-foreground">{(backupToRestore.localPlans || []).length}</span>
                                                    </div>
                                                    <div className="bg-zinc-900 p-2 rounded-lg flex justify-between">
                                                        <span className="text-zinc-500">{isArabic ? 'العمليات المالية:' : 'Payments:'}</span>
                                                        <span className="font-mono font-bold text-foreground">{(backupToRestore.localTransactions || []).length}</span>
                                                    </div>
                                                    <div className="bg-zinc-900 p-2 rounded-lg flex justify-between">
                                                        <span className="text-zinc-500">{isArabic ? 'جدول الحضور:' : 'Attendance:'}</span>
                                                        <span className="font-mono font-bold text-foreground">{(backupToRestore.localAttendance || []).length}</span>
                                                    </div>
                                                    <div className="bg-zinc-900 p-2 rounded-lg flex justify-between col-span-2">
                                                        <span className="text-zinc-500">{isArabic ? 'الكورسات المصاحبة:' : 'Courses & Metadata:'}</span>
                                                        <span className="font-mono font-bold text-primary">{(backupToRestore.courses || []).length} {isArabic ? 'كورس' : 'courses'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="outline" size="sm" onClick={() => { setRestoreStep('idle'); setBackupToRestore(null); }} className="border-zinc-800 text-xs">
                                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={executeRestoreUABK} className="text-xs font-bold font-mono uppercase">
                                                    {isArabic ? 'تنفيذ الاستعادة الآن' : 'Execute Restore'}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {restoreStep === 'restoring' && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="py-12 flex flex-col items-center justify-center gap-4"
                                        >
                                            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            <div className="text-center">
                                                <h4 className="text-sm font-bold font-mono text-foreground uppercase tracking-wider">{isArabic ? 'جاري استيراد الأرشيف...' : 'Restoring Database...'}</h4>
                                                <p className="text-xs text-zinc-500 mt-1">{isArabic ? 'يرجى الانتظار، جاري تنشيط قاعدة البيانات وتهيئة المزامنة السحابية.' : 'Rebuilding indexes, syncing ledger models, and preparing Firestore pipeline.'}</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {restoreStep === 'done' && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="py-10 flex flex-col items-center justify-center gap-4 text-center"
                                        >
                                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                <Check className="h-6 w-6 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wider">{isArabic ? 'اكتملت الاستعادة بنجاح!' : 'Restoration Successful!'}</h4>
                                                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                                                    {isArabic 
                                                        ? 'تم ملء السجلات بنجاح في ذاكرة المتصفح النشطة وبدأت المزامنة التلقائية مع السحابة.'
                                                        : 'Your local master storage has been fully updated. The app is executing background synchronization to the cloud.'}
                                                </p>
                                            </div>
                                            <Button size="sm" onClick={() => { setRestoreStep('idle'); setBackupToRestore(null); }} className="bg-primary text-zinc-950 font-bold text-xs mt-2">
                                                {isArabic ? 'إغلاق' : 'Dismiss'}
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}

function TeacherDisasterRecoverySection({ teacherId, isArabic }: { teacherId: string; isArabic: boolean }) {
    return (
        <LocalDataProvider teacherId={teacherId}>
            <TeacherDisasterRecoveryContent teacherId={teacherId} isArabic={isArabic} />
        </LocalDataProvider>
    );
}

export default function SettingsPage() {
    const { i18n, t } = useTranslation();
    const { user, isUserLoading } = useUser();
    const [studentId, setStudentId] = useState<string | null>(null);
    const [assistantTeacherName, setAssistantTeacherName] = useState<string | null>(null);
    const isArabic = i18n.language === 'ar';
    const isAssistant = !!assistantTeacherName;
    const isUserStudent = !!(user && (isStudentEmail(user.email) || user.isAnonymous));
    const isTeacherPotential = user && !user.isAnonymous && !isAssistant && !isUserStudent && !studentId;

    const effectiveStudentId = studentId || (isUserStudent && user ? user.uid : null);
    const { student: cloudStudent, isLoading: isStudentLoading } = useStudent(effectiveStudentId);
    const [localStudent, setLocalStudent] = useState<any>(null);
    const firestore = useFirestore();
    const router = useRouter();
    
    // Notifications default to enabled and synchronize with localStorage
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('notifications_enabled');
            return stored !== 'false';
        }
        return true;
    });

    useEffect(() => {
        localStorage.setItem('notifications_enabled', String(notificationsEnabled));
    }, [notificationsEnabled]);

    useEffect(() => {
        const storedStudentId = localStorage.getItem('viewingStudentId');
        const resolvedStudentId = storedStudentId || (user && isStudentEmail(user.email) ? user.uid : null);
        if (resolvedStudentId) {
            setStudentId(resolvedStudentId);
            const storedProfile = localStorage.getItem('student_profile_offline_' + resolvedStudentId) || localStorage.getItem('cached_student_profile_' + resolvedStudentId);
            if (storedProfile) {
                try {
                    setLocalStudent(JSON.parse(storedProfile));
                } catch (e) {
                    console.error("Local student profile parse error:", e);
                }
            }
        }
        const storedAssistantTeacher = localStorage.getItem('assistantTeacherName');
        if (storedAssistantTeacher) {
            setAssistantTeacherName(storedAssistantTeacher);
        }
    }, [user, isUserLoading]);
    
    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !isTeacherPotential || !user) return null;
        return doc(firestore, 'teachers', user.uid);
    }, [firestore, isTeacherPotential, user]);
    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    const isTeacher = !!(isTeacherPotential && teacher);

    const auth = useAuth();
    const { toast } = useToast();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            if (auth) {
                await auth.signOut();
            } else {
                const globalAuth = getAuth();
                await signOut(globalAuth);
            }
        } catch (e) {
            console.error("Signout error:", e);
        }

        try {
            clearAllStudentAuthSessions();
        } catch (e) {
            console.error("Storage clear error:", e);
        }

        toast({
            title: isArabic ? 'تم تسجيل الخروج بنجاح' : 'Logged Out Successfully',
            description: isArabic ? 'نراك قريباً في ملخصاتي!' : 'See you soon on Mola5saty!',
        });

        // Use window.location.href to perform a clean state refresh upon signout
        window.location.href = '/signup-options';
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
    };

    const student = cloudStudent || localStudent;
    const isLoading = isUserLoading || isStudentLoading || isTeacherLoading;
    
    let displayName = isArabic ? 'مستخدم زائر' : 'Guest User';
    let displayDetail = isArabic ? 'لم يتم تسجيل الدخول' : 'Not logged in';
    let avatarUrl: string | undefined = undefined;

    if (isAssistant) {
        displayName = isArabic ? 'مساعد' : 'Assistant';
        displayDetail = isArabic ? `مساعد للمعلم: ${assistantTeacherName}` : `Assisting: ${assistantTeacherName}`;
    } else if (isTeacher) {
        displayName = teacher?.name || (isArabic ? 'المعلم' : 'Teacher');
        displayDetail = teacher?.email || (isArabic ? 'حساب المعلم' : 'Teacher Account');
        avatarUrl = teacher?.profilePictureUrl;
    } else if (student || isUserStudent) {
        displayName = student?.name || user?.displayName || (student?.barcodeId ? `Student [${student.barcodeId}]` : (user?.email && isStudentEmail(user.email) ? `Student [${getStudentBarcodeFromEmail(user.email)}]` : (isArabic ? 'طالب جامعي' : 'University Scholar')));
        const academicParts = [
            student?.university,
            student?.facultyLabel || student?.facultyCategory,
            student?.academicYearLabel || (student?.academicYear ? (isArabic ? 'الفرقة الجامعية' : 'University Year') : '')
        ].filter(Boolean);
        displayDetail = academicParts.length > 0 ? academicParts.join(' • ') : (isArabic ? 'حساب طالب جامعي' : 'University Student Account');
    }

    const isLoggedIn = user || studentId || isAssistant;
    const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

    const navGroups = [
        {
            title: isArabic ? 'الحساب والتفضيلات' : 'Account & Preferences',
            items: [
                { id: 'lang', icon: Globe, title: isArabic ? 'اللغة' : 'Language', description: i18n.language === 'ar' ? 'العربية' : 'English', action: toggleLanguage },
                { id: 'notif', icon: Bell, title: isArabic ? 'الإشعارات' : 'Notifications', description: isArabic ? 'تشغيل الإشعارات المباشرة' : 'Push notifications', isToggle: true, state: notificationsEnabled, setState: setNotificationsEnabled },
                { id: 'privacy', href: '/privacy-policy', icon: Shield, title: isArabic ? 'سياسة الخصوصية' : 'Privacy Policy', description: isArabic ? 'التعامل مع البيانات والخصوصية المضمونة' : 'Data handling & security' },
            ]
        },
        {
            title: isArabic ? 'الدعم والمعلومات' : 'Support & Information',
            items: [
                { id: 'support', href: '/support', icon: LifeBuoy, title: isArabic ? 'مركز الدعم والمساعدة' : 'Support', description: isArabic ? 'تواصل معنا للمساعدة الفورية' : 'Help center & contact' },
                { id: 'terms', href: '/terms-of-service', icon: FileText, title: isArabic ? 'شروط الخدمة' : 'Terms of Service', description: isArabic ? 'القواعد والمبادئ التوجيهية' : 'Rules & guidelines' },
                { id: 'terms-cond', href: '/terms-and-conditions', icon: Scale, title: isArabic ? 'الشروط والأحكام العامة' : 'Terms & Conditions', description: isArabic ? 'قواعد استخدام المنصة والمسؤولية القانونية' : 'Platform utilization rules & compliance' },
                { id: 'copyright', href: '/copyright', icon: Copyright, title: isArabic ? 'حقوق النشر والملكية الفكرية' : 'Copyright & IP', description: isArabic ? 'حماية ابتكارات المنصة وقوانينها' : 'Proprietary designs & IP laws' }
            ]
        }
    ];
    
    return (
        <div 
            className="p-4 md:p-6 max-w-2xl mx-auto space-y-8 mb-20"
            dir={isArabic ? 'rtl' : 'ltr'}
            style={{ fontFamily: isArabic ? "'Cairo', sans-serif" : "'Inter', sans-serif" }}
        >
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{isArabic ? 'الإعدادات' : 'Settings'}</h1>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass-card overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {isLoading ? (
                                    <Skeleton className="h-16 w-16 rounded-full" />
                                ) : (
                                    <Avatar className="h-16 w-16 border border-border shadow-sm">
                                        <AvatarImage src={avatarUrl} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{displayName.charAt(0) || <UserIcon className="w-6 h-6"/>}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className="flex-grow">
                                    {isLoading ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-32"/>
                                            <Skeleton className="h-4 w-48"/>
                                        </div>
                                    ) : (
                                         <div>
                                            <h2 className="text-xl font-bold">{displayName}</h2>
                                            <p className="text-muted-foreground text-sm">{displayDetail}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Show QR Code for Students */}
                            {student && student.barcodeId && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-zinc-200 shadow-sm hover:scale-[1.03] transition-all duration-300 self-start sm:self-auto" id="student-settings-qr">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${student.barcodeId}`}
                                        alt={student.barcodeId}
                                        className="w-12 h-12 object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="text-left font-mono text-zinc-900 select-all leading-none">
                                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{isArabic ? 'كود الطالب' : 'Student ID'}</div>
                                        <div className="text-sm font-bold mt-1 text-[#22c55e]">{student.barcodeId}</div>
                                    </div>
                                </div>
                            )}

                            {isLoggedIn ? (
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={handleLogout} 
                                    title={isArabic ? 'تسجيل الخروج' : 'Log Out'} 
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto cursor-pointer"
                                >
                                    <LogOut className="w-5 h-5"/>
                                </Button>
                            ) : (
                                <Button asChild variant="default" size="sm">
                                    <Link href="/signup-options">{isArabic ? 'تسجيل الدخول' : 'Log In'}</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Teacher Disaster Recovery Card */}
            {isTeacherPotential && user && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <TeacherDisasterRecoverySection teacherId={user.uid} isArabic={isArabic} />
                </motion.div>
            )}

            <div className="space-y-6">
                {navGroups.map((group, gIndex) => (
                    <motion.div key={group.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + gIndex * 0.1 }}>
                        <h3 className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2", isArabic ? "text-right" : "text-left")}>{group.title}</h3>
                        <Card className="glass-card overflow-hidden">
                            <div className="divide-y divide-border/50">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const content = (
                                        <div className="flex items-center gap-4 py-4 px-6 hover:bg-muted/30 transition-colors w-full cursor-pointer">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className={cn("flex-grow", isArabic ? "text-right" : "text-left")}>
                                                <p className="font-medium text-sm sm:text-base">{item.title}</p>
                                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                            </div>
                                            {item.isToggle ? (
                                                <Switch checked={item.state} onCheckedChange={item.setState} onClick={(e) => e.stopPropagation()} />
                                            ) : (
                                                <ChevronIcon className="w-5 h-5 text-muted-foreground/50" />
                                            )}
                                        </div>
                                    );

                                    if (item.href) {
                                        return <Link key={item.id} href={item.href} className="block">{content}</Link>;
                                    }
                                    return <div key={item.id} onClick={item.action} role="button" tabIndex={0} className="w-full">{content}</div>;
                                })}
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Prominent Log Out Action */}
            {isLoggedIn && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <Card className="glass-card overflow-hidden border-destructive/20 bg-destructive/[0.03] hover:bg-destructive/[0.06] transition-colors">
                        <CardContent className="p-4">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-destructive hover:text-red-500 transition-colors cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>{isArabic ? 'تسجيل الخروج من الحساب' : 'Log Out of Account'}</span>
                            </button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center pt-8">
                <p className="text-xs text-muted-foreground">{isArabic ? 'منصة ملخصاتي الجامعية — الإصدار 4.0' : 'Mola5saty University Platform — v4.0'}</p>
            </motion.div>
        </div>
    );
}
