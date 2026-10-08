
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDocs, deleteDoc, query, updateDoc, where } from 'firebase/firestore';
import type { Student, Transaction, Hub, AttendanceRecord, Aide, Center, EnrollmentPlan, StudentSubscription, DataCategoryId } from '@/lib/types';
import { dataCategories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { isSameDay, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { DollarSign, TrendingUp, Users, AlertCircle, PieChart, Building, UserCog, Send, Instagram, Facebook, Video, Download, Trash2, Phone, MessageSquare, CalendarDays, FileDown, UserCheck, CalculatorIcon, Calendar as CalendarIcon, Edit, ShieldCheck, UserPlus, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CenterManagementModal } from '@/components/admin/education/CenterManagementModal';
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
    const [isCenterModalOpen, setIsCenterModalOpen] = useState(false);
    const [isResetPromptOpen, setIsResetPromptOpen] = useState(false);
    const [resetPasswordInput, setResetPasswordInput] = useState('');
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [isExportPhonesModalOpen, setIsExportPhonesModalOpen] = useState(false);
    const [debtPlanFilter, setDebtPlanFilter] = useState('all');
    
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
    
    const [selectedAideForReport, setSelectedAideForReport] = useState<Aide | null>(null);
    const [isAideReportModalOpen, setIsAideReportModalOpen] = useState(false);
    
    const [dataToReset, setDataToReset] = useState<Set<DataCategoryId>>(new Set());
    const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
    
    const [sessionUser, setSessionUser] = useState<{ type: 'aide' | 'center', data: Aide | Center } | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    const isSuperAdmin = useMemo(() => sessionUser?.type === 'aide' && (sessionUser.data as Aide).role === 'S Admin', [sessionUser]);
    const loggedInCenterId = useMemo(() => sessionUser?.type === 'center' ? sessionUser.data.id : null, [sessionUser]);
    const sessionAide = useMemo(() => sessionUser?.type === 'aide' ? (sessionUser.data as Aide) : null, [sessionUser]);


    const MOCK_HUB: Hub = {
        id: 'main-hub',
        name: 'Main Education Hub',
        ...socials
    };

    useEffect(() => {
        try {
            const aideData = localStorage.getItem('hub-aide');
            const centerData = localStorage.getItem('hub-center');
            
            if (aideData) {
                const parsedAide: Aide = JSON.parse(aideData);
                if (parsedAide.role === 'Check-in Staff') {
                     router.replace('/admin/check-in');
                } else {
                    setSessionUser({ type: 'aide', data: parsedAide });
                }
            } else if (centerData) {
                setSessionUser({ type: 'center', data: JSON.parse(centerData) });
            } else {
                 router.replace('/admin/access');
            }
        } catch (e) {
            console.error("Session storage not available.");
            router.replace('/admin/access');
        }
        setIsAuthChecking(false);
    }, [router, toast]);


    const aidesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${MOCK_HUB.id}/aides`) : null, [firestore, MOCK_HUB.id]);
    const { data: aides, isLoading: aidesLoading } = useCollection<Aide>(aidesCollectionRef);
    
    const allStudentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const baseQuery = collection(firestore, 'students');
        if (loggedInCenterId) {
            return query(baseQuery, where('centerId', '==', loggedInCenterId));
        }
        return query(baseQuery);
    }, [firestore, loggedInCenterId]);

    const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(allStudentsQuery);

    const allTransactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const baseQuery = collection(firestore, `hubs/${MOCK_HUB.id}/transactions`);
         if (loggedInCenterId) {
            return query(baseQuery, where('centerId', '==', loggedInCenterId));
        }
        return query(baseQuery);
    }, [firestore, MOCK_HUB.id, loggedInCenterId]);

    const { data: allTransactions, isLoading: transactionsLoading } = useCollection<Transaction>(allTransactionsQuery);
    
    const allCheckInsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const baseQuery = collection(firestore, `hubs/${MOCK_HUB.id}/attendance`);
        if (loggedInCenterId) {
            return query(baseQuery, where('centerId', '==', loggedInCenterId));
        }
        return query(baseQuery);
    }, [firestore, MOCK_HUB.id, loggedInCenterId]);

    const { data: allCheckIns, isLoading: checkInsLoading } = useCollection<AttendanceRecord>(allCheckInsQuery);
    
    const centersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${MOCK_HUB.id}/centers`) : null, [firestore, MOCK_HUB.id]);
    const { data: centers, isLoading: centersLoading } = useCollection<Center>(centersCollectionRef);

    const plansCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${MOCK_HUB.id}/plans`) : null, [firestore, MOCK_HUB.id]);
    const { data: plans, isLoading: plansLoading } = useCollection<EnrollmentPlan>(plansCollectionRef);
    
    const isLoading = studentsLoading || transactionsLoading || centersLoading || checkInsLoading || aidesLoading || plansLoading;

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
  
    const centersOverview = useMemo(() => {
        if (!centers || !allStudents) return [];
        return centers.map(center => {
            const studentCount = allStudents.filter(student => student.centerId === center.id).length;
            return {
                id: center.id,
                name: center.name,
                studentCount: studentCount,
            };
        });
    }, [centers, allStudents]);

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


    const handleCenterSave = (newCenterList: Center[]) => {
        if (!firestore) return;
        newCenterList.forEach(center => {
        const centerRef = doc(firestore, `hubs/${MOCK_HUB.id}/centers`, center.id);
        setDocumentNonBlocking(centerRef, center, { merge: true });
        });
        centers?.forEach(oldCenter => {
        if (!newCenterList.find(s => s.id === oldCenter.id)) {
            const centerRef = doc(firestore, `hubs/${MOCK_HUB.id}/centers`, oldCenter.id);
            deleteDocumentNonBlocking(centerRef);
        }
        });
        toast({ title: t("Center list updated!") });
        setIsCenterModalOpen(false);
    };

    
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
            if (dataToReset.has('plans')) await clearCollection('plans');
            if (dataToReset.has('transactions')) await clearCollection('transactions');
            if (dataToReset.has('attendance')) await clearCollection('attendance');
            if (dataToReset.has('centers')) await clearCollection('centers');
            if (dataToReset.has('offers')) await clearCollection('offers');
            if (dataToReset.has('recordingOffers')) await clearCollection('recordingOffers');
            if (dataToReset.has('recordingBookings')) await clearCollection('recordingBookings');
            if (dataToReset.has('aides')) await clearAides();

            await batch.commit();
            
            toast({ title: t("Data Reset Successful"), description: t('Selected data has been cleared.') });
        } catch (error) {
            console.error("Error resetting data: ", error);
            toast({ title: t("Error"), description: t("Failed to reset data."), variant: "destructive" });
        }
        setDataToReset(new Set());
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
        if (aides) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aides.map(({ password, ...rest }) => rest)), "Aides");
        if (centers) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(centers), "Centers");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        saveAs(dataBlob, `${MOCK_HUB.name.replace(/ /g, '_')}_full_backup.xlsx`);
        toast({ title: t("Full Data Export Successful"), description: t("All hub data has been exported.") });
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
      localStorage.removeItem('hub-aide');
      localStorage.removeItem('hub-center');
      router.push('/admin/access');
    } catch (e) {
      console.error("Session storage not available.");
      window.location.href = '/admin/access';
    }
  }

  if (isAuthChecking || !sessionUser) {
      return (
          <div className="container mx-auto p-4 md:p-8">
              <Skeleton className="h-screen w-full" />
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
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button variant="outline" onClick={() => setIsCenterModalOpen(true)}>
                                    <Building className="mr-2 h-4 w-4"/>
                                    <span>{t('Manage Centers')}</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title={t("New Enrollments")} value={monthlyStats.newEnrollments} isLoading={isLoading} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} description={t('This month')} />
                    <StatCard title={t("Total Students")} value={isLoading ? '...' : `${allStudents?.length || 0}`} isLoading={isLoading} icon={<Users className="h-4 w-4 text-muted-foreground" />} description={t('All time')} />
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary"/>{t('Centers Overview')}</CardTitle>
                        <CardDescription>{t('A list of all centers and their total student count.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                            ) : centersOverview.map(center => (
                                <div key={center.id} className="p-4 border rounded-lg bg-muted/50 space-y-2">
                                    <h3 className="font-bold text-lg">{t(center.name)}</h3>
                                    <AnalyticsItem label={t('Total Students')} value={center.studentCount} />
                                </div>
                            ))}
                            {!isLoading && centersOverview.length === 0 && (
                                <p className="col-span-full text-center text-muted-foreground py-10">{t('No centers have been set up yet.')}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
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
        
        {isSuperAdmin && (
             <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>{t('Data Management')}</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Button variant="outline" onClick={() => setIsExportPhonesModalOpen(true)}><FileDown className="mr-2 h-4 w-4"/> {t('Export Student Phones')}</Button>
                        <Button variant="secondary" onClick={handleExportAllData}><Download className="mr-2 h-4 w-4"/> {t('Export All Hub Data')}</Button>
                        <Button variant="destructive" onClick={() => setIsResetPromptOpen(true)}><Trash2 className="mr-2 h-4 w-4"/> {t('Reset Hub Data')}</Button>
                    </CardContent>
                </Card>
                <PercentageCalculator />
             </div>
        )}

        {isSuperAdmin && centers && ( <CenterManagementModal isOpen={isCenterModalOpen} onClose={() => setIsCenterModalOpen(false)} centers={centers} onSave={handleCenterSave} hubId={MOCK_HUB.id} /> )}
        {isSuperAdmin && allStudents && aides && ( <BroadcastMessageModal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} onSend={handleBroadcastMessage} aideName={sessionUser?.data.name || 'Admin'} /> )}
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
                                onCheckedChange={handleToggleResetAll}
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
    </div>
  );
}
