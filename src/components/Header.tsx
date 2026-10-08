'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from './ui/button';
import { Settings, WifiOff, Sun, Moon, LogOut, Compass } from 'lucide-react';
import { useUser, useAuth, useDoc, useMemoFirebase, useStudent } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Teacher } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import { Logo } from '@/components/icons';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';
import { InstallPwaButton } from './InstallPwaButton';
import { isStudentEmail, getStudentBarcodeFromEmail } from '@/lib/auth-helpers';
import { findProfessorByCode } from '@/lib/professors-registry';

function UserProfile() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [studentId, setStudentId] = useState<string | null>(null);
    const [assistantTeacherName, setAssistantTeacherName] = useState<string | null>(null);
    const [cachedStudent, setCachedStudent] = useState<any>(null);

    useEffect(() => {
        try {
            const sid = localStorage.getItem('viewingStudentId');
            setStudentId(sid);
            setAssistantTeacherName(localStorage.getItem('assistantTeacherName'));
            
            if (sid) {
                const stored = localStorage.getItem('cached_student_profile_' + sid) || 
                               localStorage.getItem('student_profile_offline_' + sid);
                if (stored) {
                    try {
                        setCachedStudent(JSON.parse(stored));
                    } catch (e) {}
                }
            }
        } catch(e) {
            console.error('Error accessing localStorage:', e);
        }
    }, [user]);

    const isAssistant = !!assistantTeacherName;
    const isStudentUser = user && (user.isAnonymous || isStudentEmail(user.email));
    const isLegacyStudent = !user && !!studentId;
    const isStudent = (isStudentUser || isLegacyStudent || !!studentId) && !isAssistant;
    const isTeacher = user && !isStudent && !isAssistant;
    
    const userId = user?.uid || studentId;

    const teacherRef = useMemoFirebase(() => {
        if (!firestore || !isTeacher || !userId) return null;
        return doc(firestore, 'teachers', userId);
    }, [firestore, isTeacher, userId]);
    const { data: teacher, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);
    
    const canFetchStudent = isStudent && firestore && !!user && userId === user.uid;
    const studentRef = useMemoFirebase(() => {
        if (!canFetchStudent || !userId) return null;
        return doc(firestore, 'students', userId);
    }, [firestore, canFetchStudent, userId]);
    const { data: cloudStudent, isLoading: isStudentLoading } = useDoc<any>(studentRef);

    const student = cloudStudent || cachedStudent;

    const isLoading = isUserLoading || (isTeacher && isTeacherLoading) || (isStudent && isStudentLoading && !cachedStudent);

    const [studentAvatarImg, setStudentAvatarImg] = useState<string | null>(null);
    const [studentAvatarEmoji, setStudentAvatarEmoji] = useState<string>('🎓');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sid = userId || 'default';
            const savedImg = localStorage.getItem('student_custom_avatar_img_' + sid) || localStorage.getItem('student_custom_avatar_img');
            const savedEmoji = localStorage.getItem('student_avatar_emoji_' + sid) || localStorage.getItem('student_avatar_emoji') || '🎓';
            if (savedImg) setStudentAvatarImg(savedImg);
            if (savedEmoji) setStudentAvatarEmoji(savedEmoji);
        }
    }, [userId]);

    if (isLoading) {
        return (
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 hidden sm:block">
                    <Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-800" />
                </div>
            </div>
        );
    }

    let name = 'Guest';
    let detail = 'Not Logged In';
    let pfpUrl: string | undefined = undefined;

    if (isAssistant) {
        name = 'Assistant';
        detail = assistantTeacherName ? `Assisting: ${assistantTeacherName}` : 'Assistant Mode';
    } else if (isStudent) {
        name = student?.name || (user?.email ? `Student [${getStudentBarcodeFromEmail(user.email)}]` : 'University Scholar');
        const faculty = student?.facultyLabel || student?.facultyCategory;
        const uni = student?.university;
        detail = faculty ? `${faculty}` : (uni ? `${uni}` : 'Mola5saty Scholar');
    } else if (isTeacher) {
        name = teacher?.name || 'Professor';
        detail = teacher?.email || 'Faculty Account';
        pfpUrl = teacher?.profilePictureUrl;
    }

    return (
        <div className="flex items-center gap-3">
            {isStudent ? (
                <Link href="/profile" className="flex items-center gap-2.5 group transition-transform hover:opacity-95" title="View Student Profile">
                    {/* Modern Academic Scholar Icon / Avatar */}
                    <div 
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-xs text-base select-none overflow-hidden group-hover:border-blue-500 transition-colors" 
                        role="img" 
                        aria-label="avatar"
                    >
                        {studentAvatarImg ? (
                            <img src={studentAvatarImg} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-lg leading-none">{studentAvatarEmoji}</span>
                        )}
                    </div>
                    <div className="hidden xs:block text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {name}
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wide mt-0.5 max-w-[160px] truncate">
                            {detail}
                        </p>
                    </div>
                </Link>
            ) : (
                <>
                    <Avatar className="h-10 w-10 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden rounded-xl">
                        {pfpUrl ? (
                            <AvatarImage src={pfpUrl} />
                        ) : isTeacher ? (
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold">{name.charAt(0)}</AvatarFallback>
                        ) : (
                            <Logo width={24} height={24} showText={false} />
                        )}
                    </Avatar>
                    <div className="hidden sm:block text-left">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">{name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px]">{detail}</p>
                    </div>
                </>
            )}
        </div>
    );
}

export function Header() {
    const pathname = usePathname();
    const isOnline = useOnlineStatus();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const { user } = useUser();
    const auth = useAuth();
    const [hasSession, setHasSession] = useState(false);
    const [activeProfBranding, setActiveProfBranding] = useState<any>(null);

    const [isStudentSession, setIsStudentSession] = useState(false);
    const [isAssistantSession, setIsAssistantSession] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sid = localStorage.getItem('viewingStudentId') ||
                        localStorage.getItem('student_barcode') ||
                        localStorage.getItem('offline_student_id') ||
                        localStorage.getItem('app_student_auth_session');
            const asst = localStorage.getItem('assistantTeacherName') ||
                         localStorage.getItem('assistantForTeacherId');
            setIsStudentSession(!!sid);
            setIsAssistantSession(!!asst);
        }
    }, [pathname, user]);

    const isStudentUser = user && (user.isAnonymous || isStudentEmail(user.email));
    const isTeacher = user && !user.isAnonymous && user.email && !isStudentEmail(user.email) && !isStudentSession && !isAssistantSession;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sid = localStorage.getItem('viewingStudentId');
            const asst = localStorage.getItem('assistantTeacherName');
            const admin = localStorage.getItem('admin-session');
            setHasSession(!!(user || sid || asst || admin));

            const updateBranding = () => {
                const activeCode = localStorage.getItem('active_connected_professor_code');
                if (activeCode) {
                    const prof = findProfessorByCode(activeCode);
                    if (prof) {
                        setActiveProfBranding(prof);
                        return;
                    }
                }
                setActiveProfBranding(null);
            };

            updateBranding();
            window.addEventListener('app_branding_changed', updateBranding);
            window.addEventListener('connected_professors_updated', updateBranding);
            return () => {
                window.removeEventListener('app_branding_changed', updateBranding);
                window.removeEventListener('connected_professors_updated', updateBranding);
            };
        }
    }, [user]);

    const handleHeaderLogout = async () => {
        try {
            if (auth) {
                await auth.signOut();
            }
        } catch (e) {
            console.error(e);
        }
        try {
            localStorage.removeItem('viewingStudentId');
            localStorage.removeItem('parentForStudentBarcode');
            localStorage.removeItem('parentPhoneNumber');
            localStorage.removeItem('assistantForTeacherId');
            localStorage.removeItem('assistantTeacherName');
            localStorage.removeItem('admin-session');
            localStorage.removeItem('offline_student_id');
            localStorage.removeItem('app_student_auth_session');
            localStorage.removeItem('student_barcode');
            sessionStorage.clear();
        } catch (e) {
            console.error(e);
        }
        window.location.href = '/signup-options';
    };

    useEffect(() => {
        try {
            const saved = localStorage.getItem('mola5saty_theme') || localStorage.getItem('app_mode_dark');
            if (saved === 'dark') {
                setIsDarkMode(true);
                document.documentElement.classList.add('dark');
            } else {
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const toggleDarkLight = () => {
        const next = !isDarkMode;
        setIsDarkMode(next);
        try {
            localStorage.setItem('mola5saty_theme', next ? 'dark' : 'light');
            localStorage.setItem('app_mode_dark', next ? 'dark' : 'light');
            if (next) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            // Defer event dispatch to avoid interrupting active React render cycles
            setTimeout(() => {
                window.dispatchEvent(new Event('app_theme_changed'));
            }, 0);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl shadow-xs transition-colors duration-200">
            <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between max-w-7xl">
                {/* Brand & User Profile */}
                <div className="flex items-center gap-4 sm:gap-6">
                    <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105 active:scale-95 group">
                        {activeProfBranding ? (
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-slate-900 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center overflow-hidden">
                                    <img 
                                        src={activeProfBranding.appIconPath || activeProfBranding.avatarUrl} 
                                        alt={activeProfBranding.name} 
                                        className="w-full h-full object-cover rounded-[9px]" 
                                    />
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {activeProfBranding.appNameAr || activeProfBranding.name}
                                    </span>
                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wider font-mono uppercase">
                                        CODE [{activeProfBranding.code}]
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <Logo width={36} height={36} showText={true} />
                        )}
                    </Link>
                    
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                    
                    <UserProfile />
                </div>

                {/* Right Quick Controls: Dark/Light Mode Switcher & Settings */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {!isTeacher && (
                        <Link
                            href="/discover"
                            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all shadow-xs"
                        >
                            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>الأساتذة والمحاضرون</span>
                        </Link>
                    )}

                    {/* Dark / Light Mode Toggle Button */}
                    <button
                        onClick={toggleDarkLight}
                        type="button"
                        aria-label="Toggle Dark/Light Mode"
                        className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDarkMode ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                            <Moon className="w-4 h-4 text-blue-600" />
                        )}
                    </button>

                    <InstallPwaButton />

                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Link href="/settings" title="Settings">
                            <Settings className="w-5 h-5" />
                        </Link>
                    </Button>

                    {/* Fast Quick Log Out Button */}
                    {hasSession && (
                        <button
                            onClick={handleHeaderLogout}
                            type="button"
                            aria-label="Log Out"
                            title="Log Out / تسجيل الخروج"
                            className="h-10 w-10 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {!isOnline && (
                <div className="w-full bg-red-600 text-white text-xs py-1 px-4 flex items-center justify-center gap-2">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>You are offline. Some features may be unavailable.</span>
                </div>
            )}
        </header>
    );
}
