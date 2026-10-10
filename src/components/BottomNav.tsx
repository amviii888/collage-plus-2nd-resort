'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  GraduationCap,
  Sparkles,
  ClipboardList,
  BookOpen,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/firebase';
import { isStudentEmail } from '@/lib/auth-helpers';

export function BottomNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const [isAssistant, setIsAssistant] = useState(false);
  const [assistantTeacherId, setAssistantTeacherId] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isStudentSession, setIsStudentSession] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
        const hasStudent = !!localStorage.getItem('viewingStudentId') || 
                           !!localStorage.getItem('student_barcode') || 
                           !!localStorage.getItem('offline_student_id') || 
                           !!localStorage.getItem('app_student_auth_session');
        setIsStudentSession(hasStudent);
    } catch(e) {
        console.error('Error accessing localStorage:', e);
    }
  }, [pathname]);

  useEffect(() => {
    if (hasMounted) {
      const assistantStatus = localStorage.getItem('assistantForTeacherId');
      setIsAssistant(!!assistantStatus);
      setAssistantTeacherId(assistantStatus);
    }
  }, [pathname, hasMounted]);

  const navItems = useMemo(() => {
    if (isAssistant) {
        return [
            { href: '/assistant/dashboard', icon: ClipboardList, label: 'الحضور' },
        ];
    }
    
    // Explicit teacher role check: Authenticated teacher account always overrides stale student session
    const isTeacher = !!(user && !user.isAnonymous && user.email && !isStudentEmail(user.email));

    if (isTeacher) {
       return [
          { href: '/library', icon: BookOpen, label: 'المكتبة' },
          { href: '/profile', icon: GraduationCap, label: 'الملف الأكاديمي' },
      ];
    }

    // Default for all students (authenticated, anonymous, student barcode, or visitor):
    return [
        { href: '/discover', icon: Compass, label: 'الأساتذة والمحاضرون' },
        { href: '/library', icon: BookOpen, label: 'المكتبة' },
        { href: '/profile', icon: GraduationCap, label: 'هوية الطالب' }
    ];

  }, [isAssistant, user, isStudentSession]);
  
  if (!hasMounted) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center pb-3 sm:pb-4 px-4">
      <nav 
        className="pointer-events-auto flex items-center justify-center gap-1.5 p-1.5 rounded-full border border-slate-200/90 dark:border-blue-500/20 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl shadow-xl shadow-slate-900/10 dark:shadow-black/60 transition-all duration-300 ring-1 ring-slate-900/5 dark:ring-white/5"
        aria-label="Academic Navigation Bar"
      >
        {navItems.map((item) => {
          const isActive = item.href === '/discover' 
            ? (pathname === '/discover' || pathname.startsWith('/discover/')) 
            : (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 select-none cursor-pointer",
                  isActive 
                    ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/35 ring-2 ring-blue-400/40 scale-100" 
                    : "text-slate-700 dark:text-slate-300 hover:text-[#2563eb] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                )} 
                title={item.label}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-600 dark:text-slate-400")} />
                <span className={cn("tracking-wide whitespace-nowrap", isActive ? "font-bold text-white inline-block" : "font-medium hidden sm:inline-block")}>
                  {item.label}
                </span>
              </Link>
          );
        })}
      </nav>
    </footer>
  );
}
