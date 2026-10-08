'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogOut, QrCode, AlertCircle, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, collectionGroup, getDoc } from 'firebase/firestore';
import type { Student, Course, Teacher, CourseAccess, StudentSyncData } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format, isAfter, parseISO, formatDistanceToNow } from 'date-fns';
import { CourseCard } from '@/components/CourseCard';
import { Label } from '@/components/ui/label';
import { useStudentSyncData } from '@/hooks/use-student-sync-data';

function StudentUnlockedCourses({ studentId }: { studentId: string }) {
    const firestore = useFirestore();

    const courseAccessQuery = useMemoFirebase(
        () => collection(firestore, `students/${studentId}/courseAccess`),
        [firestore, studentId]
    );
    const { data: courseAccess, isLoading: isAccessLoading } = useCollection<CourseAccess>(courseAccessQuery);

    const [courses, setCourses] = useState<(Course & { teacher?: Teacher })[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);

    useEffect(() => {
        if (!courseAccess || !firestore) {
            setCourses([]);
            return;
        }

        if (courseAccess.length === 0) {
            setIsLoadingCourses(false);
            setCourses([]);
            return;
        }

        const fetchCourseDetails = async () => {
            setIsLoadingCourses(true);
            const coursePromises = courseAccess.map(async (access) => {
                try {
                    const coursesRef = collectionGroup(firestore, 'courses');
                    const q = query(coursesRef, where('__name__', '==', `teachers/${access.teacherId}/courses/${access.courseId}`), limit(1));
                    const courseSnap = await getDocs(q);
                    
                    if (!courseSnap.empty) {
                        const courseData = { ...courseSnap.docs[0].data(), id: courseSnap.docs[0].id } as Course;
                        
                        const teacherRef = doc(firestore, 'teachers', courseData.teacherId);
                        const teacherQuery = query(collection(firestore, 'teachers'), where('__name__', '==', teacherRef.path), limit(1));
                        const teacherSnap = await getDocs(teacherQuery);

                        let teacherData: Teacher | undefined = undefined;
                        if (!teacherSnap.empty) {
                            teacherData = { ...teacherSnap.docs[0].data(), id: teacherSnap.docs[0].id } as Teacher;
                        }
                        return { ...courseData, teacher: teacherData };
                    }
                } catch (e) {
                    console.error("Error fetching course detail: ", e);
                }
                return null;
            });
            const resolvedCourses = (await Promise.all(coursePromises)).filter((c): c is Course & { teacher?: Teacher } => c !== null);
            setCourses(resolvedCourses);
            setIsLoadingCourses(false);
        };

        fetchCourseDetails();
    }, [courseAccess, firestore]);

    const isLoading = isAccessLoading || isLoadingCourses;

    if (isLoading) {
        return (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-80 w-full bg-card rounded-2xl" />
                <Skeleton className="h-80 w-full bg-card rounded-2xl" />
            </div>
        )
    }

    if (courses.length === 0) {
        return (
            <div className="col-span-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-700/50 rounded-3xl">
                <BookOpen className="w-24 h-24 text-zinc-800" />
                <h3 className="text-lg font-bold text-white mt-4">No Unlocked Courses</h3>
                <p className="text-sm text-zinc-500 mt-2">The student has not unlocked any special courses yet.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {courses.map(course => <CourseCard key={course.id} course={course} teacher={course.teacher || null} />)}
        </div>
    );
}

export default function ParentDashboardPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [parentPhoneNumber, setParentPhoneNumber] = useState<string | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    const { syncData } = useStudentSyncData(student?.barcodeId);

    useEffect(() => {
        let storedBarcode: string | null = null;
        let storedParentPhone: string | null = null;
        try {
            storedBarcode = localStorage.getItem('parentForStudentBarcode');
            storedParentPhone = localStorage.getItem('parentPhoneNumber');
        } catch(e) {
            console.error("Session storage not available");
        }

        if (!storedBarcode || !storedParentPhone) {
            router.replace('/login?role=parent');
            return;
        }
        
        setParentPhoneNumber(storedParentPhone);

        const fetchStudentData = async () => {
            if (!firestore) return;
            
            // 1. Try to fetch directly by user.uid if available (most secure & uses 'get' rule)
            if (user && user.uid) {
                try {
                    const studentDocRef = doc(firestore, 'students', user.uid);
                    const studentDoc = await getDoc(studentDocRef);
                    if (studentDoc.exists()) {
                        setStudent({ ...studentDoc.data(), id: studentDoc.id } as Student);
                        setIsAuthChecking(false);
                        return;
                    }
                } catch (err) {
                    console.error("Error fetching student directly: ", err);
                }
            }

            // 2. Fallback to querying by barcodeId (uses 'list' rule with limit <= 1)
            try {
                const studentsRef = collection(firestore, 'students');
                const q = query(studentsRef, where("barcodeId", "==", storedBarcode), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const studentDoc = querySnapshot.docs[0];
                    setStudent({ ...studentDoc.data(), id: studentDoc.id } as Student);
                }
            } catch (err) {
                console.error("Error querying student by barcode: ", err);
            }
            setIsAuthChecking(false);
        };

        if (!isUserLoading) {
            fetchStudentData();
        }
    }, [router, firestore, user, isUserLoading]);

    const handleLogout = () => {
        try {
            localStorage.removeItem('parentForStudentBarcode');
            localStorage.removeItem('parentPhoneNumber');
            router.push('/login?role=parent');
        } catch (e) {
            console.error("Session storage not available.");
            window.location.href = '/login?role=parent';
        }
    };

    const isLoading = isAuthChecking || isUserLoading;

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 w-full rounded-2xl" />
                    <Skeleton className="lg:col-span-2 h-64 w-full rounded-2xl" />
                </div>
            </div>
        );
    }
    
    if (!student) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                 <Card>
                    <CardHeader>
                        <CardTitle>Student Not Found</CardTitle>
                        <CardDescription>Could not find student data. Please check the barcode and try again.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleLogout}><LogOut className="mr-2"/> Go Back</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const activeSubscriptions = student.activeSubscriptions?.filter(sub => isAfter(parseISO(sub.endDate), new Date())) || [];
    const totalDebt = (syncData?.debtStatus ?? student.activeSubscriptions?.reduce((acc, sub) => acc + (sub.remaining || 0), 0)) || 0;
    const lastCheckInInfo = syncData?.lastCheckIn
        ? `${formatDistanceToNow(parseISO(syncData.lastCheckIn), { addSuffix: true })} for ${syncData.planName}`
        : student.lastCheckInTime ? `${formatDistanceToNow(parseISO(student.lastCheckInTime), { addSuffix: true })} for ${student.lastCheckInPlanName}` : 'No check-in history';

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-primary" style={{ textShadow: '0 0 15px hsl(var(--primary) / 0.5)' }}>
                        Parent&apos;s Dashboard
                    </h1>
                    <p className="text-lg text-secondary">Monitoring profile for: <span className="font-semibold">{student.name}</span></p>
                </div>
                <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto bg-card border-white/5 hover:border-primary/50">Log Out</Button>
            </div>
            
            {totalDebt > 0 && (
                <Alert variant="destructive" className="rounded-2xl bg-destructive/10 border-destructive/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Outstanding Balance</AlertTitle>
                    <AlertDescription>
                        This student has an outstanding balance of <span className="font-bold">£{totalDebt.toFixed(2)}</span>. Please settle this at the office.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card className="bg-card border-white/5 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><QrCode /> Student&apos;s Attendance QR Code</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-2">
                            <div className="p-2 bg-white rounded-lg">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${student.barcodeId}&bgcolor=ffffff`}
                                    alt="Student QR Code"
                                    width={200}
                                    height={200}
                                />
                            </div>
                            <p className="font-mono text-xl tracking-widest bg-input p-2 rounded-lg border border-zinc-700 w-full text-center">{student.barcodeId}</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-card border-white/5 rounded-2xl">
                        <CardHeader>
                            <CardTitle>Student Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground">Grade</Label>
                                <p className="text-lg font-semibold p-3 h-12 bg-input rounded-md flex items-center">{student.grade || 'Not Set'}</p>
                             </div>
                             <div className="space-y-2">
                                <Label className="text-muted-foreground">Last Check-in</Label>
                                <p className="text-sm font-semibold p-3 h-12 bg-input rounded-md flex items-center">{lastCheckInInfo}</p>
                             </div>
                             <div className="space-y-2">
                                <Label className="text-muted-foreground">Active Plans</Label>
                                <p className="text-lg font-semibold p-3 h-12 bg-input rounded-md flex items-center">{activeSubscriptions.length > 0 ? `${activeSubscriptions.length} active plan(s)` : 'No active plans'}</p>
                             </div>
                        </CardContent>
                    </Card>
                 </div>
                 <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card className="bg-card border-white/5 rounded-2xl flex-grow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookOpen/> Student&apos;s Unlocked Courses</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <StudentUnlockedCourses studentId={student.id} />
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}
