'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShieldAlert, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Move, 
  Eye, 
  Save, 
  RotateCcw, 
  Smartphone, 
  Check, 
  Flame, 
  Tv, 
  Compass, 
  Maximize2,
  Lock,
  Play,
  QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { type DynamicWatermarkConfig, DEFAULT_WATERMARK_CONFIG } from '@/lib/watermark-types';
import { DynamicWatermark } from '@/components/security/DynamicWatermark';

interface WatermarkStudioTabProps {
  teacherId?: string;
  firestore?: any;
  teacherData?: any;
}

export function WatermarkStudioTab({
  teacherId,
  firestore,
  teacherData,
}: WatermarkStudioTabProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<DynamicWatermarkConfig>(DEFAULT_WATERMARK_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);

  // Dragging in live preview
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load saved watermark configuration on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const teacherKey = teacherId ? `prof_watermark_${teacherId}` : null;
    const cached = (teacherKey && localStorage.getItem(teacherKey)) ||
                   localStorage.getItem('app_active_watermark_config');

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setConfig({ ...DEFAULT_WATERMARK_CONFIG, ...parsed });
      } catch (e) {}
    } else if (teacherData?.watermarkConfig) {
      setConfig({ ...DEFAULT_WATERMARK_CONFIG, ...teacherData.watermarkConfig });
    }
  }, [teacherId, teacherData]);

  // Helper updater
  const updateConfig = (patch: Partial<DynamicWatermarkConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
  };

  // Test Speech locally with natural Arabic voice auto-selection & voice personalities
  const handleTestSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast({
        title: 'محرك الصوت غير مدعوم',
        description: 'متصفحك لا يدعم قراءة النصوص بالصوت محلياً.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsTestingSpeech(true);
      window.speechSynthesis.cancel();

      const uniSample = config.showUniversity ? '، جامعة القاهرة' : '';
      const sampleText = `تنبيه أمني. محتوى مرخص للطالب أحمد محمود رضوان، كود الطالب 2026-94، هاتف 01099887766${uniSample}.`;
      const utterance = new SpeechSynthesisUtterance(sampleText);
      
      const voiceStyle = config.ttsVoice || 'female';
      let pitch = 1.15;
      let rate = 0.94;

      if (voiceStyle === 'child') {
        pitch = 1.68;
        rate = 1.05;
      } else if (voiceStyle === 'male') {
        pitch = 0.72;
        rate = 0.88;
      }

      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = 1.0;

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

      utterance.onend = () => setIsTestingSpeech(false);
      utterance.onerror = () => setIsTestingSpeech(false);

      window.speechSynthesis.speak(utterance);
      toast({
        title: '🔊 جاري تجربة البصمة الصوتية (Audio Watermark Test)',
        description: `تم تشغيل البصمة الصوتية بنمط (${voiceStyle === 'child' ? 'صوت طفل' : voiceStyle === 'male' ? 'صوت رجل' : 'صوت أنثوي'}).`,
      });
    } catch (e) {
      setIsTestingSpeech(false);
    }
  };

  // Drag-to-place handler for custom placement
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (config.movementType !== 'fixed' || config.fixedPosition !== 'custom') return;
    setIsDragging(true);
    updatePositionFromMouse(e);
  };

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePositionFromMouse(e);
  };

  const handlePreviewMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const updatePositionFromMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(85, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100));
    updateConfig({ customX: Math.round(x), customY: Math.round(y) });
  };

  // Save watermark config to Firestore and localStorage
  const handleSaveWatermark = async () => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        const payloadStr = JSON.stringify(config);
        if (teacherId) {
          localStorage.setItem(`prof_watermark_${teacherId}`, payloadStr);
        }
        localStorage.setItem('app_active_watermark_config', payloadStr);
        window.dispatchEvent(new Event('app_watermark_changed'));
      }

      if (firestore && teacherId) {
        const teacherRef = doc(firestore, 'teachers', teacherId);
        await setDoc(teacherRef, {
          watermarkConfig: {
            ...config,
            updatedAt: serverTimestamp(),
          },
        }, { merge: true });
      }

      toast({
        title: '🛡️ تم حفظ ونشر إعدادات العلامة المائية بنجاح!',
        description: 'ستظهر العلامة المائية تلقائياً لجميع طلابك عند تشغيل أي فيديو في كافة كورساتك.',
      });
    } catch (e: any) {
      toast({
        title: 'فشل في حفظ العلامة المائية',
        description: e.message || 'حدث خطأ أثناء الحفظ',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-amber-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              العلامة المائية الديناميكية الفائقة (Ultra Dynamic Watermark)
            </h2>
          </div>
          <p className="text-xs text-zinc-300">
            حماية متقدمة ومضادة للقرصنة والتصوير بالكاميرات؛ تُطبق تلقائياً على كل فيديو تنشره بدون أي خطوات إضافية من الطالب.
          </p>
        </div>

        <Button
          onClick={handleSaveWatermark}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm h-11 px-6 rounded-2xl shadow-lg shadow-emerald-600/30 shrink-0 flex items-center gap-2"
        >
          {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'جارٍ النشر والتثبيت...' : 'حفظ وتفعيل العلامة المائية لجميع الفيديوهات'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Watermark Main Master Switch & Data Fields */}
          <Card className="bg-zinc-900/90 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>بيانات الطالب المضمنة في العلامة (Watermark Data)</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">تفعيل العلامة:</span>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => updateConfig({ enabled: checked })}
                  />
                </div>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                جميع هذه الحقول مفعلة افتراضياً للتعرف الفوري على هوية مسرّب الفيديو. يمكنك تخصيص ما تود إظهاره.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-200">رقم الهاتف (Phone Number)</Label>
                    <p className="text-[10px] text-zinc-400">يظهر رقم هاتف الطالب المسجل</p>
                  </div>
                  <Switch
                    checked={config.showPhone}
                    onCheckedChange={(v) => updateConfig({ showPhone: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-200">الاسم بالكامل (Full Name)</Label>
                    <p className="text-[10px] text-zinc-400">الاسم الثلاثي أو المعتمد للطالب</p>
                  </div>
                  <Switch
                    checked={config.showName}
                    onCheckedChange={(v) => updateConfig({ showName: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-200">كود الطالب الأكاديمي (Student Code)</Label>
                    <p className="text-[10px] text-zinc-400">الباركود والرقم التعريفي الفريد</p>
                  </div>
                  <Switch
                    checked={config.showStudentCode}
                    onCheckedChange={(v) => updateConfig({ showStudentCode: v })}
                  />
                </div>

                <div className="flex items-start justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="space-y-1 pr-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-bold text-zinc-200">الجامعة / الكلية (University)</Label>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                        تلقائي من بروفايل الطالب 🎓
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      تُجلب الجامعة والكلية تلقائياً وبشكل ديناميكي من الملف الشخصي للطالب الذي يشاهد الفيديو حالياً؛ يرى كل طالب جامعته المقيد بها لمنع تسريب المحتوى، دون أي تدخل من المعلم.
                    </p>
                  </div>
                  <Switch
                    checked={config.showUniversity}
                    onCheckedChange={(v) => updateConfig({ showUniversity: v })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">نص أمني إضافي مخصص (اختياري)</Label>
                <Input
                  value={config.customText || ''}
                  onChange={(e) => updateConfig({ customText: e.target.value })}
                  placeholder="مثال: ملكية فكرية خاصة - يعاقب القانون على إعادة النشر"
                  className="bg-zinc-950 border-zinc-800 text-xs text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Movement & Animations Modes (3 Unique Types) */}
          <Card className="bg-zinc-900/90 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Move className="w-4 h-4 text-cyan-400" />
                <span>نمط الحركة الذكية والأنيميشن (Movement & Animation)</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                اختيار أي نمط حركة يعطل التثبيت اليدوي لمقاومة محاولات القص والتسجيل الخارجي بكفاءة 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Wandering / DVD Bounce */}
                <div 
                  onClick={() => updateConfig({ movementType: 'wandering' })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    config.movementType === 'wandering'
                      ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Tv className={`w-4 h-4 ${config.movementType === 'wandering' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    <span className="text-xs font-bold text-white">الرحّالة المرتد (The Wanderer - DVD)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    يتحرك باستمرار في اتجاهات مختلفة ويرتد من حواف الشاشة مثل شاشات التلفزيون الكلاسيكية، مما يجعل قص الفيديو مستحيلاً.
                  </p>
                </div>

                {/* 2. Corner Cycling */}
                <div 
                  onClick={() => updateConfig({ movementType: 'corner_cycle' })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    config.movementType === 'corner_cycle'
                      ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Compass className={`w-4 h-4 ${config.movementType === 'corner_cycle' ? 'text-purple-400' : 'text-zinc-400'}`} />
                    <span className="text-xs font-bold text-white">القفز بين الزوايا (Corner Hopper)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    يقفز تلقائياً بين الزوايا الأربع والمنتصف كل 8 ثوانٍ بشكل غير متوقع ومباغت لملتقطي الشاشة.
                  </p>
                </div>

                {/* 3. Floating Pulse (Up/Down + Resizing) */}
                <div 
                  onClick={() => updateConfig({ movementType: 'floating_pulse' })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    config.movementType === 'floating_pulse'
                      ? 'bg-blue-950/50 border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Flame className={`w-4 h-4 ${config.movementType === 'floating_pulse' ? 'text-blue-400' : 'text-zinc-400'}`} />
                    <span className="text-xs font-bold text-white">الطفو والنبض (Breathing Float)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    يطفو صعوداً وهبوطاً ويتغير حجمه ويكبر ويصغر بنعومة ديناميكية متصلة.
                  </p>
                </div>

                {/* 4. Fixed / Custom Position */}
                <div 
                  onClick={() => updateConfig({ movementType: 'fixed' })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    config.movementType === 'fixed'
                      ? 'bg-amber-950/50 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className={`w-4 h-4 ${config.movementType === 'fixed' ? 'text-amber-400' : 'text-zinc-400'}`} />
                    <span className="text-xs font-bold text-white">موضع ثابت ومخصص (Fixed Placement)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    تثبيت العلامة في مكان محدد (المنتصف، الزوايا، أو سحبها يدوياً إلى أي إحداثية تريدها).
                  </p>
                </div>
              </div>

              {/* Movement Speed Control */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-3.5 h-3.5 text-emerald-400" />
                    <Label className="text-xs font-bold text-white">سرعة حركة العلامة المائية (DVD Movement Speed):</Label>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {config.movementSpeed === 'slow' ? '0.5x بطيء' : config.movementSpeed === 'fast' ? '2.0x سريع' : config.movementSpeed === 'ultra_fast' ? '3.2x فائق السرعة' : '1.0x عادي'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'slow', label: 'بطيء (0.5x)' },
                    { key: 'normal', label: 'عادي (1.0x)' },
                    { key: 'fast', label: 'سريع (2.0x)' },
                    { key: 'ultra_fast', label: 'فائق السرعة (3.2x)' },
                  ].map(spd => (
                    <button
                      key={spd.key}
                      type="button"
                      onClick={() => updateConfig({ movementSpeed: spd.key as any })}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                        (config.movementSpeed || 'normal') === spd.key
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed Placement Position Selector (Only if fixed is chosen) */}
              {config.movementType === 'fixed' ? (
                <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-amber-400">تحديد موضع التثبيت:</Label>
                    <span className="text-[10px] text-zinc-400">يمكنك أيضاً سحب العلامة في شاشة المعاينة</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { key: 'center', label: 'في المنتصف' },
                      { key: 'top-left', label: 'أعلى اليسار' },
                      { key: 'top-right', label: 'أعلى اليمين' },
                      { key: 'bottom-left', label: 'أسفل اليسار' },
                      { key: 'bottom-right', label: 'أسفل اليمين' },
                      { key: 'custom', label: 'سحب مخصص' },
                    ].map(pos => (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => updateConfig({ fixedPosition: pos.key as any })}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                          config.fixedPosition === pos.key
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>تم تعطيل التثبيت الموضعي اليدوي تلقائياً لأنك اخترت نمط حركة ديناميكي نشط.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Sizing, Opacity, Colors & Borders */}
          <Card className="bg-zinc-900/90 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-purple-400" />
                <span>الحجم، الشفافية، والألوان والإطارات (Styling & Sizing)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* Sizing Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="text-zinc-300">مقياس الحجم (Resize Scale):</Label>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round((config.scale || 1.0) * 100)}%</span>
                </div>
                <Slider
                  min={0.6}
                  max={2.5}
                  step={0.1}
                  value={[config.scale || 1.0]}
                  onValueChange={([val]) => updateConfig({ scale: val })}
                />
              </div>

              {/* Opacity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="text-zinc-300">درجة الشفافية (Transparency / Opacity):</Label>
                  <span className="font-mono text-amber-400 font-bold">{Math.round((config.opacity || 0.5) * 100)}%</span>
                </div>
                <Slider
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={[config.opacity || 0.5]}
                  onValueChange={([val]) => updateConfig({ opacity: val })}
                />
              </div>

              {/* Colors: Text & Background */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">لون النص (Watermark Color)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.textColor || '#22c55e'}
                      onChange={(e) => updateConfig({ textColor: e.target.value })}
                      className="bg-zinc-950 border-zinc-800 w-10 h-9 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={config.textColor || '#22c55e'}
                      onChange={(e) => updateConfig({ textColor: e.target.value })}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">لون خلفية العلامة (Background)</Label>
                  <Select 
                    value={config.bgColor || 'rgba(0, 0, 0, 0.65)'} 
                    onValueChange={(v) => updateConfig({ bgColor: v })}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="rgba(0, 0, 0, 0.65)">داكن معتم (Black 65%)</SelectItem>
                      <SelectItem value="rgba(0, 0, 0, 0.35)">داكن خفيف (Black 35%)</SelectItem>
                      <SelectItem value="transparent">بدون خلفية (شفاف تماماً)</SelectItem>
                      <SelectItem value="#131316">رمادي جرافيت (#131316)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Border Styles */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">نمط الإطار (Border Style)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'none', label: 'بدون إطار' },
                    { key: 'thin', label: 'إطار ناعم (Thin)' },
                    { key: 'glow', label: 'إطار متوهج (Neon Glow)' },
                  ].map(b => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => updateConfig({ borderStyle: b.key as any })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        config.borderStyle === b.key
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Special Security: Flickering & Audio Watermark (TTS) */}
          <Card className="bg-zinc-900/90 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>الخواص السرية الفائقة: الوميض المفاجئ والقراءة الصوتية (100% Free TTS)</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                تقنيات استخباراتية لمنع تصوير الفيديو من شاشات أخرى أو تسجيل الصوت بدون إذن.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Flickering */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">الوميض المفاجئ المباغت (Flickering Mode)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Stealth Flash
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    تكون العلامة شفافة وهادئة، وفجأة تومض بشدة وبوضوح 100% لثانيتين لحرق بيانات الطالب في الكاميرا، ثم تعود لطبيعتها.
                  </p>
                </div>
                <Switch
                  checked={config.flickerEnabled}
                  onCheckedChange={(v) => updateConfig({ flickerEnabled: v })}
                />
              </div>

              {/* Audio TTS Watermark */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-950 to-blue-950/30 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">العلامة المائية الصوتية (Audio Watermark / Text-To-Speech)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                        100% FREE
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      يقرأ النظام تلقائياً بيانات الطالب وبصمته بصوت واضح في ميكروفون الجهاز لحرق أي تسجيل غير مصرح به.
                    </p>
                  </div>
                  <Switch
                    checked={config.ttsEnabled}
                    onCheckedChange={(v) => updateConfig({ ttsEnabled: v })}
                  />
                </div>

                {config.ttsEnabled && (
                  <div className="pt-3 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-300">نبرة وصوت القارئ (Voice):</Label>
                        <Select 
                          value={config.ttsVoice || 'female'} 
                          onValueChange={(v) => updateConfig({ ttsVoice: v as any })}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectItem value="female">صوت أنثوي (Female)</SelectItem>
                            <SelectItem value="male">صوت رجل عميق (Male)</SelectItem>
                            <SelectItem value="child">صوت طفل (Child)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-300">تكرار القراءة الصوتية:</Label>
                        <Select 
                          value={String(config.ttsIntervalMinutes || 15)} 
                          onValueChange={(v) => updateConfig({ ttsIntervalMinutes: Number(v) as any })}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectItem value="5">كل 5 دقائق (مكثف)</SelectItem>
                            <SelectItem value="15">كل 15 دقيقة (موصى به)</SelectItem>
                            <SelectItem value="30">كل 30 دقيقة</SelectItem>
                            <SelectItem value="60">كل ساعة (مرة في الساعة)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestSpeech}
                        disabled={isTestingSpeech}
                        className="border-blue-500/40 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50 rounded-xl text-xs flex items-center gap-1.5 self-end md:self-auto"
                      >
                        {isTestingSpeech ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isTestingSpeech ? 'جاري القراءة بصوت مسموع...' : 'تجربة الصوت الآن (Free Test)'}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Initial Automatic TTS Test upon video open */}
                {config.ttsEnabled && (
                  <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-center justify-between text-xs text-zinc-300">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-[11px]">تشغيل تجريبي تلقائي عند فتح الفيديو (Auto-Test on start):</span>
                      <p className="text-[10px] text-zinc-400">ينطق النظام بصمة الطالب تلقائياً بعد 15 ثانية من فتح الفيديو لتأكيد عملها، ثم يستمر كل 15 دقيقة.</p>
                    </div>
                    <Switch
                      checked={(config.ttsInitialTestDelaySeconds ?? 15) > 0}
                      onCheckedChange={(v) => updateConfig({ ttsInitialTestDelaySeconds: v ? 15 : 0 })}
                    />
                  </div>
                )}
              </div>

              {/* Anti-Inspect & Tamper Shield (Fortress Guard) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-950 to-red-950/30 border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-bold text-white">درع الحظر المشدد ضد الفحص (Anti-Inspect & Anti-Tamper Shield)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                        Ultra Secured
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      حماية قصوى تمنع فتح أدوات الفحص أو حذف عنصر العلامة المائية من كود الصفحة للحصول على الفيديو خام.
                    </p>
                  </div>
                  <Switch
                    checked={config.antiTamperShieldEnabled ?? true}
                    onCheckedChange={(v) => updateConfig({ antiTamperShieldEnabled: v })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="font-bold text-red-400 flex items-center gap-1">🔒 إغلاق Inspect & F12</span>
                    <p className="text-[10px] text-zinc-400">تعطيل الزر الأيمن واختصارات الفحص (F12, Ctrl+Shift+I, DevTools).</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="font-bold text-amber-400 flex items-center gap-1">⚡ مراقبة الحذف والتعديل</span>
                    <p className="text-[10px] text-zinc-400">نظام MutationObserver يقفل المشغل فورا إذا حُذف العنصر أو غُيرت شفافيته.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">🎨 ختم Canvas مباشر</span>
                    <p className="text-[10px] text-zinc-400">رسم بصمة الطالب مباشرة على بكسلات الـ Canvas بطريقة غير قابلة للفرز كـ HTML.</p>
                  </div>
                </div>
              </div>

              {/* High-Res QR Verification Pass Stamp Controls */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-950 to-emerald-950/20 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">ختم التوثيق الرقمي عالي الدقة (High-Res QR Verification Pass Stamp)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      يُظهر ختم QR تفاعلي مدمج برمز الطالب في زاوية المشغل للتحقق السريع من ملكية المحتوى وبصمة العرض.
                    </p>
                  </div>
                  <Switch
                    checked={config.showQrStamp ?? true}
                    onCheckedChange={(v) => updateConfig({ showQrStamp: v })}
                  />
                </div>

                {(config.showQrStamp ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-300">موقع ختم الـ QR على الشاشة:</Label>
                      <Select 
                        value={config.qrPosition || 'bottom-right'} 
                        onValueChange={(v) => updateConfig({ qrPosition: v as any })}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="bottom-right">أسفل اليمين (Bottom-Right)</SelectItem>
                          <SelectItem value="bottom-left">أسفل اليسار (Bottom-Left)</SelectItem>
                          <SelectItem value="top-right">أعلى اليمين (Top-Right)</SelectItem>
                          <SelectItem value="top-left">أعلى اليسار (Top-Left)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-300">عنوان الختم الرقمي (Pass Title):</Label>
                      <Input
                        type="text"
                        value={config.qrPassTitle || 'SECURE DIGITAL PASS'}
                        onChange={(e) => updateConfig({ qrPassTitle: e.target.value })}
                        placeholder="SECURE DIGITAL PASS"
                        className="bg-zinc-900 border-zinc-700 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Visual Theme Representation Card for Professor Profile */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">المعاينة البصرية للثيم والخلفية (Visual Representation of Profile Theme)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      محاكاة حية لمعاينة شكل بروفايلك الأكاديمي، الخلفية الخضراء التفاعلية، والكروت كما تظهر للطلاب عند زيارة بروفايلك.
                    </p>
                  </div>
                </div>

                {/* Theme Selector Switches */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                  {[
                    { id: 'emerald', label: 'الزمردي الكهربائي 🟢', color: 'from-emerald-500/20 via-zinc-950 to-zinc-950', border: 'border-emerald-500/40', accent: 'text-emerald-400' },
                    { id: 'sapphire', label: 'السيبراني الأزرق 🔵', color: 'from-blue-500/20 via-zinc-950 to-zinc-950', border: 'border-blue-500/40', accent: 'text-blue-400' },
                    { id: 'amber', label: 'العنبر الصحراوي 🟧', color: 'from-amber-500/20 via-zinc-950 to-zinc-950', border: 'border-amber-500/40', accent: 'text-amber-400' },
                    { id: 'obsidian', label: 'الظلام العميق ⬛', color: 'from-zinc-900 via-zinc-950 to-zinc-950', border: 'border-zinc-700', accent: 'text-zinc-300' },
                    { id: 'violet', label: 'البنفسجي الملكي 🟣', color: 'from-purple-500/20 via-zinc-950 to-zinc-950', border: 'border-purple-500/40', accent: 'text-purple-400' },
                  ].map((themeItem) => (
                    <button
                      key={themeItem.id}
                      type="button"
                      onClick={() => {
                        updateConfig({ profileTheme: themeItem.id as any });
                        localStorage.setItem('app_active_global_theme', themeItem.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        (config.profileTheme || 'emerald') === themeItem.id
                          ? 'bg-zinc-800 text-white border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {themeItem.label}
                    </button>
                  ))}
                </div>

                {/* Accurate Mini Visual Mockup of Teacher Profile */}
                <div className={`relative p-5 rounded-2xl bg-gradient-to-b ${
                  config.profileTheme === 'sapphire' ? 'from-blue-950/40 via-zinc-950 to-zinc-950 border-blue-500/30' :
                  config.profileTheme === 'amber' ? 'from-amber-950/40 via-zinc-950 to-zinc-950 border-amber-500/30' :
                  config.profileTheme === 'obsidian' ? 'from-zinc-900 via-zinc-950 to-zinc-950 border-zinc-800' :
                  config.profileTheme === 'violet' ? 'from-purple-950/40 via-zinc-950 to-zinc-950 border-purple-500/30' :
                  'from-emerald-950/40 via-zinc-950 to-zinc-950 border-emerald-500/30'
                } border shadow-2xl space-y-4 overflow-hidden`}>
                  {/* Background Radial Glow & Technical Point Grid */}
                  <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-emerald-500/40 flex items-center justify-center overflow-hidden shadow-lg">
                      {teacherData?.avatarUrl || teacherData?.customAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={teacherData?.avatarUrl || teacherData?.customAvatar || '/icons/professors/387869340_817871683671250_6351633986100870309_n.jpg'} 
                          alt="Prof" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-lg font-black text-emerald-400">
                          {teacherData?.name?.charAt(0) || 'أ'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>{teacherData?.name || 'الأستاذ د. أحمد رضوان'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                          موثق ✓
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">أستاذ المادة والتخصص الأكاديمي • 1,240+ طالب مسجل</p>
                    </div>
                  </div>

                  {/* Sample Course Card in Theme */}
                  <div className="relative z-10 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-[11px]">كورسات الأستاذ المعروضة للطلاب:</span>
                      <p className="text-[10px] text-zinc-400">المحاضرة الشاملة والتطبيقات العملية (معاينة نمط الكروت)</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      نشط للمشاهدة
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Video Player Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>المعاينة الحية التفاعلية على الفيديو</span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSpeech}
                disabled={isTestingSpeech}
                className="h-7 text-[11px] px-2.5 rounded-lg border-blue-500/40 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40 flex items-center gap-1 font-bold"
              >
                <Volume2 className="w-3 h-3 text-blue-400" />
                <span>{isTestingSpeech ? 'جاري نطق البصمة...' : 'تجربة الصوت الحي 🔊'}</span>
              </Button>
            </div>

            {/* Video Player Canvas Mockup */}
            <div 
              ref={previewRef}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              className={`relative aspect-video w-full rounded-3xl bg-zinc-950 border-2 border-zinc-800 overflow-hidden shadow-2xl flex flex-col justify-between ${
                config.movementType === 'fixed' && config.fixedPosition === 'custom' ? 'cursor-move' : ''
              }`}
              style={{
                backgroundImage: 'radial-gradient(ellipse at center, #1e293b 0%, #090d16 100%)',
              }}
            >
              {/* Simulated Lecture Video Scene */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none opacity-40">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <Play className="w-8 h-8 text-white/50 ml-1" />
                </div>
                <h4 className="text-sm font-black text-white/80">المحاضرة الأولى: مقدمة في علوم التخصص</h4>
                <p className="text-[10px] text-white/40 mt-1">شاشة محاكاة حية لطريقة عرض العلامة المائية فوق مشغل الفيديو</p>
              </div>

              {/* The Actual Real Dynamic Watermark Component */}
              <DynamicWatermark
                config={config}
                previewStudent={{
                  name: 'أحمد محمود رضوان',
                  phone: '01099887766',
                  barcode: 'STD-2026-94',
                  university: config.showUniversity ? 'جامعة القاهرة (تلقائي من بروفايل الطالب)' : undefined,
                }}
              />

              {/* Simulated Video Player Controls bar at bottom */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-6 flex items-center justify-between pointer-events-none text-white/70 text-xs">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[10px] font-mono">14:20 / 45:00</span>
                </div>
                <div className="h-1 flex-1 mx-3 bg-white/20 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-emerald-500 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono">1080p HD</span>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تطبيق تلقائي فوري 100%:</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                بمجرد الضغط على زر الحفظ، تُعتمد هذه الإعدادات تلقائياً كقالب رسمي لكافة الفيديوهات المنشورة. يرى كل طالب بياناته الشخصية الحقيقية (رقمه، كوده، واسمه وجامعته) لتأمين كامل ضد التسريب.
              </p>
            </div>

            {/* Quick Action Save Button */}
            <Button
              onClick={handleSaveWatermark}
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 !text-white font-black text-xs sm:text-sm h-12 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>نشر وتطبيق العلامة المائية الآن</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
