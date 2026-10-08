'use client';

import * as React from 'react';
import { useLocalData } from '@/context/LocalDataContext';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function TeacherDashboardSyncButton({ teacherId }: { teacherId: string }) {
    const { 
        isSyncing, 
        isDirty, 
        triggerManualTwoWaySync, 
        getManualSyncRemaining 
    } = useLocalData();
    const { toast } = useToast();
    const firestore = useFirestore();
    const [online, setOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    React.useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check if teacher has an active connected assistant
    const assistantsQuery = useMemoFirebase(() => {
        if (!firestore || !teacherId) return null;
        return query(collection(firestore, 'assistants'), where('teacherId', '==', teacherId));
    }, [firestore, teacherId]);

    const { data: assistants, isLoading: isAssistantsLoading } = useCollection<any>(assistantsQuery);

    // If teacher has NO linked assistants, DO NOT show the sync button at all (use push-only offline mode)
    if (isAssistantsLoading || !assistants || assistants.length === 0) {
        return null;
    }

    const handleSync = async () => {
        if (!online) {
            toast({
                variant: 'destructive',
                title: 'Offline Mode',
                description: 'You are currently offline. Local changes will sync automatically when back online.',
            });
            return;
        }

        const remaining = getManualSyncRemaining();
        if (remaining <= 0) {
            toast({
                variant: 'destructive',
                title: 'Daily Limit Reached',
                description: 'Maximum manual daily syncs reached. Background sync will keep your database updated.',
            });
            return;
        }

        const result = await triggerManualTwoWaySync();
        if (result.success) {
            toast({
                title: 'Sync Complete',
                description: 'Database is up to date with assistant updates.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: result.error || 'Failed to sync with assistant changes.',
            });
        }
    };

    return (
        <div className="flex items-center gap-2.5">
            {/* Status Indicator Label */}
            <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all duration-300 select-none",
                isDirty 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}>
                <span className={cn(
                    "w-2 h-2 rounded-full",
                    isDirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                )} />
                <span>{isDirty ? "Sync Available" : "Up to Date"}</span>
            </div>

            {/* Sync All Button */}
            <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
                className={cn(
                    "h-9 gap-2 px-4 text-xs font-bold border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl transition-all shadow-md",
                    isDirty && "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                )}
            >
                <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isSyncing && "animate-spin")} />
                <span>{isSyncing ? "Syncing..." : "Sync All"}</span>
            </Button>
        </div>
    );
}

export function SyncControl() {
    const { 
        isSyncing, 
        isDirty, 
        triggerManualTwoWaySync, 
        getManualSyncRemaining 
    } = useLocalData();
    const { toast } = useToast();
    const [online, setOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    React.useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSync = async () => {
        if (!online) {
            toast({
                variant: 'destructive',
                title: 'Offline',
                description: 'You are currently offline. Please connect to the internet to back up changes.',
            });
            return;
        }

        const remaining = getManualSyncRemaining();
        if (remaining <= 0) {
            toast({
                variant: 'destructive',
                title: 'Limit Exceeded',
                description: 'You have used all 3 manual daily backups. Automatic background backups will still occur.',
            });
            return;
        }

        const result = await triggerManualTwoWaySync();
        if (result.success) {
            toast({
                title: 'Backup Successful',
                description: 'Your local database was successfully backed up to the cloud.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Backup Failed',
                description: result.error || 'Failed to complete cloud backup.',
            });
        }
    };

    const remainingBackups = getManualSyncRemaining();

    return (
        <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl px-4 py-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    online ? (isDirty ? "bg-amber-500 animate-pulse" : "bg-emerald-500") : "bg-red-500 animate-pulse"
                )} />
                <span className="text-xs font-semibold text-zinc-300 select-none">
                    {online ? (isDirty ? "Unsynced" : "Synced") : "Offline"}
                </span>
            </div>

            <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
                className={cn(
                    "h-8 gap-1.5 px-3 text-xs font-bold border-zinc-800 hover:bg-zinc-800 transition-all",
                    isDirty && online && "border-amber-500/50 hover:bg-amber-500/10 text-amber-500 hover:text-amber-400"
                )}
            >
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Backup Now"}
            </Button>

            {online && (
                <span className="text-[10px] text-zinc-500 font-semibold select-none hidden sm:inline border-l border-zinc-800 pl-3">
                    {remainingBackups} left today
                </span>
            )}
        </div>
    );
}
