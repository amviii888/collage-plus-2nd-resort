
'use client';
import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LocalStudent, LocalPlan, LocalTransaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FilePenLine, History, Trash2, UserPlus, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { EnrollStudentModal } from '@/components/teacher/EnrollStudentModal';
import { StudentDetailModal } from '@/components/teacher/StudentDetailModal';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { useLocalData } from '@/context/LocalDataContext';
import { add } from 'date-fns';

export default function MyStudentsPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { teacherId, localStudents, setLocalStudents, localPlans, localTransactions, localAttendance, deleteLocalStudent } = useLocalData();

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 400);
    const [studentToDelete, setStudentToDelete] = useState<LocalStudent | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<LocalStudent | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');

    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

    const filteredStudents = useMemo(() => {
        let students = localStudents;
        if (selectedPlanId) {
            students = students.filter((s: LocalStudent) => s.planId === selectedPlanId);
        }
        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            students = students.filter((s: LocalStudent) => 
                s.name.toLowerCase().includes(lowercasedTerm) ||
                s.phone.includes(lowercasedTerm)
            );
        }
        return students;
    }, [localStudents, selectedPlanId, debouncedSearchTerm]);

    const planOptions = useMemo(() => {
        const options = localPlans.map((p: LocalPlan) => ({ value: p.id, label: t(p.name) }));
        options.unshift({ value: '', label: 'All Plans' });
        return options;
    }, [localPlans, t]);

    const handleOpenModal = (student: LocalStudent, modal: 'history' | 'note') => {
        setSelectedStudent(student);
        // Defer opening the modal slightly to allow DropdownMenu to close fully
        // and restore pointer-events to the body.
        setTimeout(() => {
            if (modal === 'note') setIsNoteModalOpen(true);
            if (modal === 'history') setIsHistoryModalOpen(true);
        }, 100);
    };
    
    const handleDeleteStudent = () => {
        if (studentToDelete) {
            deleteLocalStudent(studentToDelete.id);
            toast({title: "Student Removed", variant: "destructive"});
            setStudentToDelete(null);
        }
    };

    const handleEnrollStudent = async (studentData: Omit<LocalStudent, 'id' | 'createdAt'>) => {
        const generatedCode = Math.floor(10000 + Math.random() * 90000).toString();
        const finalBarcode = studentData.barcodeId?.trim() ? studentData.barcodeId.trim() : generatedCode;
        const studentToSave: LocalStudent = {
          id: uuidv4(),
          ...studentData,
          barcodeId: finalBarcode,
          createdAt: new Date() as any,
          updatedAt: new Date().toISOString(),
          synced: false,
        };
        setLocalStudents(prev => [...prev, studentToSave]);
        toast({title: "Student Enrolled", description: `${studentToSave.name} has been enrolled. Their ID / Code is ${studentToSave.barcodeId}`});
        setIsEnrollModalOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>My Local Students</CardTitle>
                            <CardDescription>View and manage your personally enrolled students.</CardDescription>
                        </div>
                        <Button onClick={() => setIsEnrollModalOpen(true)}><UserPlus className="mr-2"/>Enroll New Student</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 py-4">
                        <Combobox 
                            options={planOptions} 
                            value={selectedPlanId} 
                            onChange={setSelectedPlanId} 
                            placeholder={t("Filter by plan...")} 
                            searchPlaceholder={t("Search plans...")} 
                            emptyText={t("No plans found.")}
                            className="w-full sm:w-64"
                        />
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            placeholder={t('Filter students by name or phone...')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Plan</TableHead><TableHead>Debt Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student: LocalStudent) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>{student.phone}</TableCell>
                                            <TableCell>{student.planName}</TableCell>
                                            <TableCell>{student.isInDebt ? <Badge variant="destructive">In Debt</Badge> : <Badge variant="secondary">Paid</Badge>}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenModal(student, 'history')}>
                                                            <History className="mr-2 h-4 w-4" /><span>View History</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => {
                                                             setTimeout(() => {
                                                                 setStudentToDelete(student);
                                                             }, 100);
                                                         }} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /><span>Delete Student</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">{searchTerm ? 'No students found.' : 'No students enrolled yet.'}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this student.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <EnrollStudentModal 
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                onSave={handleEnrollStudent}
                localPlans={localPlans}
            />
             {selectedStudent && (
                <StudentDetailModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    student={selectedStudent}
                    teacherId={teacherId}
                    localAttendance={localAttendance}
                    localTransactions={localTransactions}
                />
            )}
        </>
    );
}
