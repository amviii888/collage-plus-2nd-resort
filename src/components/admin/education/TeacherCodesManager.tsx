'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Edit3, 
  Smartphone, 
  Key, 
  Check, 
  Sparkles, 
  BookOpen, 
  Users, 
  ShieldCheck, 
  Trash2,
  Search,
  School,
  Tag
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { Teacher } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  BUILTIN_APP_ICONS, 
  BuiltinAppIcon, 
  ProfessorItem, 
  REGISTERED_PROFESSORS,
  getActiveRegisteredProfessors,
  getAdminCustomTeacherCodes, 
  saveAdminTeacherCodeMapping,
  saveTeacherCodeMappingToCloudAndLocal,
  deleteAdminTeacherCodeMapping,
  deleteProfessorCompletely
} from '@/lib/professors-registry';

export function TeacherCodesManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Teachers from Firestore
  const teachersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'teachers'));
  }, [firestore]);
  
  const { data: remoteTeachers, isLoading } = useCollection<Teacher>(teachersQuery);

  const [adminMappings, setAdminMappings] = useState<Record<string, ProfessorItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [codeInputValue, setCodeInputValue] = useState('');
  const [selectedIconId, setSelectedIconId] = useState<string>('biophysics');
  const [appNameArInput, setAppNameArInput] = useState('');
  const [appNameEnInput, setAppNameEnInput] = useState('');
  const [subjectArInput, setSubjectArInput] = useState('');
  const [facultyArInput, setFacultyArInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refreshMappings = () => {
    const mappings = getAdminCustomTeacherCodes();
    setAdminMappings(mappings);
  };

  useEffect(() => {
    refreshMappings();
    window.addEventListener('admin_teacher_codes_updated', refreshMappings);
    return () => window.removeEventListener('admin_teacher_codes_updated', refreshMappings);
  }, []);

  // Merge registered professors and firestore teachers
  const allTeachersList = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Remote teachers from Firestore
    if (remoteTeachers && remoteTeachers.length > 0) {
      remoteTeachers.forEach(t => {
        seenIds.add(t.id);
        list.push({
          id: t.id,
          name: t.name,
          email: t.email,
          avatarUrl: t.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
          heroImageUrl: t.heroImageUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200',
          subjects: t.subjects || [],
          bio: t.bio || '',
          code: (t as any).code || Object.values(adminMappings).find(m => m.id === t.id)?.code || '',
          source: 'firestore'
        });
      });
    }

    // 2. Base registered professors (only active, excluding deleted)
    getActiveRegisteredProfessors().forEach(p => {
      if (p.id && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        list.push({
          id: p.id,
          name: p.name,
          email: `${p.code.toLowerCase()}@college.edu`,
          avatarUrl: p.avatarUrl,
          heroImageUrl: p.heroImageUrl,
          subjects: [p.subjectAr],
          bio: p.descriptionAr,
          code: Object.values(adminMappings).find(m => m.id === p.id)?.code || p.code,
          source: 'registry'
        });
      }
    });

    return list;
  }, [remoteTeachers, adminMappings]);

  const handleDeleteTeacher = async (teacher: any) => {
    const code = teacher.code || teacher.id;
    if (!window.confirm(`هل أنت متأكد من حذف الأستاذ (${teacher.name}) وكوده [${code}] نهائياً من النظام؟`)) {
      return;
    }

    try {
      await deleteProfessorCompletely(code, firestore);
      if (teacher.id && teacher.id !== code) {
        await deleteProfessorCompletely(teacher.id, firestore);
      }
      refreshMappings();
      toast({
        title: 'تم حذف الأستاذ بنجاح! 🗑️',
        description: `تم إزالة الأستاذ (${teacher.name}) وكوده [${code}] من النظام بالكامل.`,
      });
    } catch (e: any) {
      toast({
        title: 'حدث خطأ أثناء الحذف',
        description: e.message || 'فشل حذف الأستاذ.',
        variant: 'destructive',
      });
    }
  };

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return allTeachersList;
    const q = searchQuery.toLowerCase();
    return allTeachersList.filter(t => 
      t.name?.toLowerCase().includes(q) || 
      t.email?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q)
    );
  }, [allTeachersList, searchQuery]);

  const handleOpenEditModal = (teacher: any) => {
    setSelectedTeacher(teacher);
    
    // Check if mapping exists
    const existingMapping = Object.values(adminMappings).find(m => m.id === teacher.id || m.code === teacher.code);
    
    const initialCode = existingMapping?.code || teacher.code || (teacher.name?.slice(0, 2).toUpperCase() || 'DR');
    setCodeInputValue(initialCode.toUpperCase());
    
    const matchedIcon = BUILTIN_APP_ICONS.find(icon => 
      icon.emoji === existingMapping?.appIconEmoji || icon.iconPath === existingMapping?.appIconPath
    ) || BUILTIN_APP_ICONS[0];
    
    setSelectedIconId(matchedIcon.id);
    setAppNameArInput(existingMapping?.appNameAr || `منصة ${teacher.name} [${initialCode.toUpperCase()}]`);
    setAppNameEnInput(existingMapping?.appNameEn || `${teacher.name} Portal [${initialCode.toUpperCase()}]`);
    setSubjectArInput(existingMapping?.subjectAr || (teacher.subjects?.[0] || 'العلوم التخصصية'));
    setFacultyArInput(existingMapping?.facultyAr || 'كلية الطب والعلوم');
    setValidationError('');
    setIsEditModalOpen(true);
  };

  const handleSaveCodeAndIcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    
    const cleanCode = codeInputValue.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 4) {
      setValidationError('الكود يجب أن يتكون من 2 إلى 4 أحرف إنجليزية كبيرة (مثل VV أو PHYS أو MATH).');
      return;
    }

    if (!/^[A-Z0-9]{2,4}$/.test(cleanCode)) {
      setValidationError('الكود يجب أن يحتوي فقط على أحرف إنجليزية وأرقام.');
      return;
    }

    setIsSaving(true);
    setValidationError('');

    const chosenIcon = BUILTIN_APP_ICONS.find(i => i.id === selectedIconId) || BUILTIN_APP_ICONS[0];

    const mappingData: ProfessorItem = {
      id: selectedTeacher.id,
      code: cleanCode,
      name: selectedTeacher.name,
      titleAr: `أستاذ ${subjectArInput || 'المادة الأكاديمية'}`,
      titleEn: `Professor of ${subjectArInput || 'Academic Department'}`,
      subjectAr: subjectArInput || 'المقررات الأكاديمية',
      subjectEn: 'Academic Courses',
      facultyAr: facultyArInput || 'الكلية الجامعية',
      facultyEn: 'Faculty & University',
      avatarUrl: selectedTeacher.avatarUrl,
      heroImageUrl: selectedTeacher.heroImageUrl,
      appIconPath: chosenIcon.iconPath,
      appIconEmoji: chosenIcon.emoji,
      appNameAr: appNameArInput || `منصة ${selectedTeacher.name} [${cleanCode}]`,
      appNameEn: appNameEnInput || `${selectedTeacher.name} Portal [${cleanCode}]`,
      themeColor: chosenIcon.color,
      coursesCount: 4,
      studentsCount: 350,
      descriptionAr: selectedTeacher.bio || `البوابة الأكاديمية الرسمية لمحاضرات ومقررات ${selectedTeacher.name}.`,
      descriptionEn: `Official academic portal for ${selectedTeacher.name}.`
    };

    try {
      // 1. Save locally and to Firestore teacher_codes & teachers collections
      await saveTeacherCodeMappingToCloudAndLocal(mappingData, firestore);

      toast({
        title: 'تم حفظ الكود والأيقونة بنجاح! 🎓',
        description: `تم ربط الأستاذ (${selectedTeacher.name}) بالكود [${cleanCode}] وأيقونة (${chosenIcon.nameAr} ${chosenIcon.emoji}).`,
      });

      refreshMappings();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || 'فشل حفظ الكود والأيقونة.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0b1329]/90 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-[#2563eb] dark:text-blue-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              منظومة ربط أكواد الدكاترة وأيقونات التطبيق
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            حدد لكل أستاذ مسجل كوداً مخصصاً (2 إلى 4 أحرف كبيرة مثل VV أو PHYS) واختر الأيقونة المدمجة واسم التطبيق المعتمد.
          </CardDescription>
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الدكتور أو الكود..."
              className="pl-9 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-4">
        {filteredTeachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeachers.map((teacher) => {
              const activeMapping = Object.values(adminMappings).find(m => m.id === teacher.id || m.code === teacher.code);
              const currentCode = activeMapping?.code || teacher.code || '---';
              const currentIconEmoji = activeMapping?.appIconEmoji || '⚡';
              const currentAppName = activeMapping?.appNameAr || `منصة ${teacher.name}`;

              return (
                <div
                  key={teacher.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                        <img 
                          src={teacher.avatarUrl} 
                          alt={teacher.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {teacher.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {teacher.email}
                        </p>
                      </div>
                    </div>

                    <Badge className="font-mono font-black text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg shadow-xs">
                      كود: {currentCode}
                    </Badge>
                  </div>

                  {/* Icon & App Name Info */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{currentIconEmoji}</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs truncate max-w-[180px]">
                          {currentAppName}
                        </span>
                        <span className="text-[10px] text-slate-500">الأيقونة وهوية التطبيق</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleOpenEditModal(teacher)}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 rounded-xl border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل الكود</span>
                      </Button>

                      <Button
                        onClick={() => handleDeleteTeacher(teacher)}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold cursor-pointer"
                        title="حذف الأستاذ نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            لا يوجد أساتذة مسجلون يطابقون البحث.
          </div>
        )}

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
            <DialogHeader className="space-y-2 text-right">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-[#2563eb] dark:text-blue-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <span>تخصيص كود الأستاذ وأيقونة المنصة ({selectedTeacher?.name})</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400 text-xs text-right">
                اختر الكود الأكاديمي (2 إلى 4 أحرف كبيرة) وحدد الأيقونة المناسبة لتثبيتها على هواتف الطلاب.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveCodeAndIcon} className="space-y-5 py-2">
              {/* 1. Code Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>كود الأستاذ (2 إلى 4 أحرف إنجليزية كبيرة)</span>
                  <span className="text-[10px] text-blue-600 font-mono">2-4 Capital Letters (e.g. VV / PHYS / MATH)</span>
                </label>
                <Input
                  type="text"
                  maxLength={4}
                  required
                  value={codeInputValue}
                  onChange={(e) => setCodeInputValue(e.target.value.toUpperCase())}
                  placeholder="PHYS"
                  className="h-12 rounded-xl text-center text-xl font-mono font-black uppercase tracking-widest border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* 2. Pre-built Codebase Icons Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block text-right">
                  اختر أيقونة التطبيق المعتمدة من الحزمة المدمجة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50">
                  {BUILTIN_APP_ICONS.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setSelectedIconId(icon.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-right transition-all flex items-center gap-2.5 cursor-pointer",
                        selectedIconId === icon.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20 ring-2 ring-blue-500/40"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                      )}
                    >
                      <span className="text-2xl shrink-0">{icon.emoji}</span>
                      <div className="truncate text-right">
                        <span className="text-xs font-bold block truncate text-slate-900 dark:text-white">
                          {icon.nameAr}
                        </span>
                        <span className="text-[9px] text-slate-500 block truncate font-mono">
                          {icon.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Custom App Name & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block text-right">
                    اسم المنصة بالعربية
                  </label>
                  <Input
                    value={appNameArInput}
                    onChange={(e) => setAppNameArInput(e.target.value)}
                    placeholder="منصة د. وليد فاروق"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block text-right">
                    التخصص / المادة
                  </label>
                  <Input
                    value={subjectArInput}
                    onChange={(e) => setSubjectArInput(e.target.value)}
                    placeholder="الفيزياء الطبية"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              {validationError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-bold text-center">
                  {validationError}
                </p>
              )}

              <DialogFooter className="pt-3 gap-2 flex-col-reverse sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs px-4"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !codeInputValue}
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs px-6 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ الكود والأيقونة للأستاذ'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
