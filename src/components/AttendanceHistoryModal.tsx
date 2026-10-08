'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarCheck, Clock, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';
import { formatDistanceToNow, parseISO, isAfter, subDays, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export interface AttendanceItem {
  id: string;
  checkInTime: string;
  planName?: string;
  status?: string;
  teacherName?: string;
  hubName?: string;
}

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  barcodeId?: string;
  studentName?: string;
}

export function AttendanceHistoryModal({
  isOpen,
  onClose,
  studentId,
  barcodeId,
  studentName,
}: AttendanceHistoryModalProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const firestore = useFirestore();
  const [timeRange, setTimeRange] = useState<'1w' | '1m'>('1w');
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchAttendanceHistory = async () => {
      const mergedRecords: AttendanceItem[] = [];
      const seenKey = new Set<string>();

      const addRecord = (item: AttendanceItem) => {
        const timeKey = item.checkInTime ? new Date(item.checkInTime).getTime() : 0;
        const key = `${timeKey}_${item.planName || ''}`;
        if (!seenKey.has(key) && item.checkInTime) {
          seenKey.add(key);
          mergedRecords.push(item);
        }
      };

      try {
        if (typeof window !== 'undefined') {
          const localAttendanceStr = localStorage.getItem('attendances');
          if (localAttendanceStr) {
            try {
              const localList = JSON.parse(localAttendanceStr);
              if (Array.isArray(localList)) {
                localList.forEach((att: any) => {
                  const match = (studentId && att.studentId === studentId) ||
                                (barcodeId && att.barcodeId === barcodeId);
                  if (match && att.checkInTime) {
                    addRecord({
                      id: att.id || `local_${Math.random()}`,
                      checkInTime: att.checkInTime,
                      planName: att.planName || att.lessonName || 'Academic Lecture Check-in',
                      status: att.status || 'Present',
                      teacherName: att.teacherName || '',
                      hubName: att.hubName || '',
                    });
                  }
                });
              }
            } catch (err) {
              console.error('Error parsing local attendances:', err);
            }
          }
        }

        if (firestore) {
          try {
            if (studentId) {
              const qStudent = query(
                collectionGroup(firestore, 'attendances'),
                where('studentId', '==', studentId),
                firestoreLimit(50)
              );
              const snap = await getDocs(qStudent);
              snap.forEach((d) => {
                const data = d.data();
                addRecord({
                  id: d.id,
                  checkInTime: data.checkInTime || data.date || '',
                  planName: data.planName || data.lessonName || 'Academic Lecture Check-in',
                  status: data.status || 'Present',
                  teacherName: data.teacherName || '',
                  hubName: data.hubName || '',
                });
              });
            }

            if (barcodeId) {
              const qBarcode = query(
                collectionGroup(firestore, 'attendances'),
                where('barcodeId', '==', barcodeId),
                firestoreLimit(50)
              );
              const snapB = await getDocs(qBarcode);
              snapB.forEach((d) => {
                const data = d.data();
                addRecord({
                  id: d.id,
                  checkInTime: data.checkInTime || data.date || '',
                  planName: data.planName || data.lessonName || 'Academic Lecture Check-in',
                  status: data.status || 'Present',
                  teacherName: data.teacherName || '',
                  hubName: data.hubName || '',
                });
              });
            }
          } catch (cloudErr) {
            console.warn('Cloud attendance fetch fallback (offline/permissions):', cloudErr);
          }
        }
      } catch (e) {
        console.error('Failed to load attendance logs:', e);
      } finally {
        if (isMounted) {
          mergedRecords.sort((a, b) => {
            const timeA = new Date(a.checkInTime).getTime() || 0;
            const timeB = new Date(b.checkInTime).getTime() || 0;
            return timeB - timeA;
          });
          setRecords(mergedRecords);
          setIsLoading(false);
        }
      };
    };

    fetchAttendanceHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId, barcodeId, firestore]);

  const filteredRecords = records.filter((item) => {
    if (!item.checkInTime) return false;
    try {
      const date = new Date(item.checkInTime);
      if (isNaN(date.getTime())) return false;
      const days = timeRange === '1w' ? 7 : 30;
      const cutoff = subDays(new Date(), days);
      return isAfter(date, cutoff);
    } catch {
      return true;
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#0b0f19] border border-blue-900/20 dark:border-blue-500/20 text-slate-800 dark:text-slate-100 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl transition-colors">
        <DialogHeader className="space-y-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>{isArabic ? 'سجل الحضور الأكاديمي' : 'Academic Attendance History'}</span>
            </DialogTitle>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setTimeRange('1w')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  timeRange === '1w'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isArabic ? 'آخر أسبوع' : '1 Week'}
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('1m')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  timeRange === '1m'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isArabic ? 'آخر شهر' : '1 Month'}
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {timeRange === '1w'
              ? (isArabic ? 'عرض سجلات حضور المحاضرات والسكاشن خلال آخر 7 أيام' : 'Showing lecture attendance records from past 7 days')
              : (isArabic ? 'عرض سجلات حضور المحاضرات والسكاشن خلال آخر 30 يوماً' : 'Showing lecture attendance records from past 30 days')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-900" />
              <Skeleton className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-900" />
              <Skeleton className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-900" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/30">
              <Clock className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isArabic ? 'لا توجد تسجيلات حضور' : 'No Attendance Recorded'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {timeRange === '1w'
                  ? (isArabic ? 'لم يتم العثور على تسجيلات حضور خلال الأسبوع الماضي.' : 'No check-ins found for the past week.')
                  : (isArabic ? 'لم يتم تسجيل حضور خلال الشهر الماضي.' : 'No check-in history found for the past month.')}
              </p>
            </div>
          ) : (
            filteredRecords.map((item) => {
              const recDate = new Date(item.checkInTime);
              const isValidDate = !isNaN(recDate.getTime());
              const timeAgo = isValidDate
                ? formatDistanceToNow(recDate, { addSuffix: true })
                : 'Recently';
              const exactFormatted = isValidDate
                ? format(recDate, 'PPp')
                : item.checkInTime;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.planName || (isArabic ? 'حضور محاضرة جامعية' : 'Lecture Attendance')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{timeAgo}</span>
                        <span>•</span>
                        <span className="truncate">{exactFormatted}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 px-2 py-0.5">
                      {item.status || (isArabic ? 'حاضر' : 'Present')}
                    </Badge>
                    {item.teacherName && (
                      <span className="text-[9px] text-slate-500 truncate max-w-[110px]">
                        {item.teacherName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
