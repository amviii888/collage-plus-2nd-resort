'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStudent, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { DynamicWatermarkConfig } from '@/lib/watermark-types';
import { DEFAULT_WATERMARK_CONFIG } from '@/lib/watermark-types';
import { ShieldAlert, Lock, AlertTriangle, EyeOff, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePathname } from 'next/navigation';

interface DynamicWatermarkProps {
  studentId?: string;
  teacherId?: string;
  config?: Partial<DynamicWatermarkConfig>;
  forceCanvasStamp?: boolean;
  enableQrStamp?: boolean;
  enableAudioTts?: boolean;
  enableVisualWatermark?: boolean;
  // Mock data for preview mode in teacher settings
  previewStudent?: {
    name?: string;
    phone?: string;
    barcode?: string;
    university?: string;
  };
}

export function DynamicWatermark({
  studentId,
  teacherId,
  config: overrideConfig,
  forceCanvasStamp,
  enableQrStamp,
  enableAudioTts,
  enableVisualWatermark,
  previewStudent,
}: DynamicWatermarkProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const effectiveStudentId = studentId || user?.uid;
  const { student } = useStudent(effectiveStudentId || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isPublicRoute = !pathname || pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/student-login') || pathname.startsWith('/assistant-login') || pathname.startsWith('/parent-login') || pathname.startsWith('/signup') || pathname.startsWith('/teacher-signup') || pathname.startsWith('/student-signup') || pathname.startsWith('/signup-options') || pathname.startsWith('/forgot-password') || pathname.startsWith('/admin') || pathname.startsWith('/terms') || pathname.startsWith('/privacy') || pathname.startsWith('/support') || pathname.startsWith('/delete-account') || pathname.startsWith('/download-ios') || pathname.startsWith('/copyright');

  const hasStudentSession = Boolean(
    (user && !user.isAnonymous && user.uid) ||
    studentId ||
    previewStudent ||
    (typeof window !== 'undefined' && localStorage.getItem('viewingStudentId'))
  );

  // Security status states
  const [isTampered, setIsTampered] = useState(false);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);
  const [fullscreenEl, setFullscreenEl] = useState<Element | null>(null);

  // Fullscreen top-layer portal detection to force watermark on top of full-screen players
  useEffect(() => {
    const checkFs = () => {
      if (typeof document !== 'undefined') {
        const activeFs = document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement;
        setFullscreenEl(activeFs || null);
      }
    };
    checkFs();
    document.addEventListener('fullscreenchange', checkFs);
    document.addEventListener('webkitfullscreenchange', checkFs);
    document.addEventListener('mozfullscreenchange', checkFs);
    return () => {
      document.removeEventListener('fullscreenchange', checkFs);
      document.removeEventListener('webkitfullscreenchange', checkFs);
      document.removeEventListener('mozfullscreenchange', checkFs);
    };
  }, []);

  const firestore = useFirestore();
  const teacherDocRef = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return doc(firestore, 'teachers', teacherId);
  }, [firestore, teacherId]);
  const { data: cloudTeacher } = useDoc<any>(teacherDocRef);

  // Load teacher's saved config from props, Firestore, or localStorage
  const [teacherConfig, setTeacherConfig] = useState<DynamicWatermarkConfig>(DEFAULT_WATERMARK_CONFIG);

  useEffect(() => {
    if (overrideConfig && Object.keys(overrideConfig).length > 0) {
      setTeacherConfig({ ...DEFAULT_WATERMARK_CONFIG, ...overrideConfig });
      return;
    }

    if (cloudTeacher?.watermarkConfig) {
      setTeacherConfig({ ...DEFAULT_WATERMARK_CONFIG, ...cloudTeacher.watermarkConfig });
      if (typeof window !== 'undefined' && teacherId) {
        try {
          localStorage.setItem(`prof_watermark_${teacherId}`, JSON.stringify(cloudTeacher.watermarkConfig));
        } catch (e) {}
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const activeProfTheme = localStorage.getItem('app_active_global_theme');
      const teacherKey = teacherId ? `prof_watermark_${teacherId}` : null;
      const cached = (teacherKey && localStorage.getItem(teacherKey)) ||
                     (activeProfTheme && localStorage.getItem(`watermark_${activeProfTheme}`)) ||
                     localStorage.getItem('app_active_watermark_config');

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setTeacherConfig({ ...DEFAULT_WATERMARK_CONFIG, ...parsed });
        } catch (e) {}
      }
    }
  }, [teacherId, overrideConfig, cloudTeacher]);

  const cfg = useMemo(() => {
    const base = {
      ...DEFAULT_WATERMARK_CONFIG,
      ...teacherConfig,
      ...(cloudTeacher?.watermarkConfig || {}),
      ...(overrideConfig || {}),
    };
    if (enableQrStamp === false) {
      base.showQrStamp = false;
    }
    if (enableAudioTts === false) {
      base.ttsEnabled = false;
    }
    if (enableVisualWatermark === false) {
      base.enabled = false;
    }
    return base;
  }, [teacherConfig, cloudTeacher, overrideConfig, enableQrStamp, enableAudioTts, enableVisualWatermark]);

  // Cached student profile fallback (for instant zero-latency rendering & offline support)
  const localCachedStudent = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const idToSearch = effectiveStudentId || localStorage.getItem('viewingStudentId');
      if (idToSearch) {
        const raw = localStorage.getItem('cached_student_profile_' + idToSearch);
        if (raw) return JSON.parse(raw);
      }
      const rawGeneric = localStorage.getItem('student_profile') || localStorage.getItem('student_user_profile');
      if (rawGeneric) return JSON.parse(rawGeneric);
    } catch (e) {}
    return null;
  }, [effectiveStudentId]);

  // Display fields - strictly fetched from the watching student's profile, NOT the teacher
  const studentName = previewStudent?.name || 
                      student?.name || 
                      localCachedStudent?.name || 
                      (typeof window !== 'undefined' ? (
                        localStorage.getItem('student_name') || 
                        localStorage.getItem('studentName') || 
                        (JSON.parse(localStorage.getItem('mol5saty_active_student_profile') || '{}')?.name)
                      ) : '') ||
                      user?.displayName ||
                      user?.email?.split('@')[0] || 
                      'Registered Student';

  const studentPhone = useMemo(() => {
    if (previewStudent?.phone) return previewStudent.phone;
    if (typeof window !== 'undefined') {
      const verifiedDirect = localStorage.getItem('verified_student_phone');
      if (verifiedDirect) return verifiedDirect;
      if (effectiveStudentId) {
        const studentSpecific = localStorage.getItem('student_phone_' + effectiveStudentId);
        if (studentSpecific) return studentSpecific;
      }
    }
    if (student?.phoneNumber) return student.phoneNumber;
    if ((student as any)?.phone) return (student as any).phone;
    if (localCachedStudent?.phoneNumber) return localCachedStudent.phoneNumber;
    if (localCachedStudent?.phone) return localCachedStudent.phone;
    if (typeof window !== 'undefined') {
      try {
        const mol5satyProfile = JSON.parse(localStorage.getItem('mol5saty_active_student_profile') || '{}');
        if (mol5satyProfile?.phoneNumber) return mol5satyProfile.phoneNumber;
        if (mol5satyProfile?.phone) return mol5satyProfile.phone;
        const studentProfile = JSON.parse(localStorage.getItem('student_profile') || '{}');
        if (studentProfile?.phoneNumber) return studentProfile.phoneNumber;
        if (studentProfile?.phone) return studentProfile.phone;
      } catch (e) {}
      const directPhone = localStorage.getItem('student_phone') || 
                          localStorage.getItem('studentPhoneNumber') || 
                          localStorage.getItem('last_entered_phone');
      if (directPhone) return directPhone;
    }
    return '';
  }, [previewStudent, student, localCachedStudent, effectiveStudentId]);

  const studentCode = previewStudent?.barcode || 
                      student?.barcodeId || 
                      localCachedStudent?.barcodeId || 
                      (typeof window !== 'undefined' ? (
                        localStorage.getItem('student_barcode') || 
                        localStorage.getItem('studentBarcode') || 
                        localStorage.getItem('studentCode')
                      ) : '') ||
                      (user?.email?.includes('@universe.student') ? user.email.split('@')[0] : (user?.uid ? user.uid.slice(0, 8).toUpperCase() : 'MOL5SATY_PASS'));

  // University dynamically retrieved from student profile
  const studentUniversity = useMemo(() => {
    if (previewStudent?.university) return previewStudent.university;
    if (student?.university && student.university.trim() !== '') return student.university.trim();
    if ((student as any)?.facultyLabel && (student as any).facultyLabel.trim() !== '') return (student as any).facultyLabel.trim();
    if (student?.schoolName && student.schoolName.trim() !== '') return student.schoolName.trim();
    if (localCachedStudent?.university && localCachedStudent.university.trim() !== '') return localCachedStudent.university.trim();
    if (localCachedStudent?.facultyLabel && localCachedStudent.facultyLabel.trim() !== '') return localCachedStudent.facultyLabel.trim();
    if (localCachedStudent?.schoolName && localCachedStudent.schoolName.trim() !== '') return localCachedStudent.schoolName.trim();
    return '';
  }, [previewStudent, student, localCachedStudent]);

  // State for positions & animations
  const [cornerIndex, setCornerIndex] = useState(0);
  const [isFlickering, setIsFlickering] = useState(false);
  const [wanderPos, setWanderPos] = useState({ x: 20, y: 20 });
  const wanderRef = useRef({ x: 20, y: 20, vx: 0.35, vy: 0.28 });

  // ----------------------------------------------------
  // 1. DVD Wandering Bouncing Logic
  // ----------------------------------------------------
  useEffect(() => {
    if (!cfg.enabled || isPublicRoute || cfg.movementType !== 'wandering') return;

    let animId: number;
    let lastTime = performance.now();

    // Speed multiplier: slow = 0.5x, normal = 1.0x, fast = 2.0x, ultra_fast = 3.2x
    const speedMultiplier = cfg.movementSpeed === 'slow' ? 0.5 :
                            cfg.movementSpeed === 'fast' ? 2.0 :
                            cfg.movementSpeed === 'ultra_fast' ? 3.2 : 1.0;

    const baseVx = 0.35 * speedMultiplier;
    const baseVy = 0.28 * speedMultiplier;
    wanderRef.current.vx = (wanderRef.current.vx >= 0 ? 1 : -1) * baseVx;
    wanderRef.current.vy = (wanderRef.current.vy >= 0 ? 1 : -1) * baseVy;

    const updateBounce = (time: number) => {
      const delta = Math.min((time - lastTime) / 16.6, 2.5);
      lastTime = time;

      const state = wanderRef.current;
      state.x += state.vx * delta;
      state.y += state.vy * delta;

      // Bounce off boundaries (5% to 70% to prevent clipping)
      if (state.x <= 4) {
        state.x = 4;
        state.vx = Math.abs(state.vx);
      } else if (state.x >= 68) {
        state.x = 68;
        state.vx = -Math.abs(state.vx);
      }

      if (state.y <= 4) {
        state.y = 4;
        state.vy = Math.abs(state.vy);
      } else if (state.y >= 75) {
        state.y = 75;
        state.vy = -Math.abs(state.vy);
      }

      setWanderPos({ x: state.x, y: state.y });
      animId = requestAnimationFrame(updateBounce);
    };

    animId = requestAnimationFrame(updateBounce);
    return () => cancelAnimationFrame(animId);
  }, [cfg.enabled, isPublicRoute, cfg.movementType, cfg.movementSpeed]);

  // ----------------------------------------------------
  // 2. Corner Cycling Logic
  // ----------------------------------------------------
  useEffect(() => {
    if (cfg.movementType !== 'corner_cycle') return;
    const cornerMs = cfg.movementSpeed === 'slow' ? 14000 :
                     cfg.movementSpeed === 'fast' ? 4000 :
                     cfg.movementSpeed === 'ultra_fast' ? 2000 : 8000;
    const interval = setInterval(() => {
      setCornerIndex(prev => (prev + 1) % 5);
    }, cornerMs);
    return () => clearInterval(interval);
  }, [cfg.movementType, cfg.movementSpeed]);

  // ----------------------------------------------------
  // 3. Flickering Effect (stealth flash every X seconds)
  // ----------------------------------------------------
  useEffect(() => {
    if (!cfg.flickerEnabled) return;
    const sec = Math.max(15, cfg.flickerIntervalSeconds || 40) * 1000;

    const interval = setInterval(() => {
      setIsFlickering(true);
      setTimeout(() => {
        setIsFlickering(false);
      }, 2500);
    }, sec);

    return () => clearInterval(interval);
  }, [cfg.flickerEnabled, cfg.flickerIntervalSeconds]);

  // ----------------------------------------------------
  // 4. Text-To-Speech (Audio Watermark - 100% Free Web Speech API)
  // ----------------------------------------------------
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasSpokenAutoStartRef = useRef(false);
  const audioUnlockedRef = useRef(false);

  const isTtsAllowed = useMemo(() => {
    return cfg.ttsEnabled !== false && enableAudioTts !== false;
  }, [cfg.ttsEnabled, enableAudioTts]);

  const speakWatermarkAudio = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (!isTtsAllowed) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
      activeUtteranceRef.current = null;
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const uniPhrase = cfg.showUniversity && studentUniversity ? `، ${studentUniversity}` : '';
      const arabicPhrase = `تنبيه أمني. محتوى مرخص للطالب ${studentName}، كود الطالب ${studentCode}، هاتف ${studentPhone}${uniPhrase}.`;
      const utterance = new SpeechSynthesisUtterance(arabicPhrase);
      activeUtteranceRef.current = utterance; // Prevent WebKit garbage collection cutoff
      
      // Select voice personality: female, male, or child
      const voiceStyle = cfg.ttsVoice || 'female';
      let pitch = 1.12;
      let rate = 0.94;

      if (voiceStyle === 'child') {
        pitch = 1.68; // child playful high pitch
        rate = 1.05;  // youthful tempo
      } else if (voiceStyle === 'male') {
        pitch = 0.72; // deep masculine pitch
        rate = 0.88;  // authoritative measured pace
      } else {
        // female
        pitch = 1.15;
        rate = 0.94;
      }

      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = 1.0;
      utterance.lang = 'ar-SA';

      utterance.onend = () => {
        activeUtteranceRef.current = null;
      };
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis notice:', e);
        activeUtteranceRef.current = null;
      };

      const applyVoiceAndSpeak = () => {
        try {
          if (!isTtsAllowed) {
            window.speechSynthesis.cancel();
            activeUtteranceRef.current = null;
            return;
          }
          const voices = window.speechSynthesis.getVoices() || [];
          const arVoices = voices.filter(v => 
            v.lang?.toLowerCase().startsWith('ar') || 
            v.name?.toLowerCase().includes('arabic') || 
            v.lang?.includes('ar-EG') || 
            v.lang?.includes('ar-SA') ||
            v.lang?.includes('ar')
          );
          
          if (arVoices.length > 0) {
            if (voiceStyle === 'male') {
              const maleAr = arVoices.find(v => 
                v.name.toLowerCase().includes('male') || 
                v.name.toLowerCase().includes('maged') || 
                v.name.toLowerCase().includes('tarik') ||
                v.name.toLowerCase().includes('shakir')
              );
              utterance.voice = maleAr || arVoices[0];
            } else if (voiceStyle === 'female') {
              const femaleAr = arVoices.find(v => 
                v.name.toLowerCase().includes('female') || 
                v.name.toLowerCase().includes('salma') || 
                v.name.toLowerCase().includes('hoda') || 
                v.name.toLowerCase().includes('laila')
              );
              utterance.voice = femaleAr || arVoices[0];
            } else {
              utterance.voice = arVoices[0];
            }
          }

          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
          // iOS Safari bugfix: ensure resume is kicked after speak call
          setTimeout(() => {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }, 100);
        } catch (err) {
          console.warn('Error during speak dispatch:', err);
        }
      };

      const initialVoices = window.speechSynthesis.getVoices();
      if (!initialVoices || initialVoices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          applyVoiceAndSpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
            applyVoiceAndSpeak();
          }
        }, 250);
      } else {
        applyVoiceAndSpeak();
      }
    } catch (e) {
      console.warn('TTS watermark speak notice:', e);
    }
  }, [studentName, studentCode, studentPhone, studentUniversity, cfg.showUniversity, cfg.ttsVoice, isTtsAllowed]);

  // Event listener for manual / test trigger from UI
  useEffect(() => {
    const handleManualTTS = () => {
      speakWatermarkAudio();
    };
    window.addEventListener('trigger_watermark_tts_test', handleManualTTS);
    return () => {
      window.removeEventListener('trigger_watermark_tts_test', handleManualTTS);
    };
  }, [speakWatermarkAudio]);

  // Reset spoken state & cancel speech when enableAudioTts or cfg.ttsEnabled becomes false or video changes
  useEffect(() => {
    hasSpokenAutoStartRef.current = false;
    if (!isTtsAllowed && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      activeUtteranceRef.current = null;
    }
  }, [isTtsAllowed]);

  // Unlock audio context on mobile user gesture (touchstart, pointerdown, click)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const handleUserInteraction = () => {
      if (!audioUnlockedRef.current) {
        audioUnlockedRef.current = true;
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // If TTS is enabled and auto-start hasn't fired yet, trigger it now!
        if (isTtsAllowed && !hasSpokenAutoStartRef.current) {
          hasSpokenAutoStartRef.current = true;
          setTimeout(() => {
            speakWatermarkAudio();
          }, 400);
        }
      }
    };

    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
    };
  }, [isTtsAllowed, speakWatermarkAudio]);

  // A. Auto-Start: Speaks shortly after starting the course video
  useEffect(() => {
    if (!isTtsAllowed) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const delayMs = Math.max(1, (cfg.ttsInitialTestDelaySeconds ?? 3)) * 1000;
    const autoStartTimer = setTimeout(() => {
      if (!hasSpokenAutoStartRef.current) {
        hasSpokenAutoStartRef.current = true;
        speakWatermarkAudio();
      }
    }, delayMs);

    return () => clearTimeout(autoStartTimer);
  }, [isTtsAllowed, cfg.ttsInitialTestDelaySeconds, speakWatermarkAudio]);

  // B. Recurring Interval: Repeats based on the dropdown choice (5, 10, 15, 30, 60 minutes)
  useEffect(() => {
    if (!isTtsAllowed) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const intervalMinutes = Number(cfg.ttsIntervalMinutes) > 0 ? Number(cfg.ttsIntervalMinutes) : 15;
    const intervalMs = intervalMinutes * 60 * 1000;

    const interval = setInterval(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      speakWatermarkAudio();
    }, intervalMs);

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isTtsAllowed, cfg.ttsIntervalMinutes, speakWatermarkAudio]);

  // C. Immediate Cancel: stops any ongoing TTS audio speech instantly when TTS is disabled
  useEffect(() => {
    if (!isTtsAllowed && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      activeUtteranceRef.current = null;
    }
  }, [isTtsAllowed]);

  // ----------------------------------------------------
  // 5. Anti-Inspect & DevTools Lock (Block F12, Shortcuts, ContextMenu)
  // ----------------------------------------------------
  useEffect(() => {
    if (previewStudent) return; // Don't block teacher settings studio
    if (!cfg.antiTamperShieldEnabled) return;

    // A. Disable ContextMenu / Right-Click on Protected Video
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // B. Block DevTools Shortcuts (F12, Ctrl+Shift+I/J/C, Cmd+Option+I/J/C, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          Boolean(target.closest?.('input, textarea, select, [contenteditable="true"]')))
      ) {
        return; // Never intercept when user is typing in form fields or passwords
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // F12 and F2 keys
      if (e.key === 'F12' || e.keyCode === 123 || e.key === 'F2' || e.keyCode === 113) {
        e.preventDefault();
        e.stopPropagation();
        setIsTampered(true);
        return false;
      }

      // Ctrl/Cmd + Shift + I (Inspect) or J (Console) or C (Inspect Element)
      if (isCmdOrCtrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        setIsTampered(true);
        return false;
      }

      // Ctrl/Cmd + U (View Source)
      if (isCmdOrCtrl && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Mac Option+Cmd+I / J / C
      if (e.altKey && e.metaKey && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        setIsTampered(true);
        return false;
      }
    };

    // C. DevTools Window Resize / Split detection (Desktop only, ignores mobile virtual keyboards)
    const checkDevTools = () => {
      const isMobileOrTouch = typeof window !== 'undefined' && (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)
      );
      if (isMobileOrTouch) {
        setIsDevToolsDetected(false);
        return;
      }

      const activeTag = document.activeElement?.tagName?.toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        setIsDevToolsDetected(false);
        return;
      }

      if (typeof window !== 'undefined' && window.visualViewport && window.visualViewport.height < window.innerHeight - 80) {
        setIsDevToolsDetected(false);
        return;
      }

      const threshold = 170;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        setIsDevToolsDetected(true);
      } else {
        setIsDevToolsDetected(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('resize', checkDevTools);
    document.addEventListener('contextmenu', handleContextMenu);

    const devToolsInterval = setInterval(checkDevTools, 2000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('resize', checkDevTools);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(devToolsInterval);
    };
  }, [cfg.antiTamperShieldEnabled, previewStudent]);

  // ----------------------------------------------------
  // 6. MutationObserver Watchdog (Instant Tamper Detection & Self-Healing)
  // ----------------------------------------------------
  useEffect(() => {
    if (previewStudent) return; // Don't activate self-healing in preview mode
    if (!cfg.antiTamperShieldEnabled) return;
    if (!containerRef.current) return;

    const targetNode = containerRef.current;
    const parentNode = targetNode.parentElement;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Detect removal of watermark node
        if (mutation.type === 'childList') {
          for (const removed of Array.from(mutation.removedNodes)) {
            if (removed === targetNode) {
              setIsTampered(true);
              if (parentNode) {
                parentNode.appendChild(targetNode);
              }
            }
          }
        }

        // Detect style tampering (display: none, opacity: 0, visibility: hidden, etc.)
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const style = window.getComputedStyle(targetNode);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            parseFloat(style.opacity || '1') <= 0.05
          ) {
            setIsTampered(true);
            targetNode.style.display = 'block';
            targetNode.style.visibility = 'visible';
            targetNode.style.opacity = '1';
          }
        }
      }
    });

    observer.observe(targetNode, {
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });

    if (parentNode) {
      observer.observe(parentNode, {
        childList: true,
      });
    }

    return () => observer.disconnect();
  }, [cfg.antiTamperShieldEnabled, previewStudent]);

  // ----------------------------------------------------
  // 7. Dual-Layer HTML5 Canvas Security Stamp (Direct raster rendering)
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderCanvasStamp = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 640;
      const height = parent?.clientHeight || 360;

      // Hi-DPI crisp rendering
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Setup font and style for watermark stamp: crisp, clean typography with high visibility
      ctx.font = 'bold 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';

      const studentDisplayName = studentName || 'طالب مصرح (Verified Student)';
      const studentDisplayCode = studentCode || 'ID-SECURED';
      const studentDisplayPhone = studentPhone || '01XXXXXXXXX';
      const uniStamp = cfg.showUniversity && studentUniversity ? ` • ${studentUniversity}` : '';
      const stampText = `[SECURED] ${studentDisplayName} • ${studentDisplayCode} • ${studentDisplayPhone}${uniStamp}`;

      // Dynamically measure exact text width so words NEVER overlap or collide
      const textMetrics = ctx.measureText(stampText);
      const textWidth = Math.ceil(textMetrics.width);

      // Clean, generous spacing: wide horizontal and vertical gaps guarantee no overlapping or mushy text
      const stepX = Math.max(textWidth + 180, 420);
      const stepY = 190;

      // Rotate canvas diagonally
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-20 * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      const boundExtent = Math.max(width, height) * 2;
      let rowIndex = 0;

      for (let y = -boundExtent; y < boundExtent * 2; y += stepY) {
        // Stagger every other row for an aesthetic, non-colliding diamond pattern
        const rowOffset = (rowIndex % 2 === 0) ? 0 : stepX / 2;
        for (let x = -boundExtent; x < boundExtent * 2; x += stepX) {
          ctx.fillText(stampText, x + rowOffset, y);
        }
        rowIndex++;
      }

      ctx.restore();
    };

    renderCanvasStamp();

    // Re-render on container resize & fullscreen changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        renderCanvasStamp();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    const handleWindowResize = () => renderCanvasStamp();
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('fullscreenchange', handleWindowResize);
    document.addEventListener('webkitfullscreenchange', handleWindowResize);

    // Continuously keep canvas stamp updated so it never fades or clears out
    const renderInterval = setInterval(() => {
      renderCanvasStamp();
    }, 1200);

    return () => {
      clearInterval(renderInterval);
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('fullscreenchange', handleWindowResize);
      document.removeEventListener('webkitfullscreenchange', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [studentName, studentCode, studentPhone, studentUniversity, cfg.showUniversity, fullscreenEl]);

  const isVideoOrCourseView = Boolean(
    previewStudent ||
    forceCanvasStamp ||
    pathname?.includes('/courses') ||
    pathname?.includes('/watch') ||
    pathname?.includes('/lesson') ||
    fullscreenEl
  );

  // Strictly block rendering ONLY on public landing/auth pages, BUT NEVER during video/course playback!
  if (!isVideoOrCourseView && (!cfg.enabled || isPublicRoute)) return null;

  // Compute Coordinates / Classes based on movement type
  let positionStyle: React.CSSProperties = {};

  if (cfg.movementType === 'wandering') {
    positionStyle = {
      position: 'absolute',
      left: `${wanderPos.x}%`,
      top: `${wanderPos.y}%`,
      transition: 'none',
    };
  } else if (cfg.movementType === 'corner_cycle') {
    const corners = [
      { top: '6%', left: '4%' },
      { top: '6%', right: '4%' },
      { bottom: '12%', left: '4%' },
      { bottom: '12%', right: '4%' },
      { top: '45%', left: '40%' },
    ];
    positionStyle = {
      position: 'absolute',
      ...corners[cornerIndex],
      transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  } else if (cfg.movementType === 'floating_pulse') {
    positionStyle = {
      position: 'absolute',
      top: '40%',
      left: '30%',
      animation: 'dynamicWatermarkFloat 6s ease-in-out infinite',
    };
  } else {
    // Fixed or custom
    if (cfg.fixedPosition === 'center') {
      positionStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    } else if (cfg.fixedPosition === 'top-left') {
      positionStyle = { position: 'absolute', top: '6%', left: '4%' };
    } else if (cfg.fixedPosition === 'top-right') {
      positionStyle = { position: 'absolute', top: '6%', right: '4%' };
    } else if (cfg.fixedPosition === 'bottom-left') {
      positionStyle = { position: 'absolute', bottom: '12%', left: '4%' };
    } else if (cfg.fixedPosition === 'bottom-right') {
      positionStyle = { position: 'absolute', bottom: '12%', right: '4%' };
    } else if (cfg.fixedPosition === 'custom') {
      positionStyle = {
        position: 'absolute',
        left: `${cfg.customX ?? 20}%`,
        top: `${cfg.customY ?? 20}%`,
      };
    }
  }

  // Moving Dynamic Badge Frame & Border styling
  const activeFrameShape = cfg.frameShape || cfg.borderStyle || 'thin';
  const activeFrameColor = cfg.frameColor || cfg.borderColor || cfg.textColor || '#22c55e';

  let borderCss = 'none';
  let boxShadowCss = 'none';
  let borderRadiusCss = '1rem';

  if (activeFrameShape === 'none') {
    borderCss = 'none';
    boxShadowCss = 'none';
  } else if (activeFrameShape === 'thin') {
    borderCss = `1.5px solid ${activeFrameColor}`;
    boxShadowCss = `0 4px 15px rgba(0, 0, 0, 0.6)`;
  } else if (activeFrameShape === 'glow') {
    borderCss = `1.5px solid ${activeFrameColor}`;
    boxShadowCss = `0 0 20px ${activeFrameColor}77, 0 8px 30px rgba(0, 0, 0, 0.8)`;
  } else if (activeFrameShape === 'rounded_card') {
    borderCss = `2px solid ${activeFrameColor}`;
    borderRadiusCss = '1.25rem';
    boxShadowCss = `0 10px 30px rgba(0, 0, 0, 0.9), 0 0 15px ${activeFrameColor}44`;
  } else if (activeFrameShape === 'thick') {
    borderCss = `3px solid ${activeFrameColor}`;
    boxShadowCss = `0 0 16px rgba(0,0,0,0.9)`;
  }

  // Active opacity for moving badge (minimum 0.75 in course view so it is never invisible)
  const currentOpacity = isFlickering ? 0.98 : Math.max(0.75, cfg.opacity || 0.75);

  // Diagonal Parallel Text Watermark Customization
  const textStampOpacity = cfg.textStampOpacity ?? 0.40;
  const stampPhone = cfg.stampShowPhone ?? true; // Mandatory default: phone number
  const stampName = cfg.stampShowName ?? true;
  const stampCode = cfg.stampShowStudentCode ?? true;
  const stampUni = cfg.stampShowUniversity ?? false;

  const isVisualEnabled = cfg.enabled !== false && enableVisualWatermark !== false;
  const isQrEnabled = cfg.showQrStamp !== false && enableQrStamp !== false;

  const stampContentParts: string[] = [];
  if (stampName) stampContentParts.push(studentName || 'طالب مصرح');
  if (stampCode) stampContentParts.push(`ID: ${studentCode || 'ID-VERIFIED'}`);
  if (stampPhone) stampContentParts.push(studentPhone || '01XXXXXXXXX');
  if (stampUni && studentUniversity) stampContentParts.push(studentUniversity);

  const formattedStampText = `[SECURED] ${stampContentParts.length > 0 ? stampContentParts.join(' • ') : (studentPhone || '01XXXXXXXXX')}`;

  const watermarkNodes = (
    <>
      {/* 1. Permanent HTML/SVG Parallel Lines Security Stamp Overlay (Only if Visual Watermark is enabled) */}
      {isVideoOrCourseView && isVisualEnabled && (
        <div 
          className="absolute inset-0 pointer-events-none select-none z-30 w-full h-full overflow-hidden"
          style={{ userSelect: 'none', WebkitUserSelect: 'none', pointerEvents: 'none', opacity: textStampOpacity }}
        >
          <svg className="w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="parallel-text-watermark-pattern"
                width="480"
                height="190"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-20)"
              >
                <text
                  x="20"
                  y="60"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="monospace"
                  opacity="0.9"
                  style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)' }}
                >
                  {formattedStampText}
                </text>
                <text
                  x="260"
                  y="155"
                  fill={activeFrameColor}
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="monospace"
                  opacity="0.9"
                  style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)' }}
                >
                  {formattedStampText}
                </text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#parallel-text-watermark-pattern)" />
          </svg>
        </div>
      )}

      {/* 2. HTML5 Canvas Security Stamp (Raster layer rendered directly on screen) - Only if Visual Watermark is enabled */}
      {isVideoOrCourseView && isVisualEnabled && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none select-none z-35 w-full h-full"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        />
      )}

      {/* 3. Primary Dynamic Watermark Badge (Only if Visual Watermark is enabled) */}
      {isVisualEnabled && (
        <div
          ref={containerRef}
          id="dynamic-watermark-protected-badge"
          className="pointer-events-none select-none z-50 transition-opacity duration-300"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            ...positionStyle,
            opacity: currentOpacity,
            transform: `${positionStyle.transform || ''} scale(${cfg.scale || 1.0})`,
            transformOrigin: 'center center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <div
            className="px-3.5 py-2 backdrop-blur-md font-mono font-bold uppercase tracking-wider text-right shadow-2xl flex flex-col gap-1 transition-all"
            style={{
              backgroundColor: cfg.bgColor || 'rgba(10, 15, 20, 0.88)',
              color: cfg.textColor || '#22c55e',
              fontSize: `${Math.max(12, cfg.size || 14)}px`,
              border: borderCss,
              borderRadius: borderRadiusCss,
              boxShadow: boxShadowCss,
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
              minWidth: '160px',
            }}
          >
            {cfg.showName && (
              <div className="font-extrabold flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                <span className="opacity-95 text-white">{studentName || 'Student'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-sans border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[0.85em] opacity-90">
              {cfg.showStudentCode && (
                <span className="text-amber-400/90 font-mono font-bold">
                  ID: {studentCode}
                </span>
              )}
              {cfg.showPhone && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-zinc-200/90 font-mono">{studentPhone}</span>
                </>
              )}
            </div>

            {cfg.showUniversity && studentUniversity && (
              <div className="text-[0.75em] text-zinc-300/80 font-sans truncate">
                {studentUniversity}
              </div>
            )}

            {cfg.customText && (
              <div className="text-[0.75em] text-blue-400 font-sans truncate">
                {cfg.customText}
              </div>
            )}
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes dynamicWatermarkFloat {
              0%, 100% {
                transform: translateY(0px) scale(0.96);
              }
              50% {
                transform: translateY(-20px) scale(1.06);
              }
            }
          `}} />
        </div>
      )}

      {/* High-Res QR Code Pass Stamp Overlay (Only if QR Stamp is enabled) */}
      {isQrEnabled && studentCode && (
        <div 
          className={`absolute z-30 pointer-events-none select-none p-2.5 rounded-2xl bg-black/85 border border-emerald-500/40 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-in fade-in duration-300 ${
            cfg.qrPosition === 'top-right' ? 'top-4 right-4' :
            cfg.qrPosition === 'top-left' ? 'top-4 left-4' :
            cfg.qrPosition === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'
          }`}
          style={{ opacity: cfg.opacity ? Math.max(0.65, cfg.opacity) : 0.85 }}
        >
          <div className="bg-white p-1 rounded-xl shadow-inner">
            <QRCodeSVG value={studentCode} size={cfg.qrSize || 44} level="H" />
          </div>
          <div className="text-right font-mono leading-tight">
            <div className="text-[9px] text-emerald-400 font-extrabold tracking-wider uppercase flex items-center justify-end gap-1">
              <QrCode className="w-2.5 h-2.5 inline" />
              <span>{cfg.qrPassTitle || 'SECURE DIGITAL PASS'}</span>
            </div>
            <div className="text-[11px] text-white font-bold max-w-[130px] truncate">{studentName}</div>
            <div className="text-[9px] text-zinc-400 font-mono">{studentCode}</div>
          </div>
        </div>
      )}

      {/* 3. Anti-Tamper & DevTools Shield Lockout (Activates if DevTools / DOM deletion detected) */}
      {(isTampered || isDevToolsDetected) && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl text-white p-6 select-none"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="max-w-md p-6 rounded-3xl bg-zinc-950 border border-red-500/40 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-red-400 flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                <span>حماية المحتوى: تم رصد محاولة فحص أو إزالة العلامة المائية</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                يُمنع منعاً باتاً فتح أدوات الفحص (Inspect Element / DevTools) أو التلاعب بالعلامة المائية الرقمية. تم حظر العرض وحماية الفيديو فوراً.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-[11px] text-red-300 font-mono">
              TAMPER_INTERCEPT: DevTools / Node Mutation Detected
            </div>

            <button
              type="button"
              onClick={() => {
                setIsTampered(false);
                setIsDevToolsDetected(false);
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all shadow-md"
            >
              إغلاق أدوات الفحص واستئناف المشاهدة
            </button>
          </div>
        </div>
      )}
    </>
  );

  // If a top-level fullscreen element is active (e.g. video player went full screen), portal directly into it
  if (fullscreenEl && typeof document !== 'undefined') {
    const targetNode = (fullscreenEl.tagName === 'IFRAME' || fullscreenEl.tagName === 'VIDEO') && fullscreenEl.parentElement 
      ? fullscreenEl.parentElement 
      : fullscreenEl;

    // If the targetNode already contains our containerRef, we are already naturally rendered inside the fullscreen container
    if (containerRef.current && targetNode.contains(containerRef.current)) {
      return watermarkNodes;
    }

    return createPortal(
      <div className="absolute inset-0 z-[2147483647] pointer-events-none w-full h-full overflow-hidden">
        {watermarkNodes}
      </div>,
      targetNode
    );
  }

  return watermarkNodes;
}
