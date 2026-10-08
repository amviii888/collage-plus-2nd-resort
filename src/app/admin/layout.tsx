'use client';
import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, LogOut, ShieldCheck, Percent, Send, Clapperboard, Edit, UserCog, UserCircle, ShieldAlert, Camera, LineChart, ChevronLeft, ChevronRight, Trophy, SlidersHorizontal, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useUser } from '@/firebase';

function AdminUnauthorizedAccess() {
    const router = useRouter();
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-8">
            <div className="w-full max-w-md text-center bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
                <ShieldAlert className="mx-auto h-16 w-16 text-amber-500" />
                <h1 className="mt-4 text-2xl font-bold text-white">Admin Access Required</h1>
                <p className="mt-2 text-xs text-zinc-400">
                    You must be logged in as an administrator to view this control panel. Please verify your S-Admin passkey in your profile settings.
                </p>
                <Button onClick={() => router.push('/profile')} size="lg" className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">
                    Go to Admin Verification
                </Button>
            </div>
        </div>
    );
}

const superAdminNav = [
    { href: '/admin/dashboard', label: 'Approvals', icon: UserCog },
    { href: '/admin/features', label: 'Feature Management', icon: SlidersHorizontal },
    { href: '/admin/management', label: 'Management', icon: ShieldCheck },
    { href: '/admin/teachers', label: 'Teachers & Branding', icon: Edit },
    { href: '/admin/offers', label: 'Plans & Offers', icon: Percent },
    { href: '/admin/seasons', label: 'Themes & Branding', icon: Trophy },
    { href: '/admin/marketing', label: 'Marketing', icon: Send },
    { href: '/admin/analytics', label: 'Hub Analytics', icon: LineChart },
];

type AdminSession = {
    id: string;
    name: string;
    role: string;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const { user, isUserLoading } = useUser();
    const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sessionUser, setSessionUser] = useState<AdminSession | null>(null);

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(nextLang);
        if (typeof document !== 'undefined') {
            document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = nextLang;
        }
    };

    useEffect(() => {
        if (isUserLoading) return;

        async function verifyAdmin() {
            try {
                const collapsedState = localStorage.getItem('admin-nav-collapsed');
                setIsCollapsed(collapsedState ? JSON.parse(collapsedState) : false);

                const persistentSession = localStorage.getItem('admin-session');
                if (persistentSession) {
                    const parsedSession: AdminSession = JSON.parse(persistentSession);
                    if (parsedSession.role === 'S Admin' || parsedSession.role === 'Manager' || parsedSession.role === 'Admin') {
                        setSessionUser(parsedSession);
                        setAuthStatus('authorized');
                        return;
                    }
                }

                // Without typing the S-Admin passkey in /profile first (which sets admin-session in localStorage),
                // access is blocked and user must pass S-Admin verification on /profile.
                setAuthStatus('unauthorized');
            } catch (e) {
                console.error("Session check failed", e);
                setAuthStatus('unauthorized');
            }
        }

        verifyAdmin();
    }, [pathname, user, isUserLoading]);

    const toggleNav = () => {
        setIsCollapsed(prevState => {
            const newState = !prevState;
            try {
                localStorage.setItem('admin-nav-collapsed', JSON.stringify(newState));
            } catch (e) {
                console.error("Could not save nav state to localStorage", e);
            }
            return newState;
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('admin-session');
        router.push('/login');
    };

    const navItems = superAdminNav;
    
    if (isUserLoading || authStatus === 'checking') {
         return (
            <div className="flex h-screen">
                <div className="w-64 border-r p-4 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
                </div>
                <div className="flex-1 p-8"><Skeleton className="h-full w-full" /></div>
            </div>
        )
    }

    if (authStatus === 'unauthorized') {
        return <AdminUnauthorizedAccess />;
    }

    return (
        <TooltipProvider delayDuration={0}>
        <div className="flex min-h-screen">
            <aside className={cn("flex-shrink-0 border-r bg-background flex flex-col transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
                <div className={cn("border-b h-20 flex items-center", isCollapsed ? "justify-center" : "px-4 justify-between")}>
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger onClick={toggleNav}>
                                <div className="flex flex-col items-center gap-1 cursor-pointer group">
                                    <span className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground font-bold text-lg group-hover:scale-105 transition-transform">
                                        <ChevronRight className="h-5 w-5" />
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>{t('Expand Sidebar')}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center justify-between w-full">
                            <div className="min-w-0 pr-1">
                                <h2 className="text-sm font-bold truncate">{sessionUser?.name || 'Super Admin'}</h2>
                                <p className="text-[11px] text-muted-foreground truncate">{sessionUser?.role || 'Admin Role'}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0 hover:text-foreground" onClick={toggleNav}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>
                <nav className="flex-grow p-2 space-y-1">
                    {navItems.map(item => (
                         <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                                        pathname.startsWith(item.href) && "bg-muted text-primary",
                                        isCollapsed ? "justify-center h-10" : "px-3"
                                    )}
                                    >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    <span className={cn("font-medium", isCollapsed && "hidden")}>{t(item.label)}</span>
                                </Link>
                            </TooltipTrigger>
                            {isCollapsed && (
                                <TooltipContent side="right">
                                    <p>{t(item.label)}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    ))}
                </nav>
                 <div className="p-2 mt-auto border-t space-y-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="outline" 
                                onClick={toggleLanguage}
                                className={cn("w-full gap-2 border-slate-700 bg-slate-900/80 text-xs font-bold text-blue-400 hover:bg-slate-800", isCollapsed ? "justify-center" : "justify-start")}
                            >
                                <Globe className="h-4 w-4 shrink-0 text-blue-400" />
                                <span className={cn(isCollapsed && "hidden")}>
                                    {i18n.language === 'en' ? '🇬🇧 English (Active)' : '🇸🇦 العربية (مفعل)'}
                                </span>
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right"><p>{i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}</p></TooltipContent>}
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" className={cn("w-full", isCollapsed ? "justify-center" : "justify-start")} asChild>
                                <Link href="/"><Home className="h-5 w-5" /><span className={cn(isCollapsed && "hidden", "ml-2")}>Go to Main Site</span></Link>
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right"><p>Go to Main Site</p></TooltipContent>}
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" className={cn("w-full", isCollapsed ? "justify-center" : "justify-start")} onClick={handleLogout}>
                                <LogOut className="h-5 w-5" />
                                <span className={cn(isCollapsed && "hidden", "ml-2")}>{t('Logout')}</span>
                            </Button>
                        </TooltipTrigger>
                         {isCollapsed && <TooltipContent side="right"><p>Logout</p></TooltipContent>}
                    </Tooltip>
                 </div>
            </aside>
            <main className="flex-1 overflow-y-auto bg-muted/40">
                {children}
            </main>
        </div>
        </TooltipProvider>
    );
}
    