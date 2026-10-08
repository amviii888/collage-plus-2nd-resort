'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Test, Teacher, TestQuestion, TestAttempt, Student } from '@/lib/types';
import { useUser, useFirestore, useDoc, useMemoFirebase, useStudent } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, writeBatch, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

// The main component logic
function TestPageClient() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const testId = searchParams.get('id');

    const { data: initialTest, isLoading: isTestLoading } = useDoc<Test>(
        useMemoFirebase(() => firestore && testId ? doc(firestore, 'tests', testId) : null, [firestore, testId])
    );
    
    const teacherId = initialTest?.teacherId;
    
    const { data: initialTeacher, isLoading: isTeacherLoading } = useDoc<Teacher>(
        useMemoFirebase(() => firestore && teacherId ? doc(firestore, 'teachers', teacherId) : null, [firestore, teacherId])
    );
    
    const { user, isUserLoading } = useUser();
    const { student, isLoading: isStudentLoading } = useStudent(user?.uid);

    const [testState, setTestState] = useState<'rules' | 'taking' | 'submitting' | 'submitted'>('rules');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(string | boolean | null)[]>([]);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [totalPoints, setTotalPoints] = useState<number | null>(null);
    const [incorrectQuestions, setIncorrectQuestions] = useState<TestAttempt['incorrectQuestions']>([]);

    useEffect(() => {
        if (initialTest) {
            setAnswers(Array(initialTest.questions.length).fill(null));
            setTimeLeft(initialTest.timeLimit ? initialTest.timeLimit * 60 : null);
        }
    }, [initialTest]);
    
    const submitTest = useCallback(async (status: 'completed' | 'auto_submitted_exit' = 'completed') => {
        if (!firestore || !user || testState === 'submitting' || testState === 'submitted' || !initialTest) return;
        
        setTestState('submitting');
        
        setTimeLeft(0);

        let calculatedScore = 0;
        let calculatedTotalPoints = 0;
        const incorrect: TestAttempt['incorrectQuestions'] = [];

        initialTest.questions.forEach((q, index) => {
            if (q && q.points) { // Guard against undefined or malformed questions
                calculatedTotalPoints += q.points;
                if (status === 'completed') {
                    if (String(answers[index]) === String(q.correctAnswer)) {
                        calculatedScore += q.points;
                    } else {
                        incorrect.push({
                            question: q.questionText || `Question ${index + 1}`,
                            yourAnswer: answers[index],
                            correctAnswer: q.correctAnswer,
                        });
                    }
                }
            }
        });
        
        if (status === 'auto_submitted_exit') {
            calculatedScore = 0;
        }

        const attemptData: Omit<TestAttempt, 'id'> = {
            testId: initialTest.id,
            teacherId: initialTest.teacherId,
            studentId: user.uid,
            studentName: student?.name || 'Unknown Student',
            studentPhone: student?.phoneNumber || 'N/A',
            testTitle: initialTest.title,
            answers,
            score: calculatedScore,
            totalPoints: calculatedTotalPoints,
            submittedAt: serverTimestamp() as any,
            status,
            incorrectQuestions: incorrect,
        };

        try {
            const batch = writeBatch(firestore);
            const studentRef = doc(firestore, 'students', user.uid);
            const attemptRef = doc(collection(firestore, 'testAttempts'));

            batch.set(attemptRef, attemptData);
            batch.set(studentRef, { 
                latestTestAttemptId: attemptRef.id,
                ...(status === 'completed' ? { xp: increment(50) } : {})
            }, { merge: true });

            if (status === 'completed') {
                const curXp = parseInt(localStorage.getItem('student-xp-' + user.uid) || '0', 10);
                localStorage.setItem('student-xp-' + user.uid, (curXp + 50).toString());
            }

            await batch.commit();

            // Send push notification to parent about test results
            if (student) {
                const getAndSendTestNotif = async () => {
                    try {
                        const { collection: fCollection, setDoc: fSetDoc, doc: fDoc } = await import('firebase/firestore');
                        const notifRef = fDoc(fCollection(firestore, 'notifications'));
                        await fSetDoc(notifRef, {
                            id: notifRef.id,
                            title: "New Test Results Available",
                            body: `Your son/daughter, ${student.name}, has completed the test "${initialTest.title}" with a score of ${calculatedScore}/${calculatedTotalPoints}.`,
                            type: 'test_result',
                            targetStudentBarcode: student.barcodeId || student.id || '',
                            targetStudentId: student.id || student.barcodeId || '',
                            targetParentPhone: student.parentPhone || student.parentPhoneNumber || '',
                            isBroadcast: false,
                            createdAt: new Date().toISOString(),
                        });
                        console.log("Parent test result notification created.");
                    } catch (err) {
                        console.error("Failed to send test result notification:", err);
                    }
                };
                getAndSendTestNotif();
            }
            
            toast({
                title: status === 'completed' ? 'Test Submitted! (+50 XP)' : 'Test Automatically Submitted',
                description: status === 'completed' ? 'Your answers have been recorded and +50 XP has been added to your profile!' : 'You left the test page, so your attempt was submitted with a score of 0.',
                variant: status === 'auto_submitted_exit' ? 'destructive' : 'default',
            });
            
            setScore(calculatedScore);
            setTotalPoints(calculatedTotalPoints);
            setIncorrectQuestions(incorrect);
            setTestState('submitted');
            setTimeout(() => router.push('/profile'), 8000); // Increased time to see results

        } catch (e: any) {
            toast({ title: "Submission Failed", description: e.message, variant: "destructive" });
            setTestState('taking');
        }
    }, [firestore, user, testState, initialTest, answers, router, toast, student]);

    useEffect(() => {
        if (testState !== 'taking' || timeLeft === null || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    submitTest('completed');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [testState, timeLeft, submitTest]);

    useEffect(() => {
        if (testState !== 'taking') return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                submitTest('auto_submitted_exit');
            }
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            submitTest('auto_submitted_exit');
            const confirmationMessage = "Are you sure you want to leave? Your test will be submitted with a score of 0.";
            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [testState, submitTest]);
    
    const handleAnswerChange = (answer: string | boolean) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = answer;
        setAnswers(newAnswers);
    };

    const goToNextQuestion = () => {
        if (initialTest && currentQuestionIndex < initialTest.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const goToPrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const isLoading = isUserLoading || isTestLoading || isTeacherLoading || isStudentLoading;
    
    if (isLoading) {
         return <div className="h-screen w-full flex items-center justify-center"><Skeleton className="h-96 w-full max-w-2xl" /></div>;
    }
    
    if (!initialTest || !initialTeacher) {
         return <div className="h-screen w-full flex items-center justify-center"><p>Test not found. Please check the ID and try again.</p></div>;
    }

    // Safeguard against tests with no questions
    if (!initialTest.questions || initialTest.questions.length === 0 || !initialTest.questions[currentQuestionIndex]) {
        return (
             <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
                <Card className="max-w-lg w-full text-center">
                    <CardHeader>
                        <AlertTriangle className="mx-auto h-16 w-16 text-destructive"/>
                        <CardTitle className="mt-4">Test Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>An error occurred while loading the questions for this test. It might be configured incorrectly.</p>
                        <Button onClick={() => router.push('/profile')} className="mt-4">Back to Profile</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion: TestQuestion = initialTest.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / initialTest.questions.length) * 100;
    
    if (testState === 'rules') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
                <Card className="max-w-2xl w-full">
                    <CardHeader>
                        <CardTitle>{initialTest.title}</CardTitle>
                        <CardDescription>Prepared by: {initialTeacher.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <h3 className="font-bold mb-2">Test Rules</h3>
                        <div className="p-4 bg-muted rounded-md border text-sm space-y-2">
                             <p className="whitespace-pre-wrap">{initialTest.rulesText}</p>
                             <div className="flex items-start gap-2 pt-2 text-destructive font-bold">
                                <AlertTriangle className="w-8 h-8 mt-1"/>
                                <p>If you exit the exam at any time before submitting, your test will be automatically submitted and you will receive a score of zero.</p>
                             </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={() => setTestState('taking')}>I Understand, Start Test</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    if (testState === 'submitting' || testState === 'submitted') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
                <Card className="max-w-lg w-full text-center">
                    <CardHeader>
                        {testState === 'submitting' || score === null ? (
                             <CheckCircle className="mx-auto h-16 w-16 text-green-500"/>
                        ) : (
                             <div className="text-6xl font-bold" style={{ color: `hsl(${(score / (totalPoints || 1)) * 120}, 80%, 50%)` }}>{Math.round((score / (totalPoints || 1)) * 100)}%</div>
                        )}
                       
                        <CardTitle className="mt-4">{testState === 'submitting' || score === null ? "Test Submitted!" : "Your Result"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {testState === 'submitting' || score === null ? (
                             <p className="text-muted-foreground">Your answers have been saved. Calculating your score...</p>
                        ) : (
                            <div>
                                <p className="text-2xl font-semibold">You scored {score} out of {totalPoints}.</p>
                                <p className="text-muted-foreground mt-2">You will be redirected back to your profile shortly.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-muted">
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">{initialTest.title}</h2>
                            {timeLeft !== null && (
                                <div className="flex items-center gap-2 font-mono text-lg font-bold rounded-md bg-destructive text-destructive-foreground px-3 py-1">
                                    <Clock className="w-5 h-5"/>
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                            )}
                        </div>
                        <Progress value={progress} className="mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <p className="font-semibold text-lg">Question {currentQuestionIndex + 1} of {initialTest.questions.length} ({currentQuestion.points} points)</p>
                            {currentQuestion.questionMedia && (
                                <div className="relative w-full aspect-video border rounded-md overflow-hidden">
                                     <iframe src={`${currentQuestion.questionMedia.replace('/view', '/preview')}`} className="w-full h-full" title="Question Media" />
                                </div>
                            )}
                            {currentQuestion.questionText && (
                                <p className="text-lg whitespace-pre-wrap">{currentQuestion.questionText}</p>
                            )}

                            <div className="pt-4">
                                {currentQuestion.type === 'mcq' && (
                                    <RadioGroup
                                        value={String(answers[currentQuestionIndex])}
                                        onValueChange={(val) => handleAnswerChange(val)}
                                        className="space-y-2"
                                    >
                                        {currentQuestion.options?.map((option, index) => (
                                            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors">
                                                <RadioGroupItem value={String(index)} id={`q${currentQuestionIndex}-o${index}`} />
                                                <Label htmlFor={`q${currentQuestionIndex}-o${index}`} className="text-base font-normal flex-grow cursor-pointer">{option}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                )}
                                {currentQuestion.type === 'true_false' && (
                                    <RadioGroup
                                        value={String(answers[currentQuestionIndex])}
                                        onValueChange={(val) => handleAnswerChange(val === 'true')}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2 p-3 border rounded-lg has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors flex-1">
                                            <RadioGroupItem value="true" id={`q${currentQuestionIndex}-true`} />
                                            <Label htmlFor={`q${currentQuestionIndex}-true`} className="text-base font-normal cursor-pointer">True</Label>
                                        </div>
                                         <div className="flex items-center space-x-2 p-3 border rounded-lg has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors flex-1">
                                            <RadioGroupItem value="false" id={`q${currentQuestionIndex}-false`} />
                                            <Label htmlFor={`q${currentQuestionIndex}-false`} className="text-base font-normal cursor-pointer">False</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                         <Button variant="outline" onClick={goToPrevQuestion} disabled={currentQuestionIndex === 0}>Previous</Button>
                         {currentQuestionIndex === initialTest.questions.length - 1 ? (
                            <Button onClick={() => submitTest('completed')}>Submit Test</Button>
                         ) : (
                            <Button onClick={goToNextQuestion}>Next</Button>
                         )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

// Wrap in Suspense because useSearchParams requires it
export default function TestPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><p>Loading Test...</p></div>}>
            <TestPageClient />
        </Suspense>
    )
}
