'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import type { TestAttempt } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Award, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface TestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  studentPhone?: string;
  studentBarcodeId?: string;
}

export function TestHistoryModal({
  isOpen,
  onClose,
  studentId,
  studentPhone,
  studentBarcodeId,
}: TestHistoryModalProps) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchTestHistory = async () => {
      const allAttempts: TestAttempt[] = [];
      const seenIds = new Set<string>();

      const addAttempt = (att: TestAttempt) => {
        if (att.id && !seenIds.has(att.id)) {
          seenIds.add(att.id);
          allAttempts.push(att);
        }
      };

      // 1. Fetch from Firestore if available
      if (firestore && (studentId || studentPhone || studentBarcodeId)) {
        try {
          // Query by studentId
          if (studentId) {
            const attQuery = query(
              collection(firestore, 'testAttempts'),
              where('studentId', '==', studentId),
              firestoreLimit(10)
            );
            const snapshot = await getDocs(attQuery);
            snapshot.docs.forEach(d => {
              addAttempt({ id: d.id, ...(d.data() as any) });
            });
          }

          // Query by studentPhone if list is still < 5
          if (studentPhone && allAttempts.length < 5) {
            const phoneQuery = query(
              collection(firestore, 'testAttempts'),
              where('studentPhone', '==', studentPhone),
              firestoreLimit(10)
            );
            const phoneSnap = await getDocs(phoneQuery);
            phoneSnap.docs.forEach(d => {
              addAttempt({ id: d.id, ...(d.data() as any) });
            });
          }
        } catch (err) {
          console.warn("Failed fetching test attempts from Firestore:", err);
        }
      }

      // 2. Fallback to localStorage cached test attempts
      try {
        if (typeof window !== 'undefined' && studentId) {
          const cached = localStorage.getItem(`cached_test_attempts_${studentId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => addAttempt(item));
            }
          }
        }
      } catch (err) {
        console.error("Local test attempts cache read error:", err);
      }

      // Sort by submittedAt timestamp descending
      allAttempts.sort((a, b) => {
        const tA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt as any || 0).getTime();
        const tB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt as any || 0).getTime();
        return tB - tA;
      });

      // Strictly limit to the 5 most recent tests only
      const recent5 = allAttempts.slice(0, 5);

      if (isMounted) {
        setAttempts(recent5);
        setIsLoading(false);
      }
    };

    fetchTestHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId, studentPhone, studentBarcodeId, firestore]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-wide text-slate-900 dark:text-zinc-100">
                {t('Test Results History')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                {t('Showing your 5 most recent test results')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-20 w-full rounded-xl bg-slate-100 dark:bg-zinc-900" />
              <Skeleton className="h-20 w-full rounded-xl bg-slate-100 dark:bg-zinc-900" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-900/30">
              <Award className="w-8 h-8 mx-auto text-slate-400 dark:text-zinc-600 mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-300">{t('No Test History Yet')}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t('Complete quizzes or tests to view your scores here.')}</p>
            </div>
          ) : (
            attempts.map((attempt, index) => {
              const totalPoints = attempt.totalPoints || 1;
              const percentage = Math.round((attempt.score / totalPoints) * 100);
              const incorrectCount = attempt.incorrectQuestions?.length || 0;
              const totalAnswered = attempt.answers?.length || 0;
              const correctCount = Math.max(0, totalAnswered - incorrectCount);

              const submitDate = attempt.submittedAt?.toDate
                ? attempt.submittedAt.toDate()
                : new Date(attempt.submittedAt as any || Date.now());
              const timeAgo = !isNaN(submitDate.getTime())
                ? formatDistanceToNow(submitDate, { addSuffix: true })
                : 'Recently';

              const isExpanded = expandedAttemptId === attempt.id;

              return (
                <div
                  key={attempt.id || index}
                  className="bg-slate-50/80 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] font-black uppercase bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5">
                          #{index + 1} {t('Test')}
                        </Badge>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                          {timeAgo}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 mt-1 truncate">
                        {attempt.testTitle || t('Standard Assessment')}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                        {percentage}%
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">
                        {attempt.score} / {totalPoints} {t('Pts')}
                      </p>
                    </div>
                  </div>

                  <Progress value={percentage} className="h-1.5 bg-slate-200 dark:bg-zinc-800" />

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> {correctCount} {t('Correct')}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-3.5 h-3.5" /> {incorrectCount} {t('Incorrect')}
                      </span>
                    </div>

                    {incorrectCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 transition-all"
                      >
                        {isExpanded ? t('Hide Review') : t('Review')}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Incorrect questions expansion */}
                  {isExpanded && incorrectCount > 0 && (
                    <div className="mt-2 p-3 bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-1.5 text-xs shadow-xs">
                      <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                        {t('Incorrect Question Review')}:
                      </p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {attempt.incorrectQuestions.map((iq, qIdx) => (
                          <div key={qIdx} className="text-[11px] text-slate-700 dark:text-zinc-300 flex items-start gap-1">
                            <span className="font-bold text-amber-600 dark:text-amber-400">Q{iq.question}:</span>
                            <span>
                              {t('Correct Answer')}: <strong className="text-emerald-600 dark:text-emerald-400">{String(iq.correctAnswer)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
