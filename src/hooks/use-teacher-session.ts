'use client';

import { useUser } from '@/firebase';
import { useState, useEffect } from 'react';

export function useTeacherSession() {
  const { user, isUserLoading } = useUser();
  const [teacherId, setTeacherId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return (user && !user.isAnonymous)
        ? user.uid
        : (localStorage.getItem('teacherId') ||
           localStorage.getItem('active_connected_professor_code') ||
           (() => {
             try {
               const accs = JSON.parse(localStorage.getItem('teacher_accounts') || '[]');
               return accs?.[0]?.id || null;
             } catch (e) {
               return null;
             }
           })() ||
           null);
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const resolvedId = (user && !user.isAnonymous)
        ? user.uid
        : (localStorage.getItem('teacherId') ||
           localStorage.getItem('active_connected_professor_code') ||
           (() => {
             try {
               const accs = JSON.parse(localStorage.getItem('teacher_accounts') || '[]');
               return accs?.[0]?.id || null;
             } catch (e) {
               return null;
             }
           })() ||
           'teacher_default');
      setTeacherId(resolvedId);
    }
  }, [user]);

  const effectiveTeacherId = teacherId || user?.uid || (typeof window !== 'undefined' ? (localStorage.getItem('teacherId') || 'teacher_default') : 'teacher_default');

  return {
    teacherId: effectiveTeacherId,
    user,
    isUserLoading,
  };
}
