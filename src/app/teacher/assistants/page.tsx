'use client';

import { useState } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, deleteDoc } from 'firebase/firestore';
import type { Teacher } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Trash2, User, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

export default function TeacherAssistantsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'teachers', user.uid);
    }, [firestore, user]);
    
    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    const assistantsRef = useMemoFirebase(() => {
        if (!firestore || !teacher) return null;
        return query(collection(firestore, 'assistants'), where('teacherId', '==', teacher.id));
    }, [firestore, teacher, refreshTrigger]);

    const { data: assistants, isLoading: isAssistantsLoading } = useCollection<any>(assistantsRef);

    const handleRemoveAssistant = async (assistantId: string, assistantName: string) => {
        if (!firestore) return;
        setIsRemoving(assistantId);
        try {
            await deleteDoc(doc(firestore, 'assistants', assistantId));
            toast({
                title: t('Assistant Removed'),
                description: `${assistantName} ${t('has been fired/removed successfully.')}`,
            });
            setRefreshTrigger(prev => prev + 1);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('Error'),
                description: error.message || t('Could not remove assistant.'),
            });
        } finally {
            setIsRemoving(null);
        }
    };

    if (isUserLoading || isTeacherLoading || !teacher) {
        return (
            <div className="space-y-6 max-w-lg">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6 max-w-lg">
            <Card className="liquid-glass border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="text-primary" /> {t('Manage Assistants')}</CardTitle>
                    <CardDescription>
                        {t("Here is your unique code for your assistants to log in. They will be able to manage your courses, calendar, and personal attendance system.")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-mono p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-center tracking-widest text-primary font-bold shadow-inner">
                        {teacher?.assistantCode || 'Loading...'}
                    </p>
                </CardContent>
            </Card>

            <Card className="liquid-glass border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="text-accent" /> {t('Active Assistants')}
                    </CardTitle>
                    <CardDescription>
                        {t('This is a list of assistants currently joined. You can revoke access immediately by removing them.')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isAssistantsLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : !assistants || assistants.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40 p-4">
                            <User className="mx-auto w-10 h-10 text-zinc-600 mb-2" />
                            <p className="text-sm">{t('No assistants connected yet.')}</p>
                            <p className="text-xs text-zinc-500 mt-1">{t('Share the code above with your team to get started.')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                            {assistants.map((asst) => (
                                <div key={asst.id} className="flex items-center justify-between p-4 bg-zinc-900/10 hover:bg-zinc-900/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800 text-primary">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground">{asst.name}</h4>
                                            {asst.joinedAt && (
                                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(asst.joinedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => handleRemoveAssistant(asst.id, asst.name)}
                                        disabled={isRemoving !== null}
                                        title={t('Fire Assistant')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
