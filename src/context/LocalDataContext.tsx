'use client';

import * as React from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { LocalPlan, LocalStudent, LocalTransaction, LocalAttendanceRecord } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface LocalDataContextType {
    teacherId: string;
    localPlans: LocalPlan[];
    setLocalPlans: (value: LocalPlan[] | ((val: LocalPlan[]) => LocalPlan[])) => void;
    localStudents: LocalStudent[];
    setLocalStudents: (value: LocalStudent[] | ((val: LocalStudent[]) => LocalStudent[])) => void;
    localTransactions: LocalTransaction[];
    setLocalTransactions: (value: LocalTransaction[] | ((val: LocalTransaction[]) => LocalTransaction[])) => void;
    localAttendance: LocalAttendanceRecord[];
    setLocalAttendance: (value: LocalAttendanceRecord[] | ((val: LocalAttendanceRecord[]) => LocalAttendanceRecord[])) => void;
    isSyncing: boolean;
    isDirty: boolean;
    triggerTwoWaySync: () => Promise<void>;
    triggerManualTwoWaySync: () => Promise<{ success: boolean; error?: string }>;
    getManualSyncRemaining: () => number;
    triggerDisasterRecovery: () => Promise<{ success: boolean; message?: string; error?: string }>;
    getDisasterRecoveryRemainingHours: () => number;
    deleteLocalStudent: (id: string) => void;
    deleteLocalPlan: (id: string) => void;
}

const LocalDataContext = React.createContext<LocalDataContextType | undefined>(undefined);

// Helper function to pull/download cloud changes from Firestore and merge with local state
async function pullCollection<T extends { id: string; updatedAt?: string; synced?: boolean }>(
    firestore: any,
    teacherId: string,
    subcollectionName: string,
    localItems: T[],
    setLocalItems: (val: T[] | ((prev: T[]) => T[])) => void
): Promise<boolean> {
    if (!firestore || !teacherId) return false;

    try {
        const querySnapshot = await getDocs(collection(firestore, 'teachers', teacherId, subcollectionName));
        const cloudItems: T[] = [];
        querySnapshot.forEach((docSnap) => {
            cloudItems.push({
                ...docSnap.data(),
                id: docSnap.id,
                synced: true
            } as T);
        });

        let hasChanges = false;
        const updatedLocalItems = [...localItems];

        // 1. Merge cloud items into local state
        for (const cloudItem of cloudItems) {
            const localIdx = updatedLocalItems.findIndex(item => item.id === cloudItem.id);
            if (localIdx === -1) {
                // Not found locally: new cloud item, add it
                updatedLocalItems.push(cloudItem);
                hasChanges = true;
            } else {
                const localItem = updatedLocalItems[localIdx];
                const cloudUpdateStr = cloudItem.updatedAt || '';
                const localUpdateStr = localItem.updatedAt || '';
                
                // If cloud version is newer, update local copy
                if (cloudUpdateStr && (!localUpdateStr || new Date(cloudUpdateStr) > new Date(localUpdateStr))) {
                    updatedLocalItems[localIdx] = cloudItem;
                    hasChanges = true;
                }
            }
        }

        // 2. Remove local items that are synced but missing from cloud (indicating deleted elsewhere)
        const cloudIds = new Set(cloudItems.map(item => item.id));
        const finalItems = updatedLocalItems.filter(item => {
            const existsInCloud = cloudIds.has(item.id);
            if (existsInCloud) return true;
            if (!item.synced) return true; // Keep local unsynced edits/creations

            // Synced but not in cloud -> deleted on another device
            hasChanges = true;
            return false;
        });

        if (hasChanges) {
            setLocalItems(finalItems);
        }

        return hasChanges;
    } catch (err) {
        console.error(`Failed to pull cloud items for ${subcollectionName}:`, err);
        return false;
    }
}

// Helper function to sync a collection using the "One-Way Smart Push" model (ZERO READS)
async function syncCollection<T extends { id: string; updatedAt?: string; synced?: boolean }>(
    firestore: any,
    teacherId: string,
    subcollectionName: string,
    localItems: T[],
    setLocalItems: (val: T[] | ((prev: T[]) => T[])) => void
): Promise<boolean> {
    if (!firestore || !teacherId) return false;
    
    // 1. Gather unsynced (dirty) items from local storage
    const unsyncedItems = localItems.filter(item => !item.synced);
    
    // 2. Gather deleted IDs
    const deletedKey = `deleted_${subcollectionName}-${teacherId}`;
    const deletedIds: string[] = JSON.parse(localStorage.getItem(deletedKey) || '[]');

    if (unsyncedItems.length === 0 && deletedIds.length === 0) {
        return false; // No offline modifications to upload
    }

    let hasChanges = false;

    // 3. Process deletions (deleteDoc) in parallel
    if (deletedIds.length > 0) {
        const deleteResults = await Promise.allSettled(
            deletedIds.map(id => deleteDoc(doc(firestore, 'teachers', teacherId, subcollectionName, id)))
        );
        const remainingDeletedIds: string[] = [];
        deleteResults.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
                hasChanges = true;
            } else {
                remainingDeletedIds.push(deletedIds[idx]);
                console.error(`Failed to delete cloud item ${deletedIds[idx]} in ${subcollectionName}:`, res.reason);
            }
        });
        localStorage.setItem(deletedKey, JSON.stringify(remainingDeletedIds));
    }

    // 4. Process unsynced additions and edits (setDoc) in parallel
    if (unsyncedItems.length > 0) {
        const successSyncedIds: string[] = [];
        const uploadResults = await Promise.allSettled(
            unsyncedItems.map(item => {
                const dataToUpload = {
                    ...item,
                    synced: true,
                    updatedAt: item.updatedAt || new Date().toISOString()
                };
                return setDoc(doc(firestore, 'teachers', teacherId, subcollectionName, item.id), dataToUpload)
                    .then(() => item.id);
            })
        );

        uploadResults.forEach(res => {
            if (res.status === 'fulfilled') {
                successSyncedIds.push(res.value);
                hasChanges = true;
            } else {
                console.error(`Failed to upload item in ${subcollectionName}:`, res.reason);
            }
        });

        // 5. Mark successfully uploaded items as synced: true in the local state
        if (successSyncedIds.length > 0) {
            setLocalItems((prev: T[]) =>
                prev.map(item =>
                    successSyncedIds.includes(item.id) ? { ...item, synced: true } : item
                )
            );
        }
    }

    return hasChanges;
}

export function LocalDataProvider({ children, teacherId }: { children: React.ReactNode; teacherId: string }) {
    const { toast } = useToast();
    const [localPlans, setLocalPlans] = useLocalStorage<LocalPlan[]>(`localPlans-${teacherId}`, []);
    const [localStudents, setLocalStudents] = useLocalStorage<LocalStudent[]>(`localStudents-${teacherId}`, []);
    const [localTransactions, setLocalTransactions] = useLocalStorage<LocalTransaction[]>(`localTransactions-${teacherId}`, []);
    const [localAttendance, setLocalAttendance] = useLocalStorage<LocalAttendanceRecord[]>(`localAttendance-${teacherId}`, []);

    const [isSyncing, setIsSyncing] = React.useState(false);
    const isSyncingRef = React.useRef(false);
    const [syncState, setSyncState] = React.useState<'idle' | 'syncing' | 'success'>('idle');
    const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const firestore = useFirestore();

    // Create stable refs for local states so that triggerTwoWaySync callback does not recreate on state changes
    const localPlansRef = React.useRef(localPlans);
    const localStudentsRef = React.useRef(localStudents);
    const localTransactionsRef = React.useRef(localTransactions);
    const localAttendanceRef = React.useRef(localAttendance);

    React.useEffect(() => { localPlansRef.current = localPlans; }, [localPlans]);
    React.useEffect(() => { localStudentsRef.current = localStudents; }, [localStudents]);
    React.useEffect(() => { localTransactionsRef.current = localTransactions; }, [localTransactions]);
    React.useEffect(() => { localAttendanceRef.current = localAttendance; }, [localAttendance]);

    // Dynamically calculate if there are unsynced (dirty) changes
    const isDirty = React.useMemo(() => {
        const hasUnsynced = 
            localStudents.some(s => !s.synced) ||
            localPlans.some(p => !p.synced) ||
            localTransactions.some(t => !t.synced) ||
            localAttendance.some(a => !a.synced);
            
        const hasDeleted = 
            JSON.parse(localStorage.getItem(`deleted_localStudents-${teacherId}`) || '[]').length > 0 ||
            JSON.parse(localStorage.getItem(`deleted_localPlans-${teacherId}`) || '[]').length > 0 ||
            JSON.parse(localStorage.getItem(`deleted_localTransactions-${teacherId}`) || '[]').length > 0 ||
            JSON.parse(localStorage.getItem(`deleted_localAttendance-${teacherId}`) || '[]').length > 0;
            
        return hasUnsynced || hasDeleted;
    }, [localStudents, localPlans, localTransactions, localAttendance, teacherId]);

    const isDirtyRef = React.useRef(isDirty);
    React.useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    const triggerTwoWaySync = React.useCallback(async () => {
        if (!firestore || !teacherId || !navigator.onLine || isSyncingRef.current) return;
        
        const startedWithDirty = isDirtyRef.current;
        isSyncingRef.current = true;
        setIsSyncing(true);
        
        if (startedWithDirty) {
            setSyncState('syncing');
        }

        try {
            const r1 = await syncCollection(firestore, teacherId, 'localStudents', localStudentsRef.current, setLocalStudents);
            const r2 = await syncCollection(firestore, teacherId, 'localPlans', localPlansRef.current, setLocalPlans);
            const r3 = await syncCollection(firestore, teacherId, 'localTransactions', localTransactionsRef.current, setLocalTransactions);
            const r4 = await syncCollection(firestore, teacherId, 'localAttendance', localAttendanceRef.current, setLocalAttendance);
            
            const changesOccurred = r1 || r2 || r3 || r4;
            
            localStorage.setItem(`lastBackupTime-${teacherId}`, new Date().toISOString());
            
            if (startedWithDirty || changesOccurred) {
                setSyncState('success');
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => {
                    setSyncState('idle');
                }, 3000);
            } else {
                setSyncState('idle');
            }
        } catch (e) {
            console.error("Manual / Auto sync failed:", e);
            setSyncState('idle');
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [firestore, teacherId, setLocalStudents, setLocalPlans, setLocalTransactions, setLocalAttendance]);

    const getManualSyncRemaining = React.useCallback(() => {
        try {
            const syncsKey = `manualSyncTimestamps-${teacherId}`;
            const timestamps: number[] = JSON.parse(localStorage.getItem(syncsKey) || '[]');
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            const validTimestamps = timestamps.filter(t => t > oneDayAgo);
            return Math.max(0, 3 - validTimestamps.length);
        } catch (e) {
            return 3;
        }
    }, [teacherId]);

    const triggerManualTwoWaySync = React.useCallback(async () => {
        if (!firestore || !teacherId) return { success: false, error: 'System not ready.' };
        if (!navigator.onLine) return { success: false, error: 'You are currently offline. Please connect to the internet to sync.' };
        if (isSyncingRef.current) return { success: false, error: 'A sync is already in progress.' };

        // Check rate limit
        const syncsKey = `manualSyncTimestamps-${teacherId}`;
        let timestamps: number[] = [];
        try {
            timestamps = JSON.parse(localStorage.getItem(syncsKey) || '[]');
        } catch (e) {}

        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const validTimestamps = timestamps.filter(t => t > oneDayAgo);

        if (validTimestamps.length >= 3) {
            return { 
                success: false, 
                error: 'Rate limit exceeded. You can only perform a manual two-way sync up to 3 times per day. Try again later or use automatic background sync.' 
            };
        }

        isSyncingRef.current = true;
        setIsSyncing(true);
        setSyncState('syncing');

        try {
            // 1. PUSH local changes (unsynced additions/edits, deletions)
            const r1 = await syncCollection(firestore, teacherId, 'localStudents', localStudentsRef.current, setLocalStudents);
            const r2 = await syncCollection(firestore, teacherId, 'localPlans', localPlansRef.current, setLocalPlans);
            const r3 = await syncCollection(firestore, teacherId, 'localTransactions', localTransactionsRef.current, setLocalTransactions);
            const r4 = await syncCollection(firestore, teacherId, 'localAttendance', localAttendanceRef.current, setLocalAttendance);

            // 2. PULL cloud changes (merge new/updated items, delete locally if missing in cloud)
            const p1 = await pullCollection(firestore, teacherId, 'localStudents', localStudentsRef.current, setLocalStudents);
            const p2 = await pullCollection(firestore, teacherId, 'localPlans', localPlansRef.current, setLocalPlans);
            const p3 = await pullCollection(firestore, teacherId, 'localTransactions', localTransactionsRef.current, setLocalTransactions);
            const p4 = await pullCollection(firestore, teacherId, 'localAttendance', localAttendanceRef.current, setLocalAttendance);

            const pushedChanges = r1 || r2 || r3 || r4;
            const pulledChanges = p1 || p2 || p3 || p4;

            // Log successful manual sync timestamp
            validTimestamps.push(now);
            localStorage.setItem(syncsKey, JSON.stringify(validTimestamps));
            localStorage.setItem(`lastBackupTime-${teacherId}`, new Date().toISOString());

            setSyncState('success');
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => {
                setSyncState('idle');
            }, 3000);

            return { success: true };
        } catch (e: any) {
            console.error("Manual Two-Way sync failed:", e);
            setSyncState('idle');
            return { success: false, error: e.message || 'Sync failed.' };
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [firestore, teacherId, setLocalStudents, setLocalPlans, setLocalTransactions, setLocalAttendance]);

    // Handle auto sync on mount/online/periodically
    React.useEffect(() => {
        if (navigator.onLine && teacherId) {
            const timer = setTimeout(() => {
                triggerTwoWaySync();
            }, 8000); // Friendly 8-second delay on initial load
            return () => clearTimeout(timer);
        }
    }, [teacherId, triggerTwoWaySync]);

    // Automatically trigger sync when dirty changes are made while online, debounced at 8 seconds after the most recent change
    React.useEffect(() => {
        if (navigator.onLine && isDirty && teacherId) {
            const timer = setTimeout(() => {
                triggerTwoWaySync();
            }, 8000); // Debounced 8-second wait after a change
            return () => clearTimeout(timer);
        }
    }, [isDirty, localStudents, localPlans, localTransactions, localAttendance, teacherId, triggerTwoWaySync]);

    React.useEffect(() => {
        const handleOnline = () => {
            triggerTwoWaySync();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [triggerTwoWaySync]);

    React.useEffect(() => {
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const getDisasterRecoveryRemainingHours = React.useCallback(() => {
        try {
            const lastTime = Number(localStorage.getItem(`disasterRecoveryTimestamp-${teacherId}`) || 0);
            if (!lastTime) return 0;
            const now = Date.now();
            const diff = 24 * 60 * 60 * 1000 - (now - lastTime);
            if (diff <= 0) return 0;
            return Math.ceil(diff / (1000 * 60 * 60));
        } catch (e) {
            return 0;
        }
    }, [teacherId]);

    const triggerDisasterRecovery = React.useCallback(async () => {
        if (!firestore || !teacherId) return { success: false, error: 'System not ready.' };
        if (!navigator.onLine) return { success: false, error: 'You are currently offline. Please connect to the internet to perform disaster recovery.' };
        if (isSyncingRef.current) return { success: false, error: 'A sync operation is already in progress.' };

        const remainingHours = getDisasterRecoveryRemainingHours();
        if (remainingHours > 0) {
            return {
                success: false,
                error: `Disaster Recovery can only be executed once every 24 hours. Next recovery available in ${remainingHours} hour(s).`
            };
        }

        isSyncingRef.current = true;
        setIsSyncing(true);
        setSyncState('syncing');

        try {
            // Force pull cloud documents from Firestore into local storage
            await pullCollection(firestore, teacherId, 'localStudents', localStudentsRef.current, setLocalStudents);
            await pullCollection(firestore, teacherId, 'localPlans', localPlansRef.current, setLocalPlans);
            await pullCollection(firestore, teacherId, 'localTransactions', localTransactionsRef.current, setLocalTransactions);
            await pullCollection(firestore, teacherId, 'localAttendance', localAttendanceRef.current, setLocalAttendance);

            // Clear local deleted tracking registers
            localStorage.removeItem(`deleted_localStudents-${teacherId}`);
            localStorage.removeItem(`deleted_localPlans-${teacherId}`);
            localStorage.removeItem(`deleted_localTransactions-${teacherId}`);
            localStorage.removeItem(`deleted_localAttendance-${teacherId}`);

            const now = Date.now();
            localStorage.setItem(`disasterRecoveryTimestamp-${teacherId}`, now.toString());
            localStorage.setItem(`lastBackupTime-${teacherId}`, new Date().toISOString());

            setSyncState('success');
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => {
                setSyncState('idle');
            }, 3000);

            return {
                success: true,
                message: 'Disaster Recovery completed! All plans, students, transactions, and attendance records have been restored from cloud storage.'
            };
        } catch (e: any) {
            console.error("Disaster Recovery failed:", e);
            setSyncState('idle');
            return { success: false, error: e.message || 'Disaster Recovery failed.' };
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [firestore, teacherId, getDisasterRecoveryRemainingHours, setLocalStudents, setLocalPlans, setLocalTransactions, setLocalAttendance]);

    const deleteLocalStudent = React.useCallback((id: string) => {
        setLocalStudents(prev => prev.filter(s => s.id !== id));
        const deletedKey = `deleted_localStudents-${teacherId}`;
        const deleted = JSON.parse(localStorage.getItem(deletedKey) || '[]');
        if (!deleted.includes(id)) {
            deleted.push(id);
            localStorage.setItem(deletedKey, JSON.stringify(deleted));
        }
    }, [teacherId, setLocalStudents]);

    const deleteLocalPlan = React.useCallback((id: string) => {
        setLocalPlans(prev => prev.filter(p => p.id !== id));
        const deletedKey = `deleted_localPlans-${teacherId}`;
        const deleted = JSON.parse(localStorage.getItem(deletedKey) || '[]');
        if (!deleted.includes(id)) {
            deleted.push(id);
            localStorage.setItem(deletedKey, JSON.stringify(deleted));
        }
    }, [teacherId, setLocalPlans]);

    const value = {
        teacherId,
        localPlans,
        setLocalPlans,
        localStudents,
        setLocalStudents,
        localTransactions,
        setLocalTransactions,
        localAttendance,
        setLocalAttendance,
        isSyncing,
        isDirty,
        triggerTwoWaySync,
        triggerManualTwoWaySync,
        getManualSyncRemaining,
        triggerDisasterRecovery,
        getDisasterRecoveryRemainingHours,
        deleteLocalStudent,
        deleteLocalPlan
    };

    return (
        <LocalDataContext.Provider value={value}>
            {children}
            {syncState !== 'idle' && (
                <div id="sync-toast" className="fixed top-4 md:top-6 right-4 z-[9999] max-w-sm pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-card/95 border border-border/80 backdrop-blur-md text-card-foreground shadow-2xl p-4 rounded-xl flex items-center gap-3 pointer-events-auto transition-all duration-300">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                            {syncState === 'syncing' ? (
                                <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold">
                                {syncState === 'syncing' ? "Syncing Local Database..." : "Cloud Backup Complete"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {syncState === 'syncing' ? "Saving offline changes to cloud..." : "All offline changes have been backed up"}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </LocalDataContext.Provider>
    );
}

export function useLocalData() {
    const context = React.useContext(LocalDataContext);
    if (context === undefined) {
        return {
            teacherId: '',
            localPlans: [],
            setLocalPlans: () => {},
            localStudents: [],
            setLocalStudents: () => {},
            localTransactions: [],
            setLocalTransactions: () => {},
            localAttendance: [],
            setLocalAttendance: () => {},
            isSyncing: false,
            isDirty: false,
            triggerTwoWaySync: async () => {},
            triggerManualTwoWaySync: async () => ({ success: true }),
            getManualSyncRemaining: () => 0,
            triggerDisasterRecovery: async () => ({ success: true }),
            getDisasterRecoveryRemainingHours: () => 0,
            deleteLocalStudent: () => {},
            deleteLocalPlan: () => {},
        };
    }
    return context;
}
