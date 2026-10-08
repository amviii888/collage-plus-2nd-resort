
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDocs, deleteDoc, query, updateDoc, where } from 'firebase/firestore';
import type { Student, Teacher, Transaction, Hub, AttendanceRecord, Center, EnrollmentPlan, StudentSubscription, DataCategoryId, Aide } from '@/lib/types';
import { dataCategories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { DollarSign, TrendingUp, Users, AlertCircle, PieChart, Building, Send, Instagram, Facebook, Video, Download, Trash2, Phone, MessageSquare, CalendarDays, FileDown, UserCheck, CalculatorIcon, Calendar as CalendarIcon, Edit, ShieldCheck, ShieldAlert, Ban, UserPlus, Search, LogOut, Eye, EyeOff, FlaskConical, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Calculator } from '@/components/admin/education/Calculator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { BroadcastMessageModal } from '@/components/admin/education/BroadcastMessageModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ExportPhonesModal } from '@/components/admin/education/ExportPhonesModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { PercentageCalculator } from '@/components/admin/education/PercentageCalculator';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRange } from 'react-day-picker';
import { BiometricManager } from '@/components/admin/education/BiometricManager';

type AdminSession = { id: string; name: string; role: string; };

const StatCard = ({ title, value, icon, isLoading, description, variant = 'default', href }: { title: string, value: string | number, icon: React.ReactNode, isLoading: boolean, description?: string, variant?: 'default' | 'destructive', href?: string }) => {
    const cardContent = (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className={`text-2xl font-bold ${variant === 'destructive' ? 'text-destructive' : ''}`}>{value}</div>}
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href} className="hover:opacity-80 transition-opacity">{cardContent}</Link>;
    }
    
    return cardContent;
};


const AnalyticsItem = ({ label, value, isCurrency = false }: { label: string, value: string | number, isCurrency?: boolean }) => (
    <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{isCurrency && '£'}{value}</p>
    </div>
);

type StudentInDebt = Student & { lastCheckIn?: string };

const getTotalDebt = (subscriptions: StudentSubscription[] = []) => {
    return subscriptions.reduce((acc, sub) => acc + (sub.remaining || 0), 0);
};

export default function ManagementPage() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isResetPromptOpen, setIsResetPromptOpen] = useState(false);
    const [resetPasswordInput, setResetPasswordInput] = useState('');
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [isExportPhonesModalOpen, setIsExportPhonesModalOpen] = useState(false);
    const [debtPlanFilter, setDebtPlanFilter] = useState('all');
    const [hiddenAccountsSearch, setHiddenAccountsSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [hiddenAccountsType, setHiddenAccountsType] = useState<'student' | 'teacher'>('student');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(hiddenAccountsSearch);
        }, 500);
        return () => clearTimeout(handler);
    }, [hiddenAccountsSearch]);
    
    const [socials, setSocials] = useState({
        instagramUrl: '',
        facebookUrl: '',
        tiktokUrl: '',
        socialNote: '',
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    
    const [dataToReset, setDataToReset] = useState<Set<DataCategoryId>>(new Set());
    const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
    const [isDeleteAllStudentsModalOpen, setIsDeleteAllStudentsModalOpen] = useState(false);
    const [deleteStudentsConfirmText, setDeleteStudentsConfirmText] = useState('');
    const [isDeletingAllStudents, setIsDeletingAllStudents] = useState(false);
    const [deleteTargetAccount, setDeleteTargetAccount] = useState<{ id: string; name: string; type: 'student' | 'teacher'; codeOrEmail?: string } | null>(null);
    const [isDeletingTarget, setIsDeletingTarget] = useState(false);
    
    const [sessionUser, setSessionUser] = useState<AdminSession | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        try {
            const sessionData = localStorage.getItem('admin-session');
            if (sessionData) {
                const parsedSession: AdminSession = JSON.parse(sessionData);
                if (parsedSession.role !== 'S Admin' && parsedSession.role !== 'Manager') {
                    router.replace('/admin/check-in'); // Redirect non-admins
                } else {
                    setSessionUser(parsedSession);
                }
            } else {
                router.replace('/admin/access');
            }
        } catch (e) {
            console.error("Session check failed", e);
            router.replace('/admin/access');
        }
        setIsAuthChecking(false);
    }, [router]);


    const isSuperAdmin = useMemo(() => sessionUser?.role === 'S Admin', [sessionUser]);


    const MOCK_HUB: Hub = {
        id: 'main-hub',
        name: 'Main Education Hub',
        ...socials
    };
    
    const allStudentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'students'));
    }, [firestore]);

    const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(allStudentsQuery);

    const allTeachersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teachers'));
    }, [firestore]);

    const { data: allTeachers, isLoading: teachersLoading } = useCollection<Teacher>(allTeachersQuery);
    
    const allAidesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, `hubs/${MOCK_HUB.id}/aides`));
    }, [firestore, MOCK_HUB.id]);
    const { data: allAides, isLoading: aidesLoading } = useCollection<Aide>(allAidesQuery);

    const allTransactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, `hubs/${MOCK_HUB.id}/transactions`));
    }, [firestore, MOCK_HUB.id]);

    const { data: allTransactions, isLoading: transactionsLoading } = useCollection<Transaction>(allTransactionsQuery);
    
    const allCheckInsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, `hubs/${MOCK_HUB.id}/attendance`));
    }, [firestore, MOCK_HUB.id]);

    const { data: allCheckIns, isLoading: checkInsLoading } = useCollection<AttendanceRecord>(allCheckInsQuery);
    
    const plansCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${MOCK_HUB.id}/plans`) : null, [firestore, MOCK_HUB.id]);
    const { data: plans, isLoading: plansLoading } = useCollection<EnrollmentPlan>(plansCollectionRef);
    
    const isLoading = studentsLoading || teachersLoading || transactionsLoading || checkInsLoading || plansLoading || aidesLoading;

    const periodTransactions = useMemo(() => {
        if (!allTransactions || !dateRange?.from) return [];
        const interval = { start: dateRange.from, end: dateRange.to || dateRange.from };
        return allTransactions.filter(t => isWithinInterval(new Date(t.date), interval));
    }, [allTransactions, dateRange]);

    const periodCheckIns = useMemo(() => {
        if (!allCheckIns || !dateRange?.from) return [];
        const interval = { start: dateRange.from, end: dateRange.to || dateRange.from };
        return allCheckIns.filter(t => isWithinInterval(new Date(t.checkInTime), interval));
    }, [allCheckIns, dateRange]);


    const revenueSummary = useMemo(() => {
        if (!periodTransactions) return { range: 0 };
        const totalRevenue = periodTransactions.reduce((acc, trans) => acc + trans.paidAmount, 0);
        return { range: totalRevenue };
    }, [periodTransactions]);
    
    const monthlyStats = useMemo(() => {
        if (!allTransactions) return { newEnrollments: 0 };
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const newEnrollments = allTransactions.filter(t => {
            const transDate = new Date(t.date);
            return t.type === 'New Enrollment' && isWithinInterval(transDate, { start: monthStart, end: monthEnd });
        }).length;
        return { newEnrollments };
    }, [allTransactions]);

    const debtSummary = useMemo(() => {
        if (!allStudents || !allCheckIns) return { totalDebt: 0, studentsInDebt: [] as StudentInDebt[] };
    
        const lastCheckInMap = new Map<string, string>();
        allCheckIns
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
        .forEach(checkIn => {
            if (!checkIn.barcodeId) return;
            if (!lastCheckInMap.has(checkIn.barcodeId)) {
            lastCheckInMap.set(checkIn.barcodeId, checkIn.checkInTime);
            }
        });
    
        let studentsInDebt: StudentInDebt[] = allStudents
        .filter(student => getTotalDebt(student.activeSubscriptions) > 0)
        .map(student => ({
            ...student,
            lastCheckIn: lastCheckInMap.get(student.barcodeId)
        }));
    
        if (debtPlanFilter !== 'all') {
        studentsInDebt = studentsInDebt.filter(s => s.activeSubscriptions?.some(sub => sub.planId === debtPlanFilter && sub.remaining > 0));
        }
    
        const totalDebt = allStudents.reduce((acc, student) => acc + getTotalDebt(student.activeSubscriptions), 0);
    
        return { 
        totalDebt, 
        studentsInDebt: studentsInDebt.sort((a, b) => getTotalDebt(b.activeSubscriptions || []) - getTotalDebt(a.activeSubscriptions || [])) 
        };
    }, [allStudents, allCheckIns, debtPlanFilter]);
  
    const newMemberAndRenewalStats = useMemo(() => {
        if (!periodTransactions) return { new: 0, renewals: 0 };
        return periodTransactions.reduce((acc, trans) => {
        if (trans.type === 'New Enrollment') acc.new += 1;
        else if (trans.type === 'Extend/Payment') acc.renewals += 1;
        return acc;
        }, { new: 0, renewals: 0 });
    }, [periodTransactions]);

    const planAndMemberAnalytics = useMemo(() => {
        if (!allStudents) return { byPlan: {}, paymentStatus: { paidInFull: 0, owes: 0 } };
    
        const byPlan = allStudents.reduce((acc, member) => {
        member.activeSubscriptions?.forEach(sub => {
            const planName = t(sub.planName) || 'Unknown Plan';
            acc[planName] = (acc[planName] || 0) + 1;
        });
        return acc;
        }, {} as Record<string, number>);
    
        const paymentStatus = allStudents.reduce((acc, member) => {
        const totalDebt = getTotalDebt(member.activeSubscriptions);
        if (totalDebt > 0) {
            acc.owes += 1;
        } else {
            acc.paidInFull += 1;
        }
        return acc;
        }, { paidInFull: 0, owes: 0 });
    
        return { byPlan, paymentStatus };
    }, [allStudents, t]);
  
    const checkInAnalytics = useMemo(() => {
        if (!periodCheckIns) return { totalCheckIns: 0, byPlan: {} };

        const byPlan = periodCheckIns.reduce((acc, checkIn) => {
            const planName = t(checkIn.planName) || 'Unknown Plan';
            acc[planName] = (acc[planName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return { totalCheckIns: periodCheckIns.length, byPlan };

    }, [periodCheckIns, t]);
    
    const handleResetPasswordConfirm = () => {
        if (resetPasswordInput.toLowerCase() === 'reset') {
            setIsResetPromptOpen(false);
            setResetPasswordInput('');
            setIsResetDataModalOpen(true);
        } else {
            toast({ title: t("Incorrect Confirmation"), description: t("Please type 'reset' to confirm."), variant: "destructive" });
            setResetPasswordInput('');
        }
    };
    
    const handleToggleResetAll = (checked: boolean | 'indeterminate') => {
        const allCategories = dataCategories.map(c => c.id);
        setDataToReset(checked ? new Set(allCategories) : new Set());
    };

    const handleResetData = async () => {
        if (!firestore || dataToReset.size === 0) {
            toast({ title: t("No data selected"), description: t("Please select at least one category to reset."), variant: "destructive"});
            return;
        };

        setIsResetDataModalOpen(false);
        toast({ title: t("Resetting selected data..."), description: t("This may take a moment.") });

        try {
            const batch = writeBatch(firestore);

            const clearCollection = async (collectionName: string) => {
                const isRoot = collectionName === 'students';
                const path = isRoot ? collectionName : `hubs/${MOCK_HUB.id}/${collectionName}`;
                const collectionRef = collection(firestore, path);
                const snapshot = await getDocs(collectionRef);
                snapshot.forEach(doc => batch.delete(doc.ref));
            };
            
            const clearAides = async () => {
                 const aidesRef = collection(firestore, `hubs/${MOCK_HUB.id}/aides`);
                 const q = query(aidesRef, where('role', '!=', 'S Admin'));
                 const snapshot = await getDocs(q);
                 snapshot.forEach(doc => batch.delete(doc.ref));
            }

            if (dataToReset.has('students')) await clearCollection('students');
            if (dataToReset.has('transactions')) await clearCollection('transactions');
            if (dataToReset.has('attendance')) await clearCollection('attendance');
            if (dataToReset.has('offers')) await clearCollection('offers');
            if (dataToReset.has('recordingOffers')) await clearCollection('recordingOffers');
            if (dataToReset.has('recordingBookings')) await clearCollection('recordingBookings');
            if (dataToReset.has('plans')) await clearCollection('plans');
            if (dataToReset.has('aides')) await clearAides();


            await batch.commit();
            
            toast({ title: t("Data Reset Successful"), description: t('Selected data has been cleared.') });
        } catch (error) {
            console.error("Error resetting data: ", error);
            toast({ title: t("Error"), description: t("Failed to reset data."), variant: "destructive" });
        }
        setDataToReset(new Set());
    };

    const handleDeleteAllStudents = async () => {
        if (!firestore) return;
        if (deleteStudentsConfirmText.trim().toUpperCase() !== 'DELETE') {
            toast({
                title: t('Confirmation required'),
                description: t("Please type 'DELETE' to confirm deletion."),
                variant: 'destructive',
            });
            return;
        }

        setIsDeletingAllStudents(true);
        toast({
            title: t('Deleting students...'),
            description: t('Removing all student records and sync data from database.'),
        });

        try {
            const studentsSnap = await getDocs(collection(firestore, 'students'));
            const syncSnap = await getDocs(collection(firestore, 'studentSyncData'));

            const allDocRefs = [
                ...studentsSnap.docs.map((d) => d.ref),
                ...syncSnap.docs.map((d) => d.ref),
            ];

            const totalCount = studentsSnap.size;

            const BATCH_SIZE = 400;
            for (let i = 0; i < allDocRefs.length; i += BATCH_SIZE) {
                const chunk = allDocRefs.slice(i, i + BATCH_SIZE);
                const batch = writeBatch(firestore);
                chunk.forEach((ref) => batch.delete(ref));
                await batch.commit();
            }

            setIsDeleteAllStudentsModalOpen(false);
            setDeleteStudentsConfirmText('');
            toast({
                title: t('All Students Deleted'),
                description: `${t('Successfully deleted')} ${totalCount} ${t('students. Their login documents are wiped.')}`,
            });
        } catch (err: any) {
            console.error('Error deleting all students:', err);
            toast({
                title: t('Deletion Error'),
                description: err.message || t('Failed to delete students.'),
                variant: 'destructive',
            });
        } finally {
            setIsDeletingAllStudents(false);
        }
    };
    
    const handleExportPhones = (message: string) => {
        if (!allStudents || allStudents.length === 0) {
            toast({ title: t("No Students"), description: t("There are no students to export."), variant: "destructive" });
            return;
        }
        
        const exportData = allStudents.map(student => ({
            Name: student.name,
            Phone: student.phoneNumber,
            Message: message,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        
        saveAs(data, `student_phones_${MOCK_HUB.name.replace(/ /g, '_')}.xlsx`);
        
        toast({ title: t("Export Successful"), description: `${allStudents.length} ${t("students' phone numbers exported.")}` });
        setIsExportPhonesModalOpen(false);
    };

    const handleExportAllData = () => {
        if (isLoading) {
            toast({ title: t("Please wait"), description: t("Data is still loading."), variant: "destructive" });
            return;
        }

        const wb = XLSX.utils.book_new();
        if (allStudents) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allStudents), "Students");
        if (allTransactions) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allTransactions), "Transactions");
        if (allCheckIns) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allCheckIns), "Attendance");
        if (plans) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plans), "Plans");
        if (allAides) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allAides.map(({ password, ...rest }: any) => rest)), "Aides");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        saveAs(dataBlob, `${MOCK_HUB.name.replace(/ /g, '_')}_full_backup.xlsx`);
        toast({ title: t("Full Data Export Successful"), description: t("All hub data has been exported.") });
    };

    const handleToggleHiddenAccount = async (id: string, isStudent: boolean, currentValue: boolean) => {
        if (!firestore) return;
        try {
            const docRef = doc(firestore, isStudent ? 'students' : 'teachers', id);
            await updateDoc(docRef, { isHiddenAccount: !currentValue });
            toast({
                title: !currentValue ? t('Labeled as Testing Account') : t('Account Set to Public'),
                description: !currentValue 
                    ? t('This account is now hidden from the Leaderboard and Discover page.') 
                    : t('This account is now visible to everyone.'),
            });
        } catch (err: any) {
            toast({
                title: t('Error'),
                description: err.message || t('Failed to update visibility status.'),
                variant: 'destructive'
            });
        }
    };

    const handleToggleBanAccount = async (id: string, isStudent: boolean, currentIsBanned: boolean) => {
        if (!firestore) return;
        try {
            const docRef = doc(firestore, isStudent ? 'students' : 'teachers', id);
            await updateDoc(docRef, { 
                isBanned: !currentIsBanned,
                bannedAt: !currentIsBanned ? new Date().toISOString() : null,
                ipBanStatus: !currentIsBanned ? 'BANNED_IP' : 'ACTIVE'
            });
            toast({
                title: !currentIsBanned ? t('Account & IP Banned') : t('Account Unbanned'),
                description: !currentIsBanned 
                    ? t('This account and associated IP address have been blocked from logging in or checking in.') 
                    : t('This account has been unbanned and restored.'),
                variant: !currentIsBanned ? 'destructive' : 'default',
            });
        } catch (err: any) {
            toast({
                title: t('Error'),
                description: err.message || t('Failed to update ban status.'),
                variant: 'destructive',
            });
        }
    };

    const handleDeleteSpecificAccount = async () => {
        if (!firestore || !deleteTargetAccount) return;
        setIsDeletingTarget(true);
        try {
            const isStudent = deleteTargetAccount.type === 'student';
            const docRef = doc(firestore, isStudent ? 'students' : 'teachers', deleteTargetAccount.id);
            await deleteDoc(docRef);

            if (isStudent) {
                try {
                    const syncRef = doc(firestore, 'studentSyncData', deleteTargetAccount.id);
                    await deleteDoc(syncRef);
                } catch (syncErr) {
                    console.error("Sync document deletion error:", syncErr);
                }
            }

            toast({
                title: t('Account Deleted'),
                description: `${t('Successfully deleted account for')} ${deleteTargetAccount.name}.`,
            });
            setDeleteTargetAccount(null);
        } catch (err: any) {
            console.error('Error deleting account:', err);
            toast({
                title: t('Delete Error'),
                description: err.message || t('Failed to delete account.'),
                variant: 'destructive',
            });
        } finally {
            setIsDeletingTarget(false);
        }
    };
  
  const handleBroadcastMessage = async (message: string, from: string) => {
    if (!firestore || !allStudents || allStudents.length === 0) {
      toast({ title: t("No Students"), description: t("There are no students in this hub to send a message to."), variant: "destructive" });
      return;
    }

    toast({ title: t("Sending message..."), description: t("This may take a few moments.") });

    const batch = writeBatch(firestore);

    allStudents.forEach(student => {
      const studentRef = doc(firestore, `students`, student.id);
      batch.update(studentRef, { message: { text: message, from } });
    });

    try {
      await batch.commit();
      toast({ title: t("Message Sent"), description: `${t("The message has been sent to all")} ${allStudents.length} ${t("students.")}` });
      setIsBroadcastModalOpen(false);
    } catch (e) {
      console.error("Error broadcasting message:", e);
      toast({ title: t("Error"), description: t("Failed to send the message."), variant: "destructive" });
    }
  };

  const handleSocialsSave = async () => {
      if (!firestore) return;
      const hubRef = doc(firestore, `hubs/${MOCK_HUB.id}`);
      try {
          await updateDoc(hubRef, socials);
          toast({ title: t('Social Info Saved'), description: t('Your social media links and note have been updated.')});
      } catch (e) {
          console.error(e);
          toast({ title: t('Save Error'), variant: 'destructive'});
      }
  };

  const getTimeframeText = (range: DateRange | undefined) => {
    if (!range?.from) return t('No date selected');
    if (!range.to || isSameDay(range.from, range.to)) return format(range.from, 'PPP');
    return `${format(range.from, 'PP')} - ${format(range.to, 'PP')}`;
  }
  
  const handleLogout = () => {
    try {
      localStorage.removeItem('admin-session');
      router.push('/admin/access');
    } catch (e) {
      console.error("Session storage not available.");
      window.location.href = '/admin/access';
    }
  }

  if (isLoading || !sessionUser) {
      return (
          <div className="container mx-auto p-4 md:p-8 space-y-6">
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-96 w-full" />
          </div>
      )
  }

  return (
    <div className="space-y-6">
        {isSuperAdmin ? (
            <>
                 <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <CardTitle className="text-3xl font-bold tracking-tight">{t('S-Admin Management')}</CardTitle>
                                <CardDescription>{t("High-level overview, analytics, and administrative tools for the hub.")}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title={t("New Enrollments")} value={monthlyStats.newEnrollments} isLoading={isLoading} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} description={t('This month')} />
                    <StatCard title={t("Total Students")} value={isLoading ? '...' : `${allStudents?.length || 0}`} isLoading={isLoading} icon={<Users className="h-4 w-4 text-muted-foreground" />} description={t('All time')} />
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Aide Security</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BiometricManager aide={sessionUser as unknown as Aide} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>{t('Data Management')}</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <Button variant="outline" onClick={() => setIsExportPhonesModalOpen(true)}><FileDown className="mr-2 h-4 w-4"/> {t('Export Student Phones')}</Button>
                            <Button variant="secondary" onClick={handleExportAllData}><Download className="mr-2 h-4 w-4"/> {t('Export All Hub Data')}</Button>
                            
                            <div className="pt-2 border-t border-border/50">
                                <Button 
                                    variant="destructive" 
                                    className="w-full justify-center bg-red-600/90 hover:bg-red-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                                    onClick={() => {
                                        setDeleteStudentsConfirmText('');
                                        setIsDeleteAllStudentsModalOpen(true);
                                    }}
                                >
                                    <UserX className="w-4 h-4" />
                                    {t('Delete All Students (Temporary Pre-Launch Wipe)')}
                                </Button>
                                <p className="text-[11px] text-muted-foreground mt-1 text-center">
                                    {t('Temporary button: permanently wipes all student records before public app launch.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <PercentageCalculator />

                    {/* Testing & Demo Accounts (Hidden Accounts) */}
                    <Card className="glass-card shadow-lg border border-border/50 bg-[#131316]/75 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#22c55e]">
                                <FlaskConical className="w-5 h-5 text-[#22c55e]" />
                                {t('Testing & Demo Accounts (Hidden Accounts)')}
                            </CardTitle>
                            <CardDescription>
                                {t('Label accounts to be hidden from the public Leaderboard and Discover page. Testing accounts can log in normally but remain anonymous.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg w-full max-w-xs border border-zinc-800">
                                <Button
                                    type="button"
                                    variant={hiddenAccountsType === 'student' ? 'default' : 'ghost'}
                                    className={cn("w-1/2 font-semibold text-xs py-1.5 h-auto", hiddenAccountsType === 'student' ? "bg-[#22c55e] text-zinc-950 font-bold hover:bg-[#1eb053]" : "text-zinc-400 hover:text-zinc-200")}
                                    onClick={() => { setHiddenAccountsType('student'); setHiddenAccountsSearch(''); }}
                                >
                                    {t('Students')}
                                </Button>
                                <Button
                                    type="button"
                                    variant={hiddenAccountsType === 'teacher' ? 'default' : 'ghost'}
                                    className={cn("w-1/2 font-semibold text-xs py-1.5 h-auto", hiddenAccountsType === 'teacher' ? "bg-[#22c55e] text-zinc-950 font-bold hover:bg-[#1eb053]" : "text-zinc-400 hover:text-zinc-200")}
                                    onClick={() => { setHiddenAccountsType('teacher'); setHiddenAccountsSearch(''); }}
                                >
                                    {t('Teachers')}
                                </Button>
                            </div>

                            {hiddenAccountsType === 'student' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('Search student by code (e.g. 202401) or name...')}
                                            className="pl-9 bg-zinc-950 border-zinc-800 focus-visible:ring-primary text-zinc-200 placeholder:text-zinc-500"
                                            value={hiddenAccountsSearch}
                                            onChange={(e) => setHiddenAccountsSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* Search Results */}
                                    {debouncedSearch.trim().length > 0 && (
                                        <div className="space-y-2 border border-zinc-800 rounded-lg p-3 bg-zinc-950/40">
                                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('Search Results')}</h4>
                                            {(() => {
                                                const queryStr = debouncedSearch.toLowerCase().trim();
                                                const filtered = allStudents?.filter(s => 
                                                    (s.name || '').toLowerCase().includes(queryStr) || 
                                                    (s.barcodeId || '').toLowerCase().includes(queryStr)
                                                ) || [];

                                                if (filtered.length === 0) {
                                                    return <p className="text-xs text-muted-foreground py-2">{t('No students found matching your query.')}</p>;
                                                }

                                                return (
                                                    <div className="divide-y divide-zinc-800">
                                                        {filtered.slice(0, 10).map(studentDoc => {
                                                            const isHidden = (studentDoc as any).isHiddenAccount === true;
                                                            const isBanned = (studentDoc as any).isBanned === true;
                                                            return (
                                                                <div key={studentDoc.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between py-2.5 gap-2 border-b border-zinc-800/80 last:border-0">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-bold text-zinc-200">{studentDoc.name || t('Scholar')}</span>
                                                                            {isBanned && (
                                                                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-destructive/20 border border-destructive/40 text-destructive flex items-center gap-1">
                                                                                    <Ban className="w-2.5 h-2.5" />
                                                                                    {t('IP BANNED')}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-xs text-muted-foreground font-mono">{t('Code')}: {studentDoc.barcodeId}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                                        <Badge variant={isHidden ? "outline" : "default"} className={cn("text-[10px] font-bold px-1.5 py-0.5", isHidden ? "border-amber-600/30 text-amber-500 bg-amber-950/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40")}>
                                                                            {isHidden ? (
                                                                                <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> {t('Hidden')}</span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t('Public')}</span>
                                                                            )}
                                                                        </Badge>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className={cn("h-7 px-2 text-xs font-bold transition-all", isHidden ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30" : "text-[#bf7c1c] hover:text-amber-400 hover:bg-amber-950/30")}
                                                                            onClick={() => handleToggleHiddenAccount(studentDoc.id, true, isHidden)}
                                                                        >
                                                                            {isHidden ? t('Make Public') : t('Hide')}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className={cn("h-7 px-2 text-xs font-bold transition-all border", isBanned ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30" : "border-destructive/40 text-destructive hover:bg-destructive/10")}
                                                                            onClick={() => handleToggleBanAccount(studentDoc.id, true, isBanned)}
                                                                        >
                                                                            {isBanned ? (
                                                                                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {t('Unban')}</span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1"><Ban className="w-3 h-3" /> {t('Ban IP')}</span>
                                                                            )}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            className="h-7 px-2 text-xs font-bold bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive hover:text-white transition-all"
                                                                            onClick={() => setDeleteTargetAccount({ id: studentDoc.id, name: studentDoc.name || 'Student', type: 'student', codeOrEmail: studentDoc.barcodeId })}
                                                                            title={t('Delete Account')}
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('All Teachers')}</h4>
                                    {(!allTeachers || allTeachers.length === 0) ? (
                                        <p className="text-xs text-muted-foreground py-2">{t('No registered teachers found.')}</p>
                                    ) : (
                                        <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 bg-zinc-950/40 max-h-60 overflow-y-auto pr-1">
                                            {allTeachers.map(teacherDoc => {
                                                const isHidden = (teacherDoc as any).isHiddenAccount === true;
                                                const isBanned = (teacherDoc as any).isBanned === true;
                                                return (
                                                    <div key={teacherDoc.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-3 gap-2 border-b border-zinc-800/80 last:border-0">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-zinc-200">{teacherDoc.name}</span>
                                                                {isBanned && (
                                                                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-destructive/20 border border-destructive/40 text-destructive flex items-center gap-1">
                                                                        <Ban className="w-2.5 h-2.5" />
                                                                        {t('IP BANNED')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground font-mono">{teacherDoc.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                            <Badge variant={isHidden ? "outline" : "default"} className={cn("text-[10px] font-bold px-1.5 py-0.5", isHidden ? "border-amber-600/30 text-amber-500 bg-amber-950/20" : "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40")}>
                                                                {isHidden ? (
                                                                    <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> {t('Hidden')}</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t('Public')}</span>
                                                                )}
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className={cn("h-7 px-2 text-xs font-bold transition-all", isHidden ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30" : "text-[#bf7c1c] hover:text-amber-400 hover:bg-amber-950/30")}
                                                                onClick={() => handleToggleHiddenAccount(teacherDoc.id, false, isHidden)}
                                                            >
                                                                {isHidden ? t('Make Public') : t('Hide')}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className={cn("h-7 px-2 text-xs font-bold transition-all border", isBanned ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30" : "border-destructive/40 text-destructive hover:bg-destructive/10")}
                                                                onClick={() => handleToggleBanAccount(teacherDoc.id, false, isBanned)}
                                                            >
                                                                {isBanned ? (
                                                                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {t('Unban')}</span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1"><Ban className="w-3 h-3" /> {t('Ban IP')}</span>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-7 px-2 text-xs font-bold bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive hover:text-white transition-all"
                                                                onClick={() => setDeleteTargetAccount({ id: teacherDoc.id, name: teacherDoc.name, type: 'teacher', codeOrEmail: teacherDoc.email })}
                                                                title={t('Delete Account')}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* List of Hidden Accounts Summary */}
                            <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <EyeOff className="w-3.5 h-3.5 text-[#bf7c1c]" />
                                    {t('Currently Hidden Testing Accounts')}
                                </h4>
                                {(() => {
                                    const hiddenStudents = allStudents?.filter(s => (s as any).isHiddenAccount === true) || [];
                                    const hiddenTeachers = allTeachers?.filter(t => (t as any).isHiddenAccount === true) || [];
                                    const totalHidden = hiddenStudents.length + hiddenTeachers.length;

                                    if (totalHidden === 0) {
                                        return (
                                            <div className="text-xs text-muted-foreground p-4 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-950/20">
                                                {t('No testing or demo accounts are currently hidden.')}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 bg-zinc-950/40">
                                            {hiddenStudents.map(studentDoc => (
                                                <div key={studentDoc.id} className="flex items-center justify-between p-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-zinc-200">{studentDoc.name || t('Scholar')}</span>
                                                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                                                            <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[9px] px-1 py-0 h-auto font-semibold">{t('Student')}</Badge>
                                                            {studentDoc.barcodeId}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 text-xs font-bold"
                                                        onClick={() => handleToggleHiddenAccount(studentDoc.id, true, true)}
                                                    >
                                                        {t('Make Public')}
                                                    </Button>
                                                </div>
                                            ))}
                                            {hiddenTeachers.map(teacherDoc => (
                                                <div key={teacherDoc.id} className="flex items-center justify-between p-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-zinc-200">{teacherDoc.name}</span>
                                                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                                                            <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[9px] px-1 py-0 h-auto font-semibold">{t('Teacher')}</Badge>
                                                            {teacherDoc.email}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 text-xs font-bold"
                                                        onClick={() => handleToggleHiddenAccount(teacherDoc.id, false, true)}
                                                    >
                                                        {t('Make Public')}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        ) : (
            <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title={t("Revenue")} value={`£${revenueSummary.range.toFixed(2)}`} isLoading={isLoading} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} description={getTimeframeText(dateRange)} />
                    <StatCard title={t("Total Check-ins")} value={periodCheckIns.length} isLoading={isLoading} icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} description={getTimeframeText(dateRange)} />
                    <StatCard title={t("Total Students")} value={isLoading ? '...' : `${allStudents?.length || 0}`} isLoading={isLoading} icon={<Users className="h-4 w-4 text-muted-foreground" />} description={t('All time')} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5 text-primary"/>{t('Enrollment & Plan Analytics')}</CardTitle>
                            <CardDescription>{t('A summary of student distribution and payments for the selected period.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-2/3" />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">{t('Check-ins by Plan')}</h4>
                                        {Object.keys(checkInAnalytics.byPlan).length > 0 ? (
                                            Object.entries(checkInAnalytics.byPlan).map(([planName, count]) => (
                                                <AnalyticsItem key={planName} label={planName} value={count} />
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground">{t('No check-ins for this period.')}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2 border-t pt-2">
                                        <h4 className="font-semibold text-sm">{t('New Enrollments vs Renewals')}</h4>
                                        <div className="text-center p-2 rounded-md bg-muted/50">
                                            <p><span className="text-green-600 font-bold">{newMemberAndRenewalStats.new}</span> {t('New')} / <span className="text-blue-600 font-bold">{newMemberAndRenewalStats.renewals}</span> {t('Renew')}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-t pt-2">
                                        <h4 className="font-semibold text-sm">{t('Students by Plan (All Time)')}</h4>
                                        {Object.keys(planAndMemberAnalytics.byPlan).length > 0 ? (
                                            Object.entries(planAndMemberAnalytics.byPlan).map(([planName, count]) => (
                                                <AnalyticsItem key={planName} label={planName} value={count} />
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground">{t('No students enrolled in plans.')}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <PercentageCalculator />
                </div>
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />{t('Debt Tracking')}</CardTitle>
                                <CardDescription>{`${debtSummary.studentsInDebt.length} ${t('students with')} £${debtSummary.totalDebt.toFixed(2)} ${t('in total debt.')}`}</CardDescription>
                            </div>
                            <div className="w-48">
                                <Select value={debtPlanFilter} onValueChange={setDebtPlanFilter}>
                                    <SelectTrigger><SelectValue placeholder={t('Filter by plan...')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Plans')}</SelectItem>
                                        {plans?.map(p => <SelectItem key={p.id} value={p.id}>{t(p.name)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-72">
                            <Table>
                                <TableHeader><TableRow><TableHead>{t('Name')}</TableHead><TableHead>{t('Phone')}</TableHead><TableHead>{t('Center')}</TableHead><TableHead className="text-right">{t('Amount Owed')}</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({length: 3}).map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))
                                    ) : debtSummary.studentsInDebt.length > 0 ? (
                                        debtSummary.studentsInDebt.map(student => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.name}</TableCell>
                                                <TableCell>{student.phoneNumber}</TableCell>
                                                <TableCell>{t(student.centerName || '')}</TableCell>
                                                <TableCell className="text-right"><Badge variant="destructive">£{getTotalDebt(student.activeSubscriptions).toFixed(2)}</Badge></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center">{t('No students have outstanding debt.')}</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </>
        )}
        
        {isSuperAdmin && sessionUser && ( <BroadcastMessageModal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} onSend={handleBroadcastMessage} aideName={sessionUser.name} /> )}
        {isSuperAdmin && <ExportPhonesModal isOpen={isExportPhonesModalOpen} onClose={() => setIsExportPhonesModalOpen(false)} onExport={handleExportPhones} />}

        {isSuperAdmin && (
            <AlertDialog open={isResetPromptOpen} onOpenChange={setIsResetPromptOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Confirm Action')}</AlertDialogTitle>
                        <AlertDialogDescription>{t("This is a destructive action. To proceed, please type 'reset' in the box below.")}</AlertDialogDescription>
                        <Input type="text" value={resetPasswordInput} onChange={e => setResetPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResetPasswordConfirm()} placeholder={t('reset')} autoFocus />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResetPasswordInput('')}>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetPasswordConfirm}>{t('Confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
        
        {isSuperAdmin && (
            <AlertDialog open={isResetDataModalOpen} onOpenChange={setIsResetDataModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">{t('Reset Hub Data')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('Select the data categories you want to permanently delete. This action cannot be undone.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                        <div className="flex items-center space-x-2 p-2 rounded-md bg-muted">
                            <Checkbox id="reset-all" 
                                checked={dataToReset.size === dataCategories.length}
                                onCheckedChange={(checked) => {
                                    const allCategories = dataCategories.map(c => c.id);
                                    setDataToReset(checked ? new Set(allCategories) : new Set());
                                }}
                            />
                            <Label htmlFor="reset-all" className="font-bold text-base">{t('Reset All Hub Data')}</Label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                            {dataCategories.map(category => (
                                <div key={category.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`reset-${category.id}`} 
                                        checked={dataToReset.has(category.id)}
                                        onCheckedChange={(checked) => {
                                            setDataToReset(prev => {
                                                const newSet = new Set(prev);
                                                if (checked) {
                                                    newSet.add(category.id);
                                                } else {
                                                    newSet.delete(category.id);
                                                }
                                                return newSet;
                                            })
                                        }}
                                    />
                                    <Label htmlFor={`reset-${category.id}`} className="font-normal">{t(category.label)}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDataToReset(new Set())}>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetData} disabled={dataToReset.size === 0} className="bg-destructive hover:bg-destructive/90">{t("Yes, delete selected data")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        {isSuperAdmin && (
            <AlertDialog open={isDeleteAllStudentsModalOpen} onOpenChange={setIsDeleteAllStudentsModalOpen}>
                <AlertDialogContent className="bg-card border-destructive/50 max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-bold">
                            <UserX className="w-5 h-5 text-destructive" />
                            {t('Wipe All Student Accounts')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-foreground/90 space-y-3 pt-2">
                            <span className="block font-semibold text-destructive">
                                {t('⚠️ Warning: This will permanently delete ALL student records and their sync data from Firestore.')}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                                {t('Students will no longer be able to log in because their account documents will be deleted. This action cannot be undone.')}
                            </span>
                            <span className="block pt-2 space-y-1">
                                <Label className="text-xs font-semibold text-foreground">
                                    {t("Type 'DELETE' to confirm:")}
                                </Label>
                                <Input
                                    value={deleteStudentsConfirmText}
                                    onChange={(e) => setDeleteStudentsConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="bg-background border-destructive/40 font-mono text-sm tracking-wider uppercase text-destructive focus-visible:ring-destructive"
                                    autoFocus
                                />
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
                        <AlertDialogCancel
                            onClick={() => {
                                setDeleteStudentsConfirmText('');
                                setIsDeleteAllStudentsModalOpen(false);
                            }}
                            disabled={isDeletingAllStudents}
                        >
                            {t('Cancel')}
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAllStudents}
                            disabled={isDeletingAllStudents || deleteStudentsConfirmText.trim().toUpperCase() !== 'DELETE'}
                            className="bg-destructive hover:bg-destructive/90 font-bold"
                        >
                            {isDeletingAllStudents ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('Deleting...')}
                                </>
                            ) : (
                                t('Permanently Delete All Students')
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        {/* Delete Specific Account Confirmation Modal */}
        <AlertDialog open={!!deleteTargetAccount} onOpenChange={(open) => !open && setDeleteTargetAccount(null)}>
            <AlertDialogContent className="bg-card border-destructive/50 max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive flex items-center gap-2 text-lg font-bold">
                        <Trash2 className="w-5 h-5 text-destructive" />
                        {t('Delete Account')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-foreground/90 space-y-2 pt-2">
                        <span className="block font-bold text-foreground text-base">
                            {deleteTargetAccount?.name}
                        </span>
                        {deleteTargetAccount?.codeOrEmail && (
                            <span className="block text-xs font-mono text-muted-foreground">
                                {deleteTargetAccount.type === 'student' ? `${t('Barcode / Code')}: ` : `${t('Email')}: `}
                                {deleteTargetAccount.codeOrEmail}
                            </span>
                        )}
                        <span className="block text-xs text-destructive/90 pt-1">
                            {t('⚠️ Are you sure you want to permanently delete this account? The user profile and sync data will be completely removed from Firestore.')}
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
                    <AlertDialogCancel onClick={() => setDeleteTargetAccount(null)} disabled={isDeletingTarget}>
                        {t('Cancel')}
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteSpecificAccount}
                        disabled={isDeletingTarget}
                        className="bg-destructive hover:bg-destructive/90 font-bold gap-2"
                    >
                        {isDeletingTarget ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('Deleting...')}
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                {t('Delete Account')}
                            </>
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
