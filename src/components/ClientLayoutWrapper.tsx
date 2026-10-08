
'use client';

import { Toaster } from '@/components/ui/toaster';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Logo } from '@/components/icons';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import './../app/nav.css';
import { useUser } from '@/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';

import { ScreenProtectionGuard } from '@/components/security/ScreenProtectionGuard';
import { NotificationListener } from '@/components/NotificationListener';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';

function UnauthorizedAccess() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-8 animated-gradient-dark">
            <Card className="w-full max-w-md text-center liquid-glass">
                <CardHeader>
                    <ShieldAlert className="mx-auto h-16 w-16 text-primary" />
                    <CardTitle className="mt-4 text-2xl font-bold text-primary">Access Denied</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-muted-foreground">
                        You must be logged in to access this page. Please create an account or sign in to continue.
                    </p>
                    <Button asChild size="lg" className="w-full">
                        <Link href="/signup-options">Create Account</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const [direction, setDirection] = useState(i18n.dir(i18n.language));
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [isStudentSession, setIsStudentSession] = useState(false);
  const [isParentSession, setIsParentSession] = useState(false);
  const [isAssistantSession, setIsAssistantSession] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
        setIsStudentSession(!!localStorage.getItem('viewingStudentId'));
        setIsParentSession(!!localStorage.getItem('parentForStudentBarcode'));
        setIsAssistantSession(!!localStorage.getItem('assistantForTeacherId'));
    } catch(e) {
        setIsStudentSession(false);
        setIsParentSession(false);
        setIsAssistantSession(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
        const newDirection = i18n.dir(lng);
        document.documentElement.lang = lng;
        document.documentElement.dir = newDirection;
        setDirection(newDirection);
    };

    handleLanguageChange(i18n.language);
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      const registerSW = () => {
        try {
          navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(async (reg) => {
              console.log('Service Worker registered successfully:', reg.scope);
              reg.update().catch(() => {});

              // Register Periodic Sync if supported
              if ('periodicSync' in reg) {
                try {
                  const status = await (navigator as any).permissions?.query({
                    name: 'periodic-background-sync',
                  });
                  if (status?.state === 'granted' || !status) {
                    await (reg as any).periodicSync.register('universe-sync-rosters', {
                      minInterval: 12 * 60 * 60 * 1000, // 12 hours
                    });
                    console.log('Periodic Sync registered');
                  }
                } catch (pe) {
                  // Non-fatal if unsupported
                }
              }

              // Register Background Sync if supported
              if ('sync' in reg) {
                try {
                  await (reg as any).sync.register('sync-offline-attendance');
                  console.log('Background Sync registered');
                } catch (se) {
                  // Non-fatal if unsupported
                }
              }
            })
            .catch((err) => {
              console.warn('Service Worker registration deferred/skipped:', err?.message || err);
            });

          // Listen for SW messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'TRIGGER_ONE_WAY_PUSH') {
              console.log('[App] Received background sync push signal from SW');
              window.dispatchEvent(new Event('online'));
            }
          });
        } catch (e) {
          console.warn('Service Worker initialization exception:', e);
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  const publicRoutes = [
    '/', '/login', '/teacher-signup', '/student-signup', '/signup-options',
    '/terms-of-service', '/privacy-policy', '/copyright', '/terms-and-conditions',
    '/meet-the-devs', '/offline', '/parent-login', '/assistant-login', '/student-login', '/forgot-password',
    '/support'
  ];

  const noNavRoutes = [
    '/', '/login', '/teacher-signup', '/student-signup', '/admin/login',
    '/assistant-login', '/parent-login', '/signup-options', '/student-login',
    '/admin/canvas/login', '/admin/access', '/offline', '/forgot-password',
    '/terms-of-service', '/privacy-policy', '/copyright', '/terms-and-conditions',
    '/meet-the-devs', '/support'
  ];
  
  const cleanedPathname = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  const isPublicRoute = publicRoutes.includes(cleanedPathname) || 
                        pathname.startsWith('/courses/') ||
                        pathname.startsWith('/collections/');

  // Wait for isClient to prevent client-side hydration mismatch
  if (!isClient) {
      return null;
  }

  const isRealUser = user && !user.isAnonymous;
  const isAuthenticated = isRealUser || isStudentSession || isParentSession || isAssistantSession;

  // Only block rendering on isUserLoading for protected/private views to prevent a momentary flicker of unauthorized content.
  // Public routes mount immediately and safely because they require no authentication.
  const isProtected = !isPublicRoute && !pathname.startsWith('/admin/');
  if (isUserLoading && isProtected) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-950 relative overflow-hidden" id="app-auth-splash">
          <div className="flex flex-col items-center gap-4 text-center z-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.25)] animate-pulse">
              <Logo width={40} height={40} showText={false} className="rounded-lg shadow-sm" />
            </div>
            <div className="space-y-1">
              <p className="font-sans font-bold text-base tracking-widest text-white uppercase">
                MOL5SATY <span className="text-blue-500">UNI</span>
              </p>
              <p className="text-[11px] font-mono text-slate-400 tracking-wider">
                VERIFYING_SECURITY_SESSION...
              </p>
            </div>
          </div>
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1)_0%,transparent_60%)] pointer-events-none" />
        </div>
      );
  }

  const isUnauthorized = !isAuthenticated && isProtected;

  if (isUnauthorized) {
    return <UnauthorizedAccess />;
  }

  const showNav = !noNavRoutes.includes(pathname) && !pathname.startsWith('/admin/');

  return (
    <I18nextProvider i18n={i18n}>
      <ScreenProtectionGuard />
      <NotificationListener />
      <div className="relative flex min-h-screen w-full flex-col bg-background text-foreground overflow-x-hidden screen-protected transition-colors">
        {!isOnline && (
          <div className="w-full bg-red-600/90 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-[100] backdrop-blur-md shadow-md" id="pwa-offline-top-banner">
            <WifiOff className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>
              {i18n.language === 'ar'
                ? "أنت حالياً بدون اتصال — بعض الميزات قد لا تكون متوفرة"
                : "Currently offline — some features might not be available"}
            </span>
          </div>
        )}
        {showNav && <Header />}
        <main className={cn(
          "flex-1",
          showNav ? "pb-24" : ""
        )}>
            {children}
        </main>
        {showNav && <BottomNav />}
        <Toaster />
      </div>
    </I18nextProvider>
  );
}
