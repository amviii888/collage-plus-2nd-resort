'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Student, Aide, Transaction, Hub, StudentSubscription } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, collection, deleteDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FilePenLine, Receipt, MessageSquare, History, Send, List, Trash2, UserPlus, DollarSign, Search } from 'lucide-react';
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
import { isAfter, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { NoteModal } from './NoteModal';
import { StudentHistoryModal } from './StudentHistoryModal';
import { MessageModal } from './MessageModal';
import { StudentPlansModal } from './StudentPlansModal';
import { AddStudentModal } from './AddStudentModal';
import { ExtendPlanModal } from './ExtendPlanModal';
import { AddPaymentModal } from './AddPaymentModal';
import { useDebounce } from '@/hooks/use-debounce';
import { AppCache } from '@/lib/cache';

interface StudentsListProps {
  hub: Hub;
  aide: Aide;
  centerId?: string | null;
  centerName?: string | null;
}

const getTotalDebt = (subscriptions: StudentSubscription[] = []) => {
    return subscriptions.reduce((acc, sub) => acc + (sub.remaining || 0), 0);
};

export function StudentsList({ hub, aide, centerId, centerName }: StudentsListProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [internalStudents, setInternalStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
        if (!firestore) return;

        const cacheKey = `admin_students_${centerId || 'all'}`;
        const cached = AppCache.get<Student[]>(cacheKey);
        if (cached) {
            setInternalStudents(cached);
            setIsLoading(false);
            return;
        }

        let studentsQuery;
        const studentsRef = collection(firestore, 'students');

        // Always filter by center if a centerId is provided.
        // The search will be a client-side filter on this initial dataset.
        setIsLoading(true);
        if (centerId) {
             studentsQuery = query(studentsRef, where('centerId', '==', centerId));
        } else {
             studentsQuery = query(studentsRef);
        }
        try {
            const snapshot = await getDocs(studentsQuery);
            const fetched = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Student));
            AppCache.set(cacheKey, fetched, 300_000); // 5 min TTL
            setInternalStudents(fetched);
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setIsLoading(false);
        }
    };
    fetchStudents();
}, [firestore, centerId]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return internalStudents;
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return internalStudents.filter(s => 
        s.name.toLowerCase().includes(lowercasedTerm) || 
        s.phoneNumber.includes(lowercasedTerm) || 
        s.barcodeId.includes(lowercasedTerm)
    );
  }, [internalStudents, debouncedSearchTerm]);


  const handleOpenModal = (student: Student, modal: 'note' | 'history' | 'message' | 'plans' | 'extend' | 'payment') => {
    setSelectedStudent(student);
    if (modal === 'note') setIsNoteModalOpen(true);
    if (modal === 'history') setIsHistoryModalOpen(true);
    if (modal === 'message') setIsMessageModalOpen(true);
    if (modal === 'plans') setIsPlansModalOpen(true);
    if (modal === 'extend') setIsExtendModalOpen(true);
    if (modal === 'payment') setIsPaymentModalOpen(true);
  };
  
  const handleSaveNewStudent = async (studentData: Student, newTransactions: Omit<Transaction, 'id' | 'aide' | 'date'>[]) => {
     if (!firestore || !aide) {
        toast({ title: t("Error"), description: t("Cannot save student. Database or aide unavailable."), variant: "destructive" });
        return;
    };
    
    try {
        const batch = writeBatch(firestore);
        
        const studentRef = doc(firestore, `students`, studentData.id);
        batch.set(studentRef, studentData);

        const transactionCollectionRef = collection(firestore, `hubs/${hub.id}/transactions`);
        newTransactions.forEach(transaction => {
            const transactionDoc = doc(transactionCollectionRef);
            const finalTransaction: Omit<Transaction, 'id'> = {
                ...transaction,
                aide: aide.name,
                date: new Date().toISOString(),
            }
            batch.set(transactionDoc, finalTransaction);
        })

        await batch.commit();
        setInternalStudents(prev => [studentData, ...prev]);

        toast({ title: t("Student Enrolled"), description: `${studentData.name} ${t('has been successfully enrolled.')}` });
        setIsAddStudentModalOpen(false);

    } catch (e: any) {
        console.error("Error saving new student:", e);
        toast({ title: t("Save Error"), description: e.message || t("There was a problem saving the new student."), variant: "destructive" });
    }
  };

  const handleNoteSave = (studentId: string, note: string) => {
    if (!firestore) return;
    const studentRef = doc(firestore, `students`, studentId);
    updateDocumentNonBlocking(studentRef, { notes: note });
    setInternalStudents(prev => prev.map(s => s.id === studentId ? {...s, notes: note} : s));
    toast({ title: t('Note Saved'), description: t("The student's note has been updated.")});
    setIsNoteModalOpen(false);
    setSelectedStudent(null);
  }

  const handleMessageSave = (studentId: string, message: { text: string, from: string }) => {
    if (!firestore) return;
    const studentRef = doc(firestore, `students`, studentId);
    updateDocumentNonBlocking(studentRef, { message: message });
    setInternalStudents(prev => prev.map(s => s.id === studentId ? {...s, message: message} : s));
    toast({ title: t('Message Sent'), description: t("The message has been sent to the student.")});
    setIsMessageModalOpen(false);
    setSelectedStudent(null);
  };

  const confirmDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };
  
  const handleAddPayment = async (studentId: string, updatedSubscriptions: StudentSubscription[], transactionData: Omit<Transaction, 'id' | 'aide' | 'date'>) => {
    if (!firestore) { return; }
    const student = internalStudents?.find(s => s.id === studentId);
    if (!student) return;

    try {
        const batch = writeBatch(firestore);
        const studentRef = doc(firestore, `students`, studentId);
        batch.update(studentRef, { activeSubscriptions: updatedSubscriptions });
        
        const transRef = doc(collection(firestore, `hubs/${hub.id}/transactions`));
        const finalTransaction: Omit<Transaction, 'id'> = {
            ...transactionData,
            aide: aide.name,
            date: new Date().toISOString(),
        }
        batch.set(transRef, finalTransaction);
        
        await batch.commit();
        setInternalStudents(prev => prev.map(s => s.id === studentId ? {...s, activeSubscriptions: updatedSubscriptions} : s));
        toast({ title: t("Payment recorded."), description: `${transactionData.studentName} paid £${transactionData.paidAmount}` });
        setIsPaymentModalOpen(false);
    } catch(e: any) {
        console.error(e);
        toast({ title: t("Failed to add payment."), variant: 'destructive'});
    }
  };

  const handleExtendPlan = async (studentId: string, updatedSubscriptions: StudentSubscription[], newTransaction: Omit<Transaction, 'id' | 'aide' | 'date'>) => {
    if (!firestore) return;
    try {
        const batch = writeBatch(firestore);
        const studentRef = doc(firestore, `students`, studentId);
        batch.update(studentRef, { activeSubscriptions: updatedSubscriptions });

        const transRef = doc(collection(firestore, `hubs/${hub.id}/transactions`));
        const finalTransaction: Omit<Transaction, 'id'> = {
            ...newTransaction,
            aide: aide.name,
            date: new Date().toISOString(),
        }
        batch.set(transRef, finalTransaction);

        await batch.commit();
        setInternalStudents(prev => prev.map(s => s.id === studentId ? {...s, activeSubscriptions: updatedSubscriptions} : s));
        toast({ title: t("Success"), description: t("Student plan extended.")});
        setIsExtendModalOpen(false);
    } catch(e: any) {
        console.error(e);
        toast({ title: t("Failed to extend plan."), variant: 'destructive'});
    }
  }

  const handleDeleteStudent = async () => {
    if (!firestore || !studentToDelete) return;

    try {
        const batch = writeBatch(firestore);

        const studentRef = doc(firestore, `students`, studentToDelete.id);
        batch.delete(studentRef);

        const transactionsQuery = query(collection(firestore, `hubs/${hub.id}/transactions`), where('studentId', '==', studentToDelete.barcodeId));
        const transactionSnapshot = await getDocs(transactionsQuery);
        transactionSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const attendanceQuery = query(collection(firestore, `hubs/${hub.id}/attendance`), where('barcodeId', '==', studentToDelete.barcodeId));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        attendanceSnapshot.forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        
        setInternalStudents(prev => prev.filter(s => s.id !== studentToDelete.id));

        toast({ title: t('Student Deleted'), description: `${studentToDelete.name} ${t('has been removed from the system.')}`, variant: 'destructive' });
        setStudentToDelete(null);
    } catch (e: any) {
        console.error(e);
        toast({ title: t('Error'), description: t("Failed to delete the student and their data."), variant: 'destructive' });
        setStudentToDelete(null);
    }
  };

  const getOverallStatus = (subscriptions: StudentSubscription[] = []) => {
      if (!subscriptions || subscriptions.length === 0) return <Badge variant="outline">{t('No Plan')}</Badge>;
      const hasActivePlan = subscriptions.some(s => isAfter(parseISO(s.endDate), new Date()));
      if (hasActivePlan) return <Badge variant="secondary">{t('Active')}</Badge>;
      return <Badge variant="destructive">{t('Expired')}</Badge>;
  }


  return (
    <>
      <div className="flex items-center justify-between py-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Filter students by name, phone, or barcode...')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="max-w-sm pl-10"
            />
        </div>
        <Button onClick={() => setIsAddStudentModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('Enroll Student')}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name')}</TableHead>
              <TableHead>{t('Phone')}</TableHead>
              <TableHead>{t('Center')}</TableHead>
              <TableHead>{t('Active Plans')}</TableHead>
              <TableHead>{t('Overall Status')}</TableHead>
              <TableHead>{t('Notes')}</TableHead>
              <TableHead className="text-right">{t('Total Owed')}</TableHead>
              <TableHead><span className="sr-only">{t('Actions')}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="h-24 text-center">{t('Loading students...')}</TableCell></TableRow>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const totalDebt = getTotalDebt(student.activeSubscriptions);

                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.phoneNumber}</TableCell>
                    <TableCell>{t(student.centerName || 'N/A')}</TableCell>
                    <TableCell>
                       <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenModal(student, 'plans')}>
                           {student.activeSubscriptions?.length || 0} {t('Plan(s)')}
                       </Button>
                    </TableCell>
                    <TableCell>
                      {getOverallStatus(student.activeSubscriptions)}
                    </TableCell>
                    <TableCell>
                      {student.notes && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MessageSquare className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate max-w-[150px]">{student.notes}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       {totalDebt > 0 ? (
                            <Badge variant="destructive">£{totalDebt.toFixed(2)}</Badge>
                       ) : (
                            <Badge variant="outline">£0.00</Badge>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{t('Open menu')}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenModal(student, 'plans')}>
                            <List className="mr-2 h-4 w-4" />
                            <span>{t('View All Plans')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal(student, 'history')}>
                            <History className="mr-2 h-4 w-4" />
                            <span>{t('View History')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal(student, 'note')}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            <span>{t('Add/Edit Note')}</span>
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleOpenModal(student, 'message')}>
                            <Send className="mr-2 h-4 w-4" />
                            <span>{t('Send Message')}</span>
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleOpenModal(student, 'extend')}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>{t('Add/Extend Plan')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenModal(student, 'payment')} disabled={totalDebt <= 0}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            <span>{t('Add Payment')}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => confirmDeleteStudent(student)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>{t('Delete Student')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t(searchTerm ? 'No students match your search.' : 'No students found for this center.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <AddStudentModal 
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSave={handleSaveNewStudent}
        hubId={hub.id}
        centerId={centerId}
        centerName={centerName}
      />

      {selectedStudent && (
        <>
            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                onSave={handleNoteSave}
                student={selectedStudent}
            />
            <StudentHistoryModal
              isOpen={isHistoryModalOpen}
              onClose={() => setIsHistoryModalOpen(false)}
              student={selectedStudent}
              hubId={hub.id}
            />
            <MessageModal
                isOpen={isMessageModalOpen}
                onClose={() => setIsMessageModalOpen(false)}
                onSave={handleMessageSave}
                student={selectedStudent}
                aideName={aide.name}
            />
            <StudentPlansModal
                isOpen={isPlansModalOpen}
                onClose={() => setIsPlansModalOpen(false)}
                student={selectedStudent}
            />
             <ExtendPlanModal 
                isOpen={isExtendModalOpen}
                onClose={() => setIsExtendModalOpen(false)}
                student={selectedStudent}
                hub={hub}
                onExtend={handleExtendPlan}
             />
             <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                student={selectedStudent}
                hubId={hub.id}
                onSave={handleAddPayment}
             />
        </>
      )}

      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('This action cannot be undone. This will permanently delete the student')} <span className="font-bold">{studentToDelete?.name}</span> {t('and all of their associated data.')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">{t('Yes, Delete Student')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
