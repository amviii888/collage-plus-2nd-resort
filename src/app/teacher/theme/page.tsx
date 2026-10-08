'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { 
  Palette, 
  Sparkles, 
  Check, 
  Eye, 
  RotateCcw, 
  Layers, 
  ArrowLeft, 
  Smartphone, 
  Monitor, 
  Moon, 
  Sun,
  GraduationCap,
  Save,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function TeacherThemeEditorPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const teacherId = searchParams.get('id') || user?.uid;

  const teacherDocRef = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return doc(firestore, 'teachers', teacherId);
  }, [firestore, teacherId]);

  const { data: teacherData, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherDocRef);

  // Customizer State
  const [themeTitle, setThemeTitle] = useState('ثيم الأستاذ المخصص');
  const [themeDesc, setThemeDesc] = useState('الهوية البصرية الأكاديمية الخاصة بي ومفعلة لطلابي');
  const [themeBgType, setThemeBgType] = useState<'solid' | 'gradient' | 'cyber'>('gradient');
  const [themeBgStartColor, setThemeBgStartColor] = useState('#070b14');
  const [themeBgEndColor, setThemeBgEndColor] = useState('#0b1329');
  const [themeGradientAngle, setThemeGradientAngle] = useState('135');
  const [themeCardBgColor, setThemeCardBgColor] = useState('#0e172a');
  const [themeBorderColor, setThemeBorderColor] = useState('#1e293b');
  const [themeTextColor, setThemeTextColor] = useState('#f8fafc');
  const [themeAccent, setThemeAccent] = useState('#2563eb');
  const [themeGlowIntensity, setThemeGlowIntensity] = useState<'none' | 'subtle' | 'vivid' | 'neon'>('vivid');
  const [themeGridPattern, setThemeGridPattern] = useState<'none' | 'dots' | 'lines' | 'stars' | 'cyber'>('dots');
  const [themeFontFamily, setThemeFontFamily] = useState<'sans' | 'space' | 'mono' | 'serif'>('sans');
  const [themeGlassBlur, setThemeGlassBlur] = useState<'none' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  const [themeSprinkles, setThemeSprinkles] = useState<'none' | 'sparkles' | 'stars' | 'glow'>('sparkles');

  // Preview Mode
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>('dark');
  const [isSaving, setIsSaving] = useState(false);

  // Load existing saved custom theme if present
  useEffect(() => {
    if (teacherData?.customTheme) {
      const ct: any = teacherData.customTheme;
      if (ct.themeTitle) setThemeTitle(ct.themeTitle);
      if (ct.themeDesc) setThemeDesc(ct.themeDesc);
      if (ct.bgType) setThemeBgType(ct.bgType);
      if (ct.bgStartColor) setThemeBgStartColor(ct.bgStartColor);
      if (ct.bgEndColor) setThemeBgEndColor(ct.bgEndColor);
      if (ct.gradientAngle) setThemeGradientAngle(ct.gradientAngle);
      if (ct.cardBgColor) setThemeCardBgColor(ct.cardBgColor);
      if (ct.borderColor) setThemeBorderColor(ct.borderColor);
      if (ct.textColor) setThemeTextColor(ct.textColor);
      if (ct.accentColor) setThemeAccent(ct.accentColor);
      if (ct.glowIntensity) setThemeGlowIntensity(ct.glowIntensity);
      if (ct.gridPattern) setThemeGridPattern(ct.gridPattern);
      if (ct.fontFamily) setThemeFontFamily(ct.fontFamily);
      if (ct.glassBlur) setThemeGlassBlur(ct.glassBlur);
      if (ct.sprinkles) setThemeSprinkles(ct.sprinkles);
    }
  }, [teacherData]);

  // Presets
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'royal_blue':
        setThemeTitle('Royal Navy Blue (أزرق ملكي أكاديمي)');
        setThemeDesc('أناقة هادئة ومريحة مع خلفيات داكنة عميقة وتباين عالي للنصوص');
        setThemeBgType('gradient');
        setThemeBgStartColor('#070b14');
        setThemeBgEndColor('#0e172a');
        setThemeGradientAngle('135');
        setThemeCardBgColor('#0e172a');
        setThemeBorderColor('#1e3a8a');
        setThemeTextColor('#f8fafc');
        setThemeAccent('#2563eb');
        setThemeFontFamily('sans');
        setThemeGridPattern('dots');
        setThemeGlowIntensity('vivid');
        setThemeSprinkles('sparkles');
        break;
      case 'emerald':
        setThemeTitle('Emerald Scholar (الزمردي الجامعي)');
        setThemeDesc('حيوية ونشاط أكاديمي مع درجات الأخضر الزمردي المتألق');
        setThemeBgType('gradient');
        setThemeBgStartColor('#022c22');
        setThemeBgEndColor('#064e3b');
        setThemeGradientAngle('145');
        setThemeCardBgColor('#072418');
        setThemeBorderColor('#065f46');
        setThemeTextColor('#f0fdf4');
        setThemeAccent('#10b981');
        setThemeFontFamily('sans');
        setThemeGridPattern('dots');
        setThemeGlowIntensity('vivid');
        setThemeSprinkles('glow');
        break;
      case 'cyberpunk':
        setThemeTitle('Cyberpunk Neon (النيون السيبراني)');
        setThemeDesc('طاقة عالية مع خطوط نيون وردية وكريبتون بنفسجي فائق الحداثة');
        setThemeBgType('cyber');
        setThemeBgStartColor('#090014');
        setThemeBgEndColor('#1a0033');
        setThemeGradientAngle('135');
        setThemeCardBgColor('#120324');
        setThemeBorderColor('#ff007f');
        setThemeTextColor('#fdf4ff');
        setThemeAccent('#ff007f');
        setThemeFontFamily('mono');
        setThemeGridPattern('cyber');
        setThemeGlowIntensity('neon');
        setThemeSprinkles('glow');
        break;
      case 'ramadan':
        setThemeTitle('Ramadan Twilight (أمسية رمضانية)');
        setThemeDesc('أجواء ليلية مباركة مكللة ببريق الذهب وأطياف النجوم الهادئة');
        setThemeBgType('gradient');
        setThemeBgStartColor('#070919');
        setThemeBgEndColor('#0f1538');
        setThemeGradientAngle('145');
        setThemeCardBgColor('#0e1329');
        setThemeBorderColor('#2a3563');
        setThemeTextColor('#f1f5f9');
        setThemeAccent('#f59e0b');
        setThemeFontFamily('serif');
        setThemeGridPattern('stars');
        setThemeGlowIntensity('vivid');
        setThemeSprinkles('stars');
        break;
      case 'cosmic':
        setThemeTitle('Cosmic Nebula (السديم الكوني)');
        setThemeDesc('رحلة بين المجرات البنفسجية العميقة وأمواج السدم الفضائية');
        setThemeBgType('gradient');
        setThemeBgStartColor('#090314');
        setThemeBgEndColor('#1b0838');
        setThemeGradientAngle('135');
        setThemeCardBgColor('#14062a');
        setThemeBorderColor('#a855f7');
        setThemeTextColor('#faf5ff');
        setThemeAccent('#c084fc');
        setThemeFontFamily('space');
        setThemeGridPattern('stars');
        setThemeGlowIntensity('neon');
        setThemeSprinkles('sparkles');
        break;
      case 'desert':
        setThemeTitle('Desert Amber (العنبر الصحراوي)');
        setThemeDesc('كثبان ذهبية دافئة وأشعة شمس مضيئة لإطلالة عربية أصيلة');
        setThemeBgType('gradient');
        setThemeBgStartColor('#140d04');
        setThemeBgEndColor('#261706');
        setThemeGradientAngle('135');
        setThemeCardBgColor('#1c1105');
        setThemeBorderColor('#bf7c1c');
        setThemeTextColor('#fefce8');
        setThemeAccent('#bf7c1c');
        setThemeFontFamily('space');
        setThemeGridPattern('dots');
        setThemeGlowIntensity('subtle');
        setThemeSprinkles('sparkles');
        break;
      case 'winter':
        setThemeTitle('Winter Frost (الصقيع الشتوي)');
        setThemeDesc('ثلج كريستالي أزرق وأجواء شتوية نقية فائقة الوضوح');
        setThemeBgType('gradient');
        setThemeBgStartColor('#071321');
        setThemeBgEndColor('#0e243b');
        setThemeGradientAngle('160');
        setThemeCardBgColor('#0c1b2d');
        setThemeBorderColor('#38bdf8');
        setThemeTextColor('#f0f9ff');
        setThemeAccent('#0284c7');
        setThemeFontFamily('space');
        setThemeGridPattern('dots');
        setThemeGlowIntensity('subtle');
        setThemeSprinkles('stars');
        break;
    }
    toast({ title: '🎨 تم تطبيق القالب الجاهز بنجاح' });
  };

  // Save theme to Firestore
  const handleSaveTheme = async () => {
    if (!firestore || !teacherId) {
      toast({ title: 'خطأ', description: 'يرجى تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const themeClass = `prof_theme_${teacherId}`;
      const customThemePayload = {
        id: themeClass,
        themeClass: themeClass,
        themeTitle: themeTitle.trim() || 'ثيم الأستاذ المخصص',
        themeDesc: themeDesc.trim(),
        title: themeTitle.trim() || 'ثيم الأستاذ المخصص',
        bgType: themeBgType,
        bgStartColor: themeBgStartColor,
        bgEndColor: themeBgEndColor,
        gradientAngle: themeGradientAngle,
        cardBgColor: themeCardBgColor,
        borderColor: themeBorderColor,
        textColor: themeTextColor,
        accentColor: themeAccent,
        glowIntensity: themeGlowIntensity,
        gridPattern: themeGridPattern,
        fontFamily: themeFontFamily,
        glassBlur: themeGlassBlur,
        sprinkles: themeSprinkles,
        previewBg: themeBgType === 'gradient' 
          ? `linear-gradient(${themeGradientAngle}deg, ${themeBgStartColor}, ${themeBgEndColor})` 
          : themeBgStartColor,
        teacherId: teacherId,
        teacherName: teacherData?.name || 'الأستاذ',
        updatedAt: serverTimestamp(),
      };

      // 1. Update Teacher Document
      const tRef = doc(firestore, 'teachers', teacherId);
      await setDoc(tRef, {
        customTheme: customThemePayload,
        assignedThemeId: themeClass,
        themeAssignedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Publish to library_themes so all students load it dynamically
      const libRef = doc(firestore, 'library_themes', themeClass);
      await setDoc(libRef, customThemePayload, { merge: true });

      // 3. Mirror locally
      if (typeof window !== 'undefined') {
        localStorage.setItem(`prof_theme_${teacherId}`, JSON.stringify(customThemePayload));
        localStorage.setItem('app_active_global_theme', themeClass);
        window.dispatchEvent(new Event('app_theme_changed'));
      }

      toast({
        title: '✨ تم حفظ ونشر ثيم الأستاذ بنجاح!',
        description: 'تم تحديث مظهر وهوية المنصة لجميع الطلاب المرتبطين بحسابك.',
      });
    } catch (e: any) {
      console.error('Error saving professor theme:', e);
      toast({
        title: 'فشل في حفظ الثيم',
        description: e.message || 'حدث خطأ أثناء حفظ الثيم',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Computed Preview Style
  const previewCanvasStyle = useMemo(() => {
    if (previewMode === 'dark') {
      let bg = themeBgStartColor;
      if (themeBgType === 'gradient') {
        bg = `linear-gradient(${themeGradientAngle}deg, ${themeBgStartColor}, ${themeBgEndColor})`;
      } else if (themeBgType === 'cyber') {
        bg = `radial-gradient(ellipse at 50% 0%, ${themeAccent}25 0%, transparent 70%), linear-gradient(180deg, #020204 0%, #08080f 50%, #020204 100%)`;
      }
      return {
        background: bg,
        color: themeTextColor,
        borderColor: themeBorderColor,
      };
    } else {
      return {
        background: '#f8fafc',
        color: '#0f172a',
        borderColor: '#e2e8f0',
      };
    }
  }, [previewMode, themeBgType, themeBgStartColor, themeBgEndColor, themeGradientAngle, themeTextColor, themeBorderColor, themeAccent]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300">
            <Link href={teacherId ? `/teacher?id=${teacherId}` : '/teacher'}>
              <ArrowLeft className="w-4 h-4 mr-1 rtl:rotate-180" />
              <span>العودة للملف الأكاديمي</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Palette className="w-6 h-6 text-purple-400" />
              <span>استوديو تخصيص ثيم وهوية الأستاذ</span>
            </h1>
            <p className="text-xs text-zinc-400">
              صمم الألوان والهوية البصرية التي ستظهر تلقائياً لجميع طلابك عند دخولهم مقرراتك أو حسابك
            </p>
          </div>
        </div>

        <Button
          onClick={handleSaveTheme}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm h-11 px-6 rounded-2xl shadow-lg shadow-purple-600/30 flex items-center gap-2"
        >
          {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'جارٍ الحفظ والنشر...' : 'حفظ وتطبيق الثيم لطلابي'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customization Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Presets Toolbar */}
          <Card className="bg-zinc-900/80 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>قوالب ثيمات جاهزة (Preset Inspiration)</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                اختر قالباً لبدء التخصيص أو صمم مظهرك الخاص من الصفر
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'royal_blue', name: 'ملخصاتي رويال', color: '#2563eb' },
                  { key: 'emerald', name: 'الزمردي الجامعي', color: '#10b981' },
                  { key: 'ramadan', name: 'أمسية رمضانية', color: '#f59e0b' },
                  { key: 'cyberpunk', name: 'نيون سيبراني', color: '#ff007f' },
                  { key: 'cosmic', name: 'السديم الكوني', color: '#c084fc' },
                  { key: 'desert', name: 'عنبر صحراوي', color: '#bf7c1c' },
                  { key: 'winter', name: 'صقيع شتوي', color: '#0284c7' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs font-bold hover:border-zinc-500 transition-all flex items-center gap-2"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.color }} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Theme Identity & Meta */}
          <Card className="bg-zinc-900/80 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                <span>بيانات وهوية الثيم</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">اسم الثيم الأكاديمي</Label>
                <Input 
                  value={themeTitle} 
                  onChange={(e) => setThemeTitle(e.target.value)} 
                  className="bg-zinc-950 border-zinc-800 text-xs text-white" 
                  placeholder="مثال: ثيم د. فاروق الملكي" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">وصف الثيم</Label>
                <Input 
                  value={themeDesc} 
                  onChange={(e) => setThemeDesc(e.target.value)} 
                  className="bg-zinc-950 border-zinc-800 text-xs text-white" 
                  placeholder="وصف مختصر للثيم يظهر لطلابك" 
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Global Palette & Canvas */}
          <Card className="bg-zinc-900/80 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>لوحة الألوان والخلفيات (Palette & Canvas)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">نمط الخلفية</Label>
                  <Select value={themeBgType} onValueChange={(v: any) => setThemeBgType(v)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="gradient">تدرج لوني انسيابي (Gradient)</SelectItem>
                      <SelectItem value="solid">لون داكن مصمت (Solid)</SelectItem>
                      <SelectItem value="cyber">شبكة سيبرانية متوهجة (Cyber)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">لون الهوية الرئيسي (Brand Accent)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={themeAccent}
                      onChange={(e) => setThemeAccent(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 w-10 h-9 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeAccent}
                      onChange={(e) => setThemeAccent(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">لون بداية الخلفية</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={themeBgStartColor}
                      onChange={(e) => setThemeBgStartColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 w-10 h-9 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeBgStartColor}
                      onChange={(e) => setThemeBgStartColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">لون نهاية الخلفية</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={themeBgEndColor}
                      onChange={(e) => setThemeBgEndColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 w-10 h-9 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeBgEndColor}
                      onChange={(e) => setThemeBgEndColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">خلفية البطاقات (Card Bg)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="color"
                      value={themeCardBgColor}
                      onChange={(e) => setThemeCardBgColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 w-9 h-8 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeCardBgColor}
                      onChange={(e) => setThemeCardBgColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">حدود البطاقات (Border)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="color"
                      value={themeBorderColor}
                      onChange={(e) => setThemeBorderColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 w-9 h-8 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeBorderColor}
                      onChange={(e) => setThemeBorderColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">لون النصوص (Text)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="color"
                      value={themeTextColor}
                      onChange={(e) => setThemeTextColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 w-9 h-8 p-0.5 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={themeTextColor}
                      onChange={(e) => setThemeTextColor(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-xs font-mono h-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Atmosphere & Effects */}
          <Card className="bg-zinc-900/80 border-zinc-800 text-white rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>الخطوط والمؤثرات الجمالية (Atmosphere)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">نوع الخط (Font Family)</Label>
                  <Select value={themeFontFamily} onValueChange={(v: any) => setThemeFontFamily(v)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="sans">Clean Modern Sans</SelectItem>
                      <SelectItem value="space">Space Grotesk</SelectItem>
                      <SelectItem value="mono">Technical Monospace</SelectItem>
                      <SelectItem value="serif">Academic Serif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">زخرفة الخلفية (Grid Pattern)</Label>
                  <Select value={themeGridPattern} onValueChange={(v: any) => setThemeGridPattern(v)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="none">بدون زخرفة (None)</SelectItem>
                      <SelectItem value="dots">نقاط هندسية (Technical Dots)</SelectItem>
                      <SelectItem value="lines">خطوط شبكية (Grid Lines)</SelectItem>
                      <SelectItem value="stars">نجوم وبريق (Star Dust)</SelectItem>
                      <SelectItem value="cyber">مصفوفة رقمية (Cyber)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">شدة توهج النيون (Glow Intensity)</Label>
                  <Select value={themeGlowIntensity} onValueChange={(v: any) => setThemeGlowIntensity(v)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="none">بدون توهج (None)</SelectItem>
                      <SelectItem value="subtle">توهج خفيف (Subtle)</SelectItem>
                      <SelectItem value="vivid">توهج حيوي (Vivid Aura)</SelectItem>
                      <SelectItem value="neon">نيون فائق (High Voltage)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">جزيئات متناثرة (Sprinkles)</Label>
                  <Select value={themeSprinkles} onValueChange={(v: any) => setThemeSprinkles(v)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="none">بدون جزيئات (None)</SelectItem>
                      <SelectItem value="sparkles">بريق براق (Sparkles)</SelectItem>
                      <SelectItem value="stars">نجوم فضية (Stars)</SelectItem>
                      <SelectItem value="glow">وهج هادئ (Soft Glow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Interactive Student Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-400" />
                <span>معاينة حية لواجهة الطالب (Live Preview)</span>
              </span>

              {/* Toggle Dark / Light preview */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('dark')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                    previewMode === 'dark' ? "bg-zinc-800 text-white shadow-xs" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <Moon className="w-3 h-3 text-blue-400" />
                  <span>ليلي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('light')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                    previewMode === 'light' ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>نهاري</span>
                </button>
              </div>
            </div>

            {/* Simulated Student Portal Canvas */}
            <div 
              className="rounded-3xl border p-5 transition-all duration-300 relative overflow-hidden shadow-2xl"
              style={previewCanvasStyle}
            >
              {/* Top Mini Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-md"
                    style={{ backgroundColor: themeAccent, color: '#ffffff' }}
                  >
                    🎓
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{teacherData?.name || 'الأستاذ'}</span>
                    <span className="text-[10px] opacity-70">بوابة الطالب المعتمدة</span>
                  </div>
                </div>

                <Badge 
                  className="text-[10px] font-bold"
                  style={{ backgroundColor: `${themeAccent}20`, color: themeAccent, borderColor: `${themeAccent}40` }}
                >
                  ثيم مفعل
                </Badge>
              </div>

              {/* Student Course Card Mock */}
              <div className="mt-4 space-y-3">
                <div 
                  className="rounded-2xl border p-4 transition-all space-y-3 relative overflow-hidden shadow-md"
                  style={{ backgroundColor: themeCardBgColor, borderColor: themeBorderColor }}
                >
                  <div className="flex items-center justify-between">
                    <Badge 
                      className="text-[9px] font-bold"
                      style={{ backgroundColor: themeAccent, color: '#ffffff' }}
                    >
                      كورس دراسي معتمد
                    </Badge>
                    <span className="text-[10px] font-mono opacity-80">3 وحدات مفعّلة</span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base leading-snug">
                    مقرر المحاضرات والتدريبات المتقدمة
                  </h3>

                  <p className="text-xs opacity-70 line-clamp-2">
                    المحاضرات والشروحات التفاعلية مع بنوك الأسئلة والاختبارات الفصلية
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
                    <span className="font-mono text-[11px] font-bold" style={{ color: themeAccent }}>
                      المشاهدات: 3 من 3 متبقية
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl font-bold text-xs text-white shadow-md transition-all hover:opacity-90"
                      style={{ backgroundColor: themeAccent }}
                    >
                      مشاهدة المحاضرة الآن
                    </button>
                  </div>
                </div>

                {/* Profile Badge Mock */}
                <div 
                  className="rounded-2xl border p-3.5 flex items-center justify-between"
                  style={{ backgroundColor: `${themeCardBgColor}cc`, borderColor: themeBorderColor }}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: `${themeAccent}25`, color: themeAccent }}
                    >
                      ⭐
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{themeTitle}</span>
                      <span className="text-[10px] opacity-70">الهوية البصرية المرتبطة لجميع الطلاب</span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <p className="text-[10px] opacity-60">
                  سيتم تطبيق هذه الألوان تلقائياً لكل طالب مسجل معك في أي مقرر أو تدريب
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            <Button
              onClick={handleSaveTheme}
              disabled={isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs h-12 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>نشر الثيم الآن وتفعيله لطلابي</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
