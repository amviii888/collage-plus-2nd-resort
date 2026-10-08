'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Homework, LocalPlan, Grade } from '@/lib/types';
import { useLocalData } from '@/context/LocalDataContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PlusCircle, Edit, Trash2, CalendarIcon, AlertCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { format } from 'date-fns';
import { cn, toJsDate } from '@/lib/utils';

const homeworkSchema = z.object({
  title: z.string().optional().default(''),
  planName: z.string().optional().default(''),
  grade: z.string().optional().default(''),
  content: z.string().min(1, 'Homework content is required'),
  resourceLink: z.string().optional().default(''),
  expiresAt: z.date().optional().nullable(),
});

type HomeworkFormValues = z.infer<typeof homeworkSchema>;

function HomeworkForm({ teacherId, onFinished, homeworkToEdit, localPlans }: { teacherId: string, onFinished: () => void, homeworkToEdit: Homework | null, localPlans: LocalPlan[] }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HomeworkFormValues>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: homeworkToEdit ? {
      title: homeworkToEdit.title || '',
      planName: homeworkToEdit.planName || '',
      grade: homeworkToEdit.grade || '',
      content: homeworkToEdit.content || '',
      resourceLink: homeworkToEdit.resourceLink || '',
      expiresAt: toJsDate(homeworkToEdit.expiresAt) || undefined,
    } : {
      title: '',
      planName: '',
      grade: '',
      content: '',
      resourceLink: '',
      expiresAt: undefined,
    },
  });

  const onSubmit = async (data: HomeworkFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    let cleanLink = (data.resourceLink || '').trim();
    if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      cleanLink = `https://${cleanLink}`;
    }
    
    let expirationDate: Date | null = null;
    if (data.expiresAt) {
      expirationDate = new Date(data.expiresAt);
      expirationDate.setHours(23, 59, 59, 999);
    }

    const homeworkData = {
      title: data.title || '',
      planName: data.planName || '',
      grade: data.grade || '',
      content: data.content,
      resourceLink: cleanLink || '',
      teacherId,
      createdAt: homeworkToEdit?.createdAt || serverTimestamp(),
      expiresAt: expirationDate,
    };

    try {
      if (homeworkToEdit) {
        const homeworkRef = doc(firestore, 'homeworks', homeworkToEdit.id);
        await updateDoc(homeworkRef, homeworkData);
        toast({ title: "Homework Updated" });
      } else {
        await addDoc(collection(firestore, 'homeworks'), homeworkData);
        toast({ title: "Homework Created" });
      }
      onFinished();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    const plan = localPlans.find(p => p.id === planId);
    if (plan) {
      form.setValue('planName', plan.name, { shouldValidate: true });
      if ((plan as any).grade) {
        form.setValue('grade', (plan as any).grade, { shouldValidate: true });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Homework Title (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., Chapter 5 Review" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="planName" render={({ field }) => (
          <FormItem>
            <FormLabel>Plan (Optional)</FormLabel>
            {localPlans.length > 0 && (
              <Select onValueChange={(value) => handlePlanSelect(value)}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a plan to assign this to" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {localPlans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input {...field} placeholder="Or enter plan name manually" className="mt-2" />
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="grade" render={({ field }) => (
          <FormItem><FormLabel>Grade (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g. Grade 10 or All" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="content" render={({ field }) => (
          <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea {...field} placeholder="Enter homework instructions..." rows={5} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="resourceLink" render={({ field }) => (
          <FormItem><FormLabel>Resource Link (Optional)</FormLabel><FormControl><Input {...field} placeholder="https://docs.google.com/..." /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="expiresAt" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Expiration Date (Optional)</FormLabel>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                  />
                  {field.value && (
                    <div className="p-2 border-t text-right">
                      <Button variant="ghost" size="sm" type="button" onClick={() => field.onChange(null)}>
                        Clear Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {field.value && (
                <Button variant="outline" size="sm" type="button" onClick={() => field.onChange(null)}>
                  Clear
                </Button>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onFinished}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Homework'}</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export function ManageHomework({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { localPlans } = useLocalData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  const homeworkQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'homeworks'), where('teacherId', '==', teacherId));
  }, [firestore, teacherId]);
  const { data: homeworks, isLoading } = useCollection<Homework>(homeworkQuery);

  const openCreateModal = () => {
    setEditingHomework(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (homework: Homework) => {
    setEditingHomework(homework);
    setIsModalOpen(true);
  }

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (window.confirm("Are you sure you want to delete this homework?")) {
        try {
            await deleteDoc(doc(firestore, 'homeworks', id));
            toast({ title: "Homework deleted", variant: 'destructive' });
        } catch(e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Homework Assignments</h2>
          <p className="text-muted-foreground">Create and manage homework for your personal plans.</p>
        </div>
        <Button onClick={openCreateModal}><PlusCircle className="mr-2 h-4 w-4" /> Create Homework</Button>
      </div>
      
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        homeworks && homeworks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {homeworks.map(hw => (
              <Card key={hw.id}>
                <CardHeader>
                  <CardTitle>{hw.title || `${hw.planName || ''} ${hw.grade ? `- ${hw.grade}` : ''}`.trim() || 'Homework'}</CardTitle>
                  <CardDescription>
                    {(() => {
                      const cDate = toJsDate(hw.createdAt);
                      return cDate ? `Created: ${cDate.toLocaleDateString()}` : null;
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-3">{hw.content}</p>
                  {(() => {
                    const eDate = toJsDate(hw.expiresAt);
                    if (!eDate) return null;
                    return (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>Expires: {format(eDate, "PPP")}</span>
                      </div>
                    );
                  })()}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(hw)}><Edit className="mr-2" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(hw.id)}><Trash2 className="mr-2" /> Delete</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-8"><p>No homework created yet.</p></Card>
        )
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingHomework ? 'Edit' : 'Create'} Homework</DialogTitle>
            </DialogHeader>
            <HomeworkForm onFinished={() => setIsModalOpen(false)} teacherId={teacherId} homeworkToEdit={editingHomework} localPlans={localPlans} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
