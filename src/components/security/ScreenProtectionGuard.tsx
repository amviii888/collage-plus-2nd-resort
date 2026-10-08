'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, EyeOff, Lock } from 'lucide-react';

export function ScreenProtectionGuard() {
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applyInstantBlackout = () => {
    if (typeof document !== 'undefined') {
      document.body?.classList.add('mol5asaty-guard-protected');
    }
  };

  const removeInstantBlackout = () => {
    if (typeof document !== 'undefined') {
      document.body?.classList.remove('mol5asaty-guard-protected');
    }
  };

  const wipeClipboard = () => {
    // Intentionally disabled: allows users/developers to copy errors and logs freely without interference
  };

  const showSecurityWarning = (msg: string, blackoutDurationMs = 5000) => {
    applyInstantBlackout();
    setIsBlackedOut(true);
    setWarningMessage(msg);

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    warningTimerRef.current = setTimeout(() => {
      setWarningMessage(null);
      // Only un-blackout if window currently has focus and document is visible
      if (typeof document !== 'undefined' && !document.hidden && document.hasFocus && document.hasFocus()) {
        setIsBlackedOut(false);
        removeInstantBlackout();
      }
    }, blackoutDurationMs);
  };

  useEffect(() => {
    // 1. Android FLAG_SECURE Bridge (Capacitor / Cordova / Native Android WebView)
    try {
      if (typeof window !== 'undefined') {
        const cap = (window as any).Capacitor;
        if (cap && cap.Plugins) {
          if (cap.Plugins.PrivacyScreen?.enable) {
            cap.Plugins.PrivacyScreen.enable();
          }
        }
      }
    } catch {
      // Ignored in standard browser context
    }

    // 2. Intercept navigator.mediaDevices.getDisplayMedia to prevent Screen Sharing (Zoom, Teams, Meet, OBS)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.getDisplayMedia = async function (...args) {
          showSecurityWarning('Screen recording and screen sharing are strictly prohibited by institutional policy.', 6000);
          throw new DOMException('Screen sharing is prohibited by Mol5asati security policy.', 'NotAllowedError');
        };
      } catch {
        // Read-only in some environments
      }
    }

    // 3. Ultra-Fast Synchronous Keyboard Event Capture for Screenshots
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Allow dismissing warning with Escape
      if (e.key === 'Escape') {
        setIsBlackedOut(false);
        setWarningMessage(null);
        removeInstantBlackout();
        return;
      }

      // PrintScreen / PrtScn key (Immediate sync blackout)
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        applyInstantBlackout();
        wipeClipboard();
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Screenshot attempt intercepted and blocked.');
        return false;
      }

      // Windows Game Bar / Snipping Tool (Win + G, Win + Shift + S)
      if (e.metaKey && (key === 'g' || (e.shiftKey && key === 's'))) {
        applyInstantBlackout();
        wipeClipboard();
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Screen capture / snipping tool detected and blocked.');
        return false;
      }

      if (isCmdOrCtrl) {
        // macOS Screenshot combos: Cmd + Shift + 3 / 4 / 5 / 6
        if (e.shiftKey && ['3', '4', '5', '6', 's'].includes(key)) {
          applyInstantBlackout();
          e.preventDefault();
          e.stopPropagation();
          showSecurityWarning('Screen capture is restricted.');
          return false;
        }

        // Print: Cmd/Ctrl + P
        // Save HTML: Cmd/Ctrl + S
        if (key === 'p' || key === 's') {
          applyInstantBlackout();
          e.preventDefault();
          e.stopPropagation();
          showSecurityWarning('Printing and saving pages are restricted.');
          return false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        applyInstantBlackout();
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Screenshot attempt intercepted.');
      }
    };

    // 4. Window Blur & Visibility - do not black out or block on normal tab/window switches
    const handleWindowBlur = () => {
      // Kept passive to allow copying error logs and switching to dev tools
    };

    const handleWindowFocus = () => {
      // Clear blackout only if not in active warning countdown
      if (!warningMessage) {
        setTimeout(() => {
          if (!document.hidden && document.hasFocus && document.hasFocus()) {
            setIsBlackedOut(false);
            removeInstantBlackout();
          }
        }, 200);
      }
    };

    // 5. Visibility Change - kept passive to prevent false positive lockouts
    const handleVisibilityChange = () => {
      // Kept passive to allow smooth switching without obscuring errors
    };

    // 6. Right-Click Context Menu Prevention on Media & Protected Views
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.tagName === 'VIDEO' ||
          target.tagName === 'IFRAME' ||
          target.closest('.protected-media') ||
          target.closest('.no-capture'))
      ) {
        e.preventDefault();
      }
    };

    // 7. Drag and Drop Prevention (Prevents saving dragged media)
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.tagName === 'VIDEO' ||
          target.closest('.protected-media'))
      ) {
        e.preventDefault();
      }
    };

    // Attach with capture = true for highest priority event dispatch
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });
    window.addEventListener('blur', handleWindowBlur, { passive: true });
    window.addEventListener('focus', handleWindowFocus, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [warningMessage]);

  return (
    <>
      {/* Global CSS injection for instant hardware blackout and print blockage */}
      <style jsx global>{`
        @media print {
          html, body {
            display: none !important;
            visibility: hidden !important;
          }
        }
        body.mol5asaty-guard-protected > *:not(#screen-protection-curtain):not(#screen-protection-warning) {
          filter: blur(16px) brightness(0.1) !important;
          pointer-events: none !important;
          user-select: none !important;
        }
        pre, code, [data-error], [role="alert"], [data-radix-toast-announce], .toaster, .toast, .font-mono, [data-selectable], .selectable-text {
          user-select: text !important;
          -webkit-user-select: text !important;
          pointer-events: auto !important;
        }
      `}</style>

      {/* Millisecond Blackout Curtain (Protects against app snapshots, screen recording, and window blur / tab switching) */}
      {isBlackedOut && (
        <div 
          id="screen-protection-curtain"
          onClick={() => {
            setIsBlackedOut(false);
            setWarningMessage(null);
            removeInstantBlackout();
          }}
          className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl text-white p-6 cursor-pointer"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 2147483647 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl max-w-md text-center shadow-2xl space-y-4 animate-in fade-in duration-75 cursor-default"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <EyeOff className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Protected Academic Content
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Screen recording, screenshots, background capturing, and window sharing are disabled to safeguard institutional lectures and exam content.
            </p>
            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBlackedOut(false);
                  setWarningMessage(null);
                  removeInstantBlackout();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              >
                Dismiss Notice (Esc)
              </button>
              <div className="text-[11px] font-mono text-zinc-500">
                DRM Protection Active • Mol5asati Secure Flag
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Security Banner Warning */}
      {warningMessage && (
        <div 
          id="screen-protection-warning"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[2147483647] bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-sm border border-rose-400/40 animate-in fade-in slide-in-from-top-4 duration-150"
        >
          <ShieldAlert className="w-5 h-5 shrink-0 text-white animate-pulse" />
          <span>{warningMessage}</span>
        </div>
      )}
    </>
  );
}

