'use client';
import { useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { TestAttempt } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, CheckCircle, XCircle, History, Sparkles, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { TestHistoryModal } from '@/components/TestHistoryModal';
import { useTranslation } from 'react-i18next';

export function LatestTestResultCard({ 
    testAttemptId, 
    studentId,
    studentPhone,
    studentBarcodeId,
}: { 
    testAttemptId?: string | null; 
    studentId?: string;
    studentPhone?: string;
    studentBarcodeId?: string;
    playpen?: boolean;
}) {
    const firestore = useFirestore();
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const attemptRef = useMemoFirebase(() => {
        if (!firestore || !testAttemptId) return null;
        return doc(firestore, 'testAttempts', testAttemptId);
    }, [firestore, testAttemptId]);

    const { data: testResult, isLoading } = useDoc<TestAttempt>(attemptRef);

    if (isLoading) {
        return (
            <div className="p-5 rounded-2xl border border-blue-900/20 dark:border-blue-500/20 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-7 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-28 flex items-center justify-center">
                    <Skeleton className="h-10 w-10 rounded-full animate-spin border-2 border-blue-500 border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!testResult) {
        return (
            <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isArabic ? 'لا توجد اختبارات مسجلة بعد' : 'No Test Benchmarks Yet'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        {isArabic 
                            ? 'عندما تؤدي اختبارات وتقييمات المحاضرات ستظهر درجاتك ونسب التفوق هنا مباشرة.' 
                            : 'When you complete lecture quizzes and chapter exams, your benchmarks and answer analysis will appear here.'}
                    </p>
                </div>
                <div className="pt-2 flex justify-center">
                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="py-1.5 px-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                    >
                        <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{isArabic ? 'سجل الاختبارات الشامل' : 'Test History'}</span>
                    </button>
                </div>

                <TestHistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    studentId={studentId}
                    studentPhone={studentPhone}
                    studentBarcodeId={studentBarcodeId}
                />
            </div>
        );
    }
    
    const percentage = testResult.totalPoints > 0 ? (testResult.score / testResult.totalPoints) * 100 : 0;
    const correctCount = testResult.answers.length - testResult.incorrectQuestions.length;

    return (
        <div className="p-5 rounded-2xl border border-blue-900/20 dark:border-blue-500/20 bg-slate-50/70 dark:bg-slate-900/70 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-blue-600 dark:text-blue-400 font-semibold block">
                        {isArabic ? 'أحدث نتيجة اختبار' : 'LATEST ASSESSMENT'}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                        {testResult.testTitle}
                    </h4>
                </div>
                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                    <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isArabic ? 'السجل' : 'History'}</span>
                </button>
            </div>

            {/* Score Showcase */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                <div>
                    <div className="text-3xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
                        {Math.round(percentage)}%
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 block">
                        {testResult.score} / {testResult.totalPoints} {isArabic ? 'درجة' : 'Points'}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{correctCount} {isArabic ? 'صحيح' : 'Correct'}</span>
                    </div>
                    {testResult.incorrectQuestions.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>{testResult.incorrectQuestions.length} {isArabic ? 'خاطئ' : 'Incorrect'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Review Mistakes preview */}
            {testResult.incorrectQuestions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/70 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                        {isArabic ? 'مراجعة الإجابات الصحيحة:' : 'ANSWER KEY REVIEW:'}
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
                        {testResult.incorrectQuestions.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                                <span>{isArabic ? `سؤال ${item.question}` : `Q${item.question}`}</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                                    {String(item.correctAnswer)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <TestHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                studentId={studentId}
                studentPhone={studentPhone}
                studentBarcodeId={studentBarcodeId}
            />
        </div>
    );
}
