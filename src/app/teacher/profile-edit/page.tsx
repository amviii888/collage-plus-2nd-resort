
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
            const storedId = localStorage.getItem('teacherId');
            const uid = (user && !user.isAnonymous) ? user.uid : storedId;
            setEffectiveTeacherId(uid || null);
        }
    }, [user]);

    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !effectiveTeacherId) return null;
        return doc(firestore, 'teachers', effectiveTeacherId);
    }, [firestore, effectiveTeacherId]);
    
    const { data: cloudTeacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

    if ((isUserLoading || isTeacherLoading) && !cloudTeacher && !effectiveTeacherId) {
        return <Skeleton className="h-96 w-full" />;
    }

    const currentId = effectiveTeacherId || user?.uid || 'teacher_default';
    
    // Use cloudTeacher or construct fallback profile for this teacher ID
    const initialTeacher: Teacher = cloudTeacher || {
        id: currentId,
        name: 'الأستاذ',
        email: user?.email || 'teacher@mol5saty.com',
        bio: '',
        profilePictureUrl: (typeof window !== 'undefined' ? localStorage.getItem(`custom_teacher_avatar_${currentId}`) : null) || '',
        heroImageUrl: '',
        subjects: ['المقررات الجامعية'],
        gradesTaught: ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'],
        approved: true,
        createdAt: new Date().toISOString() as any,
    };

    return <TeacherProfileForm teacher={initialTeacher} />;
}
