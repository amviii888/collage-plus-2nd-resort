'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Users, 
  UserCheck, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Coins, 
  Calculator, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  ArrowUpRight, 
  TrendingDown, 
  Landmark, 
  Star, 
  BarChart3, 
  ChevronRight,
  PlusCircle,
  Trash2,
  Wallet,
  PieChart as PieChartIcon,
  X,
  FileDown,
  RotateCcw,
  Info,
  Link as LinkIcon
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Recharts imports for full visual suite
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

type AdminSession = { id: string; name: string; role: string; };

// --- Calculator Page Types ---
type CalculationMode = 'manual' | 'auto';

interface Split {
    id: string;
    percentage: number;
    amount: number;
}

interface TeacherCalc {
    id: string;
    name: string;
    mode: CalculationMode;
    manualIncome: number;
    studentCount: number;
    ratePerStudent: number;
    totalIncome: number;
    splits: Split[];
    isCustom?: boolean;
}

interface CalculatorExpense {
    id: string;
    name: string;
    amount: number;
}

interface CanvasConfigItem {
    id: string;
    name: string;
    amount: number;
}

const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description?: string }) => (
  <Card className="liquid-glass border-primary/10">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent className="space-y-1">
      <div className="text-3xl font-black text-foreground">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

// Form Component for manual entries in the finance tracker
function AddItemForm({ type, onAddItem }: { type: 'income' | 'expense', onAddItem: (item: CanvasConfigItem, type: 'income' | 'expense') => void }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (name.trim() && !isNaN(numericAmount) && numericAmount > 0) {
            onAddItem({ id: uuidv4(), name: name.trim(), amount: numericAmount }, type);
            setName('');
            setAmount('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground">{type === 'income' ? t('New Manual Income') : t('New Manual Expense')}</Label>
            <div className="flex gap-2">
                <Input placeholder={t('Item Name')} value={name} onChange={e => setName(e.target.value)} className="text-xs" />
                <Input type="number" placeholder={t('Amount')} value={amount} onChange={e => setAmount(e.target.value)} className="w-28 text-xs" />
                <Button type="submit" size="sm" variant="secondary"><PlusCircle className="h-4 w-4 mr-1" /> Add</Button>
            </div>
        </form>
    );
}

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'projections' | 'standings'>('projections');

  // --- Calculator & Money State ---
  const [teachers, setTeachers] = useState<TeacherCalc[]>([]);
  const [calculatorExpenses, setCalculatorExpenses] = useState<CalculatorExpense[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const canvasConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'hubs/main-hub/config/canvas') : null, [firestore]);
  const { data: canvasConfig, isLoading: isConfigLoading } = useDoc<any>(canvasConfigRef);

  // Authenticate Admin
  useEffect(() => {
    try {
      const sessionData = localStorage.getItem('admin-session');
      if (!sessionData) {
        router.replace('/admin/access');
        return;
      }
      const parsedSession: AdminSession = JSON.parse(sessionData);
      if (parsedSession.role !== 'S Admin' && parsedSession.role !== 'Manager') {
        router.replace('/admin/access');
        toast({ title: t("Access Denied"), variant: "destructive" });
      } else {
        setAdminSession(parsedSession);
      }
    } catch (e) {
      console.error("Session storage failed", e);
      router.replace('/admin/access');
    }
    setIsAuthChecking(false);
  }, [router, t, toast]);

  // Load teachers from Firestore
  const teachersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teachers');
  }, [firestore]);
  const { data: dbTeachers, isLoading: teachersLoading } = useCollection<any>(teachersQuery);

  // Fetch student counts for each teacher asynchronously
  const [studentCounts, setStudentCounts] = useState<{ [teacherId: string]: number }>({});
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    if (!firestore || !dbTeachers || dbTeachers.length === 0) return;

    const fetchCounts = async () => {
      setCountsLoading(true);
      const counts: { [teacherId: string]: number } = {};
      try {
        await Promise.all(
          dbTeachers.map(async (teacher: any) => {
            try {
              const snap = await getDocs(collection(firestore, 'teachers', teacher.id, 'localStudents'));
              counts[teacher.id] = snap.size;
            } catch (e) {
              console.error("Error fetching students for", teacher.id, e);
              counts[teacher.id] = 0;
            }
          })
        );
        setStudentCounts(counts);
      } catch (err) {
        console.error("Error in batch count", err);
      } finally {
        setCountsLoading(false);
      }
    };

    fetchCounts();
  }, [firestore, dbTeachers]);

  // --- Calculator Initial Storage Load ---
  useEffect(() => {
      try {
          const savedTeachers = localStorage.getItem('centerCalc-teachers');
          const savedExpenses = localStorage.getItem('centerCalc-expenses');
          if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
          if (savedExpenses) setCalculatorExpenses(JSON.parse(savedExpenses));
      } catch (e) { console.error("Failed to load calculator state", e); }
      setIsInitialLoad(false);
  }, []);

  // Save Calculator State
  useEffect(() => {
      if (isInitialLoad) return;
      try {
          localStorage.setItem('centerCalc-teachers', JSON.stringify(teachers));
          localStorage.setItem('centerCalc-expenses', JSON.stringify(calculatorExpenses));
      } catch (e) {
          console.error("Failed to save calculator state", e);
      }
  }, [teachers, calculatorExpenses, isInitialLoad]);

  // Handle calculator split updates
  useEffect(() => {
    setTeachers(prevTeachers => 
        prevTeachers.map(t => {
            const totalIncome = t.mode === 'manual' ? t.manualIncome : t.studentCount * t.ratePerStudent;
            const newSplits = t.splits.map(split => ({ ...split, amount: (totalIncome * split.percentage) / 100 }));
            return { ...t, totalIncome, splits: newSplits };
        })
    );
  }, [teachers.map(t => [t.mode, t.manualIncome, t.studentCount, t.ratePerStudent, t.splits.map(s => s.percentage).join(',')].join('-')).join('--')]);

  // Compute calculator-specific sums
  const { totalGrossIncome, totalCalcExpenses, netProfit, totalHubCut } = useMemo(() => {
    const income = teachers.reduce((sum, t) => sum + t.totalIncome, 0);
    const expenseTotal = calculatorExpenses.reduce((sum, e) => sum + e.amount, 0);
    const hubCut = teachers.flatMap(t => t.splits).reduce((sum, s) => sum + s.amount, 0);
    return { totalGrossIncome: income, totalCalcExpenses: expenseTotal, netProfit: hubCut - expenseTotal, totalHubCut: hubCut };
  }, [teachers, calculatorExpenses]);

  // Source selector state for Overall Financial Summary
  const [financialModelSource, setFinancialModelSource] = useState<'tracker' | 'absolute'>('tracker');
  const [selectedAbsolutePeriodIdx, setSelectedAbsolutePeriodIdx] = useState<number>(0);

  // --- Upgraded Projections State with Dynamic Overrides ---
  const [overhead, setOverhead] = useState<number>(1500);
  const [tuitionFee, setTuitionFee] = useState<number>(60);
  const [monthlyGrowth, setMonthlyGrowth] = useState<number>(10);
  const [retentionRate, setRetentionRate] = useState<number>(94);
  const [feePeriod, setFeePeriod] = useState<'monthly' | 'term'>('monthly');
  const [termDuration, setTermDuration] = useState<number>(4.5);
  
  // Custom Student Count states
  const [studentCountParam, setStudentCountParam] = useState<number>(120);
  const [hasCustomStudentCount, setHasCustomStudentCount] = useState<boolean>(false);
  const [isLinkedToExpenses, setIsLinkedToExpenses] = useState<boolean>(false);

  // --- Absolute Student & Revenue Model State ---
  const [absStudentCount, setAbsStudentCount] = useState<number>(7000);
  const [hasCustomAbsStudentCount, setHasCustomAbsStudentCount] = useState<boolean>(true);
  const [absFee, setAbsFee] = useState<number>(40);
  const [absGrowthRate, setAbsGrowthRate] = useState<number>(10);
  const [absPeriodType, setAbsPeriodType] = useState<'terms' | 'months' | 'years'>('terms');
  const [isAbsLinkedToExpenses, setIsAbsLinkedToExpenses] = useState<boolean>(false);
  const [isAbsLinkedToIncome, setIsAbsLinkedToIncome] = useState<boolean>(false);
  const [isAbsLinkedToStudentCount, setIsAbsLinkedToStudentCount] = useState<boolean>(false);

  // Live total synced count
  const teachersCount = useMemo(() => dbTeachers?.length || 0, [dbTeachers]);
  const totalStudentsCount = useMemo(() => {
    return Object.values(studentCounts).reduce((sum, count) => sum + count, 0);
  }, [studentCounts]);

  // Track and load actual live student count automatically on first load
  useEffect(() => {
    if (!hasCustomStudentCount && totalStudentsCount > 0) {
      setStudentCountParam(totalStudentsCount);
    }
  }, [totalStudentsCount, hasCustomStudentCount]);

  // Computed student count from calculator (teachers using auto calculation)
  const calculatorStudents = useMemo(() => {
    return teachers.reduce((sum, t) => sum + (t.mode === 'auto' ? t.studentCount : 0), 0);
  }, [teachers]);

  // Absolute term projections calculations
  const absoluteProjections = useMemo(() => {
    const data = [];
    
    // Determine the base student count
    const baseStudents = isAbsLinkedToStudentCount 
      ? (calculatorStudents > 0 ? calculatorStudents : (totalStudentsCount > 0 ? totalStudentsCount : 120))
      : absStudentCount;
      
    // Determine the starting revenue
    const baseRevenue = isAbsLinkedToIncome
      ? totalHubCut
      : baseStudents * absFee;
      
    // Determine expenses to subtract if linked
    const baseExpenses = isAbsLinkedToExpenses ? totalCalcExpenses : 0;
    
    // Determine how many periods to project
    const maxPeriods = absPeriodType === 'months' ? 12 : (absPeriodType === 'years' ? 3 : 4);
    
    let currentStudents = baseStudents;
    let currentRevenue = baseRevenue;
    
    for (let p = 1; p <= maxPeriods; p++) {
      if (p > 1) {
        if (isAbsLinkedToIncome) {
          // Grow the revenue directly
          currentRevenue = currentRevenue * (1 + absGrowthRate / 100);
          // Also grow the virtual student count proportionally
          currentStudents = currentStudents * (1 + absGrowthRate / 100);
        } else {
          // Grow the students, then multiply by the absolute fee
          currentStudents = currentStudents * (1 + absGrowthRate / 100);
          currentRevenue = currentStudents * absFee;
        }
      }
      
      const label = absPeriodType === 'months' 
        ? `Month ${p}` 
        : (absPeriodType === 'years' ? `Year ${p}` : `Term ${p}`);
        
      data.push({
        label,
        students: Math.round(currentStudents),
        revenue: Math.round(currentRevenue),
        expenses: Math.round(baseExpenses),
        profit: Math.max(0, Math.round(currentRevenue - baseExpenses)),
      });
    }
    
    return data;
  }, [
    absStudentCount,
    absFee,
    absGrowthRate,
    absPeriodType,
    isAbsLinkedToStudentCount,
    isAbsLinkedToIncome,
    isAbsLinkedToExpenses,
    calculatorStudents,
    totalStudentsCount,
    totalHubCut,
    totalCalcExpenses,
  ]);

  // Sync selected index when period type changes
  useEffect(() => {
    setSelectedAbsolutePeriodIdx(0);
  }, [absPeriodType]);

  // Compute overall financial totals dynamically based on selected data source (tracker vs absolute projections)
  const { totalIncome, totalExpenses, netCapital } = useMemo(() => {
    if (financialModelSource === 'absolute') {
      const activePeriod = absoluteProjections[selectedAbsolutePeriodIdx] || absoluteProjections[0] || { revenue: 0, expenses: 0, profit: 0 };
      return {
        totalIncome: activePeriod.revenue,
        totalExpenses: activePeriod.expenses,
        netCapital: activePeriod.profit
      };
    } else {
      // In Tracker mode, income is the total hub cut from teachers and custom incomes,
      // and expenses are the general expenses (totalCalcExpenses)
      return { 
        totalIncome: totalHubCut, 
        totalExpenses: totalCalcExpenses, 
        netCapital: totalHubCut - totalCalcExpenses 
      };
    }
  }, [financialModelSource, selectedAbsolutePeriodIdx, absoluteProjections, totalHubCut, totalCalcExpenses]);

  // Sync tuition base to local storage preferences if wanted
  const activeMonthlyTuition = useMemo(() => {
    return feePeriod === 'monthly' ? tuitionFee : tuitionFee / termDuration;
  }, [feePeriod, tuitionFee, termDuration]);

  // Budget calculations based on connected flag
  const activeOverhead = useMemo(() => {
    return isLinkedToExpenses ? totalExpenses : overhead;
  }, [isLinkedToExpenses, totalExpenses, overhead]);

  // Connected dynamic revenue forecast for top stats card
  const projectedRevenue = useMemo(() => {
    return studentCountParam * activeMonthlyTuition;
  }, [studentCountParam, activeMonthlyTuition]);

  // Standings Chart Data
  const teacherStandingData = useMemo(() => {
    if (!dbTeachers || dbTeachers.length === 0) {
      return [
        { name: 'Dr. Sarah Jenkins', students: 45, growthRate: 12 },
        { name: 'Prof. James Vance', students: 32, growthRate: 8 },
        { name: 'Miss Emily Stone', students: 28, growthRate: 15 },
        { name: 'Mr. David Miller', students: 18, growthRate: -4 },
        { name: 'Dr. Clara Oswald', students: 22, growthRate: 6 },
      ];
    }

    return dbTeachers.map((t: any) => {
      const count = studentCounts[t.id] ?? 0;
      const growth = t.growthRate || Math.floor((t.name?.charCodeAt(0) || 75) % 18) - 4;
      return {
        name: t.name || 'Unknown Teacher',
        students: count,
        growthRate: growth,
      };
    }).sort((a: any, b: any) => b.students - a.students);
  }, [dbTeachers, studentCounts]);

  // 12-Month Projections Calculations
  const monthlyProjections = useMemo(() => {
    let currentRoster = studentCountParam;
    const data = [];
    let cumulativeSavings = 0;
    
    for (let month = 1; month <= 12; month++) {
      const grossRevenue = currentRoster * activeMonthlyTuition;
      const netProfit = Math.max(0, grossRevenue - activeOverhead);
      cumulativeSavings += netProfit;
      
      data.push({
        month: `Month ${month}`,
        students: Math.round(currentRoster),
        revenue: Math.round(grossRevenue),
        profit: Math.round(netProfit),
        savings: Math.round(cumulativeSavings),
      });
      
      const growth = currentRoster * (monthlyGrowth / 100);
      const loss = currentRoster * ((100 - retentionRate) / 100);
      currentRoster = Math.max(0, currentRoster + growth - loss);
    }
    return data;
  }, [studentCountParam, activeMonthlyTuition, activeOverhead, monthlyGrowth, retentionRate]);

  // Optimization Insights calculations
  const insights = useMemo(() => {
    const breakEvenStudents = Math.ceil(activeOverhead / activeMonthlyTuition);
    const activeRoster = studentCountParam;
    const isProfitable = activeRoster > breakEvenStudents;
    const annualSavings = monthlyProjections[11]?.savings || 0;
    const improvedRetentionAnnualSavings = Math.round(annualSavings * 1.15);

    return {
      breakEvenStudents,
      isProfitable,
      annualSavings,
      improvedRetentionAnnualSavings,
    };
  }, [activeOverhead, activeMonthlyTuition, studentCountParam, monthlyProjections]);

  // --- Calculator Operations ---
  const addTeacher = () => setTeachers([...teachers, { id: uuidv4(), name: `Teacher ${teachers.length + 1}`, mode: 'auto', manualIncome: 0, studentCount: 0, ratePerStudent: 0, totalIncome: 0, splits: [] }]);
  const addCustomIncome = () => setTeachers([...teachers, { id: uuidv4(), name: `Custom Income ${teachers.filter(t => t.isCustom).length + 1}`, mode: 'manual', manualIncome: 0, studentCount: 0, ratePerStudent: 0, totalIncome: 0, splits: [{ id: uuidv4(), percentage: 100, amount: 0 }], isCustom: true }]);
  const updateTeacher = (id: string, field: keyof TeacherCalc, value: any) => setTeachers(teachers.map(t => t.id === id ? { ...t, [field]: value } : t));
  const removeTeacher = (id: string) => setTeachers(teachers.filter(t => t.id !== id));
  const addSplit = (teacherId: string) => setTeachers(teachers.map(t => t.id === teacherId ? { ...t, splits: [...t.splits, {id: uuidv4(), percentage: 10, amount: 0}] } : t));
  const updateSplit = (teacherId: string, splitId: string, newPercentage: number) => setTeachers(teachers.map(t => t.id === teacherId ? { ...t, splits: t.splits.map(s => s.id === splitId ? { ...s, percentage: newPercentage } : s) } : t));
  const removeSplit = (teacherId: string, splitId: string) => setTeachers(teachers.map(t => t.id === teacherId ? {...t, splits: t.splits.filter(s => s.id !== splitId)} : t));
  const addCalculatorExpense = () => setCalculatorExpenses([...calculatorExpenses, {id: uuidv4(), name: '', amount: 0}]);
  const updateCalculatorExpense = (id: string, field: 'name' | 'amount', value: any) => setCalculatorExpenses(calculatorExpenses.map(e => e.id === id ? {...e, [field]: value} : e));
  const removeCalculatorExpense = (id: string) => setCalculatorExpenses(calculatorExpenses.filter(e => e.id !== id));
  
  const handleResetData = () => {
      setTeachers([]);
      setCalculatorExpenses([]);
      localStorage.removeItem('centerCalc-teachers');
      localStorage.removeItem('centerCalc-expenses');
      setIsResetConfirmOpen(false);
      toast({ title: "Calculator Reset", description: "Calculator data has been cleared from local storage." });
  };

  const handleExport = () => {
      const summaryData = [
          { Metric: 'Total Gross Income', Value: `£${totalGrossIncome.toFixed(2)}` },
          { Metric: 'Total Hub Cut', Value: `£${totalHubCut.toFixed(2)}` },
          { Metric: 'Total Expenses', Value: `£${totalCalcExpenses.toFixed(2)}` },
          { Metric: 'Net Profit (Hub)', Value: `£${netProfit.toFixed(2)}` },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
      const teacherData = teachers.flatMap(teacher => {
          const totalHubCutAmount = teacher.splits.reduce((s, c) => s + c.amount, 0);
          const teacherRemainderAmount = teacher.totalIncome - totalHubCutAmount;
          const totalHubCutPercentage = teacher.splits.reduce((s, c) => s + c.percentage, 0);
          const teacherRemainderPercentage = 100 - totalHubCutPercentage;
          const teacherSummaryRow = { 'Type': 'Teacher Summary', 'Name / Split': teacher.name, 'Calculation': teacher.mode === 'auto' ? `${teacher.studentCount} students x £${teacher.ratePerStudent}` : 'Manual Input', 'Gross Income (£)': teacher.totalIncome.toFixed(2), 'Total Hub Cut (£)': totalHubCutAmount.toFixed(2), "Teacher's Profit (£)": teacherRemainderAmount.toFixed(2), "Teacher's Profit (%)": `${teacherRemainderPercentage.toFixed(1)}%`, 'Split Detail': '', 'Split %': '', 'Split Amount (£)': '' };
          const splitRows = teacher.splits.map((split, i) => ({ 'Type': 'Split Detail', 'Name / Split': `  ↳ ${teacher.name}`, 'Calculation': '', 'Gross Income (£)': '', 'Total Hub Cut (£)': '', "Teacher's Profit (£)": '', "Teacher's Profit (%)": '', 'Split Detail': `Hub Cut ${i + 1}`, 'Split %': split.percentage, 'Split Amount (£)': split.amount.toFixed(2) }));
          return [teacherSummaryRow, ...splitRows, {}];
      });
      const teacherSheet = XLSX.utils.json_to_sheet(teacherData, { header: [ 'Type', 'Name / Split', 'Calculation', 'Gross Income (£)', 'Total Hub Cut (£)', "Teacher's Profit (£)", "Teacher's Profit (%)", 'Split Detail', 'Split %', 'Split Amount (£)' ] });
      teacherSheet['!cols'] = [ { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 } ];
      const expenseData = calculatorExpenses.map(exp => ({ 'Expense Name': exp.name, 'Amount (£)': exp.amount }));
      if(calculatorExpenses.length > 0) { expenseData.push({} as any); expenseData.push({ 'Expense Name': 'Total Expenses', 'Amount (£)': totalCalcExpenses }); }
      const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
      expenseSheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Financial Summary');
      XLSX.utils.book_append_sheet(workbook, teacherSheet, 'Teacher Breakdown');
      XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      saveAs(data, `center_financial_calculation_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Export Successful", description: "Your calculation has been exported to Excel." });
  };

  const handleAddItem = async (item: CanvasConfigItem, type: 'income' | 'expense') => {
      if (!canvasConfigRef) return;
      if (!canvasConfig) await setDoc(canvasConfigRef, { [type === 'income' ? 'incomes' : 'expenses']: [item] });
      else await updateDoc(canvasConfigRef, { [type === 'income' ? 'incomes' : 'expenses']: arrayUnion(item) });
  };

  const handleDeleteItem = async (item: CanvasConfigItem, type: 'income' | 'expense') => {
      if (!canvasConfigRef) return;
      await updateDoc(canvasConfigRef, { [type === 'income' ? 'incomes' : 'expenses']: arrayRemove(item) });
  };

  if (isAuthChecking || teachersLoading || countsLoading || isConfigLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-8 h-8 text-primary" />
            {t('Universal Hub Analytics')}
          </h1>
          <p className="text-muted-foreground">{t('Observe consolidated performance, teacher comparisons, and customized projection models.')}</p>
        </div>
      </div>

      {/* Stats Cards - Unified and Connected to Custom Parameters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Roster Teachers" value={teachersCount} icon={<Users className="text-indigo-400" />} description={t('Active faculty members')} />
        <StatCard title="Estimated Student Hub" value={totalStudentsCount} icon={<UserCheck className="text-emerald-400" />} description={t('Aggregated physical student roster')} />
        <StatCard title="Monthly Revenue Est." value={`£${projectedRevenue.toFixed(0)}`} icon={<DollarSign className="text-amber-400" />} description={t('Linked to custom projections')} />
        <StatCard title="Active Target Expenses" value={`£${activeOverhead.toFixed(0)}`} icon={<Landmark className="text-rose-400" />} description={isLinkedToExpenses ? t('Dynamic tracker overhead') : t('Linked to custom projections')} />
      </div>

      {/* Modern High-Contrast Tabs */}
      <div className="flex border-b border-border/80 gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('projections')} 
          className={cn(
            "px-4 py-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2", 
            activeTab === 'projections' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Projections & Money Calculator
        </button>
        <button 
          onClick={() => setActiveTab('standings')} 
          className={cn(
            "px-4 py-2 border-b-2 font-bold text-sm transition-all flex items-center gap-2", 
            activeTab === 'standings' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Standings & Faculty
        </button>
      </div>

      {/* Tab 1: Projections Forecast */}
      {activeTab === 'projections' && (
        <>
          <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              {t('Upgraded Hub Business Projection Model')}
            </CardTitle>
            <CardDescription>{t('Project long-term school scale & compound growth by tuning tuition pricing, rent overhead, and student retention parameters.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Control Panel with sliders and inputs */}
              <div className="lg:col-span-2 space-y-6 bg-muted/20 p-5 rounded-2xl border border-border/30">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {t('Parameter Controls')}
                </h3>

                {/* 1. Student Count */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <Label htmlFor="studentsInput" className="font-bold flex items-center gap-1">
                      {t('Average Students')}
                      {hasCustomStudentCount && <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-500 bg-amber-500/5">Custom</Badge>}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="studentsInput"
                        type="number"
                        min="1"
                        max="2000"
                        value={studentCountParam}
                        onChange={(e) => {
                          setStudentCountParam(Math.max(1, Number(e.target.value)));
                          setHasCustomStudentCount(true);
                        }}
                        className="w-20 h-7 font-mono font-bold text-right p-1 text-xs"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    value={studentCountParam}
                    onChange={(e) => {
                      setStudentCountParam(Number(e.target.value));
                      setHasCustomStudentCount(true);
                    }}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>Live Synced Count: {totalStudentsCount || 120}</span>
                    {hasCustomStudentCount && (
                      <Button 
                        size="sm" 
                        variant="link" 
                        onClick={() => {
                          setStudentCountParam(totalStudentsCount || 120);
                          setHasCustomStudentCount(false);
                        }} 
                        className="h-auto p-0 text-[10px] font-bold text-primary"
                      >
                        Revert to Live
                      </Button>
                    )}
                  </div>
                </div>

                {/* 2. Tuition Fee with period selector */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <Label className="font-bold">{t('Tuition Pricing Model')}</Label>
                    <div className="flex rounded-md border border-input p-0.5 bg-background">
                      <button 
                        onClick={() => setFeePeriod('monthly')} 
                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded", feePeriod === 'monthly' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                      >
                        Monthly
                      </button>
                      <button 
                        onClick={() => setFeePeriod('term')} 
                        className={cn("px-2 py-0.5 text-[10px] font-bold rounded", feePeriod === 'term' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                      >
                        Per Term
                      </button>
                    </div>
                  </div>

                  {feePeriod === 'term' && (
                    <div className="space-y-2 p-3 rounded-lg border border-border/40 bg-background/50">
                      <div className="flex justify-between items-center text-xs">
                        <Label htmlFor="termDuration" className="text-muted-foreground text-[11px]">{t('Term Duration (Months)')}</Label>
                        <Input
                          id="termDuration"
                          type="number"
                          step="0.1"
                          min="1"
                          max="12"
                          value={termDuration}
                          onChange={(e) => setTermDuration(Math.max(1, parseFloat(e.target.value) || 4.5))}
                          className="w-16 h-6 text-xs text-right font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">Average Egyptian term duration is usually 4.5 months.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label htmlFor="feeInput" className="text-[11px] text-muted-foreground">
                        {feePeriod === 'monthly' ? t('Fee Amount (£/mo)') : t('Fee Amount per Term (£)')}
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">£</span>
                        <Input
                          id="feeInput"
                          type="number"
                          min="1"
                          max="2000"
                          value={tuitionFee}
                          onChange={(e) => setTuitionFee(Math.max(1, Number(e.target.value)))}
                          className="w-16 h-7 font-mono font-bold text-right p-1 text-xs"
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min={feePeriod === 'monthly' ? "10" : "50"}
                      max={feePeriod === 'monthly' ? "300" : "1500"}
                      value={tuitionFee}
                      onChange={(e) => setTuitionFee(Number(e.target.value))}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    {feePeriod === 'term' && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Calculated monthly equivalent: <span className="font-bold text-indigo-500">£{(tuitionFee / termDuration).toFixed(2)}/mo</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Overhead with linked switch option */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <Label className="font-bold">{t('Expenses & Budget')}</Label>
                    <button
                      onClick={() => setIsLinkedToExpenses(!isLinkedToExpenses)}
                      className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded border transition-all",
                        isLinkedToExpenses 
                          ? "bg-green-500/10 border-green-500/30 text-green-500 font-bold" 
                          : "bg-muted text-muted-foreground border-border/30 hover:bg-muted/80"
                      )}
                    >
                      <LinkIcon className="w-3 h-3" />
                      {isLinkedToExpenses ? t('Linked to Tracker 🔗') : t('Link Tracker')}
                    </button>
                  </div>

                  {isLinkedToExpenses ? (
                    <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{t('Connected Overhead:')}</span>
                        <span className="font-mono text-xs font-bold text-green-500">£{totalExpenses.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Calculated dynamically from general calculator expenses (£{totalCalcExpenses.toFixed(2)}) + manual transactions (£{(canvasConfig?.expenses?.reduce((sum: any, item: any) => sum + item.amount, 0) || 0).toFixed(2)}).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <Label htmlFor="overheadParamInput" className="text-[11px] text-muted-foreground">{t('Manual Overhead Budget (£)')}</Label>
                        <Input
                          id="overheadParamInput"
                          type="number"
                          min="0"
                          max="10000"
                          value={overhead}
                          onChange={(e) => setOverhead(Math.max(0, Number(e.target.value)))}
                          className="w-16 h-7 font-mono font-bold text-right p-1 text-xs"
                        />
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="50"
                        value={overhead}
                        onChange={(e) => setOverhead(Number(e.target.value))}
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                    </div>
                  )}
                </div>

                {/* 4. Target Monthly Growth */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <Label htmlFor="growthInput" className="font-bold">{t('Target Monthly Growth')}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="growthInput"
                        type="number"
                        min="0"
                        max="100"
                        value={monthlyGrowth}
                        onChange={(e) => setMonthlyGrowth(Math.max(0, Number(e.target.value)))}
                        className="w-14 h-7 font-mono font-bold text-right p-1 text-xs"
                      />
                      <span className="text-xs font-bold text-emerald-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={monthlyGrowth}
                    onChange={(e) => setMonthlyGrowth(Number(e.target.value))}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold hover:bg-emerald-500/5 hover:text-emerald-500 hover:border-emerald-500/30" onClick={() => setMonthlyGrowth(11)}>11% Target</Button>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold hover:bg-emerald-500/5 hover:text-emerald-500 hover:border-emerald-500/30" onClick={() => setMonthlyGrowth(15)}>15% High</Button>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold hover:bg-muted" onClick={() => setMonthlyGrowth(5)}>5% Stable</Button>
                  </div>
                </div>

                {/* 5. Monthly Student Retention */}
                <div className="space-y-2 border-t border-border/30 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <Label htmlFor="retentionInput" className="font-bold">{t('Monthly Student Retention')}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="retentionInput"
                        type="number"
                        min="1"
                        max="100"
                        value={retentionRate}
                        onChange={(e) => setRetentionRate(Math.min(100, Math.max(1, Number(e.target.value))))}
                        className="w-14 h-7 font-mono font-bold text-right p-1 text-xs"
                      />
                      <span className="text-xs font-bold text-cyan-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={retentionRate}
                    onChange={(e) => setRetentionRate(Number(e.target.value))}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  {/* Detailed explanation helper card */}
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl space-y-1 mt-2">
                    <h5 className="text-[10px] font-black uppercase text-cyan-500 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      What is Student Retention?
                    </h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      The percentage of students who stay enrolled month-to-month. For example, a <strong>94% retention rate</strong> means that out of 100 students, 6 leave each month. Keeping retention high is highly compounding—retaining existing students is 5x cheaper than acquiring new ones!
                    </p>
                  </div>
                </div>
              </div>

              {/* Projection Area Chart */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">{t('12-Month Projections Forecast')}</h3>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/25 font-bold">
                    {t('1 Year Forecast')}
                  </Badge>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyProjections} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip />
                      <ChartLegend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" name="Monthly Profit" dataKey="profit" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                      <Area type="monotone" name="Cumulative Savings" dataKey="savings" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSavings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t text-center">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">{t('End Roster')}</span>
                    <span className="text-lg font-bold text-foreground font-mono">{monthlyProjections[11]?.students || 0} {t('St.')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">{t('End Monthly Profit')}</span>
                    <span className="text-lg font-bold text-primary font-mono">£{monthlyProjections[11]?.profit || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">{t('Yearly Accumulated')}</span>
                    <span className="text-lg font-bold text-emerald-500 font-mono">£{insights.annualSavings}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Insight Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/40">
              {/* Break-Even Status Card */}
              <div className="p-4 rounded-xl border bg-card/50 flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${insights.isProfitable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {insights.isProfitable ? <ArrowUpRight className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('Break-Even Status')}</h4>
                  <p className="text-sm font-bold text-foreground leading-snug">
                    {insights.isProfitable 
                      ? `${t('Profitable by')} ${Math.round(studentCountParam - insights.breakEvenStudents)} ${t('students!')}` 
                      : t('Operating at a monthly deficit.')
                    }
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Hub needs')} <span className="font-bold text-foreground">{insights.breakEvenStudents} {t('students')}</span> {t('to cover fixed rent overhead.')}
                  </p>
                </div>
              </div>

              {/* Growth Optimization Insights */}
              <div className="p-4 rounded-xl border bg-card/50 flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('Tuition Elasticity')}</h4>
                  <p className="text-sm font-bold text-foreground leading-snug">
                    +£{Math.round(studentCountParam * 5)} / {t('month')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Increasing pricing by just')} <span className="font-bold text-foreground">£5</span> {t('adds')} <span className="font-bold text-foreground">£{Math.round(studentCountParam * 5 * 12)}</span> {t('annually.')}
                  </p>
                </div>
              </div>

              {/* Retention Optimization Card */}
              <div className="p-4 rounded-xl border bg-card/50 flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-500 shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('Retention Leverage')}</h4>
                  <p className="text-sm font-bold text-foreground leading-snug">
                    £{insights.improvedRetentionAnnualSavings - insights.annualSavings} / {t('year')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('A 5% retention boost yields')} <span className="font-bold text-foreground">£{insights.improvedRetentionAnnualSavings - insights.annualSavings}</span> {t('additional yearly profit.')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Absolute Student & Term Revenue Model --- */}
        <Card className="glass-card">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                {t('Absolute Student & Term Revenue Model')}
              </CardTitle>
              <CardDescription>{t('Raw calculations of per-term or monthly income and growth based on absolute numbers of students and fixed tuition fees.')}</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={financialModelSource === 'absolute' ? 'default' : 'outline'}
                onClick={() => setFinancialModelSource(financialModelSource === 'absolute' ? 'tracker' : 'absolute')}
                className={cn(
                  "text-xs font-bold transition-all",
                  financialModelSource === 'absolute' 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
                    : "hover:bg-indigo-500/5 hover:text-indigo-500"
                )}
              >
                <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                {financialModelSource === 'absolute' 
                  ? "Feeding Financial Summary & Splits 🔗" 
                  : "Feed Overall Summary & Splits"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Controls Column */}
              <div className="lg:col-span-2 space-y-6 bg-muted/20 p-5 rounded-2xl border border-border/30">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {t('Absolute Controls')}
                </h3>

                {/* Scope selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold">{t('Projection Range')}</Label>
                  <div className="flex rounded-md border border-input p-0.5 bg-background">
                    <button 
                      onClick={() => setAbsPeriodType('terms')} 
                      className={cn("flex-1 py-1 text-xs font-bold rounded transition-all", absPeriodType === 'terms' ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                      Terms (4)
                    </button>
                    <button 
                      onClick={() => setAbsPeriodType('months')} 
                      className={cn("flex-1 py-1 text-xs font-bold rounded transition-all", absPeriodType === 'months' ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                      Months (12)
                    </button>
                    <button 
                      onClick={() => setAbsPeriodType('years')} 
                      className={cn("flex-1 py-1 text-xs font-bold rounded transition-all", absPeriodType === 'years' ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                      Years (3)
                    </button>
                  </div>
                </div>

                {/* Link switches to override */}
                <div className="space-y-2.5 p-3 rounded-xl border border-border bg-background/50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Link to Calculator & Expenses</span>
                  
                  {/* Link Student Count */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="absLinkStudents" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      Link Student Count
                    </Label>
                    <button
                      id="absLinkStudents"
                      onClick={() => setIsAbsLinkedToStudentCount(!isAbsLinkedToStudentCount)}
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border transition-all",
                        isAbsLinkedToStudentCount 
                          ? "bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400" 
                          : "bg-muted text-muted-foreground border-border/30"
                      )}
                    >
                      {isAbsLinkedToStudentCount ? `Linked (${calculatorStudents || totalStudentsCount}) 🔗` : 'Link Tracker'}
                    </button>
                  </div>

                  {/* Link Income */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="absLinkIncome" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      Link Income Stream
                    </Label>
                    <button
                      id="absLinkIncome"
                      onClick={() => setIsAbsLinkedToIncome(!isAbsLinkedToIncome)}
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border transition-all",
                        isAbsLinkedToIncome 
                          ? "bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400" 
                          : "bg-muted text-muted-foreground border-border/30"
                      )}
                    >
                      {isAbsLinkedToIncome ? `Linked (£${totalIncome.toFixed(0)}) 🔗` : 'Link Tracker'}
                    </button>
                  </div>

                  {/* Link Expenses */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="absLinkExpenses" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
                      Link Expenses & Deductions
                    </Label>
                    <button
                      id="absLinkExpenses"
                      onClick={() => setIsAbsLinkedToExpenses(!isAbsLinkedToExpenses)}
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded border transition-all",
                        isAbsLinkedToExpenses 
                          ? "bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400" 
                          : "bg-muted text-muted-foreground border-border/30"
                      )}
                    >
                      {isAbsLinkedToExpenses ? `Linked (£${totalExpenses.toFixed(0)}) 🔗` : 'Link Tracker'}
                    </button>
                  </div>
                </div>

                {/* 1. Student Count Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <Label htmlFor="absStudentsInput" className="font-bold flex items-center gap-1">
                      {t('Amount of Students')}
                      {isAbsLinkedToStudentCount && <Badge variant="outline" className="text-[9px] px-1 py-0 border-green-500/30 text-green-500 bg-green-500/5">Synced</Badge>}
                    </Label>
                    <Input
                      id="absStudentsInput"
                      type="number"
                      disabled={isAbsLinkedToStudentCount}
                      min="1"
                      max="100000"
                      value={isAbsLinkedToStudentCount ? (calculatorStudents || totalStudentsCount) : absStudentCount}
                      onChange={(e) => {
                        setAbsStudentCount(Math.max(1, Number(e.target.value)));
                        setHasCustomAbsStudentCount(true);
                      }}
                      className="w-24 h-7 font-mono font-bold text-right p-1 text-xs"
                    />
                  </div>
                  {!isAbsLinkedToStudentCount && (
                    <>
                      <input
                        type="range"
                        min="10"
                        max="20000"
                        step="50"
                        value={absStudentCount}
                        onChange={(e) => {
                          setAbsStudentCount(Number(e.target.value));
                          setHasCustomAbsStudentCount(true);
                        }}
                        className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Current Live: {totalStudentsCount || 120}</span>
                        {hasCustomAbsStudentCount && (
                          <Button 
                            size="sm" 
                            variant="link" 
                            onClick={() => {
                              setAbsStudentCount(totalStudentsCount || 120);
                              setHasCustomAbsStudentCount(false);
                            }} 
                            className="h-auto p-0 text-[10px] font-bold text-indigo-500 hover:text-indigo-600"
                          >
                            Use Live
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Absolute Term Fee Control */}
                {!isAbsLinkedToIncome && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label htmlFor="absFeeInput" className="font-bold">
                        {t('Tuition Fee (£)')}
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">£</span>
                        <Input
                          id="absFeeInput"
                          type="number"
                          min="1"
                          max="10000"
                          value={absFee}
                          onChange={(e) => setAbsFee(Math.max(1, Number(e.target.value)))}
                          className="w-20 h-7 font-mono font-bold text-right p-1 text-xs"
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="1000"
                      step="5"
                      value={absFee}
                      onChange={(e) => setAbsFee(Number(e.target.value))}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}

                {/* 3. Growth Rate Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <Label htmlFor="absGrowthInput" className="font-bold">{t('Expected Growth Rate')}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="absGrowthInput"
                        type="number"
                        min="-50"
                        max="100"
                        value={absGrowthRate}
                        onChange={(e) => setAbsGrowthRate(Number(e.target.value))}
                        className="w-16 h-7 font-mono font-bold text-right p-1 text-xs"
                      />
                      <span className="text-xs font-bold text-indigo-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    value={absGrowthRate}
                    onChange={(e) => setAbsGrowthRate(Number(e.target.value))}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold" onClick={() => setAbsGrowthRate(10)}>10% Growth</Button>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold" onClick={() => setAbsGrowthRate(20)}>20% High</Button>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold" onClick={() => setAbsGrowthRate(0)}>0% Flat</Button>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                  <p className="text-[10.5px] text-muted-foreground leading-normal">
                    {t('Formula: ')}
                    {isAbsLinkedToIncome ? (
                      <span className="font-semibold text-indigo-500">{t('Linked income from Tracker')} × (1 + {absGrowthRate}%)<sup>period</sup></span>
                    ) : (
                      <span className="font-semibold text-indigo-500">{t('Students')} × £{absFee}</span>
                    )}
                    {isAbsLinkedToExpenses && <span className="text-rose-500 font-semibold"> - {t('Linked Expenses')}</span>}
                    {t('. Projection updates immediately as you tweak parameters or use the calculator.')}
                  </p>
                </div>
              </div>

              {/* Chart and Table Column */}
              <div className="lg:col-span-3 space-y-6">
                <div className="p-4 border rounded-2xl bg-card">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t('Absolute Revenue & Growth Trend')}</h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 uppercase">{absPeriodType}</span>
                  </div>
                  
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={absoluteProjections} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="absRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="absProfitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `£${val.toLocaleString()}`} tick={{ fontSize: 10 }} />
                        <ChartTooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background/95 border p-3 rounded-xl shadow-xl text-xs space-y-1">
                                <p className="font-bold">{payload[0].payload.label}</p>
                                <p className="text-indigo-400 font-semibold">{t('Students')}: <span className="text-foreground">{payload[0].payload.students?.toLocaleString()}</span></p>
                                <p className="text-indigo-500 font-bold">{t('Gross Revenue')}: <span className="text-foreground">£{payload[0].payload.revenue?.toLocaleString()}</span></p>
                                {isAbsLinkedToExpenses && (
                                  <>
                                    <p className="text-rose-400 font-semibold">{t('Expenses')}: <span className="text-foreground">£{payload[0].payload.expenses?.toLocaleString()}</span></p>
                                    <p className="text-emerald-500 font-bold">{t('Projected Profit')}: <span className="text-foreground">£{payload[0].payload.profit?.toLocaleString()}</span></p>
                                  </>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <ChartLegend />
                        <Area type="monotone" name={t("Gross Revenue")} dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#absRevenueGrad)" />
                        {isAbsLinkedToExpenses && (
                          <Area type="monotone" name={t("Projected Profit")} dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#absProfitGrad)" />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table Breakdown */}
                <div className="border rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase">{t('Period')}</TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase">{t('Students')}</TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase">{t('Gross Revenue')}</TableHead>
                        {isAbsLinkedToExpenses && (
                          <>
                            <TableHead className="text-right font-black text-[10px] uppercase">{t('Expenses')}</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase">{t('Net Profit')}</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absoluteProjections.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-bold text-xs py-2">{row.label}</TableCell>
                          <TableCell className="text-right font-mono text-xs py-2">{row.students.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-indigo-500 font-bold py-2">£{row.revenue.toLocaleString()}</TableCell>
                          {isAbsLinkedToExpenses && (
                            <>
                              <TableCell className="text-right font-mono text-xs text-rose-500 py-2">£{row.expenses.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-xs text-emerald-500 font-bold py-2">£{row.profit.toLocaleString()}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Center Financial Calculator & Expense Tracker --- */}
        <div className="space-y-6 pt-12 border-t border-border/60">
          <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                      <CardTitle className="text-2xl font-bold flex items-center gap-2"><Calculator /> Center Financial Calculator</CardTitle>
                      <CardDescription>A tool to calculate income, expenses, and profit splits. Data is saved automatically in your browser.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={() => setIsResetConfirmOpen(true)} variant="destructive" size="sm"><RotateCcw className="mr-2 h-4 w-4"/> Reset Calculator</Button>
                      <Button onClick={handleExport} variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4"/> Export to Excel</Button>
                  </div>
              </CardHeader>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">
                  <Card className="border-indigo-500/10 shadow-sm">
                      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/40">
                          <div className="space-y-1">
                              <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <span className="bg-indigo-500/10 p-1.5 rounded text-indigo-500"><DollarSign className="w-4 h-4" /></span>
                                Incomes Tracker (Teachers & Custom Incomes)
                              </CardTitle>
                              <CardDescription>Track revenue cuts from specific teachers or register flat manual/custom income streams.</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              <Button onClick={addTeacher} size="sm" variant="outline" className="text-xs font-semibold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5"/>Add Teacher
                              </Button>
                              <Button onClick={addCustomIncome} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5"/>Add Custom Income
                              </Button>
                          </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ScrollArea className="h-[600px] pr-4">
                          <div className="space-y-4">
                            {teachers.map((teacher) => {
                                const isCustom = teacher.isCustom;
                                const totalHubCutAmount = teacher.splits.reduce((s, c) => s + c.amount, 0);
                                const teacherRemainderAmount = teacher.totalIncome - totalHubCutAmount;
                                const totalHubCutPercentage = teacher.splits.reduce((s, c) => s + c.percentage, 0);
                                const teacherRemainderPercentage = 100 - totalHubCutPercentage;
                                
                                return (
                                    <div key={teacher.id} className={cn(
                                      "p-4 border rounded-xl space-y-4 transition-all duration-200", 
                                      isCustom 
                                        ? "bg-indigo-500/5 border-indigo-500/20 shadow-sm" 
                                        : "bg-background/55 border-border"
                                    )}>
                                        <div className="flex justify-between items-start gap-4">
                                          <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                              <Input 
                                                value={teacher.name} 
                                                onChange={e => updateTeacher(teacher.id, 'name', e.target.value)} 
                                                className="text-base font-bold h-8 border-none p-0 focus-visible:ring-0 shadow-none bg-transparent" 
                                                placeholder={isCustom ? "Custom Income Source" : "Teacher Name"}
                                              />
                                              <Badge className={cn("text-[9px] font-bold px-1.5 py-0.5", isCustom ? "bg-indigo-600 hover:bg-indigo-600 text-white" : "bg-sky-600 hover:bg-sky-600 text-white")}>
                                                {isCustom ? "Custom Income" : "Teacher"}
                                              </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                              {isCustom 
                                                ? "Direct manual transaction or custom product/facility stream." 
                                                : "Professional tutor course revenue split."}
                                            </p>
                                          </div>
                                          <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => removeTeacher(teacher.id)}>
                                            <Trash2 className="w-4 h-4"/>
                                          </Button>
                                        </div>

                                        {!isCustom && (
                                          <Select value={teacher.mode} onValueChange={(v) => updateTeacher(teacher.id, 'mode', v as CalculationMode)}>
                                            <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="auto">Auto Calculate</SelectItem>
                                              <SelectItem value="manual">Manual Input</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}

                                        {isCustom ? (
                                          <div>
                                            <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">Total Income Amount (£)</Label>
                                            <div className="relative">
                                              <span className="absolute left-2.5 top-1.5 text-xs font-bold text-muted-foreground">£</span>
                                              <Input 
                                                type="number" 
                                                value={teacher.manualIncome} 
                                                onChange={e => updateTeacher(teacher.id, 'manualIncome', Number(e.target.value))} 
                                                className="h-8 pl-6 text-xs font-mono font-bold" 
                                                placeholder="0.00"
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          teacher.mode === 'auto' ? (
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label className="text-xs font-bold text-muted-foreground">Student Count</Label>
                                                <Input type="number" value={teacher.studentCount} onChange={e => updateTeacher(teacher.id, 'studentCount', Number(e.target.value))} className="h-8 text-xs font-bold font-mono" />
                                              </div>
                                              <div>
                                                <Label className="text-xs font-bold text-muted-foreground">Rate per Student (£)</Label>
                                                <Input type="number" value={teacher.ratePerStudent} onChange={e => updateTeacher(teacher.id, 'ratePerStudent', Number(e.target.value))} className="h-8 text-xs font-bold font-mono" />
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              <Label className="text-xs font-bold text-muted-foreground">Total Income (£)</Label>
                                              <Input type="number" value={teacher.manualIncome} onChange={e => updateTeacher(teacher.id, 'manualIncome', Number(e.target.value))} className="h-8 text-xs font-bold font-mono" />
                                            </div>
                                          )
                                        )}

                                        <div className="p-2.5 bg-muted rounded-xl text-right">
                                          <Label className="text-[11px] text-muted-foreground font-semibold">Gross Profit Generated:</Label>
                                          <p className="text-base font-black font-mono">£{teacher.totalIncome.toFixed(2)}</p>
                                          {!isCustom && teacher.mode === 'auto' && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{teacher.studentCount} students @ £{teacher.ratePerStudent}/student</p>
                                          )}
                                        </div>

                                        <div className="space-y-2 border-t border-border/40 pt-3">
                                          <div className="flex justify-between items-center">
                                            <Label className="text-xs font-bold text-muted-foreground">
                                              {isCustom ? "Hub Shares & Splits" : "Revenue Splits (Hub Cut)"}
                                            </Label>
                                            <Button size="sm" variant="outline" className="h-6 text-[10px] font-bold" onClick={() => addSplit(teacher.id)}>
                                              <PlusCircle className="mr-1 h-3 w-3"/>Add Split
                                            </Button>
                                          </div>
                                          {teacher.splits.length === 0 ? (
                                            <p className="text-[10px] text-muted-foreground italic bg-muted/40 p-2 rounded-lg text-center">
                                              No splits configured. Hub cut is currently 0%.
                                            </p>
                                          ) : (
                                            <ScrollArea className="max-h-32 pr-4">
                                              <div className="space-y-2">
                                                {teacher.splits.map(split => (
                                                  <div key={split.id} className="flex items-center gap-2">
                                                    <Input type="number" value={split.percentage} onChange={(e) => updateSplit(teacher.id, split.id, Number(e.target.value))} className="w-16 h-7 text-xs font-bold font-mono text-center" />
                                                    <span className="text-xs font-bold text-sky-500">%</span>
                                                    <div className="flex-grow p-1 bg-muted rounded text-right">
                                                      <p className="text-xs font-bold text-sky-500 font-mono">£{split.amount.toFixed(2)}</p>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeSplit(teacher.id, split.id)}>
                                                      <X className="w-3.5 h-3.5"/>
                                                    </Button>
                                                  </div>
                                                ))}
                                              </div>
                                            </ScrollArea>
                                          )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                          <div className="p-2.5 bg-sky-500/10 rounded-xl text-right border border-sky-500/20">
                                            <Label className="text-[10px] text-sky-800 dark:text-sky-300 font-bold block">
                                              {isCustom ? "Total Hub Share Cut:" : "Total Hub Cut:"}
                                            </Label>
                                            <p className="text-lg font-black text-sky-600 dark:text-sky-400 font-mono">£{totalHubCutAmount.toFixed(2)}</p>
                                          </div>
                                          
                                          <div className="p-2.5 bg-green-500/10 rounded-xl text-right border border-green-500/20 flex justify-between items-center">
                                            <div className="text-left">
                                              <Label className="text-[10px] text-green-800 dark:text-green-300 font-bold block">
                                                {isCustom ? "Partner/Seller Remainder:" : "Teacher Remainder:"}
                                              </Label>
                                              <p className="text-lg font-black text-green-600 dark:text-green-400 font-mono">£{teacherRemainderAmount.toFixed(2)}</p>
                                            </div>
                                            <Badge className="text-xs bg-green-600 font-bold font-mono shrink-0">{teacherRemainderPercentage.toFixed(0)}%</Badge>
                                          </div>
                                        </div>
                                    </div>
                                );
                            })}
                          </div>
                        </ScrollArea>
                      </CardContent>
                  </Card>
              </div>
              <div className="xl:col-span-1 space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                      <div className="space-y-1">
                        <CardTitle>General Expenses</CardTitle>
                        <CardDescription>Track center-wide costs.</CardDescription>
                      </div>
                      <Button size="sm" className="h-7 text-[11px]" onClick={addCalculatorExpense}><PlusCircle className="mr-1 h-3.5 w-3.5"/>Add</Button>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-3">
                          {calculatorExpenses.map(expense => (
                            <div key={expense.id} className="flex gap-2 items-center">
                              <Input placeholder="Expense Name" value={expense.name} onChange={e => updateCalculatorExpense(expense.id, 'name', e.target.value)} className="h-8 text-xs" />
                              <Input type="number" placeholder="Amount" value={expense.amount} onChange={e => updateCalculatorExpense(expense.id, 'amount', Number(e.target.value))} className="w-24 h-8 text-xs" />
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeCalculatorExpense(expense.id)}><Trash2 className="text-destructive w-3.5 h-3.5"/></Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
              </div>
          </div>
          {/* Combined Capital and Profits Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
            <Card className="border-indigo-500/10 shadow-sm">
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <span className="bg-indigo-500/10 p-1 rounded text-indigo-500"><Wallet className="w-4 h-4" /></span>
                    {t('Overall Financial Summary')}
                  </CardTitle>
                  <CardDescription>Select the financial data source to feed the ledger.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={financialModelSource} onValueChange={(v) => setFinancialModelSource(v as 'tracker' | 'absolute')}>
                    <SelectTrigger className="h-8 text-xs font-semibold w-48">
                      <SelectValue placeholder="Select Data Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tracker">Calculator Incomes & Expenses</SelectItem>
                      <SelectItem value="absolute">Absolute Revenue Projections</SelectItem>
                    </SelectContent>
                  </Select>

                  {financialModelSource === 'absolute' && (
                    <Select value={selectedAbsolutePeriodIdx.toString()} onValueChange={(v) => setSelectedAbsolutePeriodIdx(Number(v))}>
                      <SelectTrigger className="h-8 text-xs font-mono font-bold w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {absoluteProjections.map((row, idx) => (
                          <SelectItem key={idx} value={idx.toString()} className="font-mono text-xs">
                            {row.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Coins className="w-3.5 h-3.5 text-green-500" />
                    {t('Total Income')}
                  </p>
                  <p className="text-xl font-bold text-green-500 font-mono">£{totalIncome.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    {t('Total Expenses')}
                  </p>
                  <p className="text-xl font-bold text-red-500 font-mono">£{totalExpenses.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-semibold">
                    <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                    {t('Net Capital')}
                  </p>
                  <p className={cn("text-xl font-bold font-mono", netCapital >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-destructive")}>
                    £{netCapital.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-500/10 shadow-sm">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="bg-sky-500/10 p-1 rounded text-sky-500"><PieChartIcon className="w-4 h-4" /></span>
                  {t('Profit Distribution (Hub Shares)')}
                </CardTitle>
                <CardDescription>
                  {financialModelSource === 'absolute' 
                    ? `Splitting the £${netCapital.toFixed(2)} net profit of projected ${absoluteProjections[selectedAbsolutePeriodIdx]?.label || 'active term'}.`
                    : `Splitting the £${netCapital.toFixed(2)} net profit of the active calculator state.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="p-3 bg-green-500/10 rounded-lg space-y-1 border border-green-500/30">
                  <p className="text-[11px] text-green-700 dark:text-green-300 flex items-center gap-1 font-semibold"><PieChartIcon className="w-3 h-3"/>10% Share</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 font-mono">£{(netCapital * 0.10).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-sky-500/10 rounded-lg space-y-1 border border-sky-500/30">
                  <p className="text-[11px] text-sky-700 dark:text-sky-300 flex items-center gap-1 font-semibold"><PieChartIcon className="w-3 h-3"/>40% Share</p>
                  <p className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono">£{(netCapital * 0.40).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg space-y-1 border border-purple-500/30">
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1 font-semibold"><PieChartIcon className="w-3 h-3"/>50% Share</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono">£{(netCapital * 0.50).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all calculator data from your browser&apos;s local storage. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">Yes, Reset Data</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
        </>
      )}

      {/* Tab 2: Standings & Faculty */}
      {activeTab === 'standings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader>
              <CardTitle>{t('Unified Teacher Standing & Growth Rate')}</CardTitle>
              <CardDescription>{t('Comparing student volume per teacher (left axis) against monthly growth percentage (right axis).')}</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={teacherStandingData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} label={{ value: t('Students'), angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 11, fontWeight: 'bold' } }} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} label={{ value: t('Growth Rate (%)'), angle: 90, position: 'insideRight', offset: 0, style: { fontSize: 11, fontWeight: 'bold' } }} />
                  <ChartTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background/95 border p-3 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-bold">{payload[0].payload.name}</p>
                          <p className="text-indigo-400 font-semibold">{t('Students')}: <span className="text-foreground">{payload[0].value}</span></p>
                          <p className="text-emerald-400 font-semibold">{t('Growth Rate')}: <span className="text-foreground">{payload[1]?.value}%</span></p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar yAxisId="left" dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                  <Line yAxisId="right" type="monotone" dataKey="growthRate" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Teacher list with statistics */}
          <Card className="lg:col-span-1 glass-card flex flex-col justify-between">
            <CardHeader>
              <CardTitle>{t('Faculty Roster Stats')}</CardTitle>
              <CardDescription>{t('Detailed enrollment breakdown by teacher.')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Teacher')}</TableHead>
                      <TableHead className="text-right">{t('Students')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherStandingData.length > 0 ? (
                      teacherStandingData.map((t, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-xs py-2">{t.name}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-indigo-500 font-bold py-2">
                            {t.students}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-xs text-muted-foreground">
                          {t('No faculty teachers registered.')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
