'use client';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, documentId } from 'firebase/firestore';
import type { TestAttempt, Student } from '@/lib/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserCheck, UserX, Percent, Trophy, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
  teacherId: string;
}

type StudentAttempt = TestAttempt & { studentName?: string; studentPhone?: string };

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card className="bg-muted/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export function TestResultsModal({ isOpen, onClose, testId, testTitle, teacherId }: TestResultsModalProps) {
  const firestore = useFirestore();
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !testId || !firestore || !teacherId) {
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all attempts for the test belonging to the current teacher
        const attemptsQuery = query(
            collection(firestore, 'testAttempts'), 
            where('testId', '==', testId),
            where('teacherId', '==', teacherId)
        );
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const attemptsData = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAttempt));
        
        setAttempts(attemptsData);

      } catch (e: any) {
        setError("Failed to load test results.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [isOpen, testId, teacherId, firestore]);

  const { passed, failed, stats } = useMemo(() => {
    if (attempts.length === 0) {
      return { passed: [], failed: [], stats: { total: 0, passCount: 0, failCount: 0, passRate: 0, avgScore: 0 } };
    }
    
    const passThreshold = 0.5; // 50%
    const passedAttempts: StudentAttempt[] = [];
    const failedAttempts: StudentAttempt[] = [];

    attempts.forEach(att => {
      const percentage = att.totalPoints > 0 ? att.score / att.totalPoints : 0;
      if (percentage >= passThreshold) {
        passedAttempts.push(att);
      } else {
        failedAttempts.push(att);
      }
    });

    passedAttempts.sort((a, b) => b.score - a.score);
    failedAttempts.sort((a, b) => b.score - a.score);

    const total = attempts.length;
    const passCount = passedAttempts.length;
    const passRate = total > 0 ? (passCount / total) * 100 : 0;
    const avgScore = total > 0 ? (attempts.reduce((sum, att) => sum + att.score, 0) / total) : 0;

    return {
      passed: passedAttempts,
      failed: failedAttempts,
      stats: {
        total,
        passCount,
        failCount: total - passCount,
        passRate: Math.round(passRate),
        avgScore: Math.round(avgScore),
      }
    };
  }, [attempts]);

  const ResultsTable = ({ data, title }: { data: StudentAttempt[], title: string }) => (
    <ScrollArea className="h-72">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((att, index) => (
              <TableRow key={att.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{att.studentName}</TableCell>
                <TableCell>{att.studentPhone}</TableCell>
                <TableCell className="text-right font-semibold">{att.score} / {att.totalPoints}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={4} className="h-24 text-center">No students in this category.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Results: {testTitle}</DialogTitle>
          <DialogDescription>
            An overview of student performance on this test.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? <div className="space-y-4 py-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div> : (
          <div className="py-4 space-y-4 flex-grow flex flex-col min-h-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Attempts" value={stats.total} icon={Users} />
              <StatCard title="Average Score" value={stats.avgScore} icon={Trophy} />
              <StatCard title="Passed" value={stats.passCount} icon={UserCheck} />
              <StatCard title="Pass Rate" value={`${stats.passRate}%`} icon={Percent} />
            </div>
            <Tabs defaultValue="passed" className="w-full flex-grow flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="passed"><UserCheck className="mr-2" /> Passed ({stats.passCount})</TabsTrigger>
                <TabsTrigger value="failed"><UserX className="mr-2" /> Failed ({stats.failCount})</TabsTrigger>
              </TabsList>
              <TabsContent value="passed" className="flex-grow min-h-0"><ResultsTable data={passed} title="Passed" /></TabsContent>
              <TabsContent value="failed" className="flex-grow min-h-0"><ResultsTable data={failed} title="Failed" /></TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
