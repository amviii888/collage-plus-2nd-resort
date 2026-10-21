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

  const engageVideoShutter = () => {
    if (typeof document === 'undefined') return;
    try {
      const media = document.querySelectorAll('video, audio');
      media.forEach((m: any) => {
        try {
          if (!m.paused) {
            m.setAttribute('data-was-playing', 'true');
            m.pause?.();
          }
          m.muted = true;
          m.classList.add('mol5asaty-shutter-blank');
        } catch {}
      });
    } catch {}
  };

  const releaseVideoShutter = () => {
    if (typeof document === 'undefined') return;
    try {
      const media = document.querySelectorAll('video, audio');
      media.forEach((m: any) => {
        try {
          m.classList.remove('mol5asaty-shutter-blank');
        } catch {}
      });
    } catch {}
  };

  const applyInstantBlackout = () => {
    if (typeof document !== 'undefined') {
      document.body?.classList.add('mol5asaty-guard-protected');
      engageVideoShutter();
    }
  };

  const removeInstantBlackout = () => {
    if (typeof document !== 'undefined') {
      document.body?.classList.remove('mol5asaty-guard-protected');
      releaseVideoShutter();
    }
  };

  const wipeClipboard = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText('').catch(() => {});
      }
    } catch {}
  };

  const showSecurityWarning = (msg: string, blackoutDurationMs = 5000) => {
    applyInstantBlackout();
    engageVideoShutter();
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
    // 1. Native iOS & Android Hardware Protection Bridge (Capacitor / Web2App / Cordova / WKWebView)
    try {
      PrivacyScreen.enable().catch(() => {});
      const cap = (window as any).Capacitor;
      if (cap && cap.Plugins) {
        if (cap.Plugins.PrivacyScreen?.enable) {
          cap.Plugins.PrivacyScreen.enable();
        }
      }
      // Native WebKit bridge for iOS wrappers (Web2IPA, Median, GoNative, Custom WKWebView)
      const webkit = (window as any).webkit;
      if (webkit?.messageHandlers?.privacyScreen?.postMessage) {
        webkit.messageHandlers.privacyScreen.postMessage({ enable: true, blockScreenshots: true });
      }
      // Listen to native iOS bridge events if the wrapper sends screenshot / capture events
      window.addEventListener('screenshot', () => {
        applyInstantBlackout();
        showSecurityWarning('⛔ تنبيه أمني: التقاط الشاشة محظور تماماً على أجهزة آيفون.', 6000);
      });
      window.addEventListener('screenCaptureDidChange', (e: any) => {
        if (e?.detail?.isCaptured) {
          applyInstantBlackout();
          showSecurityWarning('⛔ تم رصد تسجيل أو بث الشاشة. تم حجب المحتوى والصوت.', 8000);
        }
      });
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

    // Intercept Canvas & Media Element captureStream APIs to block browser recording extensions
    if (typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype) {
      try {
        (HTMLCanvasElement.prototype as any).captureStream = function () {
          applyInstantBlackout();
          engageVideoShutter();
          showSecurityWarning('⛔ تم حظر تسجيل إطارات الكانفاس والفيديو بالأدوات البرمجية.', 7000);
          return new MediaStream();
        };
      } catch {}
    }
    if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype) {
      try {
        (HTMLMediaElement.prototype as any).captureStream = function () {
          applyInstantBlackout();
          engageVideoShutter();
          showSecurityWarning('⛔ تم حظر تسجيل وتصدير دفق الفيديو.', 7000);
          return new MediaStream();
        };
      } catch {}
    }

    // Engage Web Keyboard Lock API on desktop browsers to intercept OS screenshot keys
    if (typeof navigator !== 'undefined' && (navigator as any).keyboard?.lock) {
      try {
        (navigator as any).keyboard.lock(['PrintScreen']).catch(() => {});
      } catch {}
    }

    let lastMetaKeyTime = 0;

    // 3. Ultra-Fast Synchronous Keyboard Event Capture for Screenshots & Recordings
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code || '';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isMeta = e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight' || (e as any).windowsKey;

      if (isMeta) {
        lastMetaKeyTime = Date.now();
      }

      // Allow dismissing warning with Escape
      if (e.key === 'Escape') {
        setIsBlackedOut(false);
        setWarningMessage(null);
        removeInstantBlackout();
        return;
      }

      // 1. Dedicated Hardware PrintScreen / PrtScn / Snipping Key Capture (Banned completely in all combos)
      const isPrtScn = e.key === 'PrintScreen' || 
                       e.keyCode === 44 || 
                       e.code === 'PrintScreen' || 
                       e.key === 'Snapshot' ||
                       key === 'printscreen' ||
                       key === 'snapshot';

      if (isPrtScn || (e.altKey && isPrtScn) || (e.ctrlKey && isPrtScn) || (e.shiftKey && isPrtScn) || (e.metaKey && isPrtScn)) {
        applyInstantBlackout();
        engageVideoShutter();
        wipeClipboard();
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        showSecurityWarning('⛔ زر التقاط الشاشة (PrintScreen / Snipping) محظور ومعطل تماماً لحماية المواد الأكاديمية.', 6000);
        return false;
      }

      // 2. Windows & Mac Screen Snipping & Recording Combos (Exhaustive Detection)
      const isShiftS = e.shiftKey && (key === 's' || key === 'س' || code === 'KeyS');
      const isWinOrMeta = e.metaKey || (e as any).windowsKey || (Date.now() - lastMetaKeyTime < 2000);

      // Win + Shift + S (Windows Snipping Tool)
      const isWinShiftS = (isWinOrMeta || isCmdOrCtrl) && isShiftS;

      // Win + S (Windows Search / Screen Capture Hotkey)
      const isWinS = isWinOrMeta && (key === 's' || key === 'س' || code === 'KeyS') && !isUserEditingOrInteracting();

      // Win + Alt + R (Windows Game Bar / Xbox Screen Recording)
      const isWinAltR = (isWinOrMeta || e.metaKey) && e.altKey && (key === 'r' || key === 'ق' || code === 'KeyR');

      // Win + G (Windows Game Bar Overlay)
      const isWinGameBar = isWinOrMeta && (key === 'g' || key === 'ل' || code === 'KeyG');

      // Edge & Browser Web Capture: Ctrl + Shift + S
      const isBrowserCapture = isCmdOrCtrl && isShiftS;

      // Third-Party Screen Capture Hotkeys (Lightshot, ShareX, Greenshot, Screenpresso, WeChat)
      // Alt + A, Ctrl + Alt + A, Ctrl + Alt + S, Ctrl + Shift + X (Opera Snapshot)
      const isLightshot = e.altKey && (key === 'a' || key === 'ش' || code === 'KeyA') && !isUserEditingOrInteracting();
      const isGreenshot = isCmdOrCtrl && e.altKey && (key === 's' || key === 'س' || code === 'KeyS');
      const isOperaSnapshot = isCmdOrCtrl && e.shiftKey && (key === 'x' || key === 'ء' || code === 'KeyX');

      // macOS Screen Capture Combos: Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5, Cmd + Shift + 6, Cmd + Option + 5
      const isMacNumberCapture = (e.metaKey || isWinOrMeta) && e.shiftKey && ['3', '4', '5', '6', '#', '$', '%', '^'].includes(key);
      const isMacOptionCapture = e.metaKey && e.altKey && (key === '5' || key === '%');
      const isMacCapture = isMacNumberCapture || isMacOptionCapture || ((e.metaKey || isWinOrMeta) && isShiftS);

      // Suspicious Shift + S without an active typing cursor
      const isSuspiciousShiftS = isShiftS && !isUserEditingOrInteracting();

      if (
        isWinShiftS ||
        isWinS ||
        isWinAltR ||
        isWinGameBar ||
        isBrowserCapture ||
        isLightshot ||
        isGreenshot ||
        isOperaSnapshot ||
        isMacCapture ||
        isSuspiciousShiftS
      ) {
        applyInstantBlackout();
        engageVideoShutter();
        wipeClipboard();
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        showSecurityWarning('⛔ تم حظر واعتراض أداة التقاط وتسجيل الشاشة (Snipping Tool / Screen Recording). المحتوى محمي.', 6000);
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
        engageVideoShutter();
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
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
          engageVideoShutter();
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          showSecurityWarning('الطباعة وحفظ الصفحات محظوران بشكل تام.');
          return false;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code || '';
      if (e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight' || (e as any).windowsKey) {
        lastMetaKeyTime = Date.now();
      }
      const isPrtScn = e.key === 'PrintScreen' || 
                       e.keyCode === 44 || 
                       e.code === 'PrintScreen' || 
                       e.key === 'Snapshot' ||
                       key === 'printscreen';

      const isShiftS = e.shiftKey && (key === 's' || key === 'س' || code === 'KeyS');
      const isWinOrMeta = e.metaKey || (e as any).windowsKey || (Date.now() - lastMetaKeyTime < 2000);

      if (isPrtScn || (isWinOrMeta && isShiftS) || (isWinOrMeta && (key === 's' || key === 'س' || code === 'KeyS') && !isUserEditingOrInteracting())) {
        applyInstantBlackout();
        engageVideoShutter();
        wipeClipboard();
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
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

    // 5. Virtual Audio Loopback & External Audio Output Device Interception (Blocks screen recorders capturing audio)
    const checkAudioOutputRouting = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          
          // Check for virtual audio recording devices (OBS, Stereo Mix, VB-Cable, BlackHole, VoiceMeeter)
          const virtualRecordingDevice = devices.find(d => {
            const label = (d.label || '').toLowerCase();
            return (
              label.includes('stereo mix') ||
              label.includes('virtual audio') ||
              label.includes('virtual cable') ||
              label.includes('obs audio') ||
              label.includes('obs virtual') ||
              label.includes('blackhole') ||
              label.includes('vb-audio') ||
              label.includes('voicemeeter') ||
              label.includes('soundflower') ||
              label.includes('screencapture') ||
              label.includes('screen recorder') ||
              label.includes('cable input') ||
              label.includes('loopback') ||
              label.includes('camo audio')
            );
          });

          if (virtualRecordingDevice) {
            engageVideoShutter();
            applyInstantBlackout();
            showSecurityWarning('⛔ تم رصد برامج التقاط الصوت الافتراضية (Virtual Audio / Recording Loopback). تم كتم وإيقاف المحتوى.', 7000);
            return;
          }

          const bluetoothAudioDevice = devices.find(d => {
            const label = (d.label || '').toLowerCase();
            return (
              (d.kind === 'audiooutput' || (d as any).kind === 'audio') &&
              (label.includes('bluetooth') || label.includes('bth') || label.includes('wireless') || label.includes('airpods') || label.includes('tws') || label.includes('speaker'))
            );
          });

          if (bluetoothAudioDevice) {
            engageVideoShutter();
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
    let lastInputInteractionTimestamp = 0;
    const isMobileDevice = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    );

    const markInputActive = () => {
      lastInputInteractionTimestamp = Date.now();
      // Ensure any blackout is immediately dismissed if user is typing or focusing an input
      removeInstantBlackout();
      setIsBlackedOut(false);
      setWarningMessage(null);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        markInputActive();
      }
    };

    const isUserEditingOrInteracting = () => {
      if (typeof document === 'undefined') return false;
      // If user recently tapped or focused an input in the last 4 seconds, ignore blur/focus loss
      if (Date.now() - lastInputInteractionTimestamp < 4000) {
        return true;
      }
      const active = document.activeElement;
      if (active) {
        const tagName = active.tagName ? active.tagName.toUpperCase() : '';
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (active as HTMLElement).isContentEditable) {
          return true;
        }
        if (tagName === 'IFRAME' || (active.closest && active.closest('.protected-media'))) {
          return true;
        }
      }
      // Also check if any input or password field in document is currently focused
      const focusedInput = document.querySelector('input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus');
      if (focusedInput) {
        return true;
      }
      // Also check if cursor/touch is over protected media
      const hoveredPlayer = document.querySelector('.protected-media:hover, iframe:hover, #player-container:hover');
      if (hoveredPlayer) {
        return true;
      }
      return false;
    };

    const handleWindowBlur = () => {
      // 1. Immediately engage video playback shutter (auto-pause, mute, and blank video frame)
      engageVideoShutter();

      // Check if user is actively editing text inputs or typing
      if (isUserEditingOrInteracting()) {
        return;
      }

      // Check if focus is strictly inside a video iframe/player control
      if (typeof document !== 'undefined') {
        const active = document.activeElement;
        if (
          active && 
          (active.tagName === 'IFRAME' || 
           active.tagName === 'VIDEO' || 
           active.closest?.('.protected-media') || 
           active.closest?.('#player-container'))
        ) {
          return;
        }
      }

      // 2. Immediate zero-latency blackout for Snipping Tool (Win+Shift+S), OBS, Game Bar, or tab switch
      applyInstantBlackout();
      wipeClipboard();
      setIsBlackedOut(true);
      showSecurityWarning('⛔ تم تجميد وحجب الشاشة لحماية المواد الأكاديمية (Snipping / Focus Guard).', 5000);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // Mouse movement outside viewport does not trigger blackout so video controls remain smooth
    };

    const handleWindowFocus = () => {
      setTimeout(() => {
        if (!document.hidden && document.hasFocus?.()) {
          releaseVideoShutter();
          if (!isUserEditingOrInteracting()) {
            setIsBlackedOut(false);
            setWarningMessage(null);
            removeInstantBlackout();
          }
        }
      }, 150);
    };

    // 8. Visibility Change (Detect minimizing, tab switching, or iOS Control Center)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        engageVideoShutter();
        applyInstantBlackout();
        wipeClipboard();
        setIsBlackedOut(true);
      } else {
        setTimeout(() => {
          if (!document.hidden && (document.hasFocus?.() || isUserEditingOrInteracting())) {
            releaseVideoShutter();
            setIsBlackedOut(false);
            removeInstantBlackout();
          }
        }, 150);
      }
    };

    // Mobile touch gestures (3-finger / 4-finger screenshot gestures)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 3) {
        applyInstantBlackout();
        engageVideoShutter();
        showSecurityWarning('⛔ تم حظر إيماءة التقاط الشاشة على الجهاز.', 4000);
      }
    };

    // 9. Focus Watchdog (Detect backgrounding and external screen recorders stealing focus)
    let focusCheckInterval: NodeJS.Timeout | null = null;
    focusCheckInterval = setInterval(() => {
      if (typeof document !== 'undefined') {
        if (document.hidden) {
          engageVideoShutter();
          applyInstantBlackout();
          setIsBlackedOut(true);
        } else if (!document.hasFocus() && !isUserEditingOrInteracting()) {
          engageVideoShutter();
          applyInstantBlackout();
          setIsBlackedOut(true);
        }
      }
    }, 1000);

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
    }, 2000);

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

    // 11. Clipboard Copy, Cut & SelectStart Interception (Strict web & iOS lockdown)
    const isNextJsDevError = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      return !!(
        el.closest?.('nextjs-portal, [data-nextjs-dialog], [data-nextjs-toast], #nextjs__container_errors__, [data-nextjs-error-feedback], .nextjs-container-errors-body') ||
        el.tagName === 'NEXTJS-PORTAL' ||
        el.id === 'nextjs__container_errors__'
      );
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (isNextJsDevError(target)) {
        return; // Whitelist developer copying webpack/turbopack build and runtime errors
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      try {
        if (e.clipboardData) {
          e.clipboardData.clearData();
        }
      } catch (err) {}
      showSecurityWarning('⛔ نسخ المحتوى محظور ومحمي بسياسة الأمان الأكاديمية.', 3000);
      return false;
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (isNextJsDevError(target)) {
        return; // Allow selecting error text
      }
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return; // Allow typing in forms
      }
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });
    window.addEventListener('blur', handleWindowBlur, { passive: true });
    window.addEventListener('focus', handleWindowFocus, { passive: true });
    document.addEventListener('focusin', handleFocusIn, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopyCut, { capture: true, passive: false });
    document.addEventListener('cut', handleCopyCut, { capture: true, passive: false });
    document.addEventListener('selectstart', handleSelectStart, { capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      if (focusCheckInterval !== null) {
        clearInterval(focusCheckInterval);
      }
      clearInterval(devToolsCheck);
      try {
        watermarkObserver.disconnect();
      } catch {}
      document.removeEventListener('webkitplaybacktargetavailabilitychanged', handleAirPlayTarget, true);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopyCut, { capture: true });
      document.removeEventListener('cut', handleCopyCut, { capture: true });
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  const modalOverlay = (
    <>
      {/* Global CSS injection for instant hardware blackout, video blanking, and print blockage */}
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
        body.mol5asaty-guard-protected video,
        body.mol5asaty-guard-protected audio,
        video.mol5asaty-shutter-blank,
        audio.mol5asaty-shutter-blank {
          filter: brightness(0) !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        #screen-protection-curtain, #screen-protection-warning {
          filter: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        nextjs-portal, nextjs-portal *, [data-nextjs-dialog], [data-nextjs-dialog] *, [data-nextjs-toast], [data-nextjs-toast] *, #nextjs__container_errors__, #nextjs__container_errors__ *, [data-nextjs-error-feedback], [data-nextjs-error-feedback] *, .nextjs-container-errors-body, .nextjs-container-errors-body * {
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


