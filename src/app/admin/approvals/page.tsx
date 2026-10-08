
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, writeBatch } from 'firebase/firestore';
import type { Teacher, Student } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, UserX, AlertTriangle, Loader2, Users, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

type AdminSession = { name: string; role: string };

export default function CenterApprovalsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [sessionUser, setSessionUser] = useState<AdminSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Cleanup state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const teachersRequestingQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teachers'));
    }, [firestore]);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'));
    }, [firestore]);

    const { data: requestingTeachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersRequestingQuery);
    const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

    useEffect(() => {
        const sessionData = localStorage.getItem('admin-session');

        if (sessionData) {
            const parsedSession: AdminSession = JSON.parse(sessionData);
            if(parsedSession.role === 'S Admin' || parsedSession.role === 'Manager') {
                 setSessionUser(parsedSession);
            } else {
                 router.replace('/admin/access');
            }
        } else {
            router.replace('/admin/access');
        }
        setIsLoading(false);
    }, [router]);

    const handleDeleteAllStudents = async () => {
        if (!firestore) return;
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            toast({
                title: t('Confirmation Required'),
                description: t("Please type 'DELETE' to confirm deletion."),
                variant: 'destructive',
            });
            return;
        }

        setIsDeleting(true);
        toast({
            title: t('Cleaning up database...'),
            description: t('Removing all student documents and sync data from Firestore.'),
        });

        try {
            const studentsSnap = await getDocs(collection(firestore, 'students'));
            const syncSnap = await getDocs(collection(firestore, 'studentSyncData'));

            const docRefs = [
                ...studentsSnap.docs.map((d) => d.ref),
                ...syncSnap.docs.map((d) => d.ref),
            ];

            const totalCount = studentsSnap.size;

            const BATCH_SIZE = 400;
            for (let i = 0; i < docRefs.length; i += BATCH_SIZE) {
                const chunk = docRefs.slice(i, i + BATCH_SIZE);
                const batch = writeBatch(firestore);
                chunk.forEach((ref) => batch.delete(ref));
                await batch.commit();
            }

            try {
                localStorage.removeItem('app_students');
                localStorage.removeItem('students');
                localStorage.removeItem('studentSyncData');
                localStorage.removeItem('offline_students');
            } catch (e) {
                console.error('LocalStorage cleanup notice:', e);
            }

            setIsConfirmModalOpen(false);
            setConfirmText('');
            toast({
                title: t('Students Wiped Successfully'),
                description: `${t('Successfully deleted')} ${totalCount} ${t('students from the database.')}`,
            });
        } catch (err: any) {
            console.error('Error deleting all students:', err);
            toast({
                title: t('Deletion Error'),
                description: err.message || t('Failed to delete students.'),
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };
    
    if(isLoading || teachersLoading) {
        return (
            <div className="p-4 md:p-8 space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
            {/* Temporary Student Database Cleanup Card */}
            <Card className="border-destructive/60 bg-gradient-to-br from-card via-card to-destructive/10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-destructive via-amber-500 to-destructive animate-pulse" />
                <CardHeader className="pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive">
                                <UserX className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl font-black text-destructive flex items-center gap-2">
                                        {t('Database Student Cleanup Tool')}
                                    </CardTitle>
                                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 font-mono text-[10px] uppercase">
                                        {t('Temporary Admin Utility')}
                                    </Badge>
                                </div>
                                <CardDescription className="text-sm mt-0.5">
                                    {t('Wipe test/temporary student accounts from Firestore before launch so new real students can enroll.')}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant="secondary" className="px-3 py-1.5 font-mono text-xs flex items-center gap-1.5 bg-background/80 border border-border">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>{t('Students in DB')}:</span>
                            <span className="font-bold text-foreground">
                                {studentsLoading ? '...' : (allStudents?.length || 0)}
                            </span>
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-amber-300">
                                {t('Important Notice Before Launch Cleanup')}
                            </p>
                            <p className="text-amber-200/80 leading-relaxed">
                                {t('This action will permanently delete all student accounts and their synced data from Firestore. This allows a completely clean setup for genuine student registrations.')}
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {t('This tool deletes both student profiles and student sync data.')}
                    </p>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            setConfirmText('');
                            setIsConfirmModalOpen(true);
                        }}
                        disabled={!allStudents || allStudents.length === 0}
                        className="font-bold shadow-lg shadow-destructive/20 gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>{t('Delete All Current Students')}</span>
                        {allStudents && allStudents.length > 0 && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-white/20 text-white">
                                {allStudents.length}
                            </Badge>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {/* Teacher Accounts & Approval Requests Card */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <UserPlus className="w-5 h-5 text-blue-500" />
                            {t('Teacher & Professor Approvals')}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">
                            {requestingTeachers?.length || 0} {t('Total Accounts')}
                        </Badge>
                    </div>
                    <CardDescription>
                        {t('Approve new professor applications, verify academic credentials, and activate teacher dashboards.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {requestingTeachers && requestingTeachers.length > 0 ? (
                        <div className="space-y-3">
                           {requestingTeachers.map((teacherDoc) => {
                               const isApproved = teacherDoc.approved !== false;
                               return (
                                   <div key={teacherDoc.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                       <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                                               {teacherDoc.name ? teacherDoc.name.charAt(0) : 'T'}
                                           </div>
                                           <div className="space-y-0.5">
                                               <div className="flex items-center gap-2">
                                                   <h3 className="font-bold text-sm text-foreground">{teacherDoc.name || 'Unnamed Teacher'}</h3>
                                                   {isApproved ? (
                                                       <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                                                           {t('Approved & Active')}
                                                       </Badge>
                                                   ) : (
                                                       <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] animate-pulse">
                                                           {t('Pending Approval')}
                                                       </Badge>
                                                   )}
                                               </div>
                                               <p className="text-xs text-muted-foreground font-mono">{teacherDoc.email}</p>
                                               {teacherDoc.subjects && teacherDoc.subjects.length > 0 && (
                                                   <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                                       {teacherDoc.subjects.join(', ')}
                                                   </p>
                                               )}
                                           </div>
                                       </div>

                                       <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                           {!isApproved ? (
                                               <Button
                                                   size="sm"
                                                   onClick={async () => {
                                                       if (!firestore) return;
                                                       try {
                                                           const { doc, updateDoc } = await import('firebase/firestore');
                                                           await updateDoc(doc(firestore, 'teachers', teacherDoc.id), { approved: true });
                                                           toast({ title: t('Teacher Approved!'), description: `${teacherDoc.name} ${t('is now active.')}` });
                                                       } catch (e: any) {
                                                           toast({ variant: 'destructive', title: t('Error'), description: e.message });
                                                       }
                                                   }}
                                                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                               >
                                                   <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                   {t('Approve Account')}
                                               </Button>
                                           ) : (
                                               <Button
                                                   size="sm"
                                                   variant="outline"
                                                   onClick={async () => {
                                                       if (!firestore) return;
                                                       try {
                                                           const { doc, updateDoc } = await import('firebase/firestore');
                                                           await updateDoc(doc(firestore, 'teachers', teacherDoc.id), { approved: false });
                                                           toast({ title: t('Status Updated'), description: `${teacherDoc.name} ${t('set to pending.')}` });
                                                       } catch (e: any) {
                                                           toast({ variant: 'destructive', title: t('Error'), description: e.message });
                                                       }
                                                   }}
                                                   className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 text-xs font-semibold"
                                               >
                                                   {t('Set Pending')}
                                               </Button>
                                           )}

                                           <Button
                                               size="sm"
                                               variant="destructive"
                                               onClick={async () => {
                                                   if (!firestore) return;
                                                   try {
                                                       const { doc, deleteDoc } = await import('firebase/firestore');
                                                       await deleteDoc(doc(firestore, 'teachers', teacherDoc.id));
                                                       try {
                                                           await deleteDoc(doc(firestore, 'users', teacherDoc.id));
                                                       } catch (err) {}
                                                       toast({ title: t('Account Deleted'), description: `${teacherDoc.name} ${t('has been removed.')}` });
                                                   } catch (e: any) {
                                                       toast({ variant: 'destructive', title: t('Error'), description: e.message });
                                                   }
                                               }}
                                               className="text-xs font-bold"
                                           >
                                               <Trash2 className="w-3.5 h-3.5" />
                                           </Button>
                                       </div>
                                   </div>
                               );
                           })}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-10 text-sm">
                            {t('No teacher applications found in database.')}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Alert Dialog */}
            <AlertDialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <AlertDialogContent className="bg-card border-destructive/50 max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-bold">
                            <UserX className="w-6 h-6 text-destructive" />
                            {t('Delete All Students in Database?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground/90 space-y-3 pt-2">
                            <span className="block font-semibold text-destructive">
                                {t('⚠️ WARNING: You are about to permanently delete all')} {allStudents?.length || 0} {t('registered student records from the database.')}
                            </span>
                            <span className="block text-xs text-muted-foreground leading-relaxed">
                                {t('Student login documents and sync data will be completely wiped. This allows new actual students to join fresh. This action cannot be undone.')}
                            </span>
                            <span className="block pt-2 space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    {t("Type 'DELETE' to confirm:")}
                                </Label>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="bg-background border-destructive/50 font-mono text-sm tracking-wider uppercase text-destructive focus-visible:ring-destructive"
                                    autoFocus
                                />
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
                        <AlertDialogCancel
                            onClick={() => {
                                setConfirmText('');
                                setIsConfirmModalOpen(false);
                            }}
                            disabled={isDeleting}
                        >
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAllStudents}
                            disabled={isDeleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                            className="bg-destructive hover:bg-destructive/90 font-bold gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('Deleting...')}
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    {t('Permanently Delete All Students')}
                                </>
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

