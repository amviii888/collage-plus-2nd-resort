
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useAuth } from '@/firebase';
import { collection, doc, updateDoc, Timestamp, writeBatch, getDocs, query, where, limit, deleteDoc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import type { Teacher, BiometricCredential } from '@/lib/types';
import { buildAuthHeaders, clearInMemoryAdminToken } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, LogOut, CheckCircle2, XCircle, Clock, Trash2, AlertTriangle, Shield, ShieldAlert, BookUser, Crown, Users, DollarSign, Calendar as CalendarIcon, HelpCircle, Eye, EyeOff, Sparkles, Save, Copy, Check, Lock, KeyRound } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { add } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type AdminSession = { id: string; name: string; role: string; };

// WebAuthn Helper
function bufferDecode(value: string) {
    value = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (value.length % 4)) % 4;
    return Uint8Array.from(atob(value + '='.repeat(pad)), c => c.charCodeAt(0));
}


function TeacherLocalStudentCount({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teachers', teacherId, 'localStudents');
  }, [firestore, teacherId]);
  const { data: students, isLoading } = useCollection(studentsQuery);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 px-2 py-1 rounded-full bg-muted">
        <Users className="h-3 w-3" />
        {isLoading ? <Skeleton className="h-4 w-4" /> : <span>{students?.length || 0}</span>}
    </div>
  );
}


export default function AdminDashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isApprovalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [customMonths, setCustomMonths] = useState<number>(1);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // Secure Server-Side Teacher Password Reset & Legacy Purge States
  const [teacherToReset, setTeacherToReset] = useState<Teacher | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [showNewTeacherPassword, setShowNewTeacherPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [isResettingTeacherPassword, setIsResettingTeacherPassword] = useState(false);
  const [isPurgingPasswords, setIsPurgingPasswords] = useState(false);

  // Daily Academic Quest States
  const [questTitle, setQuestTitle] = useState('');
  const [questXp, setQuestXp] = useState(25);
  const [isSavingQuest, setIsSavingQuest] = useState(false);

  const questDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'announcements', 'daily_quest');
  }, [firestore]);

  const { data: questDoc } = useDoc<{ title?: string; xpReward?: number; questId?: string }>(questDocRef);

  useEffect(() => {
    if (questDoc) {
      setQuestTitle(questDoc.title || '');
      setQuestXp(questDoc.xpReward || 25);
    }
  }, [questDoc]);

  const handleSaveQuest = async () => {
    if (!firestore || !questDocRef) return;
    setIsSavingQuest(true);
    try {
      await updateDoc(questDocRef, {
        title: questTitle,
        xpReward: questXp,
        questId: 'quest-' + Date.now(), // Unique ID resets completion status for the new quest
        updatedAt: Timestamp.now(),
      });
      toast({ title: t('Daily Quest Updated'), description: t('The custom academic quest has been configured successfully.') });
    } catch (e: any) {
      try {
        await setDoc(questDocRef, {
          title: questTitle,
          xpReward: questXp,
          questId: 'quest-' + Date.now(),
          updatedAt: Timestamp.now(),
        });
        toast({ title: t('Daily Quest Created'), description: t('The custom academic quest has been configured successfully.') });
      } catch (err: any) {
        toast({ variant: 'destructive', title: t('Save Failed'), description: err.message });
      }
    } finally {
      setIsSavingQuest(false);
    }
  };

  // Leaderboard Size Limit State
  const [leaderboardSize, setLeaderboardSize] = useState<number>(100);
  const [isSavingLeaderboard, setIsSavingLeaderboard] = useState(false);

  const leaderboardDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'leaderboard');
  }, [firestore]);

  const { data: leaderboardDoc } = useDoc<{ limit?: number }>(leaderboardDocRef);

  useEffect(() => {
    if (leaderboardDoc && leaderboardDoc.limit !== undefined) {
      setLeaderboardSize(leaderboardDoc.limit);
    }
  }, [leaderboardDoc]);

  const handleSaveLeaderboardSize = async (size: number) => {
    if (!firestore || !leaderboardDocRef) return;
    setLeaderboardSize(size);
    setIsSavingLeaderboard(true);
    try {
      await setDoc(leaderboardDocRef, {
        limit: size,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      toast({ title: t('Leaderboard Size Updated'), description: t(`Students leaderboard has been limited to the top ${size} players.`) });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Update Failed'), description: e.message });
    } finally {
      setIsSavingLeaderboard(false);
    }
  };


  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      try {
        localStorage.removeItem('admin-session');
        const headers = await buildAuthHeaders(auth);
        const res = await fetch('/api/admin/verify-passkey', {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) router.replace('/profile');
          return;
        }
        const data = await res.json();
        if (!cancelled && data.authenticated && data.session?.role === 'S Admin') {
          setAdminSession({
            id: data.session.uid || 'admin',
            name: 'Super Admin',
            role: data.session.role,
          });
        } else if (!cancelled) {
          router.replace('/profile');
          toast({ title: t("Access Denied"), variant: "destructive" });
        }
      } catch {
        if (!cancelled) router.replace('/profile');
      } finally {
        if (!cancelled) setIsAuthChecking(false);
      }
    }
    verifySession();
    return () => {
      cancelled = true;
    };
  }, [router, toast, t, auth]);

  const teachersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teachers');
  }, [firestore]);

  const { data: teachers, isLoading, error: teachersError } = useCollection<Teacher>(teachersQuery);

  const codeRequests = useMemo(() => {
    if (!teachers) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    return teachers.filter(t => t.codeUsage?.extraRequested && t.codeUsage.date === todayStr);
  }, [teachers]);

  const openApprovalDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setApprovalDialogOpen(true);
  }

  const openPaymentDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setPaymentDate(teacher.paymentDueDate ? new Date(teacher.paymentDueDate as string) : undefined);
    setPaymentDialogOpen(true);
  }
  
  const openDeleteDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteConfirmOpen(true);
  }

  const handleRevoke = async (teacher: Teacher) => {
    if (!firestore) return;
    const teacherRef = doc(firestore, 'teachers', teacher.id);
    try {
        await updateDoc(teacherRef, { approved: false, approvalExpiresAt: null, paymentDueDate: null });
        toast({
            title: t('Status Updated'),
            description: t('Approval for {{name}} has been revoked.', { name: teacher.name }),
        })
    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: t('Update Failed'),
            description: e.message || 'Could not revoke teacher status.'
        });
    }
  }

  const handleTogglePersonalAttendance = async (teacher: Teacher) => {
      if (!firestore) return;
      const teacherRef = doc(firestore, 'teachers', teacher.id);
      const newValue = !teacher.hasPersonalAttendance;
      try {
          await updateDoc(teacherRef, { hasPersonalAttendance: newValue });
          toast({
              title: t('Feature Updated'),
              description: t('Personal attendance system {{status}} for {{name}}.', { status: t(newValue ? 'enabled' : 'disabled'), name: teacher.name }),
          });
      } catch (e: any) {
          toast({
              variant: 'destructive',
              title: t('Update Failed'),
              description: e.message || 'Could not update teacher feature status.'
          });
      }
  };
  
  const handleToggleIsFeatured = async (teacher: Teacher) => {
    if (!firestore) return;
    const teacherRef = doc(firestore, 'teachers', teacher.id);
    const newValue = !teacher.isFeatured;
    try {
        await updateDoc(teacherRef, { isFeatured: newValue });
        toast({
            title: t('Teacher Updated'),
            description: `${teacher.name} is ${newValue ? 'now featured' : 'no longer featured'}.`,
        });
    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: t('Update Failed'),
            description: e.message || 'Could not update teacher feature status.'
        });
    }
  };


  const handleApprove = async (period: 'custom' | 'permanent') => {
    if (!firestore || !selectedTeacher) return;
    setApprovalDialogOpen(false);

    const teacherRef = doc(firestore, 'teachers', selectedTeacher.id);
    let expiresAt: Timestamp | null = null;
    let durationText = t('permanently');

    if (period === 'custom') {
        if (customMonths <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Number of months must be greater than 0.'
            });
            return;
        }
        durationText = t('for {{count}} month(s)', { count: customMonths });
        expiresAt = Timestamp.fromDate(add(new Date(), { months: customMonths }));
    }

    try {
        await updateDoc(teacherRef, { approved: true, approvalExpiresAt: expiresAt, paymentDueDate: null });
        toast({
            title: t('Status Updated'),
            description: t('{{name}} has been approved {{durationText}}.', { name: selectedTeacher.name, durationText: durationText }),
        })
    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: t('Update Failed'),
            description: e.message || 'Could not update teacher status.'
        });
    }
    setSelectedTeacher(null);
    setCustomMonths(1);
  };
  
  const handleSetPaymentDate = async (dateToSet: Date | null) => {
    if (!firestore || !selectedTeacher) return;
    setPaymentDialogOpen(false);
    
    const teacherRef = doc(firestore, 'teachers', selectedTeacher.id);

    try {
        await updateDoc(teacherRef, { paymentDueDate: dateToSet ? Timestamp.fromDate(dateToSet) : null });
        if(dateToSet) {
            toast({ title: t('Payment Date Set'), description: `${t("{{name}}'s next payment is due on", {name: selectedTeacher.name})} ${dateToSet.toLocaleDateString()}.`});
        } else {
            toast({ title: t('Payment Date Cleared'), description: `${t("The payment due date for {{name}} has been cleared.", {name: selectedTeacher.name})}`});
        }
    } catch(e: any) {
         toast({
            variant: 'destructive',
            title: t('Update Failed'),
            description: e.message || 'Could not update payment date.'
        });
    }
    setSelectedTeacher(null);
    setPaymentDate(undefined);
  }


  const handleLogout = async () => {
    try {
      localStorage.removeItem('admin-session');
      clearInMemoryAdminToken();
      const headers = await buildAuthHeaders(auth);
      await fetch('/api/admin/verify-passkey', {
        method: 'DELETE',
        headers,
        credentials: 'include',
      }).catch(() => {});
      router.push('/profile');
    } catch {
      window.location.href = '/profile';
    }
  }
  
  const isExpired = (teacher: Teacher) => {
    if (!teacher.approvalExpiresAt) return false;
    const expiryDate = typeof teacher.approvalExpiresAt === 'string'
      ? new Date(teacher.approvalExpiresAt)
      : teacher.approvalExpiresAt.toDate();
    return expiryDate < new Date();
  }
  
  const handleDeleteTeacher = async () => {
      if (!firestore || !selectedTeacher) return;
      setIsDeleteConfirmOpen(false);

      const teacherRef = doc(firestore, 'teachers', selectedTeacher.id);
      try {
          await deleteDoc(teacherRef);
          toast({
              title: t('Teacher Deleted'),
              description: t("{{name}}'s profile and data have been permanently deleted.", { name: selectedTeacher.name }),
          });
      } catch(e: any) {
           toast({
            variant: 'destructive',
            title: t('Deletion Failed'),
            description: e.message || 'Could not delete teacher profile.',
        });
      }
      setSelectedTeacher(null);
  }



  const handleApproveExtraCodes = async (teacherToApprove: Teacher) => {
      if (!firestore || !teacherToApprove.codeUsage) return;
      const teacherRef = doc(firestore, 'teachers', teacherToApprove.id);
      const todayStr = new Date().toISOString().split('T')[0];

      try {
          await runTransaction(firestore, async (transaction) => {
              const teacherDoc = await transaction.get(teacherRef);
              if (!teacherDoc.exists()) throw new Error("Teacher not found");
              
              const currentTeacher = teacherDoc.data() as Teacher;
              const usage = currentTeacher.codeUsage;
              
              if (usage && usage.date === todayStr) {
                  transaction.update(teacherRef, {
                      'codeUsage.limit': usage.limit + 300,
                      'codeUsage.extraRequested': false
                  });
              } else {
                  // Request is stale, just reset the flag
                  transaction.update(teacherRef, { 'codeUsage.extraRequested': false });
              }
          });
          toast({ title: 'Request Approved', description: `${teacherToApprove.name} has been granted 300 extra codes for today.` });
      } catch (e: any) {
          console.error("Error approving extra codes: ", e);
          toast({ title: "Approval Failed", description: e.message, variant: "destructive" });
      }
  };

  const handleInitiateResetTeacherPassword = (teacher: Teacher) => {
    setTeacherToReset(teacher);
    setNewTeacherPassword('');
    setResetError('');
    setShowNewTeacherPassword(false);
    setIsResetDialogOpen(true);
  };

  const handleResetTeacherPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teacherToReset) return;

    const cleanPass = newTeacherPassword.trim();
    if (cleanPass.length < 6) {
      setResetError(t('Password must be at least 6 characters long.'));
      return;
    }

    setIsResettingTeacherPassword(true);
    setResetError('');

    try {
      const headers = await buildAuthHeaders(auth, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/admin/reset-teacher-password', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          teacherId: teacherToReset.id,
          teacherEmail: teacherToReset.email,
          newPassword: cleanPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset teacher password.');
      }

      toast({
        title: t('Teacher Password Reset'),
        description: t('Password updated in Firebase Auth for {{name}}. No plaintext copy was stored in Firestore.', { name: teacherToReset.name }),
      });

      setIsResetDialogOpen(false);
      setTeacherToReset(null);
      setNewTeacherPassword('');
    } catch (err: any) {
      setResetError(err.message || 'Could not reset password.');
    } finally {
      setIsResettingTeacherPassword(false);
    }
  };

  const handlePurgeLegacyPasswords = async () => {
    setIsPurgingPasswords(true);
    try {
      const headers = await buildAuthHeaders(auth, { 'Content-Type': 'application/json' });
      const res = await fetch('/api/admin/purge-passwords', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to purge legacy password fields.');
      }

      toast({
        title: t('Legacy Plaintext Passwords Purged'),
        description: `Cleaned ${data.studentsCleaned || 0} students, ${data.teachersCleaned || 0} teachers, and removed ${data.privateCredsDeleted || 0} private credential docs.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t('Purge Failed'),
        description: err.message || 'Unable to purge plaintext password fields.',
      });
    } finally {
      setIsPurgingPasswords(false);
    }
  };
  

  if (isAuthChecking || !adminSession) {
      return (
          <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
              <Skeleton className="w-full max-w-5xl h-96" />
          </div>
      )
  }

  return (
    <>
    <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tighter">{t('Admin Dashboard')}</h1>
                <p className="text-muted-foreground">{t('Approve teacher accounts and manage subscriptions.')}</p>
            </div>
            <div className='flex items-center gap-2 flex-wrap flex-shrink-0'>
                <Button
                    onClick={handlePurgeLegacyPasswords}
                    disabled={isPurgingPasswords}
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                >
                    <ShieldAlert className="h-4 w-4" />
                    {isPurgingPasswords ? t('Purging...') : t('Purge Legacy Passwords')}
                </Button>
                <Button asChild variant="outline">
                    <Link href="/admin/management"><ArrowLeft className="mr-2"/>{t('Back to Management')}</Link>
                </Button>
                <Button onClick={handleLogout} variant="secondary"><LogOut className="mr-2"/>{t('Log Out')}</Button>
            </div>
        </div>

        <Card className="shadow-lg">
            <CardContent className="p-4 md:p-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                ) : (
                    <div className="divide-y">
                        {teachers && teachers.length > 0 ? (
                           teachers.map(teacher => {
                            const expired = isExpired(teacher);
                            const approved = teacher.approved && !expired;
                            
                            return (
                                <div key={teacher.id} className="flex items-center justify-between p-4 flex-wrap gap-4">
                                    <div className='flex-grow'>
                                        <p className="font-bold text-lg">{teacher.name}</p>
                                        <div className="flex items-center gap-4">
                                            <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                        </div>
                                        {teacher.planName && (
                                            <Badge variant="outline" className="mt-1 gap-1">
                                                <Crown className="h-3 w-3 text-amber-500" /> {teacher.planName}
                                            </Badge>
                                        )}
                                        {teacher.approvalExpiresAt && (
                                            <p className={`text-xs mt-1 flex items-center gap-1 ${expired ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                               <Clock className='h-3 w-3' />
                                               {expired ? 'Expired on' : 'Expires on'}: { (typeof teacher.approvalExpiresAt === 'string' ? new Date(teacher.approvalExpiresAt) : teacher.approvalExpiresAt.toDate()).toLocaleDateString()}
                                            </p>
                                        )}
                                         {teacher.paymentDueDate && (
                                            <p className={`text-xs mt-1 flex items-center gap-1 ${new Date(teacher.paymentDueDate as string) < new Date() ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                               <DollarSign className='h-3 w-3' />
                                               {t('Payment due')}: { (typeof teacher.paymentDueDate === 'string' ? new Date(teacher.paymentDueDate) : teacher.paymentDueDate.toDate()).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className='flex items-center gap-4 flex-wrap'>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`attendance-switch-${teacher.id}`}
                                                checked={!!teacher.hasPersonalAttendance}
                                                onCheckedChange={() => handleTogglePersonalAttendance(teacher)}
                                                disabled={adminSession.role !== 'S Admin'}
                                            />
                                            <Label htmlFor={`attendance-switch-${teacher.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                              <BookUser className="h-3 w-3"/>{t('Personal Attendance')}
                                            </Label>
                                            {teacher.hasPersonalAttendance && <TeacherLocalStudentCount teacherId={teacher.id} />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={approved ? 'default' : 'destructive'} className="text-sm w-28 justify-center gap-1">
                                                {approved ? <><CheckCircle2/>{t('Approved')}</> : <><XCircle/>{ expired ? t('Expired') : t('Pending')}</>}
                                            </Badge>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                title={t('Reset Teacher Password')}
                                                onClick={() => handleInitiateResetTeacherPassword(teacher)}
                                                className="hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={() => openPaymentDialog(teacher)}
                                                variant="outline"
                                                className="w-28"
                                                disabled={adminSession.role !== 'S Admin'}
                                            >
                                                <DollarSign className="mr-2 h-4 w-4" />{t('Set Payment')}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={() => approved ? handleRevoke(teacher) : openApprovalDialog(teacher)}
                                                variant={approved ? 'secondary' : 'default'}
                                                className="w-24"
                                                disabled={adminSession.role !== 'S Admin'}
                                            >
                                                {approved ? t('Revoke') : t('Approve')}
                                            </Button>
                                            {(adminSession.role === 'S Admin') && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => openDeleteDialog(teacher)}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                           })
                        ) : (
                            <p className="text-muted-foreground text-center py-12">{t('No teachers have signed up yet.')}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>

    <AlertDialog open={isApprovalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('Approve Teacher: {{name}}', { name: selectedTeacher?.name })}</AlertDialogTitle>
            <AlertDialogDescription>
                {t('Choose an approval duration. The teacher will be visible to students for this time period. You can revoke access at any time.')}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="custom-months">{t('Custom Months')}</Label>
                    <Input 
                        id="custom-months"
                        type="number"
                        value={customMonths}
                        onChange={(e) => setCustomMonths(Number(e.target.value))}
                        min="1"
                        placeholder="e.g., 6"
                    />
                </div>
                 <Button variant="secondary" onClick={() => handleApprove('custom')}>{t('Approve for {{count}} Month(s)', { count: customMonths })}</Button>
            </div>
            <div className="mt-4 border-t pt-4">
                 <Button onClick={() => handleApprove('permanent')} className="w-full">{t('Approve Permanently')}</Button>
            </div>
            <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="w-full">{t('Cancel')}</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle/>{t('Delete Teacher: {{name}}', { name: selectedTeacher?.name })}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t("This action is irreversible. It will permanently delete this teacher's profile and all their associated data, including courses, calendar events, and share codes.")}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive hover:bg-destructive/90">
                    {t('Yes, Delete Teacher')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isPaymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('Set Payment Due Date for {{name}}', {name: selectedTeacher?.name})}</DialogTitle>
                 <DialogDescription>
                    {t('Select a date for the next subscription payment. Access will be revoked after this date.')}
                </DialogDescription>
            </DialogHeader>
             <div className="py-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {paymentDate ? paymentDate.toLocaleDateString() : <span>{t('Pick a date')}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={paymentDate}
                            onSelect={setPaymentDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <DialogFooter className="sm:justify-between">
                <Button variant="destructive" type="button" onClick={() => handleSetPaymentDate(new Date())}>
                    Set for NOW
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" type="button" onClick={() => handleSetPaymentDate(null)}>{t('Clear Date')}</Button>
                    <Button type="button" onClick={() => handleSetPaymentDate(paymentDate || null)} disabled={!paymentDate}>{t('Set Date')}</Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Secure Server-Side Reset Teacher Password Dialog */}
    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <KeyRound className="h-6 w-6" />
                    <DialogTitle className="text-xl font-bold">{t('Reset Teacher Password')}</DialogTitle>
                </div>
                <DialogDescription>
                    {t('Set a new password in Firebase Auth for')} <span className="font-semibold text-foreground">{teacherToReset?.name}</span>. {t('Plaintext passwords are never saved in Firestore.')}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResetTeacherPassword} className="space-y-4 py-2">
                <div className="space-y-2">
                    <Label htmlFor="reset-teacher-pass-input">{t('New Password')}</Label>
                    <div className="relative">
                        <Input
                            id="reset-teacher-pass-input"
                            type={showNewTeacherPassword ? 'text' : 'password'}
                            placeholder="Minimum 6 characters"
                            value={newTeacherPassword}
                            onChange={(e) => setNewTeacherPassword(e.target.value)}
                            autoFocus
                            minLength={6}
                            className="pr-10 font-mono"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewTeacherPassword(!showNewTeacherPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showNewTeacherPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {resetError && (
                        <p className="text-sm font-medium text-destructive">{resetError}</p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setIsResetDialogOpen(false);
                            setNewTeacherPassword('');
                            setResetError('');
                        }}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isResettingTeacherPassword || newTeacherPassword.trim().length < 6}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                    >
                        {isResettingTeacherPassword ? t('Updating...') : t('Update Password')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    </>
  );
}

    

    