'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { add, format, isAfter, parseISO, differenceInDays, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval, subMonths, addMonths, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, setDoc } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, doc, writeBatch, getDocs, where, setDoc as setDocBlocking, deleteDoc, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import type { Hub, Aide, AttendanceRecord, Student, Transaction, Center, StudentSubscription, DayOfWeek } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Clock, UserPlus, AlertTriangle, Phone, Users, History, BellRing, Building, LogOut, AlertCircle, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Search, User, Scan } from 'lucide-react';
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
import { AddStudentModal } from '@/components/admin/education/AddStudentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentsList } from '@/components/admin/education/StudentsList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import '@/lib/i18n';
import { CameraBarcodeScanner } from '@/components/admin/education/CameraBarcodeScanner';
import { useRouter } from 'next/navigation';
import { Combobox } from '@/components/ui/combobox';
import type { EnrollmentPlan } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';


// This is a placeholder. In a multi-hub system, you'd fetch this dynamically.
const MOCK_HUB: Hub = {
  id: 'main-hub',
  name: 'Main Education Hub',
};

function AideLogin({ onLogin, aides, isLoading }: { onLogin: (aide: Aide) => void; aides: Aide[]; isLoading: boolean; }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [selectedAideId, setSelectedAideId] = useState<string | undefined>(undefined);
    const [error, setError] = useState('');
    
    const noAidesAvailable = !isLoading && (!aides || aides.length === 0);

    const handleLogin = () => {
        setError('');
        if (!selectedAideId) {
            setError(t('Please select your name.'));
            return;
        }
        const aide = aides?.find(s => s.id === selectedAideId);
        if (aide && aide.password === password) {
            onLogin(aide);
        } else {
            toast({ title: t('Incorrect Password'), variant: 'destructive'});
            setError(t('The password you entered is incorrect.'));
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };
    
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Card className="w-full max-w-sm shadow-2xl bg-card">
                <CardHeader className="text-center">
                    <User className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="text-2xl font-bold">{t('Aide Login')}</CardTitle>
                    <CardDescription>{t('Select your name and enter password.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {noAidesAvailable ? (
                    <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
                        {t("No aide accounts have been created yet. Please use the S-Admin login.")}
                    </div>
                ) : (
                    <>
                        <Select onValueChange={setSelectedAideId} value={selectedAideId} disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoading ? t('Loading aides...') : t('Select your name...')} />
                            </SelectTrigger>
                            <SelectContent>
                                    {aides?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            type="password"
                            placeholder={t('Password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button onClick={handleLogin} className="w-full" disabled={!selectedAideId || !password || isLoading}>{t('Login')}</Button>
                    </>
                )}
                 <p className="text-center text-sm text-muted-foreground !mt-6">
                    {t("Are you an S-Admin?")}{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/admin/login')}>{t('Login Here')}</Button>
                </p>
                </CardContent>
            </Card>
      </div>
    );
}

function ManualAttendanceSheet({ hub }: { hub: Hub }) {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCheckInValue, setManualCheckInValue] = useState('');

  const plansQuery = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/plans`) : null, [firestore, hub.id]);
  const { data: plans, isLoading: plansLoading } = useCollection<EnrollmentPlan>(plansQuery);

  const studentsQuery = useMemoFirebase(() => firestore ? collection(firestore, `students`) : null, [firestore]);
  const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const attendanceQuery = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/attendance`) : null, [firestore, hub.id]);
  const { data: allAttendance, isLoading: attendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);

  const selectedPlan = useMemo(() => plans?.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);

  const enrolledStudents = useMemo(() => {
    if (!selectedPlanId || !allStudents) return [];
    const filtered = allStudents.filter(s =>
      s.activeSubscriptions?.some(sub => sub.planId === selectedPlanId)
    );
    if (!searchTerm) return filtered;
    return filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phoneNumber.includes(searchTerm));
  }, [allStudents, selectedPlanId, searchTerm]);

  const sessionDates = useMemo(() => {
    if (!selectedPlan?.sessionDays) return [];
    const dayIndexes = selectedPlan.sessionDays.map(day => ({
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    }[day as DayOfWeek]));
    
    const monthDates = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    
    return monthDates.filter(date => dayIndexes.includes(date.getDay()));
  }, [selectedPlan, currentMonth]);

  const handleScan = (barcodeId: string) => {
    setIsScannerOpen(false);
    setSearchTerm(barcodeId);
  };

  const handleManualCheckIn = () => {
    if (!manualCheckInValue.trim()) return;
    setSearchTerm(manualCheckInValue.trim());
    setManualCheckInValue('');
    setIsScannerOpen(false);
  }

  const planOptions = useMemo(() => plans?.map(p => ({ value: p.id, label: t(p.name) })) || [], [plans, t]);

  const isLoading = plansLoading || studentsLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Attendance Sheet</CardTitle>
          <CardDescription>A manual, spreadsheet-style view for managing session attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Combobox
              options={planOptions}
              value={selectedPlanId}
              onChange={setSelectedPlanId}
              placeholder={t("Choose a plan page...")}
              searchPlaceholder={t("Search plans...")}
              emptyText={t("No plans found.")}
              className="w-full sm:w-auto min-w-[250px]"
            />
             {selectedPlan && (
                <div className="flex-grow flex justify-end items-center gap-4">
                    <div className="text-sm space-x-2">
                        <span><span className="font-semibold">{t('Teacher')}:</span> {t(selectedPlan.tutor || 'N/A')}</span>
                        <span><span className="font-semibold">{t('Session Day')}:</span> {selectedPlan.sessionDays?.map(d => t(d)).join(', ') || 'N/A'}</span>
                        <span><span className="font-semibold">{t('Cost')}:</span> £{selectedPlan.price}</span>
                    </div>
                </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="mr-2 h-4 w-4" /> {t('Previous Month')}
            </Button>
            <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              {t('Next Month')} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder={t("Search a student by name, phone or barcode")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
             <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setIsScannerOpen(true)}>
                <Scan className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t('Name')}</TableHead>
                  <TableHead className="w-[150px]">{t('Number')}</TableHead>
                  {[...Array(4)].map((_, i) => (
                    <TableHead key={i} className="w-[120px] text-center">
                      {t(`Session ${i + 1}`)}
                      <div className="text-xs font-normal text-muted-foreground">
                        {sessionDates[i] ? format(sessionDates[i], 'd MMM') : '-'}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[150px]">{t('Status')}</TableHead>
                  <TableHead className="w-[200px]">{t('Note')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="h-48 text-center">{t('Loading...')}</TableCell></TableRow>
                ) : enrolledStudents.length > 0 ? (
                  enrolledStudents.map((student, studentIndex) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {studentIndex === 0 && <Button variant="outline" size="sm" className="mb-1 w-full"><Scan className="mr-2"/> Scan</Button>}
                        {student.name}
                      </TableCell>
                      <TableCell>{student.phoneNumber}</TableCell>
                      {[...Array(4)].map((_, sessionIndex) => (
                        <TableCell key={sessionIndex} className="text-center">
                           <Badge variant="outline">?</Badge>
                        </TableCell>
                      ))}
                      <TableCell><Input placeholder={t("Payment...")} className="h-8" /></TableCell>
                      <TableCell><Input placeholder={t("Note...")} className="h-8" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">{t('No students enrolled or matching search.')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between items-center text-sm font-semibold">
        <p>{t('Total Students in this plan')}: {enrolledStudents.length}</p>
        <p>{t('Total Collected')}: £0.00</p>
      </div>

       <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('Scan or Enter Student Barcode')}</DialogTitle>
                    <DialogDescription>{t("The scanned or entered barcode will be used to search for the student.")}</DialogDescription>
                </DialogHeader>
                <CameraBarcodeScanner onScan={handleScan} />
                 <div className="flex w-full items-center space-x-2 pt-4">
                    <Input 
                        type="text" 
                        placeholder={t('Enter barcode manually...')} 
                        value={manualCheckInValue}
                        onChange={(e) => setManualCheckInValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    />
                    <Button type="button" onClick={handleManualCheckIn}>{t('Check In')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}


export default function AdminCheckinPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [aide, setAide] = useState<Aide | null>(null);

  const aidesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${MOCK_HUB.id}/aides`) : null, [firestore, MOCK_HUB.id]);
  const { data: aides, isLoading: aidesLoading } = useCollection<Aide>(aidesCollectionRef);

  const studentsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `students`), where('activeSubscriptions', '!=', []));
  }, [firestore]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsCollectionRef);


  useEffect(() => {
    // Check sessionStorage on the client side for a logged-in aide
    const aideData = sessionStorage.getItem('hub-aide');
    if (aideData) {
        setAide(JSON.parse(aideData));
    }
  }, []);

  const handleLoginSuccess = (loggedInAide: Aide) => {
    setAide(loggedInAide);
    sessionStorage.setItem('hub-aide', JSON.stringify(loggedInAide));
    toast({ title: t('Login Successful'), description: `${t('Welcome')}, ${loggedInAide.name}!` });
  };

  const handleLogout = () => {
    setAide(null);
    sessionStorage.removeItem('hub-aide');
    toast({ title: t('Logged Out') });
  };

  if (!aide) {
      return (
        <div className="container mx-auto p-4 md:p-8">
            <AideLogin
                onLogin={handleLoginSuccess}
                aides={aides || []}
                isLoading={aidesLoading}
            />
        </div>
      )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <Tabs defaultValue="attendance-sheet" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="attendance-sheet">
                    <ScanLine className="mr-2 h-4 w-4" />
                    {t('Attendance Sheet')}
                </TabsTrigger>
                <TabsTrigger value="all-students">
                    <Users className="mr-2 h-4 w-4" />
                    {t('All Students')}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="attendance-sheet" className="mt-4">
                <ManualAttendanceSheet hub={MOCK_HUB} />
            </TabsContent>
            <TabsContent value="all-students" className="mt-4">
                {aide && <StudentsList hub={MOCK_HUB} aide={aide} students={students || []} studentsLoading={studentsLoading} />}
            </TabsContent>
        </Tabs>
    </div>
  );
}
