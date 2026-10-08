'use client';
import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, deleteDoc, doc, query, where } from 'firebase/firestore';
import type { Test } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Copy, Check, BarChart } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { TestFormModal } from './TestFormModal';
import { TestResultsModal } from './TestResultsModal';
import { toJsDate } from '@/lib/utils';

export function ManageTests({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // State for the results modal
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedTestForResults, setSelectedTestForResults] = useState<{id: string, title: string} | null>(null);

  const testsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tests'), where('teacherId', '==', teacherId));
  }, [firestore, teacherId]);
  
  const { data: tests, isLoading } = useCollection<Test>(testsQuery);

  const openCreateModal = () => {
    setEditingTest(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (test: Test) => {
    setEditingTest(test);
    setIsModalOpen(true);
  }

  const openResultsModal = (test: Test) => {
    setSelectedTestForResults({id: test.id, title: test.title});
    setIsResultsModalOpen(true);
  }

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (window.confirm("Are you sure you want to delete this test? All attempts will also be deleted.")) {
        try {
            await deleteDoc(doc(firestore, 'tests', id));
            toast({ title: "Test deleted", variant: 'destructive' });
        } catch(e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tests & Quizzes</h2>
          <p className="text-muted-foreground">Create and manage your private tests.</p>
        </div>
        <Button onClick={openCreateModal}><PlusCircle className="mr-2 h-4 w-4" /> Create Test</Button>
      </div>
      
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        tests && tests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => (
              <Card key={test.id}>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{test.title}</CardTitle>
                  <CardDescription>
                    {(() => {
                      const d = toJsDate(test.createdAt);
                      return d ? `Created: ${d.toLocaleDateString()}` : null;
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-2 border rounded-md bg-muted">
                        <span className="font-mono text-lg tracking-widest">{test.testCode}</span>
                        <Button size="icon" variant="ghost" onClick={() => copyCode(test.testCode)}>
                            {copiedCode === test.testCode ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{test.questions.length} questions, {test.timeLimit ? `${test.timeLimit} minutes` : 'No time limit'}</p>
                </CardContent>
                <CardContent className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openResultsModal(test)}><BarChart className="mr-2" /> Results</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(test)}><Edit className="mr-2" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(test.id)}><Trash2 className="mr-2" /> Delete</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-8"><p>No tests created yet.</p></Card>
        )
      )}

      <TestFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        testToEdit={editingTest}
        teacherId={teacherId}
      />
      
      {selectedTestForResults && (
        <TestResultsModal 
            isOpen={isResultsModalOpen}
            onClose={() => setIsResultsModalOpen(false)}
            testId={selectedTestForResults.id}
            testTitle={selectedTestForResults.title}
            teacherId={teacherId}
        />
      )}
    </div>
  )
}
