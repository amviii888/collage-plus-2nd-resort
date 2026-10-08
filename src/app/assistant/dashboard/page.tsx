'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TeacherAttendance } from '@/components/teacher/TeacherAttendance';
import { LocalDataProvider } from '@/context/LocalDataContext';
import { SyncControl } from '@/components/teacher/SyncControl';
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AssistantDashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [teacherName, setTeacherName] = useState<string | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    const assistantRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'assistants', user.uid);
    }, [firestore, user]);

    const { data: assistant, isLoading: isAssistantLoading } = useDoc<any>(assistantRef);

    useEffect(() => {
        try {
            const storedTeacherId = localStorage.getItem('assistantForTeacherId');
            const storedTeacherName = localStorage.getItem('assistantTeacherName');
            if (!storedTeacherId) {
                router.replace('/assistant-login');
            } else {
                setTeacherId(storedTeacherId);
                setTeacherName(storedTeacherName);
            }
        } catch (e) {
            console.error("Session storage not available.");
            router.replace('/assistant-login');
        }
        setIsAuthChecking(false);
    }, [router]);

    // Check if assistant was removed/fired by the teacher
    useEffect(() => {
        if (!isUserLoading && !isAssistantLoading && user && !assistant && teacherId) {
            toast({
                variant: 'destructive',
                title: 'Access Revoked',
                description: 'Your access has been revoked or you have been removed by the teacher.',
            });
            handleLogout();
        }
    }, [assistant, isAssistantLoading, isUserLoading, user, teacherId]);

    const auth = useAuth();

    const handleLogout = async () => {
        try {
            localStorage.removeItem('assistantForTeacherId');
            localStorage.removeItem('assistantTeacherName');
            if (auth) {
                await auth.signOut();
            }
            router.replace('/signup-options');
        } catch(e) {
             console.error("Session storage or auth error:", e);
             window.location.href = '/signup-options';
        }
    };

    if (isAuthChecking || isUserLoading || isAssistantLoading || !teacherId) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-24 w-full" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <LocalDataProvider teacherId={teacherId}>
            <div className="p-4 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tighter">Assistant Dashboard</h1>
                        <p className="text-muted-foreground">Managing local students for: <span className="font-semibold text-primary">{teacherName}</span></p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <SyncControl />
                        <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 border-zinc-800 hover:bg-destructive/10 hover:text-destructive h-10 sm:h-9">
                            <LogOut className="w-4 h-4" />
                            Log out
                        </Button>
                    </div>
                </div>
                
                <TeacherAttendance teacherId={teacherId} isAssistant={true} />
            </div>
        </LocalDataProvider>
    );
}
