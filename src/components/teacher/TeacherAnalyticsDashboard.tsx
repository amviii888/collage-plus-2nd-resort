'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalData } from '@/context/LocalDataContext';
import type { LocalStudent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar as CalendarIcon, 
  Users, 
  UserCheck, 
  DollarSign, 
  AlertCircle, 
  Search, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  Sparkles,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Combobox, ComboboxProps } from '../ui/combobox';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

interface TeacherAnalyticsDashboardProps {
  teacherId: string;
  planOptions: ComboboxProps['options'];
}

const StatCard = ({ title, value, icon, subtitle, isLoading }: { title: string, value: string | number, icon: React.ReactNode, subtitle?: string, isLoading: boolean }) => (
  <Card className="profile-content-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      <div className="text-primary h-4 w-4">{icon}</div>
    </CardHeader>
    <CardContent className="space-y-1">
      {isLoading ? (
        <Skeleton className="h-8 w-3/4 bg-zinc-800" />
      ) : (
        <div className="text-2xl font-black text-foreground">{value}</div>
      )}
      {subtitle && <p className="text-[10px] text-muted-foreground font-mono">{subtitle}</p>}
    </CardContent>
  </Card>
);

export function TeacherAnalyticsDashboard({ teacherId, planOptions }: TeacherAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const { localStudents, localAttendance, localTransactions } = useLocalData();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('enrolled');
  
  // Sorting State
  const [sortBy, setSortBy] = useState<'name' | 'paid' | 'remaining' | 'latestPayment' | 'attendance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  const handleSort = (field: 'name' | 'paid' | 'remaining' | 'latestPayment' | 'attendance') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // Default to descending for numbers/dates, can adjust
    }
  };

  const SortableHeader = ({ field, label }: { field: typeof sortBy, label: string }) => {
    const isActive = sortBy === field;
    return (
      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort(field)}>
        <div className="flex items-center gap-1 font-mono uppercase tracking-wider text-[10px]">
          {label}
          {isActive ? (
            sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-40 group-hover:opacity-100" />
          )}
        </div>
      </TableHead>
    );
  };

  // Helper to fetch latest payment info for a student on this plan
  const getLatestPaymentForStudent = useCallback((studentId: string, planId: string) => {
    const studentTxs = localTransactions
      .filter(tx => tx.studentId === studentId && tx.planId === planId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return studentTxs[0]; // Returns undefined if no transactions
  }, [localTransactions]);

  const studentsInPlan = useMemo(() => {
    if (!selectedPlanId) return [];
    return localStudents.filter(s => s.planId === selectedPlanId);
  }, [localStudents, selectedPlanId]);

  const studentIdsInPlan = useMemo(() => {
    return new Set(studentsInPlan.map(s => s.id));
  }, [studentsInPlan]);

  const planAttendance = useMemo(() => {
    if (!selectedPlanId || !dateRange?.from) return [];
    
    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    end.setHours(23, 59, 59, 999);

    return localAttendance.filter(rec => {
      // Robust plan identification matching
      const isForPlan = rec.planId === selectedPlanId || 
                        (rec.sessionId && rec.sessionId.startsWith(selectedPlanId)) ||
                        studentIdsInPlan.has(rec.studentId);
      if (!isForPlan) return false;

      const recTimeStr = rec.checkInTime || rec.updatedAt;
      if (!recTimeStr) return false;
      const recTime = new Date(recTimeStr);
      if (isNaN(recTime.getTime())) return false;
      return recTime >= start && recTime <= end;
    });
  }, [selectedPlanId, dateRange, localAttendance, studentIdsInPlan]);

  const studentAttendanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    planAttendance.forEach(a => {
      counts[a.studentId] = (counts[a.studentId] || 0) + 1;
    });
    return counts;
  }, [planAttendance]);

  const enrolledStudents = useMemo(() => {
    return studentsInPlan;
  }, [studentsInPlan]);

  const attendedStudents = useMemo(() => {
    return localStudents.filter(s => studentAttendanceCounts[s.id] !== undefined);
  }, [localStudents, studentAttendanceCounts]);

  const debtStudents = useMemo(() => {
    return studentsInPlan.filter(s => Boolean(s.isInDebt) || Number(s.remaining) > 0);
  }, [studentsInPlan]);

  const analytics = useMemo(() => {
    if (!selectedPlanId || !dateRange?.from) {
      return { totalAttended: 0, totalProfit: 0, debtCount: 0 };
    }

    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    end.setHours(23, 59, 59, 999);

    // Calculate total profit inside range
    const planTransactions = localTransactions.filter(tx => {
      if (tx.planId !== selectedPlanId) return false;
      if (!tx.date) return false;
      const txTime = new Date(tx.date);
      if (isNaN(txTime.getTime())) return false;
      return txTime >= start && txTime <= end;
    });

    const totalProfit = planTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    return {
      totalAttended: attendedStudents.length,
      totalProfit,
      debtCount: debtStudents.length,
    };
  }, [selectedPlanId, dateRange, localTransactions, attendedStudents, debtStudents]);

  // Sorting and searching wrapper
  const sortedStudents = useMemo(() => {
    let currentList: LocalStudent[] = [];
    if (activeTab === 'enrolled') currentList = enrolledStudents;
    else if (activeTab === 'attended') currentList = attendedStudents;
    else if (activeTab === 'debt') currentList = debtStudents;

    // Apply Search Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      currentList = currentList.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.phone.includes(term)
      );
    }

    // Apply Sorting
    return [...currentList].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortBy) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'paid':
          valA = a.paid || 0;
          valB = b.paid || 0;
          break;
        case 'remaining':
          valA = a.remaining || 0;
          valB = b.remaining || 0;
          break;
        case 'attendance':
          valA = studentAttendanceCounts[a.id] || 0;
          valB = studentAttendanceCounts[b.id] || 0;
          break;
        case 'latestPayment':
          const txA = getLatestPaymentForStudent(a.id, selectedPlanId);
          const txB = getLatestPaymentForStudent(b.id, selectedPlanId);
          valA = txA ? new Date(txA.date).getTime() : 0;
          valB = txB ? new Date(txB.date).getTime() : 0;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeTab, enrolledStudents, attendedStudents, debtStudents, searchTerm, sortBy, sortOrder, studentAttendanceCounts, selectedPlanId, localTransactions, getLatestPaymentForStudent]);

  return (
    <div className="space-y-6">
      <Card className="profile-content-card border-white/5 shadow-2xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="text-primary h-5 w-5" />
                {t('Plan Analytics & Ledger Hub')}
              </CardTitle>
              <CardDescription>{t('Zero-read local memory analytics & student plan ledger records.')}</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Combobox 
                options={planOptions} 
                value={selectedPlanId} 
                onChange={(val) => { setSelectedPlanId(val); setSearchTerm(''); }} 
                placeholder="Select plan to audit..." 
                className="w-full sm:w-auto min-w-[240px] bg-zinc-950 border-zinc-800" 
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal sm:w-auto bg-zinc-950 border-zinc-800 text-xs", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {dateRange?.from ? (
                      dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")
                    ) : <span>Pick a date range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="end">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {!selectedPlanId ? (
            <div className="py-20 text-center text-muted-foreground border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3">
              <Sparkles className="h-10 w-10 text-primary/40 animate-pulse" />
              <p className="text-sm font-medium">{t('Please select a plan from the dropdown above to view rich analytics metrics.')}</p>
            </div>
          ) : (
            <>
              {/* High Fidelity Metrics Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  isLoading={false} 
                  title="Total Enrolled" 
                  value={enrolledStudents.length} 
                  icon={<Users />} 
                  subtitle="All-time active students"
                />
                <StatCard 
                  isLoading={false} 
                  title="Unique Attended" 
                  value={analytics.totalAttended} 
                  icon={<UserCheck />} 
                  subtitle="Checked in during range"
                />
                <StatCard 
                  isLoading={false} 
                  title="Interval Profit" 
                  value={`£${analytics.totalProfit.toFixed(2)}`} 
                  icon={<DollarSign />} 
                  subtitle="Invoiced inside range"
                />
                <StatCard 
                  isLoading={false} 
                  title="Plan Debtors" 
                  value={analytics.debtCount} 
                  icon={<AlertCircle />} 
                  subtitle="Outstanding plan balances"
                />
              </div>

              {/* Rich Tabs & Lists Interface */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSortBy('name'); }} className="w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
                    <TabsList className="bg-zinc-950/60 p-1 border border-zinc-900 rounded-xl h-auto flex flex-wrap gap-1">
                      <TabsTrigger value="enrolled" className="text-xs font-mono font-bold uppercase rounded-lg py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-zinc-950">
                        {t('Enrolled')} ({enrolledStudents.length})
                      </TabsTrigger>
                      <TabsTrigger value="attended" className="text-xs font-mono font-bold uppercase rounded-lg py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-zinc-950">
                        {t('Attended')} ({attendedStudents.length})
                      </TabsTrigger>
                      <TabsTrigger value="debt" className="text-xs font-mono font-bold uppercase rounded-lg py-1.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-zinc-950">
                        {t('Debtors')} ({debtStudents.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Integrated Search Controller */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={`${t('Search student')}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-8 text-xs bg-zinc-950 border-zinc-800 rounded-lg text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <TabsContent value="enrolled">
                      <ScrollArea className="h-[420px] rounded-xl border border-white/5 bg-zinc-950/40">
                        <Table>
                          <TableHeader className="bg-zinc-950">
                            <TableRow className="border-b border-white/5">
                              <SortableHeader field="name" label={t('Name')} />
                              <SortableHeader field="paid" label={t('Paid')} />
                              <SortableHeader field="remaining" label={t('Debt')} />
                              <SortableHeader field="latestPayment" label={t('Latest Payment')} />
                              <TableHead className="text-right text-[10px] font-mono uppercase tracking-wider">{t('Ledger Status')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedStudents.length > 0 ? (
                              sortedStudents.map(s => {
                                const latestTx = getLatestPaymentForStudent(s.id, selectedPlanId);
                                const isDebtor = s.remaining > 0 || s.isInDebt;
                                return (
                                  <TableRow key={s.id} className="border-b border-white/5 hover:bg-white/5">
                                    <TableCell className="font-medium text-xs">
                                      <div>{s.name}</div>
                                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{s.phone}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-300">£{(s.paid || 0).toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-300">£{(s.remaining || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-xs">
                                      {latestTx ? (
                                        <div>
                                          <span className="font-mono text-primary">£{latestTx.amount.toFixed(2)}</span>
                                          <span className="text-[9px] text-zinc-500 ml-1.5 font-mono">({format(new Date(latestTx.date), 'MM-dd')})</span>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-500 text-[10px] italic">None</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {isDebtor ? (
                                        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-500 bg-amber-500/5">
                                          In Debt
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                                          Paid
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                                  {searchTerm ? t('No matches found for search query.') : t('No enrolled students found for this plan.')}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="attended">
                      <ScrollArea className="h-[420px] rounded-xl border border-white/5 bg-zinc-950/40">
                        <Table>
                          <TableHeader className="bg-zinc-950">
                            <TableRow className="border-b border-white/5">
                              <SortableHeader field="name" label={t('Name')} />
                              <SortableHeader field="attendance" label={t('Sessions')} />
                              <SortableHeader field="paid" label={t('Paid')} />
                              <SortableHeader field="remaining" label={t('Debt')} />
                              <SortableHeader field="latestPayment" label={t('Latest Payment')} />
                              <TableHead className="text-right text-[10px] font-mono uppercase tracking-wider">{t('Status')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedStudents.length > 0 ? (
                              sortedStudents.map(s => {
                                const sessionsCount = studentAttendanceCounts[s.id] || 0;
                                const latestTx = getLatestPaymentForStudent(s.id, selectedPlanId);
                                const isDebtor = s.remaining > 0 || s.isInDebt;
                                return (
                                  <TableRow key={s.id} className="border-b border-white/5 hover:bg-white/5">
                                    <TableCell className="font-medium text-xs">
                                      <div>{s.name}</div>
                                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{s.phone}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-primary font-bold">
                                      {sessionsCount} {sessionsCount === 1 ? 'session' : 'sessions'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-300">£{(s.paid || 0).toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-300">£{(s.remaining || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-xs">
                                      {latestTx ? (
                                        <div>
                                          <span className="font-mono text-primary">£{latestTx.amount.toFixed(2)}</span>
                                          <span className="text-[9px] text-zinc-500 ml-1.5 font-mono">({format(new Date(latestTx.date), 'MM-dd')})</span>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-500 text-[10px] italic">None</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {isDebtor ? (
                                        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-500 bg-amber-500/5">
                                          In Debt
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                                          Paid
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs italic">
                                  {searchTerm ? t('No matches found for search query.') : t('No students checked in for this plan within the selected date range.')}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="debt">
                      <ScrollArea className="h-[420px] rounded-xl border border-white/5 bg-zinc-950/40">
                        <Table>
                          <TableHeader className="bg-zinc-950">
                            <TableRow className="border-b border-white/5">
                              <SortableHeader field="name" label={t('Name')} />
                              <SortableHeader field="paid" label={t('Paid')} />
                              <SortableHeader field="remaining" label={t('Debt Amount')} />
                              <SortableHeader field="latestPayment" label={t('Latest Payment')} />
                              <TableHead className="text-right text-[10px] font-mono uppercase tracking-wider">{t('Action')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedStudents.length > 0 ? (
                              sortedStudents.map(s => {
                                const latestTx = getLatestPaymentForStudent(s.id, selectedPlanId);
                                return (
                                  <TableRow key={s.id} className="border-b border-white/5 hover:bg-white/5">
                                    <TableCell className="font-medium text-xs">
                                      <div>{s.name}</div>
                                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{s.phone}</div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-zinc-300">£{(s.paid || 0).toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-xs text-amber-500 font-black">£{(s.remaining || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-xs">
                                      {latestTx ? (
                                        <div>
                                          <span className="font-mono text-primary">£{latestTx.amount.toFixed(2)}</span>
                                          <span className="text-[9px] text-zinc-500 ml-1.5 font-mono">({format(new Date(latestTx.date), 'MM-dd')})</span>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-500 text-[10px] italic">None</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-amber-500/20 hover:bg-amber-500/10 text-amber-500" asChild>
                                        <a href={`tel:${s.phone}`}>{t('Call')}</a>
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                                  {searchTerm ? t('No matches found for search query.') : t('Excellent! No students in debt for this plan.')}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
