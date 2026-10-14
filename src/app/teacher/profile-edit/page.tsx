'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TeacherProfileForm } from '@/components/TeacherProfileForm';
import { Skeleton } from '@/components/ui/skeleton';
import type { Teacher } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function TeacherProfileEditPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [effectiveTeacherId, setEffectiveTeacherId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const uid = (user && !user.isAnonymous) ? user.uid : localStorage.getItem('teacherId');
            setEffectiveTeacherId(uid || null);
        }
    }, [user]);

    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !effectiveTeacherId) return null;
        return doc(firestore, 'teachers', effectiveTeacherId);
    }, [firestore, effectiveTeacherId]);
    
    const { data: cloudTeacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    if ((isUserLoading || isTeacherLoading) && !cloudTeacher) {
        return (
            <div className="max-w-4xl mx-auto space-y-4 p-4" dir="rtl">
                <Skeleton className="h-12 w-3/4 rounded-2xl bg-slate-800" />
                <Skeleton className="h-64 w-full rounded-2xl bg-slate-900" />
                <Skeleton className="h-48 w-full rounded-2xl bg-slate-900" />
            </div>
        );
    }

    const currentId = effectiveTeacherId || user?.uid || 'teacher_default';
    
    // Construct teacher object from cloudTeacher or fallback
    const initialTeacher: Teacher = cloudTeacher || {
        id: currentId,
        name: user?.displayName || 'الأستاذ',
        email: user?.email || 'teacher@mol5saty.com',
        bio: '',
        profilePictureUrl: (typeof window !== 'undefined' ? localStorage.getItem(`custom_teacher_avatar_${currentId}`) : null) || '',
        heroImageUrl: (typeof window !== 'undefined' ? localStorage.getItem(`custom_teacher_hero_${currentId}`) : null) || '',
        subjects: ['المقررات الجامعية'],
        gradesTaught: ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
        approved: true,
        createdAt: new Date().toISOString() as any,
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <TeacherProfileForm teacher={initialTeacher} />
        </div>
    );
}
