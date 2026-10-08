'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  GraduationCap, 
  Plus, 
  Sparkles, 
  BookOpen, 
  Lock, 
  ShieldCheck, 
  ExternalLink, 
  Users,
  Building2,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Search,
  School,
  Image as ImageIcon
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { 
  getStudentConnectedProfessors, 
  addProfessorCodeToStudent, 
  findProfessorByCode, 
  setActiveProfessorBranding, 
  ProfessorItem,
  REGISTERED_PROFESSORS 
} from '@/lib/professors-registry';

function TeacherLiveMetrics({ professorId, professorCode }: { professorId?: string; professorCode?: string }) {
  const firestore = useFirestore();
  const [localStudentCount, setLocalStudentCount] = useState<number>(0);
  
  const code = (professorCode || '').toUpperCase().trim();

  // 1. Real courses from Firestore:
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !professorId) return null;
    return collection(firestore, 'teachers', professorId, 'courses');
  }, [firestore, professorId]);
  const { data: courses } = useCollection<any>(coursesQuery);

  // 2. Real teacher doc in Firestore:
  const teacherRef = useMemoFirebase(() => {
    if (!firestore || !professorId) return null;
    return doc(firestore, 'teachers', professorId);
  }, [firestore, professorId]);
  const { data: teacherDoc } = useDoc<any>(teacherRef);

  // 3. Query Firestore students collection for students linked to this professor code
  const studentsByConnectedQuery = useMemoFirebase(() => {
    if (!firestore || !code) return null;
    return query(collection(firestore, 'students'), where('connectedProfessors', 'array-contains', code));
  }, [firestore, code]);
  const { data: studentsByConnected } = useCollection<any>(studentsByConnectedQuery);

  const studentsByCodeQuery = useMemoFirebase(() => {
    if (!firestore || !code) return null;
    return query(collection(firestore, 'students'), where('professorCode', '==', code));
  }, [firestore, code]);
  const { data: studentsByCode } = useCollection<any>(studentsByCodeQuery);

  const studentsByTeacherIdQuery = useMemoFirebase(() => {
    if (!firestore || !professorId) return null;
    return query(collection(firestore, 'students'), where('teacherId', '==', professorId));
  }, [firestore, professorId]);
  const { data: studentsByTeacherId } = useCollection<any>(studentsByTeacherIdQuery);

  // 4. Local storage scan for actual student profiles created on this browser
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      let count = 0;
      const scannedIds = new Set<string>();

      const activeProfList = localStorage.getItem('student_connected_professors_active');
      if (activeProfList) {
        try {
          const list: string[] = JSON.parse(activeProfList);
          if (list.includes(code)) {
            count++;
          }
        } catch (e) {}
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('student_profile_offline_') || k.startsWith('cached_student_profile_'))) {
          try {
            const profile = JSON.parse(localStorage.getItem(k) || '{}');
            const sid = profile.id || profile.barcode || k;
            if (!scannedIds.has(sid)) {
              if (
                profile.professorCode === code || 
                (Array.isArray(profile.connectedProfessors) && profile.connectedProfessors.includes(code)) ||
                (professorId && profile.teacherId === professorId)
              ) {
                scannedIds.add(sid);
                count++;
              }
            }
          } catch (e) {}
        }
      }

      setLocalStudentCount(count);
    } catch (e) {
      console.error(e);
    }
  }, [code, professorId]);

  // Aggregate unique real students count
  const actualStudents = useMemo(() => {
    const uniqueIds = new Set<string>();
    
    studentsByConnected?.forEach(s => s?.id && uniqueIds.add(s.id));
    studentsByCode?.forEach(s => s?.id && uniqueIds.add(s.id));
    studentsByTeacherId?.forEach(s => s?.id && uniqueIds.add(s.id));

    const totalFromFirestore = uniqueIds.size;
    
    const teacherDocCount = typeof teacherDoc?.studentsCount === 'number' 
      ? teacherDoc.studentsCount 
      : typeof teacherDoc?.studentCount === 'number' 
        ? teacherDoc.studentCount 
        : 0;

    const baseCount = Math.max(totalFromFirestore, teacherDocCount);
    return Math.max(baseCount, localStudentCount);
  }, [studentsByConnected, studentsByCode, studentsByTeacherId, teacherDoc, localStudentCount]);

  const actualCourses = courses ? courses.length : (teacherDoc?.coursesCount ?? 0);

  return (
    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
      <div className="flex items-center gap-1.5 font-mono font-bold">
        <BookOpen className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400" />
        <span>{actualCourses} {actualCourses === 1 ? 'مقرر' : 'مقررات'}</span>
      </div>
      <div className="flex items-center gap-1.5 font-mono font-bold">
        <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{actualStudents} {actualStudents === 1 ? 'طالب' : 'طلاب'}</span>
      </div>
    </div>
  );
}

export default function MyDoctorsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [connectedProfessors, setConnectedProfessors] = useState<ProfessorItem[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [professorCodeInput, setProfessorCodeInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selected professor detail modal
  const [selectedProfessor, setSelectedProfessor] = useState<ProfessorItem | null>(null);

  // Sync student ID & connected professors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('viewingStudentId') || user?.uid || 'offline_active_student';
      setActiveStudentId(storedId);
      
      const loadList = () => {
        const list = getStudentConnectedProfessors(storedId);
        setConnectedProfessors(list);
      };

      loadList();
      window.addEventListener('connected_professors_updated', loadList);
      window.addEventListener('admin_teacher_codes_updated', loadList);
      window.addEventListener('storage', loadList);
      return () => {
        window.removeEventListener('connected_professors_updated', loadList);
        window.removeEventListener('admin_teacher_codes_updated', loadList);
        window.removeEventListener('storage', loadList);
      };
    }
  }, [user]);

  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');
    setIsSubmitting(true);

    const cleanCode = (professorCodeInput || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 4) {
      setInputError('كود الدكتور يجب أن يتكون من 2 إلى 4 أحرف إنجليزية كبيرة (مثل VV أو VX أو PHYS أو MATH).');
      setIsSubmitting(false);
      return;
    }

    const result = addProfessorCodeToStudent(activeStudentId, cleanCode);
    if (!result.success) {
      setInputError(result.error || 'كود الدكتور غير مسجل في المنظومة الأكاديمية أو لم يفعله المشرف بعد.');
      setIsSubmitting(false);
      return;
    }

    const prof = result.professor;
    if (prof) {
      // Refresh list immediately
      const updated = getStudentConnectedProfessors(activeStudentId);
      setConnectedProfessors(updated);

      toast({
        title: result.alreadyExists ? 'الدكتور مضاف بالفعل! 🎓' : 'تم ربط الدكتور بنجاح! 🎉',
        description: `أهلاً بك في بوابة ${prof.name} [${cleanCode}]. تم تحديث مقرراتك وهويتك الأكاديمية.`,
      });

      setProfessorCodeInput('');
      setIsAddModalOpen(false);
    }

    setIsSubmitting(false);
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: 'تم نسخ الكود! 📋',
      description: `تم نسخ كود الدكتور [${code}] إلى الحافظة.`,
    });
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Live preview matching doctor
  const typedPreviewDoctor = useMemo(() => {
    const clean = professorCodeInput.trim().toUpperCase();
    if (clean.length >= 2 && clean.length <= 4) {
      return findProfessorByCode(clean);
    }
    return undefined;
  }, [professorCodeInput]);

  return (
    <div 
      className="min-h-screen bg-white dark:bg-[#070b14] text-[#0f172a] dark:text-slate-100 selection:bg-[#2563eb] selection:text-white pb-32 pt-4 sm:pt-6 transition-colors duration-200 relative overflow-hidden"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* Background Soft Glow Gradients - subtle light glow in light mode, obsidian deep glow in dark mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[260px] bg-gradient-to-b from-blue-50/40 via-transparent to-transparent dark:from-blue-900/20 dark:via-indigo-950/10 dark:to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

        {/* 1. Header Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
          className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329]/90 shadow-xs relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div className="space-y-2 flex-1 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-[#1e40af] dark:text-blue-400">
              <Lock className="w-3.5 h-3.5" />
              <span>منظومة الكلية الخاصة • Private Academic Portal</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] dark:text-white tracking-tight flex items-center gap-3">
              <span>الأساتذة والمحاضرون</span>
              <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/90 border border-blue-200 dark:border-blue-800 text-[#1e40af] dark:text-blue-300">
                {connectedProfessors.length} دكتور مربوط
              </span>
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
              بوابتك الخاصة بالدكاترة والأساتذة المعتمدين. أدخل كود أستاذ المادة (2 إلى 4 أحرف كبيرة) للوصول إلى محاضراته، بنوك الأسئلة، ومذكراته.
            </p>
          </div>

          <div className="z-10 shrink-0 w-full sm:w-auto">
            <Button
              onClick={() => { setInputError(''); setIsAddModalOpen(true); }}
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-sm gap-2 shadow-md shadow-blue-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دكتور بكود المادة</span>
            </Button>
          </div>
        </motion.div>

        {/* 2. Connected Professors List / Empty State */}
        {connectedProfessors && connectedProfessors.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-slate-200 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
                <span>دكاترتك المعتمدون حالياً في حسابك:</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {connectedProfessors.length} دكتور متاح
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {connectedProfessors.filter(Boolean).map((professor, index) => (
                <motion.div
                  key={professor?.code || `prof_${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  onClick={() => router.push(`/teacher?id=${professor.id}`)}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1329] hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 shadow-xs overflow-hidden group cursor-pointer flex flex-col justify-between"
                >
                  {/* Card Top: Hero Banner with Overlay */}
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img 
                      src={professor?.heroImageUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200'} 
                      alt={professor?.name || 'Professor'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
                      <div className="px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-white font-mono font-black text-xs tracking-wider flex items-center gap-1.5 shadow-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>كود: {professor?.code || 'DOC'}</span>
                      </div>

                      <div className="px-2.5 py-1 rounded-xl bg-[#2563eb] text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>أستاذ معتمد</span>
                      </div>
                    </div>

                    {/* Professor Avatar overlapping bottom edge */}
                    <div className="absolute -bottom-6 right-5 flex items-end gap-3.5">
                      <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#0b1329] overflow-hidden shadow-xl bg-white dark:bg-slate-800 shrink-0">
                        <img 
                          src={professor?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'} 
                          alt={professor?.name || 'Avatar'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mb-7">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 p-1 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          {professor?.appIconPath ? (
                            <img 
                              src={professor.appIconPath} 
                              alt={professor.name} 
                              className="w-full h-full object-contain rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <img 
                              src={professor?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'} 
                              alt={professor?.name || 'Icon'} 
                              className="w-full h-full object-cover rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 pt-8 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-bold text-[#0f172a] dark:text-white group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors">
                            {professor?.name || 'دكتور المادة'}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[#1e40af] dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-mono">
                            [{professor?.code || 'DOC'}]
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(e, professor?.code || '')}
                          title="نسخ كود الدكتور"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {copiedCode === professor?.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {professor?.titleAr || 'أستاذ المادة والمحاضرات'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700/60 text-[#1e40af] dark:text-blue-300 font-medium">
                          {professor?.subjectAr || 'الفيزياء والرياضيات'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-400 font-medium">
                          {professor?.facultyAr || 'كلية الطب والعلوم'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 pt-1">
                        {professor?.descriptionAr || 'البوابة الرسمية للمحاضرات وبنوك الأسئلة.'}
                      </p>
                    </div>

                    {/* Stats & Enter Portal CTA */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <TeacherLiveMetrics 
                        professorId={professor?.id} 
                        professorCode={professor?.code} 
                      />

                      <div className="flex items-center gap-1 text-xs font-bold text-[#2563eb] dark:text-blue-400 group-hover:translate-x-[-4px] transition-transform">
                        <span>دخول البوابة والمقررات</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State: No Professors Connected Yet */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 sm:p-14 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/30 text-center space-y-5 max-w-xl mx-auto my-6 shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-[#2563eb] dark:text-blue-400 mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#0f172a] dark:text-white">
                لم تقم بربط أي دكتور حتى الآن
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                هذه المنظومة مخصصة لأساتذة كليتك. للوصول للمحاضرات وبنوك الأسئلة، أدخل كود أستاذ المادة المكوّن من 2 إلى 4 أحرف كبيرة (مثل <span className="text-[#2563eb] dark:text-blue-400 font-mono font-bold">VV</span> أو <span className="text-[#2563eb] dark:text-blue-400 font-mono font-bold">PHYS</span> أو <span className="text-[#2563eb] dark:text-blue-400 font-mono font-bold">MATH</span>).
              </p>
            </div>

            <Button
              onClick={() => { setInputError(''); setIsAddModalOpen(true); }}
              className="h-11 px-6 rounded-2xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة كود الدكتور الآن</span>
            </Button>
          </motion.div>
        )}

        {/* 3. Add Doctor Dialog Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-[#0f172a] dark:text-white rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
            <DialogHeader className="space-y-2 text-right">
              <DialogTitle className="text-lg font-bold tracking-tight text-[#0f172a] dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-[#2563eb] dark:text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span>إضافة دكتور / أستاذ مادة</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed text-right">
                أدخل كود الدكتور الخاص بك (2 إلى 4 أحرف إنجليزية كبيرة مثل VV أو PHYS أو MATH) للربط المباشر واستعراض المقررات.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddDoctor} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0f172a] dark:text-slate-200 flex items-center justify-between">
                  <span>كود الدكتور (2 إلى 4 أحرف كبيرة)</span>
                  <span className="text-[10px] text-[#2563eb] font-mono">Capital Letters (e.g. VV / PHYS / MATH)</span>
                </label>
                <Input
                  type="text"
                  maxLength={4}
                  required
                  autoFocus
                  value={professorCodeInput}
                  onChange={(e) => {
                    setProfessorCodeInput(e.target.value.toUpperCase());
                    setInputError('');
                  }}
                  placeholder="PHYS"
                  className="h-14 rounded-2xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-2xl font-mono font-black uppercase tracking-widest text-center text-[#0f172a] dark:text-white focus:border-blue-500 focus:ring-blue-500"
                  style={{ textTransform: 'uppercase' }}
                />
                {inputError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold text-center">
                    {inputError}
                  </p>
                )}
              </div>

              {/* Matching Live Preview if valid 2-4 letter code */}
              {typedPreviewDoctor && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-blue-300 dark:border-blue-700">
                    <img 
                      src={typedPreviewDoctor.avatarUrl} 
                      alt={typedPreviewDoctor.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white">{typedPreviewDoctor.name}</span>
                      <Badge className="bg-[#2563eb] text-[10px] px-1.5 py-0 font-mono">[{typedPreviewDoctor.code}]</Badge>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 block">{typedPreviewDoctor.titleAr}</span>
                    <span className="text-[10px] text-[#2563eb] dark:text-blue-400 font-semibold">{typedPreviewDoctor.appNameAr || typedPreviewDoctor.subjectAr}</span>
                  </div>
                  <div className="text-2xl shrink-0">
                    {typedPreviewDoctor.appIconEmoji}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 gap-2 flex-col-reverse sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="border-slate-300 dark:border-slate-700 text-xs px-4"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !professorCodeInput}
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs px-6 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  تأكيد الربط بالدكتور
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 4. Professor Detail & Courses Portal Modal */}
        {selectedProfessor && (
          <Dialog open={Boolean(selectedProfessor)} onOpenChange={(open) => !open && setSelectedProfessor(null)}>
            <DialogContent className="max-w-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-[#0f172a] dark:text-white rounded-3xl p-0 overflow-hidden shadow-2xl backdrop-blur-2xl">
              <DialogTitle className="sr-only">تفاصيل الدكتور / {selectedProfessor.name}</DialogTitle>
              <DialogDescription className="sr-only">تفاصيل أستاذ المادة والوصول إلى المحاضرات وبوابته الأكاديمية</DialogDescription>
              
              {/* Modal Banner */}
              <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-900">
                <img 
                  src={selectedProfessor.heroImageUrl} 
                  alt={selectedProfessor.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-xl bg-black/75 backdrop-blur-md text-white font-mono font-black text-xs border border-white/10">
                    كود: {selectedProfessor.code}
                  </span>
                  <div className="px-3 py-1 rounded-xl bg-[#2563eb] text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>بوابة أكاديمية معتمدة</span>
                  </div>
                </div>

                <div className="absolute -bottom-6 right-6 flex items-end gap-3.5">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#0b0f19] overflow-hidden shadow-2xl bg-white dark:bg-slate-800">
                    <img 
                      src={selectedProfessor.avatarUrl} 
                      alt={selectedProfessor.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mb-7">
                    <span className="text-2xl leading-none">{selectedProfessor.appIconEmoji}</span>
                  </div>
                </div>
              </div>

              {/* Modal Details */}
              <div className="p-6 pt-8 space-y-5 text-right">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#0f172a] dark:text-white">
                      {selectedProfessor.name}
                    </h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[#1e40af] dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      [{selectedProfessor.code}]
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {selectedProfessor.titleAr}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedProfessor.facultyAr} • {selectedProfessor.subjectAr}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedProfessor.descriptionAr}
                </div>

                {/* Professor Academic Modules */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#0f172a] dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400" />
                    <span>المقررات والمواد المتاحة في بوابته:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-[#1e40af] dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#0f172a] dark:text-white block">محاضرات الفصل الدراسي</span>
                        <span className="text-[10px] text-slate-500">فيديوهات وملخصات PDF</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#0f172a] dark:text-white block">بنك الأسئلة والتدريبات</span>
                        <span className="text-[10px] text-slate-500">اختبارات دورية وتصحيح</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2 gap-2 flex-col-reverse sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedProfessor(null)}
                    className="border-slate-300 dark:border-slate-700 text-xs px-4"
                  >
                    إغلاق
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setActiveProfessorBranding(selectedProfessor, activeStudentId);
                      toast({
                        title: 'تم اعتماد هوية وأيقونة الأستاذ! 📱',
                        description: `تم تعيين أيقونة المنصة إلى شعار ${selectedProfessor.name}.`,
                      });
                      setSelectedProfessor(null);
                    }}
                    className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 ml-1.5" />
                    <span>تثبيت أيقونة هذا الدكتور للتطبيق</span>
                  </Button>
                </DialogFooter>
              </div>

            </DialogContent>
          </Dialog>
        )}

      </div>
    </div>
  );
}
