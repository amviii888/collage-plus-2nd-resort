'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY_PROCESSED = 'universe_processed_notification_ids';

export function NotificationListener() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Track processed notification IDs persistently across page navigation and refreshes
  const processedRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);
  const listenerStartTimeRef = useRef<number>(Date.now());

  // Helper to load processed IDs from localStorage
  const loadProcessedIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROCESSED);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('[NotificationListener] Could not parse stored notification IDs:', e);
    }
    return new Set();
  };

  // Helper to save processed IDs to localStorage (keep last 100)
  const saveProcessedIds = (set: Set<string>) => {
    try {
      const array = Array.from(set).slice(-100);
      localStorage.setItem(STORAGE_KEY_PROCESSED, JSON.stringify(array));
    } catch (e) {
      // Ignore storage quota errors
    }
  };

  // Helper to clean phone numbers for accurate matching across formats (e.g. +2010... vs 010...)
  const cleanPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
  };

  // Helper to normalize barcodes/codes
  const cleanCode = (code: string): string => {
    if (!code) return '';
    return code.trim().toLowerCase();
  };

  // Pleasant audio chime synthesizer
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      // Ignore audio context autoplay restrictions
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
    // Load previously processed notification IDs on mount
    processedRef.current = loadProcessedIds();
    listenerStartTimeRef.current = Date.now();
    isInitialLoadRef.current = true;
  }, []);

  useEffect(() => {
    if (!firestore) return;

    const notificationsRef = collection(firestore, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 1. Gather all local identity & role markers on this device
      const knownStudentCodes = new Set<string>();
      const knownParentCodes = new Set<string>();
      const knownParentPhones = new Set<string>();
      let rawTeacherId = '';
      let rawAdminSession = '';
      let hasDebt = false;

      try {
        // Direct local storage markers for student identity
        const studentKeys = [
          'studentBarcode',
          'studentBarcodeId',
          'studentCode',
          'userBarcode',
          'barcodeId',
          'viewingStudentId',
        ];
        for (const k of studentKeys) {
          const val = localStorage.getItem(k);
          if (val) {
            knownStudentCodes.add(cleanCode(val));
          }
        }

        // Direct local storage markers for parent identity
        const parentPhoneKeys = ['parentPhoneNumber', 'parent_phone', 'parentPhone'];
        for (const k of parentPhoneKeys) {
          const val = localStorage.getItem(k);
          if (val) knownParentPhones.add(cleanPhone(val));
        }

        const parentCodeKeys = ['parentForStudentBarcode', 'parent_student_code', 'parentStudentCode'];
        for (const k of parentCodeKeys) {
          const val = localStorage.getItem(k);
          if (val) knownParentCodes.add(cleanCode(val));
        }

        // Deep-scan localStorage keys for cached profiles
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.startsWith('cached_student_profile_') || key.startsWith('student_profile_offline_')) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.barcodeId) knownStudentCodes.add(cleanCode(parsed.barcodeId));
                if (parsed.id) knownStudentCodes.add(cleanCode(parsed.id));
                if (parsed.phone) knownStudentCodes.add(cleanPhone(parsed.phone));
                if (parsed.parentPhone) knownParentPhones.add(cleanPhone(parsed.parentPhone));
                if (parsed.parentPhoneNumber) knownParentPhones.add(cleanPhone(parsed.parentPhoneNumber));
                if (parsed.remaining > 0 || parsed.debtStatus > 0 || parsed.isInDebt) hasDebt = true;
              }
            } catch (e) {}
          }
        }

        rawTeacherId = localStorage.getItem('teacherId') || localStorage.getItem('assistantForTeacherId') || localStorage.getItem('teacher-profile') || '';
        rawAdminSession = localStorage.getItem('admin-session') || '';

        const syncData = localStorage.getItem('studentSyncData');
        if (syncData) {
          try {
            const parsed = JSON.parse(syncData);
            if (parsed.barcodeId) knownStudentCodes.add(cleanCode(parsed.barcodeId));
            if (parsed.remaining > 0 || parsed.debtStatus > 0 || parsed.isInDebt) hasDebt = true;
          } catch (e) {}
        }
      } catch (e) {
        console.error('[NotificationListener] Error reading localStorage session values:', e);
      }

      // Check URL and auth hints
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const userEmail = user?.email || '';
      const userUid = user?.uid || '';

      if (userUid) {
        knownStudentCodes.add(cleanCode(userUid));
      }

      // Infer roles with precision
      const isStudentEmail = userEmail.endsWith('@universe.student');
      if (isStudentEmail) {
        const studentEmailBarcode = cleanCode(userEmail.split('@')[0]);
        if (studentEmailBarcode) knownStudentCodes.add(studentEmailBarcode);
      }

      const isStudentSession = Boolean(knownStudentCodes.size > 0 || isStudentEmail || currentPath.startsWith('/profile') || currentPath.startsWith('/student'));
      const isParentSession = Boolean(knownParentPhones.size > 0 || knownParentCodes.size > 0 || currentPath.startsWith('/parent'));
      const isTeacherSession = Boolean(rawTeacherId || currentPath.startsWith('/teacher'));
      const isAdminSession = Boolean(rawAdminSession || userEmail === 'bodylion2009@gmail.com' || userEmail === '6108almoamviii8chef@gmail.com' || currentPath.startsWith('/admin'));

      const isFirstSnap = isInitialLoadRef.current;
      const subStartTime = listenerStartTimeRef.current;
      const nowMs = Date.now();

      snapshot.docs.forEach((doc) => {
        const notif = doc.data();
        const notifId = doc.id;

        // Skip if already processed and shown on this device
        if (processedRef.current.has(notifId)) return;

        // Determine if notification is recent
        const createdAtTime = notif.createdAt ? new Date(notif.createdAt).getTime() : 0;
        
        // Discard notifications older than 24 hours
        if (createdAtTime > 0 && nowMs - createdAtTime > 24 * 60 * 60 * 1000) {
          processedRef.current.add(notifId);
          return;
        }

        // 2. Extract notification target properties
        const targetAudience = notif.targetAudience || (notif.isBroadcast || notif.targetUserId === 'all' ? 'all' : '');
        const notifTargetStudentBarcode = cleanCode(notif.targetStudentBarcode || notif.targetStudentId || '');
        const notifTargetStudentId = cleanCode(notif.targetStudentId || '');
        const notifTargetParentPhone = cleanPhone(notif.targetParentPhone || '');
        const notifTargetStudentPhone = cleanPhone(notif.targetStudentPhone || '');
        const notifTargetUserId = (notif.targetUserId || '').trim();
        const notifType = notif.type || '';

        // For general broadcast to all, if it was created more than 3 minutes before subscription, silently process
        if (isFirstSnap && (targetAudience === 'all' || notif.isBroadcast === true || notifTargetUserId === 'all')) {
          if (createdAtTime > 0 && createdAtTime < subStartTime - 180000) {
            processedRef.current.add(notifId);
            return;
          }
        }

        let isTarget = false;

        // CASE 1: SPECIFIC STUDENT / PARENT ATTENDANCE OR DIRECT CODE TARGET
        if (notifType === 'attendance' || targetAudience === 'attendance_targeted' || (notifTargetStudentBarcode && targetAudience !== 'all')) {
          // Check if this device is the student
          const matchesStudent = Boolean(
            (notifTargetStudentBarcode && knownStudentCodes.has(notifTargetStudentBarcode)) ||
            (notifTargetStudentId && knownStudentCodes.has(notifTargetStudentId)) ||
            (notifTargetStudentPhone && knownStudentCodes.has(notifTargetStudentPhone)) ||
            (notifTargetUserId && knownStudentCodes.has(cleanCode(notifTargetUserId))) ||
            (userUid && notifTargetStudentBarcode && userUid.toLowerCase() === notifTargetStudentBarcode) ||
            (userUid && notifTargetUserId && userUid === notifTargetUserId)
          );

          // Check if this device is the parent of the student
          const matchesParent = Boolean(
            (notifTargetStudentBarcode && knownParentCodes.has(notifTargetStudentBarcode)) ||
            (notifTargetStudentId && knownParentCodes.has(notifTargetStudentId)) ||
            (notifTargetParentPhone && knownParentPhones.has(notifTargetParentPhone))
          );

          if (matchesStudent || matchesParent) {
            isTarget = true;
          }
        }
        // CASE 2: TARGET STUDENTS ONLY
        else if (targetAudience === 'students') {
          if (isStudentSession || isAdminSession) {
            isTarget = true;
          }
        }
        // CASE 3: TARGET PARENTS ONLY
        else if (targetAudience === 'parents') {
          if (isParentSession || isAdminSession) {
            isTarget = true;
          }
        }
        // CASE 4: TARGET TEACHERS ONLY
        else if (targetAudience === 'teachers') {
          if (isTeacherSession || isAdminSession) {
            isTarget = true;
          }
        }
        // CASE 5: TARGET CLEARANCE / DEBT ONLY
        else if (targetAudience === 'clearance') {
          if (hasDebt || isAdminSession) {
            isTarget = true;
          }
        }
        // CASE 6: TARGET SALES & OFFERS
        else if (targetAudience === 'sales') {
          if (isStudentSession || isParentSession || isAdminSession) {
            isTarget = true;
          }
        }
        // CASE 7: BROADCAST TO ALL UNIVERSE ACADEMY
        else if (targetAudience === 'all' || notif.isBroadcast === true || notifTargetUserId === 'all') {
          isTarget = true;
        }
        // CASE 8: DIRECT USER ID
        else if (notifTargetUserId && userUid && notifTargetUserId === userUid) {
          isTarget = true;
        }

        // If this device is the intended recipient, trigger alert and OS notification!
        if (isTarget) {
          processedRef.current.add(notifId);
          saveProcessedIds(processedRef.current);

          // Play sound chime
          playChime();

          // Trigger System OS Notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const notifOptions = {
              body: notif.body || '',
              icon: notif.icon || '/icon.png',
              badge: '/icon.png',
              tag: notifId,
              vibrate: [200, 100, 200, 100, 200],
              renotify: true,
              data: {
                url: notif.url || '/',
              },
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(notif.title || 'Universe Academy', notifOptions);
              }).catch(() => {
                try {
                  new Notification(notif.title || 'Universe Academy', notifOptions);
                } catch (e) {}
              });
            } else {
              try {
                new Notification(notif.title || 'Universe Academy', notifOptions);
              } catch (e) {}
            }
          }

          // Trigger In-App Visual Toast Alert
          toast({
            title: `🔔 ${notif.title || 'Universe Academy'}`,
            description: notif.body || '',
          });
        }
      });

      // Save processed IDs after snapshot pass
      saveProcessedIds(processedRef.current);
      isInitialLoadRef.current = false;

    }, (error) => {
      console.warn('[NotificationListener] Snapshot state notification:', error?.message || error);
    });

    return () => unsubscribe();
  }, [firestore, user, toast]);

  return null;
}
