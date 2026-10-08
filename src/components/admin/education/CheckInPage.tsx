
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { add, format, isAfter, parseISO, differenceInDays, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, setDoc } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, doc, writeBatch, getDocs, where, onSnapshot, setDoc as setDocBlocking, updateDoc, increment } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import type { Hub, Aide, AttendanceRecord, EnrolledStudent, Transaction, Center } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Clock, UserPlus, AlertTriangle, Phone, Users, History, BellRing, Building, LogOut, AlertCircle, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Search, User } from 'lucide-react';
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
import { AddStudentModal } from './AddStudentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentsList } from './StudentsList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';


function AideLogin({ onLogin, aides, isLoading }: { onLogin: (aide: Aide) => void; aides: Aide[]; isLoading: boolean; }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [password, setPassword] = useState('');
    const [selectedAideId, setSelectedAideId] = useState<string | undefined>(undefined);
    const [error, setError] = useState('');

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
                </CardContent>
            </Card>
      </div>
    );
}

interface CheckInPageProps {
    hub: Hub;
    aide: Aide | null;
    onLoginSuccess: (aide: Aide) => void;
    onLogout: () => void;
    aides: Aide[];
    aidesLoading: boolean;
}

export function CheckInPage({ hub, aide, onLoginSuccess, onLogout, aides, aidesLoading }: CheckInPageProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [checkIns, setCheckIns] = useState<AttendanceRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [checkInsLoading, setCheckInsLoading] = useState(true);
  
  const [searchInput, setSearchInput] = useState('');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [matchingStudents, setMatchingStudents] = useState<EnrolledStudent[]>([]);
  
  const [historyFilter, setHistoryFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [centerFilter, setCenterFilter] = useState('all');

  const centersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `hubs/${hub.id}/centers`) : null, [firestore, hub.id]);
  const { data: centers, isLoading: centersLoading } = useCollection<Center>(centersCollectionRef);

  useEffect(() => {
    if (!firestore || !hub.id) return;

    setStudentsLoading(true);
    const studentsQuery = query(collection(firestore, `hubs/${hub.id}/students`));
    const unsubscribeStudents = onSnapshot(studentsQuery,
        (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ ...doc.data(), barcodeId: doc.id } as EnrolledStudent));
            setStudents(studentsData);
            setStudentsLoading(false);
        },
        (error) => {
            console.error("Error fetching students:", error);
            toast({ title: t("Error"), description: t("Could not fetch students."), variant: "destructive" });
            setStudentsLoading(false);
        }
    );

    setCheckInsLoading(true);
    const checkInsQuery = query(collection(firestore, `hubs/${hub.id}/attendance`), orderBy('checkInTime', 'desc'));
    
    const unsubscribeCheckIns = onSnapshot(checkInsQuery, 
      (snapshot) => {
        const checkInsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord));
        setCheckIns(checkInsData);
        setCheckInsLoading(false);
      }, 
      (error) => {
        console.error("Error fetching check-ins in real-time:", error);
        toast({ title: t("Error"), description: t("Could not load check-in history."), variant: "destructive" });
        setCheckInsLoading(false);
      }
    );

    return () => {
        unsubscribeStudents();
        unsubscribeCheckIns();
    };
  }, [firestore, hub.id, t, toast]);


  const existingBarcodeIds = useMemo(() => students?.map(m => m.barcodeId) || [], [students]);

  const expiringSoonStudents = useMemo(() => {
    if (!students) return [];
    const today = new Date();
    return students.filter(student => {
      if (!student.subscriptionEndDate) return false;
      try {
        const expiryDate = parseISO(student.subscriptionEndDate);
        const daysLeft = differenceInDays(expiryDate, today);
        return daysLeft >= 0 && daysLeft <= 7;
      } catch (e) {
        return false;
      }
    }).sort((a, b) => differenceInDays(parseISO(a.subscriptionEndDate), today) - differenceInDays(parseISO(b.subscriptionEndDate), today));
  }, [students]);

  const debtStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student => student.remaining > 0).sort((a,b) => b.remaining - a.remaining);
  }, [students]);

  const filteredCheckIns = useMemo(() => {
    if (!checkIns) return [];
    let checks = checkIns;

    if (centerFilter !== 'all') {
        checks = checks.filter(ci => ci.centerId === centerFilter);
    }
    
    const now = new Date();
    let interval: Interval;

    switch(historyFilter) {
        case 'daily':
            interval = { start: startOfDay(now), end: endOfDay(now) };
            break;
        case 'weekly':
            interval = { start: startOfWeek(now), end: endOfWeek(now) };
            break;
        case 'monthly':
            interval = { start: startOfMonth(historyMonth), end: endOfMonth(historyMonth) };
            break;
    }

    return checks.filter(ci => isWithinInterval(new Date(ci.checkInTime), interval));
  }, [checkIns, historyFilter, historyMonth, centerFilter]);

  const firstCheckInMap = useMemo(() => {
    if (!checkIns) return new Map();
    const map = new Map<string, string>();
    for (let i = checkIns.length - 1; i >= 0; i--) {
        const checkIn = checkIns[i];
        if (!map.has(checkIn.barcodeId)) {
            map.set(checkIn.barcodeId, checkIn.id);
        }
    }
    return map;
  }, [checkIns]);

  const performCheckIn = (student: EnrolledStudent) => {
    if (!aide) {
        toast({ title: t("Error"), description: t("No aide logged in."), variant: "destructive" });
        return;
    }

    const hasSubscription = !!student.subscriptionEndDate;
    if (!hasSubscription) {
        toast({ title: t("Check-in Failed"), description: `${student.name} ${t('does not have an active enrollment.')}`, variant: "destructive" });
        return;
    }

    const isExpired = !isAfter(parseISO(student.subscriptionEndDate), new Date());
    if (isExpired) {
      toast({ title: t("Check-in Failed"), description: `${student.name}'s ${t('enrollment is expired.')}`, variant: "destructive" });
      return;
    }
    
    if (!firestore) {
      toast({ title: t("Error"), description: t("Database connection not available."), variant: "destructive" });
      return;
    }

    const attendanceCollection = collection(firestore, `hubs/${hub.id}/attendance`);
    const newCheckIn: Omit<AttendanceRecord, 'id'> = {
      barcodeId: student.barcodeId,
      checkInTime: new Date().toISOString(),
      aideName: aide.name,
      studentName: student.name,
      studentPhone: student.phone,
      planName: student.planName,
      subscriptionEndDate: student.subscriptionEndDate,
      centerId: student.centerId,
      centerName: student.centerName
    };

    addDocumentNonBlocking(attendanceCollection, newCheckIn);

    // Send targeted push notification to student and parent about check-in
    try {
      const notifRef = doc(collection(firestore, 'notifications'));
      const studentCode = (student.barcodeId || '').trim();
      const parentPhone = ((student as any).parentPhone || (student as any).parentPhoneNumber || student.phone || '').trim();
      const nowTime = format(new Date(), 'p');

      setDocBlocking(notifRef, {
        id: notifRef.id,
        title: `تسجيل حضور: ${student.name}`,
        body: `تم تسجيل حضور الطالب (${student.name}) في (${student.planName || 'الحصة'}) بنجاح الساعة ${nowTime}.`,
        type: 'attendance',
        targetAudience: 'attendance_targeted',
        targetStudentBarcode: studentCode,
        targetStudentId: studentCode,
        targetParentPhone: parentPhone,
        isBroadcast: false,
        createdAt: new Date().toISOString(),
        studentName: student.name,
        planName: student.planName || 'حصة تعليمية',
      }).catch(e => console.error("Attendance notification write failed:", e));
    } catch (e) {}

    if (student.barcodeId && firestore) {
      try {
        const studentRef = doc(firestore, 'students', student.barcodeId);
        setDocBlocking(studentRef, { xp: increment(50) }, { merge: true }).catch(() => {});
      } catch (e) {}
      const curXp = parseInt(localStorage.getItem('student-xp-' + student.barcodeId) || '0', 10);
      localStorage.setItem('student-xp-' + student.barcodeId, (curXp + 50).toString());
    }
    
    const checkInDescription = `${student.name} ${t('checked in at')} ${format(new Date(), 'p')}. (+50 XP Granted!)`;
    const noteDescription = student.notes ? `\n\n${t('Note')}: ${student.notes}` : '';

    toast({ 
        title: t('Checked In'), 
        description: (
            <div className="whitespace-pre-wrap">{checkInDescription}{noteDescription}</div>
        ),
        duration: student.notes ? 10000 : 5000 
    });

    setSearchInput('');
    setIsCheckInModalOpen(false);
    setMatchingStudents([]);
  };

  const handleSearchAndCheckIn = () => {
    if (!searchInput.trim() || !students) return;

    let foundStudent = students.find(m => m.barcodeId === searchInput);
    if (foundStudent) {
      performCheckIn(foundStudent);
      return;
    }

    foundStudent = students.find(m => m.phone === searchInput);
    if (foundStudent) {
      performCheckIn(foundStudent);
      return;
    }
    
    const nameMatches = students.filter(m => 
      m.name.toLowerCase().includes(searchInput.toLowerCase())
    );

    if (nameMatches.length === 1) {
      performCheckIn(nameMatches[0]);
    } else if (nameMatches.length > 1) {
      setMatchingStudents(nameMatches);
    } else {
      setMatchingStudents([]);
      setIsAlertOpen(true);
    }
  };
  
  const handleSaveNewStudent = async (newStudentData: EnrolledStudent, transactionData: Omit<Transaction, 'id'|'aide'|'date' | 'planId'>) => {
    if (!firestore || !aide) {
        toast({ title: t("Error"), description: t("Cannot save student. Database or aide unavailable."), variant: "destructive" });
        return;
    };

    const studentDocRef = doc(firestore, `hubs/${hub.id}/students`, newStudentData.barcodeId);
    const transactionCollectionRef = collection(firestore, `hubs/${hub.id}/transactions`);

    const finalTransactionData: Omit<Transaction, 'id'> = {
        ...(transactionData as Omit<Transaction, 'id' | 'aide' | 'date'>),
        planId: newStudentData.planId,
        aide: aide.name,
        date: new Date().toISOString(),
    }
    
    try {
        const batch = writeBatch(firestore);
        batch.set(studentDocRef, newStudentData);
        const transactionDoc = doc(transactionCollectionRef); 
        batch.set(transactionDoc, finalTransactionData);
        await batch.commit();

        toast({ title: t("Student Enrolled"), description: `${newStudentData.name} ${t('has been successfully enrolled.')}` });
        setIsAddStudentModalOpen(false);
        setSearchInput(''); 
    } catch (e) {
        console.error("Error saving new student:", e);
        toast({ title: t("Save Error"), description: t("There was a problem saving the new student."), variant: "destructive" });
    }
  };
  
  const handleHistoryFilterChange = (filter: 'daily' | 'weekly' | 'monthly') => {
    setHistoryFilter(filter);
    if (filter === 'monthly') {
        setHistoryMonth(new Date());
    }
  };

  const resetCheckInModal = () => {
    setIsCheckInModalOpen(false);
    setSearchInput('');
    setMatchingStudents([]);
  }
  
  const isDataLoading = studentsLoading || checkInsLoading || centersLoading;
  
  if (!aide) {
    return <AideLogin onLogin={onLoginSuccess} aides={aides} isLoading={aidesLoading} />;
  }

  return (
    <div className="space-y-6">
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-3xl font-bold tracking-tight">{t('Student Attendance & Management')}</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground mt-1">{t('Welcome')}, <span className="font-semibold text-primary">{aide.name}</span>!</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <Button onClick={() => setIsAddStudentModalOpen(true)} size="lg" variant="outline">
                            <UserPlus className="mr-2 h-5 w-5" /> <span>{t('Enroll Student')}</span>
                        </Button>
                        <Button onClick={() => setIsCheckInModalOpen(true)} size="lg">
                            <ScanLine className="mr-2 h-5 w-5" /> <span>{t('Mark Attendance')}</span>
                        </Button>
                        <Button onClick={onLogout} size="lg" variant="secondary">
                            <LogOut className="mr-2 h-4 w-4" /> {t('Logout')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
        
        <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="students">
                    <Users className="mr-2 h-4 w-4" />
                    {t('All Students')}
                </TabsTrigger>
                <TabsTrigger value="expiring">
                    <BellRing className="mr-2 h-4 w-4" />
                    {t('Expiring Soon')}
                </TabsTrigger>
                <TabsTrigger value="debt">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {t('Debt Students')}
                </TabsTrigger>
                <TabsTrigger value="history">
                    <History className="mr-2 h-4 w-4" />
                    {t('Attendance History')}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="students" className="mt-4">
                {aide && <StudentsList hub={hub} aide={aide} students={students} studentsLoading={studentsLoading} />}
            </TabsContent>
            <TabsContent value="expiring" className="mt-4">
                <Card className="border-amber-500 bg-amber-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                    {t('Enrollments Expiring Soon')}
                    </CardTitle>
                    <CardDescription>{t('These students need to renew their plans within the next 7 days.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>{t('Name')}</TableHead>
                        <TableHead>{t('Phone')}</TableHead>
                        <TableHead>{t('Plan')}</TableHead>
                        <TableHead className="text-right">{t('Days Left')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expiringSoonStudents.length > 0 ? expiringSoonStudents.map(student => (
                        <TableRow key={student.barcodeId}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.phone}</TableCell>
                            <TableCell>{t(student.planName)}</TableCell>
                            <TableCell className="text-right">
                            <Badge variant="destructive">
                                {differenceInDays(parseISO(student.subscriptionEndDate!), new Date())} {t('days')}
                            </Badge>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                            {t('No enrollments are expiring soon.')}
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="debt" className="mt-4">
                <Card className="border-destructive bg-destructive/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                    {t('Students with Outstanding Debt')}
                    </CardTitle>
                    <CardDescription>{t('There are')} {debtStudents.length} {t('students with an outstanding balance.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>{t('Name')}</TableHead>
                        <TableHead>{t('Phone')}</TableHead>
                        <TableHead>{t('Center')}</TableHead>
                        <TableHead className="text-right">{t('Amount Owed')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {debtStudents.length > 0 ? debtStudents.map(student => (
                        <TableRow key={student.barcodeId}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.phone}</TableCell>
                            <TableCell>{t(student.centerName)}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant="destructive">
                                    £{student.remaining.toFixed(2)}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                            {t('No students have outstanding debt.')}
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <div className="flex gap-2">
                        {(['daily', 'weekly', 'monthly'] as const).map(filter => (
                            <Button
                                key={filter}
                                variant={historyFilter === filter ? 'default' : 'outline'}
                                onClick={() => handleHistoryFilterChange(filter)}
                            >
                                {t(filter.charAt(0).toUpperCase() + filter.slice(1))}
                            </Button>
                        ))}
                    </div>

                    <div className="flex gap-2 items-center">
                      {historyFilter === 'monthly' && (
                          <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" onClick={() => setHistoryMonth(prev => subMonths(prev, 1))}>
                                  <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="font-semibold text-center w-32">{format(historyMonth, 'MMMM yyyy')}</span>
                              <Button variant="outline" size="icon" onClick={() => setHistoryMonth(prev => addMonths(prev, 1))} disabled={isAfter(addMonths(historyMonth, 1), new Date())}>
                                  <ChevronRight className="h-4 w-4" />
                              </Button>
                          </div>
                      )}
                      <div className="w-48">
                          <Select value={centerFilter} onValueChange={setCenterFilter} disabled={centersLoading}>
                              <SelectTrigger>
                                  <SelectValue placeholder={t('Filter by center...')} />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">{t('All Centers')}</SelectItem>
                                  {centers?.map(c => <SelectItem key={c.id} value={c.id}>{t(c.name)}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {t('Total Attendance')}: <span className="font-bold">{filteredCheckIns.length}</span>
                    </div>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Phone')}</TableHead>
                                <TableHead>{t('Plan')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Expires')}</TableHead>
                                <TableHead>{t('Owes')}</TableHead>
                                <TableHead>{t('Center')}</TableHead>
                                <TableHead>{t('Notes')}</TableHead>
                                <TableHead>{t('Check-In Time')}</TableHead>
                                <TableHead>{t('Aide')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isDataLoading ? (
                                <TableRow><TableCell colSpan={10} className="h-24 text-center">{t('Loading history...')}</TableCell></TableRow>
                            ) : filteredCheckIns && filteredCheckIns.length > 0 ? filteredCheckIns.map(checkIn => {
                                const student = students?.find(m => m.barcodeId === checkIn.barcodeId);
                                const hasExpiry = !!student?.subscriptionEndDate;
                                const isExpired = hasExpiry ? !isAfter(parseISO(student!.subscriptionEndDate!), new Date()) : true;
                                const isFirstCheckIn = firstCheckInMap.get(checkIn.barcodeId) === checkIn.id;

                                return (
                                <TableRow key={checkIn.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{checkIn.studentName}</span>
                                            {isFirstCheckIn && <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Sparkles className="h-3 w-3 mr-1" />{t('New')}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{checkIn.studentPhone}</TableCell>
                                    <TableCell>{t(checkIn.planName)}</TableCell>
                                    <TableCell>
                                        {student ? (
                                        isExpired ? <Badge variant="destructive">{t('Expired')}</Badge> : <Badge variant="secondary">{t('Active')}</Badge>
                                        ) : (
                                        <Badge variant="outline">{t('Unknown')}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{hasExpiry ? format(parseISO(student!.subscriptionEndDate!), 'PPP') : t('N/A')}</TableCell>
                                    <TableCell>
                                        {student && student.remaining > 0 ? (
                                            <Badge variant="destructive">£{student.remaining.toFixed(2)}</Badge>
                                        ) : (
                                            <Badge variant="outline">£0.00</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{t(checkIn.centerName)}</TableCell>
                                     <TableCell>
                                      {student?.notes && (
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <MessageSquare className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate max-w-[150px]">{student.notes}</span>
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>{format(new Date(checkIn.checkInTime), 'p, PPP')}</TableCell>
                                    <TableCell>{checkIn.aideName}</TableCell>
                                </TableRow>
                                );
                            }) : (
                                <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    {t('No attendance recorded for this period.')}
                                </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
        </Tabs>
      
      <AlertDialog open={isCheckInModalOpen} onOpenChange={resetCheckInModal}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Mark Student Attendance')}</AlertDialogTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder={t('Scan barcode, or enter name/phone...')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchAndCheckIn(); }}
                    className="mt-4 pl-10"
                    autoFocus
                />
              </div>
              {matchingStudents.length > 0 && (
                <div className="mt-4 space-y-2 rounded-md border p-2">
                    <p className="text-sm font-medium">{t('Multiple students found. Please select one:')}</p>
                    {matchingStudents.map(student => (
                        <div 
                            key={student.barcodeId}
                            onClick={() => performCheckIn(student)}
                            className="flex justify-between items-center p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                            <div>
                                <p className="font-semibold">{student.name}</p>
                                <p className="text-sm text-muted-foreground">{student.phone}</p>
                            </div>
                             <Badge variant="secondary">{t(student.centerName)}</Badge>
                        </div>
                    ))}
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleSearchAndCheckIn} disabled={!searchInput.trim()}>{t('Check In')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>{t('Student Not Found')}</AlertDialogTitle>
                <AlertDialogDescription>{t("The barcode, phone, or name is not linked to any student. Would you like to enroll a new student?")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSearchInput('')}>{t('Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setIsAlertOpen(false);
                  setIsCheckInModalOpen(false);
                  setIsAddStudentModalOpen(true);
                }}>{t('Enroll Student')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => {
            setIsAddStudentModalOpen(false);
            setSearchInput('');
        }}
        onSave={handleSaveNewStudent}
        existingBarcodeIds={existingBarcodeIds}
        initialBarcodeId={searchInput}
        hubId={hub.id}
      />
    </div>
  );
}
