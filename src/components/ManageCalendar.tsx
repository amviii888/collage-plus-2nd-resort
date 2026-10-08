
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent, Grade } from '@/lib/types';
import { grades } from '@/lib/data';
import { PlusCircle, Edit, Trash2, Loader2, Clock } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar } from './ui/calendar';
import { ScrollArea } from './ui/scroll-area';
import { toJsDate } from '@/lib/utils';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  grade: z.string().min(1, 'Grade is required'),
  place: z.string().min(1, 'Place is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  recurrence: z.enum(['single', 'weekly']),
});

type EventFormValues = z.infer<typeof eventSchema>;

function EventForm({ onFinished, teacherId, eventToEdit }: { onFinished: () => void; teacherId: string; eventToEdit?: CalendarEvent }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDate = eventToEdit ? toJsDate(eventToEdit.startTime) : null;
  const endDate = eventToEdit ? toJsDate(eventToEdit.endTime) : null;

  const defaultValues = useMemo(() => {
    if (eventToEdit && startDate) {
      return {
        title: eventToEdit.title || '',
        grade: eventToEdit.grade || '',
        place: eventToEdit.place || '',
        date: format(startDate, 'yyyy-MM-dd'),
        startTime: format(startDate, 'HH:mm'),
        endTime: endDate ? format(endDate, 'HH:mm') : format(startDate, 'HH:mm'),
        recurrence: eventToEdit.recurrence || 'single',
      };
    }
    return {
      recurrence: 'single' as const,
      grade: '',
      title: '',
      place: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
    };
  }, [eventToEdit, startDate, endDate]);

  const { register, handleSubmit, formState: { errors }, control, reset } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = async (data: EventFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const [year, month, day] = data.date.split('-').map(Number);
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);

      const startDateTime = new Date(year, month - 1, day, startH || 0, startM || 0);
      const endDateTime = new Date(year, month - 1, day, endH || 0, endM || 0);

      const eventData = {
        teacherId,
        title: data.title,
        grade: data.grade,
        place: data.place,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        recurrence: data.recurrence,
      };

      if (eventToEdit) {
        const eventRef = doc(firestore, 'teachers', teacherId, 'calendarEvents', eventToEdit.id);
        await updateDoc(eventRef, eventData);
        toast({ title: 'Event updated successfully' });
      } else {
        const eventCollection = collection(firestore, 'teachers', teacherId, 'calendarEvents');
        await addDoc(eventCollection, eventData);
        toast({ title: 'Event added successfully' });
      }
      onFinished();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error saving event', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor="grade">Grade</Label>
        <Controller
            name="grade"
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                    {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        />
        {errors.grade && <p className="text-destructive text-sm">{errors.grade.message}</p>}
      </div>
       <div>
        <Label htmlFor="place">Place (Classroom or Link)</Label>
        <Input id="place" {...register('place')} />
        {errors.place && <p className="text-destructive text-sm">{errors.place.message}</p>}
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="recurrence">Recurrence</Label>
                 <Controller
                    name="recurrence"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || 'single'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Does it repeat?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Does not repeat</SelectItem>
                                <SelectItem value="weekly">Weekly on the selected day</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && <p className="text-destructive text-sm">{errors.date.message}</p>}
            </div>
       </div>

       <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" type="time" {...register('startTime')} />
                {errors.startTime && <p className="text-destructive text-sm">{errors.startTime.message}</p>}
            </div>
            <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" type="time" {...register('endTime')} />
                {errors.endTime && <p className="text-destructive text-sm">{errors.endTime.message}</p>}
            </div>
       </div>

      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Event'}</Button>
    </form>
  );
}


export function ManageCalendar({ teacherId }: { teacherId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOwner = Boolean(user && !user.isAnonymous && user.uid === teacherId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | undefined>(undefined);
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsQuery = useMemoFirebase(
    () => {
      if (!firestore) return null;
      return collection(firestore, 'teachers', teacherId, 'calendarEvents');
    }, 
    [firestore, teacherId]
  );
  
  const { data: allEvents, isLoading } = useCollection<CalendarEvent>(eventsQuery);

  const { monthlyEventsMap, allMonthlyEvents } = useMemo(() => {
    const eventMap = new Map<string, CalendarEvent[]>();
    const allEventsForMonth: CalendarEvent[] = [];

    if (allEvents) {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      for (const event of allEvents) {
        const eventStartDate = toJsDate(event.startTime);
        if (!eventStartDate) continue;

        const eventEndDate = toJsDate(event.endTime) || eventStartDate;
        
        if (event.recurrence === 'weekly') {
            const eventDayOfWeek = eventStartDate.getDay();
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            
            daysInMonth.forEach(dayInMonth => {
                if (dayInMonth.getDay() === eventDayOfWeek && dayInMonth >= eventStartDate) {
                    const instanceEvent = {
                        ...event,
                        startTime: new Date(dayInMonth.getFullYear(), dayInMonth.getMonth(), dayInMonth.getDate(), eventStartDate.getHours(), eventStartDate.getMinutes()).toISOString(),
                        endTime: new Date(dayInMonth.getFullYear(), dayInMonth.getMonth(), dayInMonth.getDate(), eventEndDate.getHours(), eventEndDate.getMinutes()).toISOString(),
                    };
                    const dateKey = dayInMonth.toDateString();
                    const dayEvents = eventMap.get(dateKey) || [];
                    eventMap.set(dateKey, [...dayEvents, instanceEvent]);
                    allEventsForMonth.push(instanceEvent);
                }
            });
        } else {
          if (eventStartDate >= monthStart && eventStartDate <= monthEnd) {
            const dateKey = eventStartDate.toDateString();
            const dayEvents = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...dayEvents, event]);
            allEventsForMonth.push(event);
          }
        }
      }
    }
    allEventsForMonth.sort((a,b) => {
      const timeA = toJsDate(a.startTime)?.getTime() || 0;
      const timeB = toJsDate(b.startTime)?.getTime() || 0;
      return timeA - timeB;
    });
    return { monthlyEventsMap: eventMap, allMonthlyEvents: allEventsForMonth };
  }, [allEvents, currentMonth]);

  const handleEdit = (event: CalendarEvent) => {
    if (!isOwner) return;
    setEventToEdit(event);
    setIsFormOpen(true);
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!firestore || !isOwner) return;
    if (window.confirm('Are you sure you want to delete this event?')) {
        const eventRef = doc(firestore, 'teachers', teacherId, 'calendarEvents', event.id);
        try {
            await deleteDoc(eventRef);
            toast({ title: 'Event deleted.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Deletion failed', description: e.message });
        }
    }
  };
  
  const openNewEventForm = () => {
    if (!isOwner) return;
    setEventToEdit(undefined);
    setIsFormOpen(true);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-1 profile-content-card">
            <CardContent className="p-0 relative">
                 {isLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-2xl">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
                <Calendar
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={{ hasEvent: Array.from(monthlyEventsMap.keys()).map(d => new Date(d)) }}
                    modifiersClassNames={{
                        hasEvent: 'bg-primary/20 rounded-full',
                    }}
                    className="w-full"
                />
            </CardContent>
        </Card>
        <Card className="lg:col-span-2 profile-content-card">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Events for {format(currentMonth, 'MMMM yyyy')}</CardTitle>
                    {isOwner && (
                        <Button onClick={openNewEventForm} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Event</Button>
                    )}
                </div>
            </CardHeader>
             <CardContent>
                <ScrollArea className="h-96 pr-4">
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="space-y-2"><Skeleton className="h-16 w-full"/><Skeleton className="h-16 w-full"/></div>
                        ) : allMonthlyEvents.length > 0 ? (
                           allMonthlyEvents.map((event, idx) => {
                                const startDate = toJsDate(event.startTime);
                                const endDate = toJsDate(event.endTime);
                                return (
                                    <div key={`${event.id}-${idx}`} className="p-3 rounded-lg border bg-card/80 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-sm">{startDate ? format(startDate, 'EEE, MMM d') : ''}</p>
                                            <h3 className="font-bold text-md text-foreground">{event.title}</h3>
                                             <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                <span>{startDate ? format(startDate, 'p') : ''} - {endDate ? format(endDate, 'p') : ''}</span>
                                            </div>
                                        </div>
                                        {isOwner && (
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(event)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-muted-foreground py-10">No events for this month.</p>
                        )}
                    </div>
                </ScrollArea>
             </CardContent>
        </Card>

        {isOwner && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
               <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{eventToEdit ? 'Edit Event' : 'Add New Event'}</DialogTitle>
                    </DialogHeader>
                    <EventForm key={eventToEdit?.id || 'new'} onFinished={() => setIsFormOpen(false)} teacherId={teacherId} eventToEdit={eventToEdit} />
                </DialogContent>
            </Dialog>
        )}
    </div>
  );
}
