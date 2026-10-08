'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { CalendarEvent, Grade, Teacher } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, User, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { grades } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { toJsDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

interface CalendarViewProps {
  initialGrade?: Grade;
  teacherId?: string; 
}

const useEfficientEvents = (grade: Grade | undefined, teacherId?: string) => {
    const firestore = useFirestore();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [teacherMap, setTeacherMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!firestore) return;
        
        if (!grade && !teacherId) {
            setEvents([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const fetchEvents = async () => {
            try {
                const allEvents: CalendarEvent[] = [];
                const teachersToFetch = new Map<string, string>();

                if (teacherId) {
                    const q = query(collection(firestore, 'teachers', teacherId, 'events'));
                    const snap = await getDocs(q);
                    snap.forEach(d => allEvents.push({ id: d.id, ...d.data(), teacherId } as CalendarEvent));
                } else if (grade) {
                    const teachersSnapshot = await getDocs(
                        query(collection(firestore, 'teachers'), where('gradesTaught', 'array-contains', grade))
                    );

                    for (const teacherDoc of teachersSnapshot.docs) {
                        const tid = teacherDoc.id;
                        teachersToFetch.set(tid, teacherDoc.data().name);
                        const eventsSnapshot = await getDocs(
                            query(collection(firestore, `teachers/${tid}/events`), where('grade', '==', grade))
                        );
                        eventsSnapshot.forEach(doc => {
                            allEvents.push({ id: doc.id, ...doc.data(), teacherId: tid } as CalendarEvent);
                        });
                    }
                }

                setEvents(allEvents);
                setTeacherMap(teachersToFetch);
            } catch (err) {
                console.error("Error fetching calendar events:", err);
                setEvents([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();

    }, [firestore, grade, teacherId]);

    return { events, isLoading, teacherMap };
};

export function CalendarView({ initialGrade, teacherId }: CalendarViewProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || true;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedGrade, setSelectedGrade] = useState<Grade | undefined>(initialGrade);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  const { events, isLoading, teacherMap } = useEfficientEvents(selectedGrade, teacherId);
  
  const { monthlyEventsMap, allMonthlyEvents } = useMemo(() => {
    const eventMap = new Map<string, CalendarEvent[]>();
    const allEvents: CalendarEvent[] = [];
    
    if (!events) return { monthlyEventsMap: eventMap, allMonthlyEvents: allEvents };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    daysInMonth.forEach(day => {
        const dayEvents: CalendarEvent[] = [];
        const dayOfWeek = day.getDay();

        events.forEach(event => {
            const startDate = toJsDate(event.startTime);
            if (!startDate) return;

            if (event.recurrence === 'weekly') {
                if (startDate.getDay() === dayOfWeek && day >= startDate) {
                    dayEvents.push(event);
                }
            } else {
                if (isSameDay(day, startDate)) {
                    dayEvents.push(event);
                }
            }
        });

        if (dayEvents.length > 0) {
            const dateKey = format(day, 'yyyy-MM-dd');
            eventMap.set(dateKey, dayEvents);
            dayEvents.forEach(e => {
                if (!allEvents.some(ae => ae.id === e.id)) {
                    allEvents.push(e);
                }
            });
        }
    });

    allEvents.sort((a,b) => {
        const da = toJsDate(a.startTime)?.getTime() || 0;
        const db = toJsDate(b.startTime)?.getTime() || 0;
        return da - db;
    });

    return { monthlyEventsMap: eventMap, allMonthlyEvents: allEvents };
  }, [events, currentMonth]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOffset = useMemo(() => {
    return getDay(startOfMonth(currentMonth));
  }, [currentMonth]);

  const handleDaySelect = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvts = monthlyEventsMap.get(dateKey) || [];
    setSelectedDayDate(day);
    setSelectedDayEvents(dayEvts);
  };

  const formattedEventTime = (event: CalendarEvent) => {
      const start = toJsDate(event.startTime);
      const end = toJsDate(event.endTime);
      if(!start || !end) return '';
      return `${format(start, 'p')} - ${format(end, 'p')}`;
  };

  const weekDayLabels = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

  return (
    <div className="space-y-6">
      {!teacherId && (
        <div className="max-w-xs">
            <Select value={selectedGrade} onValueChange={(val) => setSelectedGrade(val as Grade)}>
                <SelectTrigger className="h-10 text-xs rounded-xl bg-card border-border">
                    <SelectValue placeholder={isArabic ? "اختر الصف لعرض الجدول الدراسي" : "Select a grade to view calendar"} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                    {grades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Monthly Calendar Card */}
        <Card className="lg:col-span-1 bg-white dark:bg-[#0b1329] border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </Button>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-black/60 flex items-center justify-center z-10 backdrop-blur-xs">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                )}
                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {weekDayLabels.map((lbl, idx) => (
                        <span key={idx} className="text-[11px] font-bold text-slate-400">
                            {lbl}
                        </span>
                    ))}
                </div>
                {/* Day numbers */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startDayOffset }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-9" />
                    ))}
                    {monthDays.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const hasEvents = monthlyEventsMap.has(dateKey);
                        const isToday = isSameDay(day, new Date());
                        return (
                            <button
                                key={dateKey}
                                onClick={() => handleDaySelect(day)}
                                className={`h-9 w-full rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                                    isToday 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : hasEvents 
                                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black hover:bg-blue-100 dark:hover:bg-blue-900/60' 
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>{format(day, 'd')}</span>
                                {hasEvents && !isToday && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 absolute bottom-1" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>

        {/* Monthly Events List Card */}
        <Card className="lg:col-span-2 bg-white dark:bg-[#0b1329] border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span>مواعيد وحصص {format(currentMonth, 'MMMM yyyy')}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <ScrollArea className="h-80 pr-2">
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full rounded-xl"/>
                                <Skeleton className="h-16 w-full rounded-xl"/>
                            </div>
                        ) : allMonthlyEvents.length > 0 ? (
                           allMonthlyEvents.map((event) => {
                                const startDate = toJsDate(event.startTime);
                                return (
                                   <div 
                                      key={event.id} 
                                      onClick={() => {
                                          if (startDate) handleDaySelect(startDate);
                                      }}
                                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-blue-400 transition-colors cursor-pointer space-y-1.5"
                                   >
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{event.title}</h4>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1 font-mono">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                {formattedEventTime(event)}
                                            </span>
                                            {event.place && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    {event.place}
                                                </span>
                                            )}
                                        </div>
                                   </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center text-slate-400 text-xs font-medium">
                                لا توجد مواعيد أو حصص مجدولة لهذا الشهر.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      {/* Selected Day Events Dialog */}
      <AlertDialog open={!!selectedDayDate} onOpenChange={(open) => !open && setSelectedDayDate(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#0b1329] border-slate-200 dark:border-slate-800 text-right">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedDayDate ? `جدول يوم ${format(selectedDayDate, 'EEEE dd MMMM yyyy')}` : ''}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
                <div className="space-y-3 pt-3">
                    {selectedDayEvents.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">لا توجد حصص مجدولة في هذا اليوم.</p>
                    ) : (
                        selectedDayEvents.map(event => (
                            <div key={event.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">{event.title}</h5>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span>{formattedEventTime(event)}</span>
                                </div>
                                {event.place && (
                                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{event.place}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">إغلاق</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CalendarView;
