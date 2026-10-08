
'use client';
import { useState, useMemo, useEffect } from 'react';
import type { EnrollmentPlan, Hub, EnrolledStudent, Transaction, AttendanceRecord, StudentSubscription, Grade, Center } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, WifiOff, Calendar as CalendarIcon, User, Tag, FileText, Clock, DollarSign, Users, UserCheck, ChevronLeft, ChevronRight, TrendingDown } from 'lucide-react';
import { PlanFormModal } from '@/components/admin/education/PlanFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { grades } from '@/lib/data';
import type { Aide } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';


const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string | number, icon: React.ReactNode, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

export function PlansPage({ hub }: { hub: Hub }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<EnrollmentPlan | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [gradeFilter, setGradeFilter] = useState<string>('all');

  useEffect(() => {
    const now = new Date();
    switch (timeframe) {
      case 'daily':
        setAnalyticsDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'weekly':
        setAnalyticsDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'monthly':
        setAnalyticsDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'custom':
        // Keep existing range
        break;
    }
  }, [timeframe]);


  const plansCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/plans`) : null, [firestore, hub.id]);
  const { data: plans, isLoading: plansLoading } = useCollection<EnrollmentPlan>(plansCollectionRef);

  const studentsQuery = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/students`) : null, [firestore, hub.id]);
  const { data: allStudents, isLoading: studentsLoading } = useCollection<EnrolledStudent>(studentsQuery);
  
  const transactionsQuery = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/transactions`) : null, [firestore, hub.id]);
  const { data: allTransactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const attendanceQuery = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/attendance`) : null, [firestore, hub.id]);
  const { data: allCheckIns, isLoading: attendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const centersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/centers`) : null, [firestore, hub.id]);
  const { data: centers, isLoading: centersLoading } = useCollection<Center>(centersCollectionRef);
  
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

 const individualPlanAnalytics = useMemo(() => {
    if (!selectedPlanId || !allStudents || !allTransactions || !allCheckIns || !analyticsDateRange?.from) {
      return { totalStudents: 0, revenue: 0, newStudentRevenue: 0, checkIns: 0, totalDebt: 0 };
    }
    
    const selectedPlan = plans?.find(p => p.id === selectedPlanId);
    if (!selectedPlan) {
       return { totalStudents: 0, revenue: 0, newStudentRevenue: 0, checkIns: 0, totalDebt: 0 };
    }

    const interval = { start: analyticsDateRange.from, end: analyticsDateRange.to || analyticsDateRange.from };
  
    const studentsInPlan = allStudents.filter(s => s.activeSubscriptions.some(sub => sub.planId === selectedPlanId));
    
    const revenue = interval ? allTransactions
      .filter(t => t.planId === selectedPlanId && isWithinInterval(new Date(t.date), interval))
      .reduce((sum, t) => sum + t.paidAmount, 0) : 0;
      
    const newStudentRevenue = interval ? allTransactions
      .filter(t => t.planId === selectedPlanId && t.type === 'New Enrollment' && isWithinInterval(new Date(t.date), interval))
      .reduce((sum, t) => sum + t.paidAmount, 0) : 0;
  
    const checkIns = interval ? allCheckIns
      .filter(ci => ci.planId === selectedPlanId && isWithinInterval(new Date(ci.checkInTime), interval))
      .length : 0;
      
    const totalDebt = studentsInPlan
      .flatMap(s => s.activeSubscriptions)
      .filter(sub => sub.planId === selectedPlanId)
      .reduce((sum, sub) => {
        let debt = sub.remaining || 0;
        if (selectedPlan.type === 'Package' && selectedPlan.priceDivisor && selectedPlan.priceDivisor > 0) {
            const pricePerShare = selectedPlan.price / selectedPlan.priceDivisor;
            // Assuming paid amount applies proportionally. If not, this logic may need adjustment.
            const expectedPaidPerShare = sub.paid * (pricePerShare / selectedPlan.price);
            debt = pricePerShare - expectedPaidPerShare;
        }
        return sum + (debt < 0 ? 0 : debt);
      }, 0);
  
    return {
      totalStudents: studentsInPlan.length,
      revenue,
      newStudentRevenue,
      checkIns,
      totalDebt
    };
  }, [selectedPlanId, analyticsDateRange, allStudents, allTransactions, allCheckIns, plans]);

  const handleSavePlan = (plan: EnrollmentPlan) => {
    if (!firestore) return;
    const plansCollection = collection(firestore, `hubs/${hub.id}/plans`);
    if (editingPlan) {
      const planRef = doc(plansCollection, plan.id);
      setDocumentNonBlocking(planRef, plan, { merge: true });
      toast({ title: t('Plan Updated'), description: `${t('Successfully updated')} "${plan.name}".` });
    } else {
      const newPlanId = `plan_${Date.now()}`;
      const newPlan = { ...plan, id: newPlanId };
      const planRef = doc(plansCollection, newPlanId);
      setDocumentNonBlocking(planRef, newPlan, {});
      toast({ title: t('Plan Added'), description: `${t('Successfully added')} "${plan.name}".` });
    }
    setEditingPlan(null);
    setIsModalOpen(false);
  };

  const openDeleteConfirm = (planId: string) => {
    setDeletingPlanId(planId);
    setIsAlertOpen(true);
  };

  const handleDeletePlan = () => {
    if (deletingPlanId && firestore) {
      const planName = plans?.find(p => p.id === deletingPlanId)?.name || 'the plan';
      const planRef = doc(firestore, `hubs/${hub.id}/plans`, deletingPlanId);
      deleteDocumentNonBlocking(planRef);
      toast({ title: t('Plan Deleted'), description: `${t('Successfully deleted')} "${t(planName)}".`, variant: 'destructive' });
      setDeletingPlanId(null);
      setIsAlertOpen(false);
    }
  };

  const handleEdit = (plan: EnrollmentPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const formatDisplayDate = () => {
    if (!analyticsDateRange?.from) {
      return <span>{t("Pick a date range")}</span>;
    }
    if (analyticsDateRange.to) {
      return `${format(analyticsDateRange.from, 'LLL d, y')} - ${format(analyticsDateRange.to, 'LLL d, y')}`;
    }
    return format(analyticsDateRange.from, 'LLL d, y');
  }

   const filteredPlans = useMemo(() => {
    if (!plans) return [];
    if (gradeFilter === 'all') return plans;
    return plans.filter(p => p.grades.includes(gradeFilter));
  }, [plans, gradeFilter]);

  const planOptions = useMemo(() => {
      return filteredPlans.map(p => ({ value: p.id, label: t(p.name) }));
  }, [filteredPlans, t]);
  

  if (!isOnline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Manage Plans')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <WifiOff className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('You are offline')}</h2>
            <p className="text-muted-foreground">
            {t('Plan publishing and editing requires an internet connection.')}
            </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = plansLoading || studentsLoading || transactionsLoading || attendanceLoading || centersLoading;

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('Plan Performance Analytics')}</CardTitle>
          <CardDescription>{t("Select a plan and a timeframe to see its performance metrics.")}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mb-4">
                <div className='w-full sm:w-auto min-w-[200px]'>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by grade..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Grades</SelectItem>
                            {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <Combobox
                    options={planOptions}
                    value={selectedPlanId}
                    onChange={setSelectedPlanId}
                    placeholder={t("Select a plan...")}
                    searchPlaceholder={t("Search plans...")}
                    emptyText={t("No plans found.")}
                    className="w-full sm:w-auto min-w-[250px]"
                />
                <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                    {(['daily', 'weekly', 'monthly', 'custom'] as const).map(tf => (
                         <Button key={tf} onClick={() => setTimeframe(tf)} variant={timeframe === tf ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3">
                            {t(tf.charAt(0).toUpperCase() + tf.slice(1))}
                        </Button>
                    ))}
                </div>
                 <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn("w-[300px] justify-start text-left font-normal", !analyticsDateRange && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formatDisplayDate()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={analyticsDateRange?.from}
                                selected={analyticsDateRange}
                                onSelect={setAnalyticsDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            {selectedPlanId && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard 
                        title={t('Total Enrolled Students')} 
                        value={individualPlanAnalytics.totalStudents} 
                        icon={<Users className="h-4 w-4 text-muted-foreground" />} 
                        isLoading={isLoading} 
                    />
                     <StatCard 
                        title={`${t('Revenue')} (${t(timeframe)})`}
                        value={`£${individualPlanAnalytics.revenue.toFixed(2)}`}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} 
                        isLoading={isLoading} 
                    />
                     <StatCard 
                        title={t('New Student Revenue')}
                        value={`£${individualPlanAnalytics.newStudentRevenue.toFixed(2)}`}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} 
                        isLoading={isLoading} 
                    />
                    <StatCard 
                        title={`${t('Attendance')} (${t(timeframe)})`}
                        value={individualPlanAnalytics.checkIns}
                        icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} 
                        isLoading={isLoading} 
                    />
                    <StatCard 
                        title={t('Total Outstanding Debt')}
                        value={`£${individualPlanAnalytics.totalDebt.toFixed(2)}`}
                        icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} 
                        isLoading={isLoading} 
                    />
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('Manage Enrollment Plans')}</CardTitle>
              <CardDescription>{t('Add, edit, or delete enrollment plans for your hub.')}</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>{t('Add Plan')}</span>
            </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? Array.from({length:3}).map((_, i) => <Card key={i} className="h-96 animate-pulse bg-muted"></Card>) 
            : plans?.map((plan) => {
                return (
                    <Card key={plan.id} className="flex flex-col shadow-sm border">
                        <CardHeader>
                        <CardTitle className="font-headline">{t(plan.name)}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <p className="flex items-start gap-2 text-muted-foreground text-sm">
                                <FileText className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />
                                <span>{t(plan.description)}</span>
                            </p>
                             <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Tag className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-foreground">
                                £{plan.price}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-foreground">
                                    {plan.durationValue} {t(plan.durationUnit)}
                                </span>
                            </div>
                            {plan.type === 'Private' && (
                                <>
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <User className="h-4 w-4 text-primary" />
                                        <span>{t('Tutor')}: {plan.tutor}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <CalendarIcon className="h-4 w-4 text-primary" />
                                        <span>{plan.schedule} ({plan.sessionDays?.map(day => t(day)).join(', ')})</span>
                                    </div>
                                </>
                            )}
                            {plan.type === 'Package' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span className="font-semibold text-foreground">{t('Included Teachers')}:</span>
                                    </div>
                                    <ul className="list-disc pl-6 text-sm text-muted-foreground">
                                        {plan.teacherSchedules?.map((ts, i) => (
                                            <li key={i}>{ts.name} ({ts.sessionDays?.map(day => t(day)).join(', ')})</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 bg-muted/50 p-4 mt-auto">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                            <Edit className="mr-2 h-4 w-4" /> <span>{t('Edit')}</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(plan.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> <span>{t('Delete')}</span>
                        </Button>
                        </CardFooter>
                    </Card>
                )
            })}
          </div>
        </CardContent>
      </Card>

      <PlanFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePlan}
        plan={editingPlan}
        centers={centers || []}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Are you absolutely sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. This will permanently delete the plan.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive hover:bg-destructive/90">{t('Delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
