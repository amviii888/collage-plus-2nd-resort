
'use client';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import type { LocalPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, List, Clock, DollarSign, CalendarDays } from 'lucide-react';
import { LocalPlanFormModal } from '@/components/teacher/LocalPlanFormModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useLocalData } from '@/context/LocalDataContext';

export default function TeacherPlansPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { localPlans, setLocalPlans, deleteLocalPlan } = useLocalData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<LocalPlan | null>(null);
    const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

    const handleSavePlan = (planData: Omit<LocalPlan, 'id' | 'createdAt' | 'totalProfit'>, planId?: string) => {
        if (planId) {
            setLocalPlans(prev => prev.map(p => p.id === planId ? { 
                ...p, 
                ...planData, 
                price: planData.price || 0, 
                totalProfit: p.totalProfit || 0,
                updatedAt: new Date().toISOString(),
                synced: false
            } : p));
            toast({ title: t("Plan Updated") });
        } else {
            const newPlan: LocalPlan = {
                id: uuidv4(),
                ...planData,
                price: planData.price || 0,
                totalProfit: 0,
                createdAt: new Date() as any,
                updatedAt: new Date().toISOString(),
                synced: false
            };
            setLocalPlans(prev => [...prev, newPlan]);
            toast({ title: t("Plan Created") });
        }
        setIsModalOpen(false);
        setEditingPlan(null);
    };

    const handleEditPlan = (plan: LocalPlan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleDeletePlan = () => {
        if (!deletingPlanId) return;
        deleteLocalPlan(deletingPlanId);
        toast({ title: t("Plan Deleted"), variant: "destructive" });
        setDeletingPlanId(null);
    };
    
    return (
        <>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight">My Personal Plans</h2>
                    <Button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Plan
                    </Button>
                </div>
                
                {localPlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {localPlans.map((plan: LocalPlan) => (
                            <Card key={plan.id} className="flex flex-col profile-content-card">
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
                                    <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Duration: {plan.durationMonths} Month(s)</p>
                                    <p className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Price: £{plan.price?.toFixed(2) || '0.00'}</p>
                                    <p className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Total Profit: £{plan.totalProfit?.toFixed(2) || '0.00'}</p>
                                    {plan.sessionDays && plan.sessionDays.length > 0 && (
                                        <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> {plan.sessionDays.map(day => t(day)).join(', ')}</p>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditPlan(plan)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingPlanId(plan.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full text-center py-16 text-muted-foreground space-y-4 border-2 border-dashed rounded-2xl">
                        <List className="mx-auto h-12 w-12" />
                        <p>No personal plans found.</p>
                        <Button onClick={() => { setEditingPlan(null); setIsModalOpen(true); }} variant="secondary">Create your first plan</Button>
                    </div>
                )}
            </div>

            <LocalPlanFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePlan}
                planToEdit={editingPlan}
            />

            <AlertDialog open={!!deletingPlanId} onOpenChange={() => setDeletingPlanId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('This action cannot be undone. This will permanently delete the plan.')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive hover:bg-destructive/90">{t('Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
