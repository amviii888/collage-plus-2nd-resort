
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFirestore } from '@/firebase';
import { doc, setDoc, updateDoc, increment, collection, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { LocalPlan, LocalStudent, LocalAttendanceRecord, LocalTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Search, Scan } from 'lucide-react';
import { Combobox } from '../ui/combobox';
import { StudentActionModal } from './StudentActionModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { CameraBarcodeScanner } from '../admin/education/CameraBarcodeScanner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useLocalData } from '@/context/LocalDataContext';

interface TeacherAttendanceProps {
  teacherId: string;
}

export function TeacherAttendance({ teacherId }: TeacherAttendanceProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const { localPlans, localStudents, setLocalStudents, setLocalAttendance, setLocalTransactions, localTransactions } = useLocalData();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<LocalStudent | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedPlan = useMemo(() => localPlans?.find(p => p.id === selectedPlanId), [localPlans, selectedPlanId]);
  const planOptions = useMemo(() => localPlans?.map(p => ({ value: p.id, label: t(p.name) })) || [], [localPlans, t]);

  const onStudentFound = (student: LocalStudent) => {
    setActiveStudent(student);
    setIsActionModalOpen(true);
  };

  const handleSearch = () => {
    if (!selectedPlanId) {
      toast({ title: "Please select a plan first", variant: "destructive" });
      return;
    }
    if (searchTerm.trim().length < 2) {
      toast({ title: "Search term too short", description: "Please enter at least 2 characters.", variant: "destructive" });
      return;
    }

    const lowercasedTerm = searchTerm.toLowerCase();
    
    const results = localStudents.filter((student: LocalStudent) => {
      if (student.planId !== selectedPlanId) return false;
      return (
        student.name.toLowerCase().includes(lowercasedTerm) ||
        student.phone.includes(lowercasedTerm) ||
        student.barcodeId?.includes(lowercasedTerm)
      );
    });

    if (results.length === 1) {
      onStudentFound(results[0]);
    } else if (results.length > 1) {
      onStudentFound(results[0]);
      toast({ title: "Multiple students found", description: `Showing the first match: ${results[0].name}. Be more specific if this is not correct.` });
    } else {
      toast({ title: "Student not found in this plan", variant: "destructive" });
    }
  };

  const handleScan = (barcodeId: string) => {
    setIsScannerOpen(false);
    if (!selectedPlanId) {
      toast({ title: "Please select a plan first", variant: "destructive" });
      return;
    }

    const student = localStudents.find((s: LocalStudent) => s.planId === selectedPlanId && s.barcodeId === barcodeId);
    
    if (student) {
      onStudentFound(student);
    } else {
      toast({ title: "Student with this QR code not found in this plan", variant: "destructive" });
    }
  };

  const handleAttend = () => {
    if (!activeStudent || !teacherId) return;
    const now = new Date();
    const selectedPlan = localPlans?.find(p => p.id === selectedPlanId || p.id === activeStudent.planId);
    const resolvedPlanName = selectedPlan ? selectedPlan.name : (activeStudent.planName || 'Class Session');

    const newRecord: LocalAttendanceRecord = {
      id: uuidv4(),
      studentId: activeStudent.id,
      barcodeId: activeStudent.barcodeId,
      studentName: activeStudent.name,
      planId: selectedPlanId || activeStudent.planId || '',
      planName: resolvedPlanName,
      status: 'Present',
      checkInTime: now.toISOString(),
      sessionId: `${activeStudent.planId || selectedPlanId || 'plan'}_${now.toISOString().split('T')[0]}`,
      updatedAt: now.toISOString(),
      synced: false
    };
    setLocalAttendance(prev => [newRecord, ...prev]);

    // Save attendance history item locally for student profile history lookup
    const historyItem = {
      id: newRecord.id,
      checkInTime: now.toISOString(),
      date: now.toISOString(),
      planName: resolvedPlanName,
      status: 'Present',
      studentId: activeStudent.id,
      barcodeId: activeStudent.barcodeId,
      studentName: activeStudent.name,
    };

    if (activeStudent.id) {
      try {
        const key = `student_attendance_history_${activeStudent.id}`;
        const curHist = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([historyItem, ...curHist]));
      } catch (e) {}
    }
    if (activeStudent.barcodeId) {
      try {
        const key = `student_attendance_history_${activeStudent.barcodeId}`;
        const curHist = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([historyItem, ...curHist]));
      } catch (e) {}
    }

    // Update local student in state
    setLocalStudents(prev => prev.map(s => s.id === activeStudent.id ? {
      ...s,
      lastAttendedAt: now as any,
      attendanceCount: (s.attendanceCount || 0) + 1,
      xp: (s.xp || 0) + 50,
      updatedAt: now.toISOString(),
      synced: false
    } : s));

    // Update student XP cache across all key variations
    const updateXpKey = (key: string) => {
      const cur = parseInt(localStorage.getItem(key) || '0', 10);
      localStorage.setItem(key, (cur + 50).toString());
    };
    const updateProfileCache = (key: string) => {
      try {
        const cachedStr = localStorage.getItem(key);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.xp = (cached.xp || 0) + 50;
          localStorage.setItem(key, JSON.stringify(cached));
        }
      } catch (e) {}
    };

    if (activeStudent.id) {
      updateXpKey('student-xp-' + activeStudent.id);
      updateProfileCache('cached_student_profile_' + activeStudent.id);
      updateProfileCache('student_profile_offline_' + activeStudent.id);
    }
    if (activeStudent.barcodeId) {
      updateXpKey('student-xp-' + activeStudent.barcodeId);
      updateProfileCache('cached_student_profile_' + activeStudent.barcodeId);
      updateProfileCache('student_profile_offline_' + activeStudent.barcodeId);
    }

    if (activeStudent.id && firestore) {
      try {
        const studentRef = doc(firestore, 'students', activeStudent.id);
        setDoc(studentRef, { xp: increment(50) }, { merge: true }).catch(e => console.error("XP update failed:", e));
      } catch (err) {
        console.error("Failed to update student XP in firestore:", err);
      }
    }

    if (activeStudent.barcodeId && activeStudent.barcodeId !== activeStudent.id && firestore) {
      try {
        const studentRef = doc(firestore, 'students', activeStudent.barcodeId);
        setDoc(studentRef, { xp: increment(50) }, { merge: true }).catch(e => console.error("XP update failed:", e));
      } catch (err) {}
    }
    
    const studentCode = (activeStudent.barcodeId || activeStudent.id || '').trim();
    const studentDbId = (activeStudent.id || activeStudent.barcodeId || '').trim();
    const parentPhone = (activeStudent.parentPhone || activeStudent.parentPhoneNumber || '').trim();
    const studentPhone = (activeStudent.phone || '').trim();

    if (studentCode && firestore) {
        const debtStatus = activeStudent.remaining > 0 ? activeStudent.remaining : 0;
        
        // Sync student data to studentSyncData under barcode so profile reflects latest attendance
        const syncRef = doc(firestore, 'studentSyncData', studentCode);
        setDoc(syncRef, {
            lastCheckIn: now.toISOString(),
            planName: resolvedPlanName || activeStudent.planName,
            debtStatus: debtStatus,
            teacherId: teacherId,
        }, { merge: true }).catch(e => console.error("Sync failed:", e));

        if (studentDbId && studentDbId !== studentCode) {
            const altSyncRef = doc(firestore, 'studentSyncData', studentDbId);
            setDoc(altSyncRef, {
                lastCheckIn: now.toISOString(),
                planName: resolvedPlanName || activeStudent.planName,
                debtStatus: debtStatus,
                teacherId: teacherId,
            }, { merge: true }).catch(() => {});
        }

        // Send targeted push notification to student and parent about student arrival
        const nowTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sendAttendanceNotification = async () => {
          let teacherName = "المعلم";
          try {
            const tDoc = await getDoc(doc(firestore, 'teachers', teacherId));
            if (tDoc.exists()) {
              teacherName = tDoc.data().name || "المعلم";
            }
          } catch (e) {
            console.error("Failed to fetch teacher profile:", e);
          }

          try {
            const notifRef = doc(collection(firestore, 'notifications'));
            const notifPayload = {
              id: notifRef.id,
              title: `تسجيل حضور: ${activeStudent.name}`,
              body: `تم تسجيل حضور الطالب (${activeStudent.name}) في (${resolvedPlanName || 'الحصة'}) بنجاح مع (${teacherName}) الساعة ${nowTime}.`,
              type: 'attendance',
              targetAudience: 'attendance_targeted',
              targetStudentBarcode: studentCode,
              targetStudentId: studentDbId,
              targetParentPhone: parentPhone,
              targetStudentPhone: studentPhone,
              isBroadcast: false,
              createdAt: new Date().toISOString(),
              studentName: activeStudent.name,
              teacherName: teacherName,
              planName: resolvedPlanName || 'حصة تعليمية',
            };
            await setDoc(notifRef, notifPayload);
            console.log("Targeted attendance notification successfully written to Firestore for:", studentCode, studentDbId, parentPhone);
          } catch (err) {
            console.error("Failed to send attendance notification:", err);
          }
        };
        sendAttendanceNotification();
    }

    toast({ title: "Attendance Marked", description: `${activeStudent.name} has been marked as attended.` });
    setIsActionModalOpen(false);
  };

  const handleAddPayment = (amount: number) => {
    if (!activeStudent || !teacherId) return;
    const newTransaction: LocalTransaction = {
      id: uuidv4(),
      studentId: activeStudent.id,
      studentName: activeStudent.name,
      planId: activeStudent.planId,
      teacherId: teacherId,
      amount: amount,
      date: new Date().toISOString(),
      type: 'payment',
      updatedAt: new Date().toISOString(),
      synced: false
    };
    setLocalTransactions(prev => [...prev, newTransaction]);
    
    setLocalStudents(prev => prev.map(s => s.id === activeStudent.id ? {
      ...s,
      paid: s.paid + amount,
      remaining: s.remaining - amount,
      isInDebt: (s.remaining - amount) > 0,
      updatedAt: new Date().toISOString(),
      synced: false
    } : s));

    setActiveStudent(prev => prev ? {
      ...prev,
      paid: prev.paid + amount,
      remaining: prev.remaining - amount,
      isInDebt: (prev.remaining - amount) > 0,
      updatedAt: new Date().toISOString()
    } : null);
    
    toast({ title: "Payment Added" });
  };

  const handleToggleDebt = () => {
    if (!activeStudent) return;
    const newDebtStatus = !activeStudent.isInDebt;
    setLocalStudents(prev => prev.map(s => s.id === activeStudent.id ? { 
      ...s, 
      isInDebt: newDebtStatus,
      updatedAt: new Date().toISOString(),
      synced: false
    } : s));
    setActiveStudent(prev => prev ? { ...prev, isInDebt: newDebtStatus } : null);
    toast({ title: "Debt Status Updated" });
  };
  
  const handleSaveNote = (note: string) => {
    if (!activeStudent) return;
    setLocalStudents(prev => prev.map(s => s.id === activeStudent.id ? { 
      ...s, 
      notes: note,
      updatedAt: new Date().toISOString(),
      synced: false
    } : s));
    setActiveStudent(prev => prev ? { ...prev, notes: note } : null);
    toast({ title: "Note Saved" });
  };

  const studentsInSelectedPlan = useMemo(() => {
    if (!selectedPlanId) return [];
    return localStudents.filter(s => s.planId === selectedPlanId);
  }, [localStudents, selectedPlanId]);

  return (
    <>
      <Card className="profile-content-card">
        <CardHeader>
          <CardTitle>{t('Mark Attendance')}</CardTitle>
          <CardDescription>{t('Select a plan, then scan a QR code or search for a student to mark them as present.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-full max-w-sm">
              <Combobox options={planOptions} value={selectedPlanId} onChange={setSelectedPlanId} placeholder={t("1. Select a plan...")} searchPlaceholder={t("Search plans...")} emptyText={t("No plans found.")} />
            </div>
            <Button onClick={() => setIsScannerOpen(true)} size="lg" className="h-24 w-full max-w-sm text-2xl mt-6" disabled={!selectedPlanId}>
              <Scan className="w-10 h-10 mr-4"/>
              {t('Scan QR Code')}
            </Button>
            <div className="text-center text-muted-foreground my-4">{t('OR')}</div>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                type="text" 
                placeholder={t("Search by name/phone...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={!selectedPlanId}
              />
              <Button onClick={handleSearch} disabled={!selectedPlanId || !searchTerm.trim()}>
                <Search/>
              </Button>
            </div>
          </div>

          {selectedPlanId && (
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-2 text-center">{t('Students in this Plan')}</h3>
              <ScrollArea className="h-72 border rounded-md">
                {studentsInSelectedPlan && studentsInSelectedPlan.length > 0 ? (
                  studentsInSelectedPlan.map((student: LocalStudent) => (
                    <div key={student.id} onClick={() => onStudentFound(student)} className="flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.phone}</div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-muted-foreground">{t('No students enrolled in this plan.')}</p>
                )}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
      
      <StudentActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        student={activeStudent}
        planName={selectedPlan?.name || ''}
        onAttend={handleAttend}
        onAddPayment={handleAddPayment}
        onToggleDebt={handleToggleDebt}
        onSaveNote={handleSaveNote}
        localTransactions={localTransactions}
      />
      
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogHeader><DialogTitle>{t('Scan Student QR Code')}</DialogTitle></DialogHeader>
        <DialogContent>
          <CameraBarcodeScanner onScan={handleScan} />
        </DialogContent>
      </Dialog>
    </>
  );
}
