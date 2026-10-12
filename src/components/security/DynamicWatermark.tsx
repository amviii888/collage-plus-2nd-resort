'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStudent, useUser } from '@/firebase';
import type { DynamicWatermarkConfig } from '@/lib/watermark-types';
import { DEFAULT_WATERMARK_CONFIG } from '@/lib/watermark-types';
import { ShieldAlert, Lock, AlertTriangle, EyeOff } from 'lucide-react';

interface DynamicWatermarkProps {
  studentId?: string;
  teacherId?: string;
  config?: Partial<DynamicWatermarkConfig>;
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
  previewStudent,
}: DynamicWatermarkProps) {
  const { user } = useUser();
  const effectiveStudentId = studentId || user?.uid;
  const { student } = useStudent(effectiveStudentId || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Security status states
  const [isTampered, setIsTampered] = useState(false);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);

  // Load teacher's saved config from localStorage / teacher profile
  const [teacherConfig, setTeacherConfig] = useState<DynamicWatermarkConfig>(DEFAULT_WATERMARK_CONFIG);

  useEffect(() => {
    if (overrideConfig) {
      setTeacherConfig({ ...DEFAULT_WATERMARK_CONFIG, ...overrideConfig });
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
  }, [teacherId, overrideConfig]);

  const cfg = useMemo(() => ({
    ...DEFAULT_WATERMARK_CONFIG,
    ...teacherConfig,
    ...overrideConfig,
  }), [teacherConfig, overrideConfig]);

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
  const studentName = previewStudent?.name || student?.name || localCachedStudent?.name || 'طالب الأكاديمية';
  const studentPhone = previewStudent?.phone || (student as any)?.phoneNumber || (student as any)?.phone || localCachedStudent?.phoneNumber || '01012345678';
  const studentCode = previewStudent?.barcode || student?.barcodeId || localCachedStudent?.barcodeId || effectiveStudentId || 'STD-2026-88';

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
    if (cfg.movementType !== 'wandering') return;

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
  }, [cfg.movementType, cfg.movementSpeed]);

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
  const speakWatermarkAudio = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();

      const uniPhrase = cfg.showUniversity && studentUniversity ? `، ${studentUniversity}` : '';
      const arabicPhrase = `تنبيه أمني. محتوى مرخص للطالب ${studentName}، كود الطالب ${studentCode}، هاتف ${studentPhone}${uniPhrase}.`;
      const utterance = new SpeechSynthesisUtterance(arabicPhrase);
      
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
      utterance.volume = 0.95;

      // Auto-detect matching Arabic voice if available on system
      const voices = window.speechSynthesis.getVoices();
      const arVoices = voices.filter(v => v.lang.startsWith('ar') || v.name.toLowerCase().includes('arabic') || v.lang.includes('ar-EG') || v.lang.includes('ar-SA'));
      
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

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS watermark speak notice:', e);
    }
  }, [studentName, studentCode, studentPhone, studentUniversity, cfg.showUniversity, cfg.ttsVoice]);

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

  // Automatic TTS execution (initial test delay + recurring interval)
  useEffect(() => {
    if (!cfg.ttsEnabled || !cfg.ttsIntervalMinutes || cfg.ttsIntervalMinutes <= 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Initial automatic test playback (15 seconds after opening video)
    const initialDelaySec = cfg.ttsInitialTestDelaySeconds !== undefined ? cfg.ttsInitialTestDelaySeconds : 15;
    let initialTimer: NodeJS.Timeout | null = null;
    
    if (initialDelaySec > 0) {
      initialTimer = setTimeout(() => {
        speakWatermarkAudio();
      }, initialDelaySec * 1000);
    }

    // Recurring interval (Every 5 min, 15 min, 30 min, or 60 min)
    const intervalMs = cfg.ttsIntervalMinutes * 60 * 1000;
    const interval = setInterval(speakWatermarkAudio, intervalMs);

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cfg.ttsEnabled, cfg.ttsIntervalMinutes, cfg.ttsInitialTestDelaySeconds, speakWatermarkAudio]);

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

    // C. DevTools Window Resize / Split detection
    const checkDevTools = () => {
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

    // Match canvas dimensions to container
    const width = (canvas.width = canvas.parentElement?.clientWidth || 640);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 360);

    ctx.clearRect(0, 0, width, height);

    // Draw light repeating diagonal security text
    ctx.save();
    ctx.rotate((-20 * Math.PI) / 180);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';

    const uniStamp = cfg.showUniversity && studentUniversity ? ` • ${studentUniversity}` : '';
    const stampText = `[SECURED] ${studentName} • ${studentCode} • ${studentPhone}${uniStamp}`;
    const stepX = 260;
    const stepY = 80;

    for (let x = -width; x < width * 2; x += stepX) {
      for (let y = -height; y < height * 2; y += stepY) {
        ctx.fillText(stampText, x, y);
      }
    }
    ctx.restore();
  }, [studentName, studentCode, studentPhone, studentUniversity, cfg.showUniversity]);

  if (!cfg.enabled) return null;

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

  // Border styling
  let borderCss = 'none';
  let boxShadowCss = 'none';
  if (cfg.borderStyle === 'thin') {
    borderCss = `1px solid ${cfg.borderColor || 'rgba(34, 197, 94, 0.4)'}`;
  } else if (cfg.borderStyle === 'glow') {
    borderCss = `1.5px solid ${cfg.textColor || '#22c55e'}`;
    boxShadowCss = `0 0 15px ${cfg.textColor || '#22c55e'}55`;
  }

  // Active opacity (handles flicker)
  const currentOpacity = isFlickering ? 0.95 : cfg.opacity;

  return (
    <>
      {/* 1. HTML5 Canvas Security Stamp (Raster layer rendered directly on screen) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none select-none z-20 w-full h-full"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      />

      {/* 2. Primary Dynamic Watermark Badge */}
      <div
        ref={containerRef}
        id="dynamic-watermark-protected-badge"
        className="pointer-events-none select-none z-40 transition-opacity duration-300"
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
          className="px-3.5 py-2 rounded-2xl backdrop-blur-xs font-mono font-bold uppercase tracking-wider text-right shadow-2xl flex flex-col gap-1"
          style={{
            backgroundColor: cfg.bgColor || 'rgba(0, 0, 0, 0.65)',
            color: cfg.textColor || '#22c55e',
            fontSize: `${cfg.size || 14}px`,
            border: borderCss,
            boxShadow: boxShadowCss,
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
            minWidth: '160px',
          }}
        >
          {cfg.showName && (
            <div className="font-extrabold flex items-center justify-between gap-2">
              <span className="opacity-95 text-white">{studentName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-sans border border-emerald-500/30">
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

        <style jsx>{`
          @keyframes dynamicWatermarkFloat {
            0%, 100% {
              transform: translateY(0px) scale(0.96);
            }
            50% {
              transform: translateY(-20px) scale(1.06);
            }
          }
        `}</style>
      </div>

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
}
