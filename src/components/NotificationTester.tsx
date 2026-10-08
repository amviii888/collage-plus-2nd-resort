'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, CheckCircle2, AlertTriangle, Send, Volume2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationTesterProps {
  isArabic?: boolean;
}

export function NotificationTester({ isArabic = false }: NotificationTesterProps) {
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<string>('default');
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(isArabic ? 'تنبيه أكاديمية يونيفرس' : 'Universe Academy Alert');
  const [message, setMessage] = useState(
    isArabic
      ? 'تم تسجيل حضورك بنجاح! تم إضافة كويز جديد في مادة الفيزياء.'
      : 'Your attendance is marked! A new Physics quiz is available.'
  );
  const [selectedPreset, setSelectedPreset] = useState<string>('exam');
  const [isSending, setIsSending] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const playNotificationChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: isArabic ? 'غير مدعوم' : 'Not Supported',
        description: isArabic ? 'المتصفح لا يدعم إشعارات النظام.' : 'This browser does not support system notifications.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        toast({
          title: isArabic ? 'تم تفعيل الإشعارات بنجاح! ✅' : 'Notifications Enabled! ✅',
          description: isArabic ? 'أنت الآن جاهز لاستقبال إشعارات النظام.' : 'You are now ready to receive system notifications.',
        });
        return true;
      } else {
        toast({
          title: isArabic ? 'تم رفض الإذن' : 'Permission Denied',
          description: isArabic ? 'يرجى تفعيل الإشعارات من إعدادات المتصفح/الهاتف.' : 'Please allow notifications in your phone/browser settings.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  };

  const triggerSystemNotification = async (customTitle?: string, customBody?: string) => {
    setIsSending(true);
    const notifTitle = customTitle || title;
    const notifBody = customBody || message;

    // 1. Play sound chime
    playNotificationChime();

    // 2. Check and request permission if needed
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsSending(false);
          return;
        }
      }
    }

    let triggeredSuccessfully = false;

    // 3. Trigger via Service Worker (Recommended for Mobile/APK system bar)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(notifTitle, {
            body: notifBody,
            icon: '/icon.png',
            badge: '/icon.png',
            vibrate: [200, 100, 200, 100, 200],
            tag: 'universe-test-' + Date.now(),
            renotify: true,
            data: {
              url: window.location.href,
            },
          });
          triggeredSuccessfully = true;
        }

        // Also postMessage to SW as redundancy
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TRIGGER_NOTIFICATION',
            title: notifTitle,
            body: notifBody,
            url: window.location.href,
          });
        }
      } catch (swErr) {
        console.warn('Service worker notification failed, trying standard API:', swErr);
      }
    }

    // 4. Fallback to standard Notification API
    if (!triggeredSuccessfully && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notifTitle, {
          body: notifBody,
          icon: '/icon.png',
        });
        triggeredSuccessfully = true;
      } catch (notifErr) {
        console.error('Standard notification failed:', notifErr);
      }
    }

    // 5. In-app toast feedback
    toast({
      title: `🔔 ${notifTitle}`,
      description: notifBody,
    });

    setLastSentTime(new Date().toLocaleTimeString());
    setIsSending(false);
  };

  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey === 'exam') {
      setTitle(isArabic ? '📅 موعد الامتحان القادم' : '📅 Upcoming Exam Alert');
      setMessage(isArabic ? 'تذكير: امتحان الفيزياء غداً الساعة ٩:٠٠ صباحاً في القاعة الرئيسية.' : 'Reminder: Physics Exam is tomorrow at 9:00 AM in Main Hall.');
    } else if (presetKey === 'grade') {
      setTitle(isArabic ? '⭐ تم رصد درجة جديدة' : '⭐ New Grade Posted');
      setMessage(isArabic ? 'أحسنت! حصلت على ٩٨/١٠٠ في اختبار الرياضيات الأخير.' : 'Great job! You scored 98/100 on your latest Mathematics test.');
    } else if (presetKey === 'attendance') {
      setTitle(isArabic ? '✅ تم تسجيل الحضور' : '✅ Attendance Confirmed');
      setMessage(isArabic ? 'تم تسجيل حضور الطالب بنجاح للحصة اليوم.' : 'Student attendance has been verified for today’s session.');
    } else if (presetKey === 'custom') {
      setTitle(isArabic ? '📢 إشعار خاص من الإدارة' : '📢 Custom Academy Notice');
      setMessage(isArabic ? 'اكتب رسالتك المخصصة هنا وسوف تظهر مباشرة في شريط إشعارات هاتفك...' : 'Type your custom text here to see it live in your phone status bar...');
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto my-6 p-4 sm:p-6 rounded-3xl bg-[#1D1D20]/90 border-2 border-[#A8E063]/30 backdrop-blur-xl shadow-2xl shadow-[#A8E063]/10 text-left" id="notification-system-tester">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#A8E063]/20 border border-[#A8E063]/40 flex items-center justify-center text-[#A8E063] shadow-lg shadow-[#A8E063]/20">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#F8F7F4] flex items-center gap-2">
              <span>{isArabic ? 'أداة اختبار إشعارات الهاتف والنظام' : 'System & Phone Notification Tester'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#A8E063]/20 text-[#A8E063] border border-[#A8E063]/30">
                LIVE_ENGINE
              </span>
            </h3>
            <p className="text-xs text-[#F8F7F4]/60">
              {isArabic 
                ? 'اختبر ظهور الإشعار في شريط الإشعارات العلوي لهاتفك مع الصوت والاهتزاز'
                : 'Test real OS notifications in your phone’s status bar with sound & vibration'}
            </p>
          </div>
        </div>

        {/* Permission Status Pill */}
        <div className="flex items-center gap-2">
          {permissionState === 'granted' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'الإشعارات مفعلة' : 'System Allowed'}</span>
            </div>
          ) : permissionState === 'denied' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isArabic ? 'مرفوضة في المتصفح' : 'Permission Blocked'}</span>
            </div>
          ) : (
            <button
              onClick={requestPermission}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFD54F]/20 border border-[#FFD54F]/50 text-[#FFD54F] hover:bg-[#FFD54F] hover:text-[#111113] text-xs font-bold transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isArabic ? 'اضغط لتفعيل الإذن' : 'Grant Permission'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Selectors */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-[#F8F7F4]/50 font-mono">
          {isArabic ? 'قوالب جاهزة:' : 'Presets:'}
        </span>
        {[
          { id: 'exam', label: isArabic ? '📅 موعد امتحان' : '📅 Exam Alert' },
          { id: 'grade', label: isArabic ? '⭐ رصد درجات' : '⭐ Grade Alert' },
          { id: 'attendance', label: isArabic ? '✅ تأكيد حضور' : '✅ Attendance' },
          { id: 'custom', label: isArabic ? '✍️ نص مخصص' : '✍️ Custom Text' },
        ].map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedPreset === preset.id
                ? 'bg-[#A8E063] text-[#111113] font-bold shadow-md shadow-[#A8E063]/20'
                : 'bg-white/5 text-[#F8F7F4]/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Interactive Title & Body Form */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-mono text-[#F8F7F4]/70 mb-1">
            {isArabic ? 'عنوان الإشعار (Notification Title):' : 'Notification Title:'}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-[#F8F7F4] focus:outline-none focus:border-[#A8E063] transition-colors"
            placeholder={isArabic ? 'اكتب عنوان الإشعار...' : 'Enter notification title...'}
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-[#F8F7F4]/70 mb-1">
            {isArabic ? 'محتوى الرسالة (Notification Body):' : 'Notification Message / Body:'}
          </label>
          <textarea
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-[#F8F7F4] focus:outline-none focus:border-[#A8E063] transition-colors resize-none"
            placeholder={isArabic ? 'اكتب محتوى الإشعار...' : 'Enter message body...'}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-[#F8F7F4]/50 font-mono">
          <Volume2 className="w-3.5 h-3.5 text-[#FFD54F]" />
          <span>{isArabic ? 'مصحوب بنغمة صوت واهتزاز' : 'Includes chime sound & vibration'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSystemNotification()}
            disabled={isSending}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#A8E063] to-[#8fd447] text-[#111113] font-black text-sm flex items-center gap-2 shadow-lg shadow-[#A8E063]/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            id="trigger-live-notification-btn"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSending
                ? (isArabic ? 'جاري الإرسال...' : 'Sending...')
                : (isArabic ? '🔔 إرسال إشعار فوري لهاتفي' : '🔔 Trigger Real System Notification')}
            </span>
          </button>
        </div>
      </div>

      {lastSentTime && (
        <div className="mt-3 text-center text-[11px] font-mono text-emerald-400/80">
          {isArabic ? `آخر إشعار تم إرساله بنجاح في: ${lastSentTime}` : `Latest notification fired at: ${lastSentTime}`}
        </div>
      )}
    </div>
  );
}
