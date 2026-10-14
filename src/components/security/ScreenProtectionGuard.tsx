'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, EyeOff, Lock } from 'lucide-react';
import { PrivacyScreen } from '@capacitor/privacy-screen';

export function ScreenProtectionGuard() {
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (typeof window === 'undefined') return;
    // 1. Android FLAG_SECURE Bridge (Capacitor / Cordova / Native Android WebView)
    try {
      PrivacyScreen.enable().catch(() => {});
      const cap = (window as any).Capacitor;
      if (cap && cap.Plugins) {
        if (cap.Plugins.PrivacyScreen?.enable) {
          cap.Plugins.PrivacyScreen.enable();
        }
      }
    } catch {
      // Ignored in standard browser context
    }

    // 2. Intercept Screen Capture & Screen Recording APIs (getDisplayMedia, MediaRecorder, getUserMedia display)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.getDisplayMedia = async function (...args) {
          // Mute all video and audio immediately
          const allMedia = document.querySelectorAll('video, audio');
          allMedia.forEach((m: any) => {
            m.muted = true;
            m.pause?.();
          });
          applyInstantBlackout();
          showSecurityWarning('⛔ تم حظر تسجيل ومشاركة الشاشة وإيقاف الصوت والمحتوى تلقائياً.', 8000);
          throw new DOMException('Screen sharing and recording are prohibited by Mol5asati security policy.', 'NotAllowedError');
        };
      } catch {
        // Read-only in some browser contexts
      }
    }

    // Intercept MediaRecorder constructor to block browser extension screen recorders
    if (typeof window !== 'undefined' && (window as any).MediaRecorder) {
      try {
        const OrigMediaRecorder = (window as any).MediaRecorder;
        (window as any).MediaRecorder = function (...args: any[]) {
          const stream = args[0];
          if (stream && typeof stream.getVideoTracks === 'function') {
            const tracks = stream.getVideoTracks();
            tracks.forEach((t: MediaStreamTrack) => t.stop());
          }
          if (stream && typeof stream.getAudioTracks === 'function') {
            const aTracks = stream.getAudioTracks();
            aTracks.forEach((t: MediaStreamTrack) => t.stop());
          }
          const allMedia = document.querySelectorAll('video, audio');
          allMedia.forEach((m: any) => {
            m.muted = true;
            m.pause?.();
          });
          applyInstantBlackout();
          showSecurityWarning('⛔ تم رصد محاولة تسجيل الشاشة عبر البرامج أو الإضافات. تم إيقاف الصوت والفيديو.', 8000);
          return new OrigMediaRecorder(new MediaStream());
        };
        (window as any).MediaRecorder.prototype = OrigMediaRecorder.prototype;
      } catch {}
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

      // 1. PrintScreen / PrtScn key (Immediate synchronous blackout)
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        applyInstantBlackout();
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('تم رصد وتجميد محاولة التقاط الشاشة (Screenshot Attempt Blocked).');
        return false;
      }

      // 2. Windows Snipping Tool & Game Bar & Screenshot Combos:
      // - Win + Shift + S / Cmd + Shift + S
      // - Ctrl + Shift + S
      // - Win + G
      if (
        (e.shiftKey && (key === 's' || key === '3' || key === '4' || key === '5' || key === '6')) ||
        (e.metaKey && (key === 'g' || key === 's')) ||
        (isCmdOrCtrl && e.shiftKey && key === 's')
      ) {
        applyInstantBlackout();
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('تم حظر أداة التقاط الشاشة Snipping Tool / Screenshot Shortcuts لحماية المحتوى.');
        return false;
      }

      // 3. DevTools Inspection Interception (F12, F2, Ctrl+Shift+I/J/C, Cmd+Option+I/J/C, Ctrl+U)
      if (
        e.key === 'F12' ||
        e.keyCode === 123 ||
        e.key === 'F2' ||
        e.keyCode === 113 ||
        (isCmdOrCtrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(key)) ||
        (isCmdOrCtrl && key === 'u')
      ) {
        applyInstantBlackout();
        e.preventDefault();
        e.stopPropagation();
        try {
          console.clear();
        } catch {}
        showSecurityWarning('⛔ تنبيه أمني: أدوات الفحص المتقدمة F12 / Inspect مغلقة بحكم الحماية.', 4000);
        return false;
      }

      if (isCmdOrCtrl) {
        // Print: Cmd/Ctrl + P
        // Save HTML: Cmd/Ctrl + S
        if (key === 'p' || key === 's') {
          applyInstantBlackout();
          e.preventDefault();
          e.stopPropagation();
          showSecurityWarning('الطباعة وحفظ الصفحات محظوران بشكل تام.');
          return false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        applyInstantBlackout();
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('تم اعتراض محاولة التقاط الشاشة.');
      }
    };

    // 4. Apple AirPlay & Remote Playback Enforcement + Bluetooth Audio Output Guard
    const enforceNoAirPlayOnMedia = () => {
      if (typeof document === 'undefined') return;
      const mediaElements = document.querySelectorAll('video, audio, iframe');
      mediaElements.forEach((el: any) => {
        try {
          el.disableRemotePlayback = true;
          el.setAttribute('disableRemotePlayback', 'true');
          el.setAttribute('x-webkit-airplay', 'deny');
          el.setAttribute('webkit-playsinline', 'true');
          el.setAttribute('playsinline', 'true');
          if (el.remote && typeof el.remote.cancelWatchAvailability === 'function') {
            el.remote.cancelWatchAvailability().catch(() => {});
          }
        } catch {}
      });
    };

    const handleAirPlayTarget = (e: any) => {
      if (e.target && e.availability === 'available') {
        e.preventDefault?.();
      }
      if (e.target?.webkitCurrentPlaybackTargetIsWireless) {
        applyInstantBlackout();
        showSecurityWarning('البث اللاسلكي وAirPlay محظوران لمنع تسجيل الصوت.', 6000);
      }
    };

    // 5. Bluetooth & External Audio Output Device Interception (Allow Wired Headphones only)
    const checkAudioOutputRouting = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const bluetoothAudioDevice = devices.find(d => {
            const label = (d.label || '').toLowerCase();
            return (
              (d.kind === 'audiooutput' || (d as any).kind === 'audio') &&
              (label.includes('bluetooth') || label.includes('bth') || label.includes('wireless') || label.includes('airpods') || label.includes('tws') || label.includes('speaker'))
            );
          });

          if (bluetoothAudioDevice) {
            // Mute media elements if Bluetooth or external wireless audio sink is active
            const media = document.querySelectorAll('video, audio');
            media.forEach((m: any) => {
              if (m && !m.muted) {
                m.muted = true;
                m.pause?.();
              }
            });
            showSecurityWarning('⚠️ تنبيه أمني: استخدام أجهزة البلوتوث أو مكبرات الصوت الخارجية محظور. يرجى استخدام سماعات سلكية (Wired Headphones).', 5000);
          }
        }
      } catch (err) {}
    };

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', checkAudioOutputRouting);
    }
    checkAudioOutputRouting();

    document.addEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayTarget, true);
    enforceNoAirPlayOnMedia();

    // 6. Watermark Anti-Tampering DOM Observer
    const watermarkObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node: any) => {
            if (node.nodeType === 1) {
              const isWatermark = 
                node.id === 'dynamic-watermark-overlay' || 
                node.classList?.contains('watermark-shield') ||
                node.classList?.contains('protected-watermark') ||
                node.tagName === 'CANVAS';
              if (isWatermark) {
                applyInstantBlackout();
                showSecurityWarning('تحذير أمني: تم رصد محاولة إزالة العلامة المائية.', 6000);
                window.dispatchEvent(new Event('watermark_tamper_detected'));
              }
            }
          });
        }
      }
    });

    try {
      watermarkObserver.observe(document.body, { childList: true, subtree: true });
    } catch {}

    // 7. Window Blur & Visibility (Snipping Tool & Background Screenshot Interception)
    const isUserEditingOrInteracting = () => {
      if (typeof document === 'undefined') return false;
      const active = document.activeElement;
      if (!active) return false;
      // Allow seamless typing on iPhone/iOS password fields, inputs, textareas, and select elements
      const tagName = active.tagName ? active.tagName.toUpperCase() : '';
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (active as HTMLElement).isContentEditable) {
        return true;
      }
      if (tagName === 'IFRAME' || (active.closest && active.closest('.protected-media'))) {
        return true;
      }
      // Also check if mouse cursor/touch is currently over protected media or active input container
      const hoveredPlayer = document.querySelector('.protected-media:hover, iframe:hover, #player-container:hover, input:focus, textarea:focus');
      if (hoveredPlayer) {
        return true;
      }
      return false;
    };

    const handleWindowBlur = () => {
      // Do NOT trigger blackout when user focuses input/password on iOS or interacts with player
      if (isUserEditingOrInteracting()) {
        return;
      }
      // On mobile/touch devices, focusing inputs / AutoFill sheets momentarily triggers blur events
      if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        setTimeout(() => {
          if (isUserEditingOrInteracting()) return;
          if (typeof document !== 'undefined' && !document.hasFocus() && !document.hidden) {
            applyInstantBlackout();
            setIsBlackedOut(true);
            setWarningMessage('أداة التقاط الشاشة / النافذة غير نشطة (Screen Capture / Snipping Tool Intercepted).');
          }
        }, 150);
        return;
      }

      applyInstantBlackout();
      setIsBlackedOut(true);
      setWarningMessage('أداة التقاط الشاشة / النافذة غير نشطة (Screen Capture / Snipping Tool Intercepted).');
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger instant blackout if cursor leaves browser viewport towards Snipping Tool or OS taskbar
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        applyInstantBlackout();
        setIsBlackedOut(true);
      }
    };

    const handleWindowFocus = () => {
      setTimeout(() => {
        if (!document.hidden && (document.hasFocus?.() || isUserEditingOrInteracting())) {
          setIsBlackedOut(false);
          setWarningMessage(null);
          removeInstantBlackout();
        }
      }, 200);
    };

    // 8. Visibility Change (Detect minimizing or tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        applyInstantBlackout();
        setIsBlackedOut(true);
      } else {
        setTimeout(() => {
          if (!document.hidden && (document.hasFocus?.() || isUserEditingOrInteracting())) {
            setIsBlackedOut(false);
            removeInstantBlackout();
          }
        }, 200);
      }
    };

    // 9. Sub-Millisecond High-Frequency Animation Frame Watchdog (Only when truly hidden or lost focus to external app)
    let rafId: number;
    const checkFocusLoop = () => {
      if (typeof document !== 'undefined') {
        if (document.hidden) {
          applyInstantBlackout();
          setIsBlackedOut(true);
        } else if (!document.hasFocus() && !isUserEditingOrInteracting()) {
          // Verify it's genuinely lost focus and not typing password or clicking video player
          applyInstantBlackout();
          setIsBlackedOut(true);
        }
      }
      rafId = requestAnimationFrame(checkFocusLoop);
    };
    rafId = requestAnimationFrame(checkFocusLoop);

    // 9. Active DevTools Detection & Console Shield
    const devToolsCheck = setInterval(() => {
      const threshold = 180;
      const isOpen = (window.outerWidth - window.innerWidth > threshold) ||
                     (window.outerHeight - window.innerHeight > threshold);
      if (isOpen) {
        applyInstantBlackout();
        setIsBlackedOut(true);
        setWarningMessage('⛔ تم رصد أدوات التطوير DevTools وهي محظورة تماماً.');
        try {
          console.clear();
        } catch {}
      }
    }, 1500);

    // 10. Right-Click Context Menu Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('القائمة الجانبية وأدوات الفحص معطلة.', 2500);
      return false;
    };

    // 7. Drag and Drop Prevention
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

    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });
    window.addEventListener('blur', handleWindowBlur, { passive: true });
    window.addEventListener('focus', handleWindowFocus, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(devToolsCheck);
      try {
        watermarkObserver.disconnect();
      } catch {}
      document.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayTarget, true);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [warningMessage]);

  const modalOverlay = (
    <>
      {/* Global CSS injection for instant hardware blackout and print blockage */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            display: none !important;
            visibility: hidden !important;
          }
        }
        body.mol5asaty-guard-protected {
          background-color: #000000 !important;
        }
        body.mol5asaty-guard-protected > *:not(#screen-protection-curtain):not(#screen-protection-warning) {
          filter: blur(50px) brightness(0) !important;
          opacity: 0 !important;
          pointer-events: none !important;
          user-select: none !important;
          visibility: hidden !important;
        }
        #screen-protection-curtain, #screen-protection-warning {
          filter: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        pre, code, [data-error], [role="alert"], [data-radix-toast-announce], .toaster, .toast, .font-mono, [data-selectable], .selectable-text {
          user-select: text !important;
          -webkit-user-select: text !important;
          pointer-events: auto !important;
        }
      `}} />

      {/* Millisecond Blackout Curtain Portaled directly to body */}
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
            className="bg-zinc-950 border border-emerald-500/30 p-8 rounded-3xl max-w-md text-center shadow-2xl space-y-4 animate-in fade-in duration-75 cursor-default"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <EyeOff className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <span>محتوى أكاديمي محمي (Protected Content)</span>
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed font-sans">
              تم حظر وتجميد الشاشة تلقائياً أثناء التقاط الشاشة، استخدام أداة Snipping Tool، أو مغادرة نافذة التطبيق لحماية المواد الأكاديمية والمحاضرات.
            </p>
            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBlackedOut(false);
                  setWarningMessage(null);
                  removeInstantBlackout();
                }}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-colors cursor-pointer"
              >
                إغلاق التنبيه واستئناف المشاهدة (Esc)
              </button>
              <div className="text-[11px] font-mono text-zinc-400">
                DRM Hardware Protection • Mol5asati Security Flag
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Security Banner Warning Portaled directly to body */}
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

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(modalOverlay, document.body);
}


