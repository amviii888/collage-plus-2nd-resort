'use client';
import './profile.css';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BookOpen,
  Briefcase,
  Calendar,
  KeySquare,
  UserCheck,
  List,
  BarChart3,
  FileText,
  ClipboardList,
  Users,
  Eye,
  Star,
  Library,
  GraduationCap,
  TrendingDown,
  Edit,
  Shield,
  QrCode,
  Copy,
  Sparkles,
  Clock,
  CheckCircle,
  CalendarCheck,
    LogOut,
  Download,
  Flame,
  Trophy,
  Zap,
  Award,
  Save,
  Phone,
  School,
  Video,
  Camera,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
  Database,
  Upload,
  ShieldAlert,
  Check,
  CircleHelp,
  Palette,
  Building2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  Lock,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import { isStudentEmail, clearAllStudentAuthSessions } from '@/lib/auth-helpers';
import { getStudentConnectedProfessors, findProfessorByCode, setActiveProfessorBranding, ProfessorItem } from '@/lib/professors-registry';
import { AttendanceHistoryModal } from '@/components/AttendanceHistoryModal';
import { SeasonalHubCard } from '@/components/SeasonalHubCard';
import { calculateLevelFromXP, getDisplayLevel, getStoredSeasons, getStoredRewards, getStudentClaimedRewards, claimStudentRewardLocally, SeasonReward, Season, AppThemeAsset } from '@/lib/seasons';
import { useUser, useFirestore, useMemoFirebase, useDoc, useStudent, useCollection, useAuth } from '@/firebase';
import { doc, updateDoc, collection, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { Teacher, Student, Grade, Course } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { grades } from '@/lib/data';
import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useStudentSyncData } from '@/hooks/use-student-sync-data';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { LocalDataProvider, useLocalData } from '@/context/LocalDataContext';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { TeacherDashboardSyncButton } from '@/components/teacher/SyncControl';
import { AppCache } from '@/lib/cache';
import { Input } from '@/components/ui/input';
import { LatestTestResultCard } from './LatestTestResultCard';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'motion/react';

const StudentCourses = lazy(() => import('./StudentCourses'));

const MILESTONE_REWARDS: Array<{ level: number; id: string; type: string; name: string; icon: string; label: string }> = [];

const ACADEMIC_YEARS_LIST = [
    { id: 'year_1', nameAr: 'الفرقة الأولى', nameEn: '1st Year' },
    { id: 'year_2', nameAr: 'الفرقة الثانية', nameEn: '2nd Year' },
    { id: 'year_3', nameAr: 'الفرقة الثالثة', nameEn: '3rd Year' },
    { id: 'year_4', nameAr: 'الفرقة الرابعة', nameEn: '4th Year' },
    { id: 'year_5', nameAr: 'الفرقة الخامسة', nameEn: '5th Year' },
    { id: 'year_6', nameAr: 'الفرقة السادسة', nameEn: '6th Year' },
    { id: 'internship', nameAr: 'سنة الامتياز (House Officer)', nameEn: 'Internship Year' },
    { id: 'postgrad', nameAr: 'دراسات عليا / ماجستير / زمالة', nameEn: 'Postgraduate' },
];

const getSanitizedAcademicYear = (studentData: any, isAr: boolean) => {
    if (!studentData) return isAr ? 'الفرقة الأولى' : '1st Year';
    const raw = studentData.academicYearLabel || studentData.academicYear || studentData.grade;
    if (!raw) return isAr ? 'الفرقة الأولى' : '1st Year';
    
    const found = ACADEMIC_YEARS_LIST.find(y => 
        y.id === raw || 
        y.nameAr === raw || 
        y.nameEn === raw
    );
    if (found) {
        return isAr ? found.nameAr : found.nameEn;
    }

    if (typeof raw === 'string') {
        const lower = raw.toLowerCase();
        if (raw.includes('ثانية') || raw.includes('2') || lower.includes('second') || lower.includes('2nd') || lower.includes('year 2') || lower.includes('year_2')) {
            return isAr ? 'الفرقة الثانية' : '2nd Year';
        }
        if (raw.includes('ثالثة') || raw.includes('3') || lower.includes('third') || lower.includes('3rd') || lower.includes('year 3') || lower.includes('year_3')) {
            return isAr ? 'الفرقة الثالثة' : '3rd Year';
        }
        if (raw.includes('رابعة') || raw.includes('4') || lower.includes('fourth') || lower.includes('4th') || lower.includes('year 4') || lower.includes('year_4')) {
            return isAr ? 'الفرقة الرابعة' : '4th Year';
        }
        if (raw.includes('خامسة') || raw.includes('5') || lower.includes('fifth') || lower.includes('5th') || lower.includes('year 5') || lower.includes('year_5')) {
            return isAr ? 'الفرقة الخامسة' : '5th Year';
        }
        if (raw.includes('أولى') || raw.includes('1') || lower.includes('first') || lower.includes('1st') || lower.includes('year 1') || lower.includes('year_1')) {
            return isAr ? 'الفرقة الأولى' : '1st Year';
        }
    }

    return isAr ? 'الفرقة الأولى' : '1st Year';
};

const getThemeStyles = (themeName: string, isDark: boolean, libraryThemes: AppThemeAsset[] = []) => {
    const customTheme = libraryThemes.find(t => t.themeClass === themeName || t.id === themeName);
    if (customTheme) {
        const accent = customTheme.accentColor || '#2563eb';
        
        if (isDark) {
            let bg = customTheme.bgStartColor || customTheme.previewBg || '#070b14';
            if (customTheme.bgType === 'gradient' && customTheme.bgStartColor && customTheme.bgEndColor) {
                bg = `linear-gradient(${customTheme.gradientAngle || '135'}deg, ${customTheme.bgStartColor}, ${customTheme.bgEndColor})`;
            } else if (customTheme.bgType === 'cyber') {
                bg = `radial-gradient(ellipse at 50% 0%, ${accent}22 0%, transparent 70%), linear-gradient(180deg, #020204 0%, #08080f 50%, #020204 100%)`;
            }

            const textColor = customTheme.textColor || '#f8fafc';
            const cardBg = customTheme.cardBgColor || '#0e172a';
            const borderColor = customTheme.borderColor || 'rgba(255, 255, 255, 0.12)';

            return {
                '--bg': bg,
                '--ink': textColor,
                '--ink-dim': 'rgba(248, 250, 252, 0.7)',
                '--ink-faint': 'rgba(248, 250, 252, 0.12)',
                '--accent': accent,
                '--success': accent,
                '--warning': '#f59e0b',
                '--card-bg': cardBg,
                '--card-border': borderColor,
                '--border': borderColor,
            } as React.CSSProperties;
        } else {
            // Light Mode: Clean, bright, highly readable mode matching the theme's accent color
            let bg = '#f8fafc';
            if (customTheme.bgType === 'gradient') {
                bg = `linear-gradient(${customTheme.gradientAngle || '135'}deg, #f8fafc 0%, #f1f5f9 100%)`;
            }

            return {
                '--bg': bg,
                '--ink': '#0f172a',
                '--ink-dim': 'rgba(15, 23, 42, 0.75)',
                '--ink-faint': 'rgba(15, 23, 42, 0.12)',
                '--accent': accent,
                '--success': accent,
                '--warning': '#d97706',
                '--card-bg': '#ffffff',
                '--card-border': '#e2e8f0',
                '--border': '#e2e8f0',
            } as React.CSSProperties;
        }
    }

    // Default to the two requested primary themes: Green Theme vs Blue Theme with Light & Dark variations
    const isGreenTheme = themeName === 'theme_emerald' || themeName === 'theme_emerald_scholar' || themeName === 'green';

    if (isGreenTheme) {
        if (isDark) {
            return {
                '--bg': '#04130d',
                '--ink': '#f0fdf4',
                '--ink-dim': 'rgba(240, 253, 244, 0.7)',
                '--ink-faint': 'rgba(240, 253, 244, 0.12)',
                '--accent': '#10b981',
                '--success': '#22c55e',
                '--warning': '#f59e0b',
                '--card-bg': '#072418',
                '--card-border': '#065f46',
                '--border': '#065f46',
            } as React.CSSProperties;
        } else {
            return {
                '--bg': '#f4fbf7',
                '--ink': '#064e3b',
                '--ink-dim': 'rgba(6, 78, 59, 0.75)',
                '--ink-faint': 'rgba(6, 78, 59, 0.12)',
                '--accent': '#059669',
                '--success': '#10b981',
                '--warning': '#d97706',
                '--card-bg': '#ffffff',
                '--card-border': '#bbf7d0',
                '--border': '#dcfce7',
            } as React.CSSProperties;
        }
    }

    // Blue Theme (Default & Primary platform theme)
    if (isDark) {
        return {
            '--bg': '#070b14',
            '--ink': '#f8fafc',
            '--ink-dim': 'rgba(248, 250, 252, 0.7)',
            '--ink-faint': 'rgba(248, 250, 252, 0.12)',
            '--accent': '#3b82f6',
            '--success': '#10b981',
            '--warning': '#f59e0b',
            '--card-bg': '#0e172a',
            '--card-border': '#1e3a8a',
            '--border': '#1e293b',
        } as React.CSSProperties;
    } else {
        return {
            '--bg': '#f8fafc',
            '--ink': '#0f172a',
            '--ink-dim': 'rgba(15, 23, 42, 0.75)',
            '--ink-faint': 'rgba(15, 23, 42, 0.12)',
            '--accent': '#2563eb',
            '--success': '#10b981',
            '--warning': '#d97706',
            '--card-bg': '#ffffff',
            '--card-border': '#cbd5e1',
            '--border': '#e2e8f0',
        } as React.CSSProperties;
    }
};

const getPetSpeech = (petId: string, customRewards: any[] = []) => {
    const customPet = customRewards.find(r => r.id === petId || r.iconOrAssetUrl === petId || r.title === petId);
    if (customPet && customPet.petQuote) {
        return customPet.petQuote;
    }
    switch (petId) {
        case 'pet_test_frog':
            return "Ribbit! Focus on your study goals and make a big leap forward today!";
        case 'pet_snail':
            return "Slow and steady wins the academic race! Keep moving forward!";
        case 'pet_cat':
            return "Mew! Your study habits are absolutely purr-fect! Let's get more XP!";
        case 'pet_bird':
            return "Tweet tweet! Fly high with your study goals and sing a song of success!";
        case 'pet_dragon':
            return "Raaawr! A mighty fire of knowledge burns within you, legend!";
        default:
            return "Always ready to assist you on your scholar journey!";
    }
};

function SAdminProfile({ userId }: { userId: string }) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        const validPasskeys = [
            'AP5793154862',
            '_eagle07APfApamviii84017',
            'almoamviiichef6108$hellarich'
        ];

        if (validPasskeys.includes(password.trim())) {
            try {
                localStorage.setItem('admin-session', JSON.stringify({ id: userId, name: 'Super Admin', role: 'S Admin' }));
                router.push('/admin/dashboard');
            } catch (e: any) {
                setError("An error occurred during verification.");
                setIsSubmitting(false);
            }
        } else {
            setError("Incorrect passkey. Please check your verification key.");
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 flex items-center justify-center min-h-[80vh]">
            <Card className="profile-content-card w-full max-w-md bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
                <CardHeader className="text-center pb-4">
                     <div className="mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl h-16 w-16 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-2">
                        <Shield className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-black text-[#0f172a] dark:text-white">S-Admin Verification</CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                        Enter your S-Admin verification key to access the administrative control panel.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                             <Label htmlFor="s-admin-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                S-Admin Verification Key
                             </Label>
                             <Input 
                                id="s-admin-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                required
                                autoFocus
                                className="h-12 text-lg text-center font-mono rounded-2xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-600"
                             />
                             {error && <p className="text-xs font-bold text-red-500 text-center animate-pulse">{error}</p>}
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-sm font-bold bg-[#2563eb] hover:bg-blue-700 text-white rounded-2xl shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer">
                            {isSubmitting ? 'Verifying S-Admin Access...' : 'Enter Admin Panel'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function TeacherDashboard({ teacherId }: { teacherId: string }) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { 
    localStudents, 
    localPlans, 
    localTransactions, 
    localAttendance,
    setLocalStudents,
    setLocalPlans,
    setLocalTransactions,
    setLocalAttendance,
    triggerTwoWaySync
  } = useLocalData();
  const teacherRef = useMemoFirebase(() => doc(firestore, 'teachers', teacherId), [firestore, teacherId]);
  const { data: teacher, isLoading: teacherLoading } = useDoc<Teacher>(teacherRef);
  
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !teacherId) return null;
    return collection(firestore, 'teachers', teacherId, 'courses');
  }, [firestore, teacherId]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const [restoreStep, setRestoreStep] = useState<'idle' | 'confirm' | 'restoring' | 'done'>('idle');
  const [backupToRestore, setBackupToRestore] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isLoading = teacherLoading || coursesLoading;
  
  const stats = {
    courses: courses?.length || 0,
    views: teacher?.viewCount || 0,
    studentsCount: localStudents?.length || 0,
    plansCount: localPlans?.length || 0,
    avgRating: teacher?.averageRating?.toFixed(1) || 'N/A'
  };
  
  const handleExportUABK = () => {
    try {
      setIsExporting(true);
      const backupData = {
        version: "1.0",
        teacherId,
        timestamp: new Date().toISOString(),
        localStudents,
        localPlans,
        localTransactions,
        localAttendance,
        courses: courses || []
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      saveAs(dataBlob, `universe_academy_vault_backup_${teacher?.name?.replace(/ /g, '_') || 'instructor'}.uabk`);
      
      toast({
        title: "Backup Complete",
        description: "Your custom .uabk academy archive has been securely downloaded.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Backup Failed",
        description: "Could not generate local snapshot archive.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportUABK = (file: File) => {
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          
          if (!json || json.version !== '1.0' || !json.teacherId) {
            toast({
              title: "Invalid File Format",
              description: "This is not a valid Universe Academy (.uabk) file.",
              variant: "destructive"
            });
            return;
          }

          setBackupToRestore(json);
          setRestoreStep('confirm');
        } catch (err) {
          toast({
            title: "Corrupted File",
            description: "The file could not be parsed as a valid JSON backup.",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
    }
  };

  const executeRestoreUABK = async () => {
    if (!backupToRestore) return;
    setRestoreStep('restoring');
    try {
      const { 
        localStudents: backupStudents = [], 
        localPlans: backupPlans = [], 
        localTransactions: backupTransactions = [], 
        localAttendance: backupAttendance = [], 
        courses: backupCourses = [] 
      } = backupToRestore;

      // 1. Restore localStudents as dirty (synced: false) for cloud push
      const mappedStudents = backupStudents.map((s: any) => ({
        ...s,
        synced: false,
        updatedAt: new Date().toISOString()
      }));
      setLocalStudents(mappedStudents);

      // 2. Restore localPlans
      const mappedPlans = backupPlans.map((p: any) => ({
        ...p,
        synced: false,
        updatedAt: new Date().toISOString()
      }));
      setLocalPlans(mappedPlans);

      // 3. Restore localTransactions
      const mappedTransactions = backupTransactions.map((t: any) => ({
        ...t,
        synced: false,
        updatedAt: new Date().toISOString()
      }));
      setLocalTransactions(mappedTransactions);

      // 4. Restore localAttendance
      const mappedAttendance = backupAttendance.map((a: any) => ({
        ...a,
        synced: false,
        updatedAt: new Date().toISOString()
      }));
      setLocalAttendance(mappedAttendance);

      // 5. Restore courses directly to Firestore cloud
      if (backupCourses && backupCourses.length > 0) {
        await Promise.all(
          backupCourses.map((c: any) => {
            const courseRef = doc(firestore, 'teachers', teacherId, 'courses', c.id);
            return setDoc(courseRef, {
              ...c,
              updatedAt: new Date().toISOString()
            });
          })
        );
      }

      // Evict memory caches to reflect changes immediately
      AppCache.clear(`coll_teachers/${teacherId}/courses`);
      AppCache.clear(`doc_teachers/${teacherId}/courses`);
      AppCache.clear(`query_teachers/${teacherId}/courses`);
      AppCache.clear(`coll_featuredCourses`);
      AppCache.clear(`query_featuredCourses`);
      AppCache.clear(`doc_featuredCourses`);

      setRestoreStep('done');
      toast({
        title: "Restoration Successful",
        description: "All records populated locally. Cloud sync is running in the background.",
      });

      // Force background synchronization after a short delay
      setTimeout(() => {
        triggerTwoWaySync().catch(err => console.error("Restore auto-sync failure:", err));
      }, 1500);

    } catch (err) {
      console.error(err);
      toast({
        title: "Restoration Failed",
        description: "Something went wrong while overwriting the local database.",
        variant: "destructive"
      });
      setRestoreStep('idle');
    }
  };

    const handleExportLocalData = () => {
        const wb = XLSX.utils.book_new();
        let hasData = false;

        if (localStudents.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localStudents), "Students");
            hasData = true;
        }
        if (localPlans.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localPlans), "Plans");
            hasData = true;
        }
        if (localTransactions.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localTransactions), "Transactions");
            hasData = true;
        }
        if (localAttendance.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(localAttendance), "Attendance");
            hasData = true;
        }

        if (!hasData) {
            toast({
                title: "No Data to Export",
                description: "There is no local data to back up.",
                variant: "destructive"
            });
            return;
        }

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        saveAs(dataBlob, `teacher_local_data_backup_${teacher?.name?.replace(/ /g, '_')}.xlsx`);
        toast({ title: "Local Data Exported", description: "All your personal offline data has been backed up." });
    };

  const onlineFeatures = [
    { href: '/teacher/courses', icon: BookOpen, title: 'المقررات والمحاضرات', desc: 'إدارة المحاضرات والفيديوهات وملفات الـ PDF', badge: 'Active', color: 'from-blue-600 to-indigo-600', iconColor: 'text-blue-500' },
    { href: '/teacher/courses/analytics', icon: BarChart3, title: 'إحصائيات المحاضرات', desc: 'متابعة نسب المشاهدة وإكمال الدروس والتقييمات', badge: 'Live', color: 'from-emerald-600 to-teal-600', iconColor: 'text-emerald-500' },
    { href: '/teacher/collections', icon: Library, title: 'مجموعات المقررات', desc: 'تجميع المقررات في حزم ومسارات دراسية متكاملة', badge: 'Vault', color: 'from-violet-600 to-purple-600', iconColor: 'text-purple-500' },
    { href: '/teacher/questions-bank', icon: CircleHelp, title: 'بنك الأسئلة والملفات', desc: 'رفع وإدارة بنوك الأسئلة بحسب الفرق الدراسية', badge: 'Q-Bank', color: 'from-amber-600 to-orange-600', iconColor: 'text-amber-500' },
    { href: '/teacher/tests', icon: FileText, title: 'الاختبارات والامتحانات', desc: 'إنشاء ومتابعة الامتحانات وتصحيح نتائج الطلاب', badge: 'Exams', color: 'from-pink-600 to-rose-600', iconColor: 'text-pink-500' },
    { href: '/teacher/calendar', icon: Calendar, title: 'الجدول والمواعيد', desc: 'تنظيم المواعيد والمحاضرات الأسبوعية وقاعات الحضور', badge: 'Schedule', color: 'from-sky-600 to-cyan-600', iconColor: 'text-sky-500' },
    { href: '/teacher/codes', icon: KeySquare, title: 'أكواد وبطاقات الوصول', desc: 'توليد ومشاركة أكواد المحاضرات والاشتراكات', badge: 'Keys', color: 'from-cyan-600 to-blue-600', iconColor: 'text-cyan-500' },
    { href: '/teacher/profile-edit', icon: Edit, title: 'تعديل الملف الأكاديمي', desc: 'تحديث النبذة التعريفية والمواد والبيانات الشخصية', badge: 'Profile', color: 'from-slate-600 to-zinc-600', iconColor: 'text-slate-400' },
  ];

  const offlineFeatures = [
    { href: '/teacher/attendance', icon: UserCheck, title: 'تسجيل الحضور الأكاديمي', desc: 'مسح الباركود وتسجيل حضور وغياب الطلاب لحظياً', badge: 'Live QR', color: 'from-green-600 to-emerald-700', iconColor: 'text-green-500' },
    { href: '/teacher/my-students', icon: Users, title: 'قائمة الطلاب المسجلين', desc: 'إدارة وتصفح بيانات وحسابات الطلاب المرتبطين', badge: 'Students', color: 'from-blue-600 to-indigo-700', iconColor: 'text-blue-500' },
    { href: '/teacher/plans', icon: List, title: 'الخطط والمجموعات الدراسية', desc: 'إنشاء وتعديل المجموعات والمواعيد والمسارات', badge: 'Plans', color: 'from-indigo-600 to-violet-700', iconColor: 'text-indigo-500' },
    { href: '/teacher/assistants', icon: Briefcase, title: 'المساعدون الأكاديميون', desc: 'إدارة وتعيين صلاحيات المساعدين والمشرفين', badge: 'Staff', color: 'from-slate-700 to-zinc-800', iconColor: 'text-slate-400' },
  ];

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl bg-slate-200 dark:bg-zinc-800/60" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-zinc-800/60" />
          <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-zinc-800/60" />
          <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-zinc-800/60" />
          <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-zinc-800/60" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl bg-slate-200 dark:bg-zinc-800/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[60vh]">
        <div className="p-6 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <AlertCircle className="w-12 h-12 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">لم يتم العثور على حساب المحاضر</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">يرجى تسجيل الدخول بحساب دكتور / محاضر معتمد للوصول إلى لوحة التحكم.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 rounded-xl">
            تسجيل الدخول
          </Button>
          <Button onClick={() => router.push('/')} variant="outline" className="text-xs px-5 rounded-xl">
            الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const doctorCode = (teacher as any)?.code || (teacherId && teacherId.length <= 4 ? teacherId.toUpperCase() : '');

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 select-none">
      {/* 1. Header Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-right">
            <div className="relative">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white dark:border-zinc-900 shadow-xl ring-2 ring-blue-500/30">
                <AvatarImage src={teacher.profilePictureUrl} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-3xl font-black rounded-3xl">
                  {teacher.name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>معتمد</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400">
                  لوحة تحكم الأستاذ الجامعي
                </span>
                {doctorCode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
                    كود: [{doctorCode}]
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {teacher.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl">
                {teacher.bio || (teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects.join(' • ') : 'بوابة إدارة المحاضرات وبنوك الأسئلة والطلاب')}
              </p>

              {teacher.subjects && teacher.subjects.length > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 pt-1 flex-wrap">
                  {teacher.subjects.map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center shrink-0">
            <Button
              asChild
              variant="outline"
              className="rounded-2xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold gap-2 px-4 shadow-xs"
            >
              <Link href={`/teacher?id=${teacherId}`}>
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>معاينة البروفايل للطلاب</span>
              </Link>
            </Button>
            <TeacherDashboardSyncButton teacherId={teacherId} />
          </div>
        </div>
      </div>

      {/* 2. Dynamic Real KPIs & Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Views */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-bold text-[11px]">المشاهدات النشطة</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {stats.views}
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">مشاهدات البروفايل للطلاب</p>
        </div>

        {/* Metric 2: Courses */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-bold text-[11px]">المقررات والمحاضرات</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {stats.courses}
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">مقرر ومحاضرة مفعلة</p>
        </div>

        {/* Metric 3: Students */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-bold text-[11px]">الطلاب المسجلين</span>
            <div className="w-7 h-7 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {stats.studentsCount}
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">طالب مسجل بالمنظومة</p>
        </div>

        {/* Metric 4: Plans */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-bold text-[11px]">الخطط والمجموعات</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <List className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {stats.plansCount}
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">مجموعات دراسية نشطة</p>
        </div>

        {/* Metric 5: Rating */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] shadow-xs space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-bold text-[11px]">التقييم الأكاديمي</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight flex items-center gap-1.5">
            <span>{stats.avgRating}</span>
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">تقييم الطلاب للمحاضر</p>
        </div>
      </div>

      {/* 3. Primary Academic & Course Features */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              أدوات المقررات والمحتوى الأكاديمي (Online Modules)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
            إدارة المحاضرات، بنوك الأسئلة، الاختبارات والتقييمات
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {onlineFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative overflow-hidden p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] hover:border-blue-500/50 dark:hover:border-blue-500/40 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center transition-colors group-hover:scale-105", item.iconColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800">
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  <span>فتح القسم</span>
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 group-hover:-translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Attendance & Students Center Tools */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              إدارة الحضور والطلاب والمساعدين (Center Operations)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
            متابعة الحضور بالباركود، القوائم والخطط الشخصية
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {offlineFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative overflow-hidden p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center transition-colors group-hover:scale-105", item.iconColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-zinc-800">
                      {item.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span>فتح القسم</span>
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 group-hover:-translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 5. Database & Archive Tools */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c101c] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span>النسخ الاحتياطي وحفظ بيانات المحاضر</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تصدير نسخة كاملة مشفرة (.uabk) أو ملف Excel لجميع بيانات الطلاب والحضور والمقررات.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={handleExportUABK}
              disabled={isExporting}
              variant="outline"
              className="rounded-xl border-slate-300 dark:border-zinc-700 text-xs font-bold gap-2 px-4 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>تصدير حزمة (.uabk)</span>
            </Button>
            <Button
              onClick={handleExportLocalData}
              variant="outline"
              className="rounded-xl border-slate-300 dark:border-zinc-700 text-xs font-bold gap-2 px-4 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>تصدير ملف Excel</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentProfile({ studentId }: { studentId?: string | null }) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();
    const router = useRouter();
    const isArabic = i18next.language === 'ar';
    const { user, isUserLoading } = useUser();

    // 1. Safe & robust student ID resolution
    const activeStudentId = (user && !user.isAnonymous) 
        ? user.uid 
        : (studentId || (typeof window !== 'undefined' ? (localStorage.getItem('viewingStudentId') || '') : ''));

    const [localStudent, setLocalStudent] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const sid = activeStudentId || localStorage.getItem('viewingStudentId');
            if (sid) {
                const stored = localStorage.getItem('student_profile_offline_' + sid) || 
                               localStorage.getItem('cached_student_profile_' + sid);
                if (stored) {
                    try {
                        return JSON.parse(stored);
                    } catch(e) {
                        console.error(e);
                    }
                }
            }
            const fallback = localStorage.getItem('mola5saty_active_student_profile');
            if (fallback) {
                try {
                    return JSON.parse(fallback);
                } catch(e) {}
            }
        }
        return null;
    });

    useEffect(() => {
        const reloadLocalProfile = () => {
            const sid = activeStudentId || (typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null);
            if (sid) {
                const stored = localStorage.getItem('student_profile_offline_' + sid) || 
                               localStorage.getItem('cached_student_profile_' + sid);
                if (stored) {
                    try {
                        setLocalStudent(JSON.parse(stored));
                        return;
                    } catch(e) {
                        console.error(e);
                    }
                }
            }
            if (typeof window !== 'undefined') {
                const fallback = localStorage.getItem('mola5saty_active_student_profile');
                if (fallback) {
                    try {
                        setLocalStudent(JSON.parse(fallback));
                    } catch(e) {}
                }
            }
        };

        reloadLocalProfile();
        window.addEventListener('storage', reloadLocalProfile);
        return () => window.removeEventListener('storage', reloadLocalProfile);
    }, [activeStudentId]);

    const canFetchFromCloud = !!activeStudentId && typeof activeStudentId === 'string' && !activeStudentId.startsWith('offline_');
    const { student: cloudStudent, isLoading: isCloudStudentLoading } = useStudent(canFetchFromCloud ? activeStudentId : null);
    const student = cloudStudent || localStudent;
    const isStudentLoading = (isUserLoading || isCloudStudentLoading) && !student;

    // Cache student profile locally when fetched successfully from the cloud
    useEffect(() => {
        if (student) {
            localStorage.setItem('mola5saty_active_student_profile', JSON.stringify(student));
            if (student.barcodeId) {
                localStorage.setItem('studentBarcode', student.barcodeId);
                localStorage.setItem('studentBarcodeId', student.barcodeId);
                localStorage.setItem('studentCode', student.barcodeId);
            }
            if (student.id) {
                localStorage.setItem('viewingStudentId', student.id);
            }
        }
        if (cloudStudent && activeStudentId && typeof activeStudentId === 'string' && !activeStudentId.startsWith('offline_')) {
            localStorage.setItem('cached_student_profile_' + activeStudentId, JSON.stringify(cloudStudent));
            localStorage.setItem('mola5saty_active_student_profile', JSON.stringify(cloudStudent));
        }
    }, [student, cloudStudent, activeStudentId]);

    // Background sync for offline signups
    useEffect(() => {
        if (!navigator.onLine || !firestore || !auth) return;
        
        const syncOfflineSignups = async () => {
            const pending = JSON.parse(localStorage.getItem('pendingOfflineStudentSignups') || '[]');
            if (pending.length === 0) return;

            const remainingPending = [];
            for (const studentData of pending) {
                try {
                    let registeredStudent: any = null;
                    if (auth.currentUser) {
                        const cloudStudentId = auth.currentUser.uid;
                        const finalBarcodeId = studentData.barcodeId || ('9' + Math.floor(1000 + Math.random() * 9000));
                        registeredStudent = {
                            id: cloudStudentId,
                            barcodeId: finalBarcodeId,
                            name: studentData.name,
                            age: Number(studentData.age),
                            phoneNumber: studentData.phoneNumber,
                            governorate: studentData.governorate || 'مصر',
                            university: studentData.university || '',
                            facultyCategory: studentData.facultyCategory || '',
                            facultyLabel: studentData.facultyLabel || studentData.facultyCategory || '',
                            academicYear: studentData.academicYear || '',
                            academicYearLabel: studentData.academicYearLabel || studentData.academicYear || '',
                            universityId: studentData.universityId || '',
                            grade: studentData.academicYearLabel || studentData.grade || 'جامعي',
                            activeSubscriptions: [],
                        };
                        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                        await setDoc(doc(firestore, 'students', cloudStudentId), {
                            ...registeredStudent,
                            createdAt: serverTimestamp(),
                        });
                    }

                    if (!registeredStudent) {
                        remainingPending.push(studentData);
                        continue;
                    }

                    const cloudStudentId = registeredStudent.id;
                    const finalBarcodeId = registeredStudent.barcodeId;

                    const currentViewingId = localStorage.getItem('viewingStudentId');
                    if (currentViewingId === studentData.id) {
                        localStorage.setItem('viewingStudentId', cloudStudentId);
                        setLocalStudent(registeredStudent);
                    }

                    localStorage.setItem('cached_student_profile_' + cloudStudentId, JSON.stringify(registeredStudent));
                    localStorage.removeItem('student_profile_offline_' + studentData.id);

                    toast({
                        title: "Account Synchronized! 🎉",
                        description: `Welcome online, ${studentData.name}! Your account has been synchronized with the cloud. Your Student Code is ${finalBarcodeId}.`,
                    });
                } catch (e: any) {
                    console.error("Failed to sync offline signup", e);
                    remainingPending.push(studentData);
                }
            }
            localStorage.setItem('pendingOfflineStudentSignups', JSON.stringify(remainingPending));
        };

        const timer = setTimeout(() => {
            syncOfflineSignups();
        }, 3000);
        return () => clearTimeout(timer);
    }, [firestore, auth, activeStudentId, toast]);

    // 2. Pure Theme & Avatar Customizer Engine
    const [equippedTheme, setEquippedTheme] = useState<string>('default');
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [avatarTab, setAvatarTab] = useState<'avatar' | 'theme' | 'icons'>('avatar');
    const [academicYearModalOpen, setAcademicYearModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [libraryThemesList, setLibraryThemesList] = useState<AppThemeAsset[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [connectedProfessors, setConnectedProfessors] = useState<ProfessorItem[]>([]);

    useEffect(() => {
        const loadConnected = () => {
            const list = getStudentConnectedProfessors(activeStudentId);
            setConnectedProfessors(list);
        };
        loadConnected();
        window.addEventListener('connected_professors_updated', loadConnected);
        window.addEventListener('storage', loadConnected);
        return () => {
            window.removeEventListener('connected_professors_updated', loadConnected);
            window.removeEventListener('storage', loadConnected);
        };
    }, [activeStudentId]);

    const availableAppIcons = useMemo(() => {
        const list = [
            {
                id: 'default',
                titleAr: 'أيقونة ملخصاتي الرسمية',
                titleEn: 'Mola5saty Official Icon',
                subtitleAr: 'الشعار الأكاديمي الأساسي (ورقة ملخصاتي الخضراء)',
                subtitleEn: 'Default platform academic emblem',
                iconEmoji: '🍃',
                iconPath: null as string | null,
                badgeAr: 'الافتراضي',
                badgeEn: 'Default',
                color: '#22c55e',
                borderClass: 'border-emerald-500/40',
                bgClass: 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-500',
            }
        ];

        connectedProfessors.forEach(prof => {
            list.push({
                id: prof.code.toLowerCase(),
                titleAr: prof.appNameAr,
                titleEn: prof.appNameEn,
                subtitleAr: `شعار ${prof.name} (${prof.subjectAr})`,
                subtitleEn: `${prof.name} Portal (${prof.subjectEn})`,
                iconEmoji: prof.appIconEmoji,
                iconPath: prof.appIconPath,
                badgeAr: `أستاذ المادة [ ${prof.code} ]`,
                badgeEn: `Doctor [ ${prof.code} ]`,
                color: prof.themeColor,
                borderClass: 'border-blue-500/40',
                bgClass: 'bg-blue-500/10 dark:bg-blue-950/30 text-blue-500',
            });
        });

        return list;
    }, [connectedProfessors]);

    const [selectedAppIcon, setSelectedAppIcon] = useState<string>(() => {
        if (typeof window !== 'undefined' && activeStudentId) {
            return localStorage.getItem('student_app_icon_' + activeStudentId) || 'default';
        }
        return 'default';
    });

    const handleSelectAppIcon = (iconId: string) => {
        setSelectedAppIcon(iconId);
        if (typeof window !== 'undefined') {
            if (activeStudentId) {
                localStorage.setItem('student_app_icon_' + activeStudentId, iconId);
            }
            localStorage.setItem('app_active_selected_icon', iconId);

            const matchedProf = connectedProfessors.find(p => p.code.toLowerCase() === iconId.toLowerCase());
            if (matchedProf) {
                setActiveProfessorBranding(matchedProf, activeStudentId);
            } else if (iconId === 'default') {
                localStorage.removeItem('app_custom_branding_title');
                window.dispatchEvent(new Event('app_branding_changed'));
            }

            window.dispatchEvent(new Event('app_icon_changed'));
        }
        const selected = availableAppIcons.find(i => i.id === iconId);
        toast({
            title: isArabic ? 'تم اختيار أيقونة التطبيق! 📱' : 'App Icon Selected! 📱',
            description: isArabic 
                ? `تم تعيين: ${selected ? selected.titleAr : 'أيقونة التطبيق'}` 
                : `Set to: ${selected ? selected.titleEn : 'Selected App Icon'}`,
        });
    };

    const setAppThemeMode = (mode: 'dark' | 'light') => {
        const isDark = mode === 'dark';
        setIsDarkMode(isDark);
        try {
            localStorage.setItem('mola5saty_theme', mode);
            localStorage.setItem('app_mode_dark', mode);
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            setTimeout(() => {
                window.dispatchEvent(new Event('app_theme_changed'));
            }, 10);
        } catch (e) {
            console.error(e);
        }
        toast({
            title: isArabic 
                ? (isDark ? 'تم تفعيل الوضع الداكن (الأسود) 🌙' : 'تم تفعيل الوضع النهاري (الأبيض) ☀️')
                : (isDark ? 'Black / Dark Mode Activated 🌙' : 'White / Light Mode Activated ☀️'),
            description: isArabic
                ? 'تم ضبط مظهر التطبيق بنجاح.'
                : 'Interface theme appearance updated.',
        });
    };

    const [customAvatarImg, setCustomAvatarImg] = useState<string | null>(() => {
        if (typeof window !== 'undefined' && activeStudentId) {
            return localStorage.getItem('student_custom_avatar_' + activeStudentId) || null;
        }
        return null;
    });
    const [avatarEmoji, setAvatarEmoji] = useState<string>(() => {
        if (typeof window !== 'undefined' && activeStudentId) {
            return localStorage.getItem('student_avatar_emoji_' + activeStudentId) || '👨‍🎓';
        }
        return '👨‍🎓';
    });

    const AVATAR_PRESETS = [
        { emoji: '👨‍🎓', labelAr: 'طالب جامعي', labelEn: 'Male Scholar' },
        { emoji: '👩‍🎓', labelAr: 'طالبة جامعية', labelEn: 'Female Scholar' },
        { emoji: '🧑‍🎓', labelAr: 'باحث أكاديمي', labelEn: 'Academic Scholar' },
        { emoji: '🦁', labelAr: 'القائد الشجاع', labelEn: 'Lion Leader' },
        { emoji: '🦅', labelAr: 'الصقر الثاقب', labelEn: 'Eagle Focus' },
        { emoji: '⚡', labelAr: 'النابغة السريع', labelEn: 'Lightning Mind' },
        { emoji: '🚀', labelAr: 'رائد الطموح', labelEn: 'Astro Vision' },
        { emoji: '🧠', labelAr: 'العقل المفكر', labelEn: 'Genius Brain' },
        { emoji: '💎', labelAr: 'الماس المعرفة', labelEn: 'Diamond Mind' },
        { emoji: '👑', labelAr: 'المتفوق الأول', labelEn: 'Top Achiever' },
        { emoji: '🔥', labelAr: 'الشغف المتوقد', labelEn: 'Burning Passion' },
        { emoji: '🎯', labelAr: 'الهدف الدقيق', labelEn: 'Target Master' },
    ];

    const handleSelectEmoji = (emoji: string) => {
        setAvatarEmoji(emoji);
        setCustomAvatarImg(null);
        if (typeof window !== 'undefined' && activeStudentId) {
            localStorage.setItem('student_avatar_emoji_' + activeStudentId, emoji);
            localStorage.removeItem('student_custom_avatar_' + activeStudentId);
        }
        toast({
            title: isArabic ? 'تم تحديث صورة الأفاتار! ✨' : 'Avatar Updated! ✨',
            description: isArabic ? 'تم حفظ مظهرك الرمزي الجديد.' : 'Your profile avatar has been saved.',
        });
    };

    const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast({
                variant: 'destructive',
                title: isArabic ? 'حجم الصورة كبير' : 'File too large',
                description: isArabic ? 'الحد الأقصى لحجم الصورة 2 ميجابايت.' : 'Maximum image size is 2MB.',
            });
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
                setCustomAvatarImg(base64);
                if (typeof window !== 'undefined' && activeStudentId) {
                    localStorage.setItem('student_custom_avatar_' + activeStudentId, base64);
                }
                toast({
                    title: isArabic ? 'تم حفظ صورتك الشخصية محلياً! 📸' : 'Photo Saved Locally! 📸',
                    description: isArabic ? 'صورتك محفوظة بجهازك فقط.' : 'Your profile photo is saved locally on your device.',
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveCustomAvatar = () => {
        setCustomAvatarImg(null);
        if (typeof window !== 'undefined' && activeStudentId) {
            localStorage.removeItem('student_custom_avatar_' + activeStudentId);
        }
        toast({
            title: isArabic ? 'تمت العودة للأفاتار الرمزي' : 'Reset to Emoji Avatar',
        });
    };

    // Fast reactive sync with dark/light mode button in Header
    useEffect(() => {
        const checkDarkMode = () => {
            if (typeof window !== 'undefined') {
                const isDark = document.documentElement.classList.contains('dark') ||
                               localStorage.getItem('mola5saty_theme') === 'dark' ||
                               localStorage.getItem('app_mode_dark') === 'dark';
                setIsDarkMode(prev => (prev !== isDark ? isDark : prev));
            }
        };

        checkDarkMode();
        window.addEventListener('app_theme_changed', checkDarkMode);
        window.addEventListener('storage', checkDarkMode);
        return () => {
            window.removeEventListener('app_theme_changed', checkDarkMode);
            window.removeEventListener('storage', checkDarkMode);
        };
    }, []);

    const sanitizedAcademicYear = getSanitizedAcademicYear(student, isArabic);

    const [selectedYearId, setSelectedYearId] = useState<string>('year_1');

    useEffect(() => {
        if (student) {
            const rawYear = student.academicYear || student.academicYearLabel || student.grade;
            const match = ACADEMIC_YEARS_LIST.find(y => 
                y.id === rawYear || 
                y.nameAr === rawYear || 
                y.nameEn === rawYear ||
                (student.academicYear && y.id === student.academicYear)
            );
            if (match) {
                setSelectedYearId(match.id);
            } else if (student.academicYear) {
                setSelectedYearId(student.academicYear);
            }
        }
    }, [student]);

    const handleSaveAcademicYear = async (yearId: string) => {
        const yearObj = ACADEMIC_YEARS_LIST.find(y => y.id === yearId);
        if (!yearObj || !student) return;

        setSelectedYearId(yearId);
        const labelAr = yearObj.nameAr;
        const labelEn = yearObj.nameEn;
        const activeLabel = isArabic ? labelAr : labelEn;

        const updated = {
            ...student,
            academicYear: yearObj.id,
            academicYearLabel: activeLabel,
            grade: activeLabel,
        };
        setLocalStudent(updated);

        if (activeStudentId) {
            localStorage.setItem('cached_student_profile_' + activeStudentId, JSON.stringify(updated));
        }

        if (firestore && activeStudentId && typeof activeStudentId === 'string' && !activeStudentId.startsWith('offline_')) {
            try {
                await setDoc(doc(firestore, 'students', activeStudentId), {
                    academicYear: yearObj.id,
                    academicYearLabel: activeLabel,
                    grade: activeLabel,
                }, { merge: true });
                await setDoc(doc(firestore, 'users', activeStudentId), {
                    academicYear: activeLabel,
                }, { merge: true });
            } catch (err) {
                console.error('Failed to update academic year in cloud:', err);
            }
        }

        toast({
            title: isArabic ? 'تم تحديث الفرقة الدراسية بنجاح! 🎓' : 'Academic Stage Updated! 🎓',
            description: isArabic ? `تم تعيين قيدك إلى: ${yearObj.nameAr}` : `Academic stage set to: ${yearObj.nameEn}`,
        });
        setAcademicYearModalOpen(false);
    };

    useEffect(() => {
        const loadEquipped = () => {
            if (typeof window !== 'undefined' && activeStudentId) {
                const stored = localStorage.getItem('student-equipped-theme-' + activeStudentId) || 
                               localStorage.getItem('app_active_global_theme') || 
                               'default';
                setEquippedTheme(stored);
            }
        };

        loadEquipped();
        window.addEventListener('app_theme_changed', loadEquipped);
        window.addEventListener('app_branding_changed', loadEquipped);

        if (!firestore) return;
        const fetchThemes = async () => {
            try {
                const themesSnap = await getDocs(collection(firestore, 'library_themes'));
                const loaded: AppThemeAsset[] = [];
                themesSnap.forEach((docSnap) => {
                    loaded.push({ id: docSnap.id, ...docSnap.data() } as AppThemeAsset);
                });
                if (loaded.length > 0) {
                    setLibraryThemesList(loaded);
                }
            } catch (err) {
                console.error("Failed to fetch cloud themes:", err);
            }
        };
        fetchThemes();

        return () => {
            window.removeEventListener('app_theme_changed', loadEquipped);
            window.removeEventListener('app_branding_changed', loadEquipped);
        };
    }, [firestore, activeStudentId]);

    // Active real-time listener for theme updates
    useEffect(() => {
        if (!firestore || !activeStudentId || typeof activeStudentId !== 'string' || activeStudentId.startsWith('offline_')) return;
        const customRef = doc(firestore, 'students', activeStudentId, 'customizations', 'profile');
        const unsub = onSnapshot(customRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.equippedTheme) {
                    setEquippedTheme(data.equippedTheme);
                    localStorage.setItem('student-equipped-theme-' + activeStudentId, data.equippedTheme);
                }
            }
        });
        return () => unsub();
    }, [firestore, activeStudentId]);

    const handleEquipTheme = async (themeId: string) => {
        setEquippedTheme(themeId);
        if (activeStudentId) {
            localStorage.setItem('student-equipped-theme-' + activeStudentId, themeId);
        }
        localStorage.setItem('app_active_global_theme', themeId);

        if (firestore && activeStudentId && typeof activeStudentId === 'string' && !activeStudentId.startsWith('offline_')) {
            try {
                const customRef = doc(firestore, 'students', activeStudentId, 'customizations', 'profile');
                await setDoc(customRef, { equippedTheme: themeId }, { merge: true });
                AppCache.clear(`doc_students/${activeStudentId}`);
            } catch (e) {
                console.error("Error saving theme to Firestore:", e);
            }
        }

        toast({
            title: isArabic ? 'تم تفعيل المظهر بنجاح! ✨' : 'Theme Activated! ✨',
            description: isArabic ? 'تم تغيير ألوان ومظهر المنصة بالكامل.' : 'Your interface appearance has been updated.',
        });
        setThemeModalOpen(false);
    };

    const BUILTIN_THEMES = [
        {
            id: 'default',
            nameAr: 'ملخصاتي رويال (الأزرق الجامعي)',
            nameEn: 'Mola5saty Royal Blue (Primary)',
            accent: '#2563eb',
            previewBg: '#070b14',
            previewCard: '#0e172a',
            border: '#1e3a8a',
            desc: isArabic 
                ? 'الثيم الأزرق الملكي المعتمد للمنصة، متوفر بالنمطين النهاري والليلي' 
                : 'Primary Royal Navy Blue theme with crisp typography and light/dark modes'
        },
        {
            id: 'theme_emerald',
            nameAr: 'الزمردي الأكاديمي (الأخضر)',
            nameEn: 'Academic Emerald Green',
            accent: '#10b981',
            previewBg: '#04130d',
            previewCard: '#072418',
            border: '#059669',
            desc: isArabic 
                ? 'ثيم الأخضر الزمردي المريح للعين أثناء المذاكرة، متوفر بالنمطين النهاري والليلي' 
                : 'Refreshing clinical green theme designed for long study sessions'
        },
    ];

    const copyBarcode = () => {
        if (student?.barcodeId) {
            navigator.clipboard.writeText(student.barcodeId);
            toast({
                title: isArabic ? 'تم نسخ كود الطالب! 📋' : 'Student Code Copied! 📋',
                description: `ID: ${student.barcodeId}`,
            });
        }
    };

    const downloadQR = async () => {
        if (!student?.barcodeId) return;
        try {
            const canvas = document.getElementById('student-qr-canvas') as HTMLCanvasElement;
            if (canvas) {
                canvas.toBlob((blob) => {
                    if (blob) {
                        saveAs(blob, `${student.name.replace(/\s+/g, '_')}_Student_Card.png`);
                        toast({ title: isArabic ? 'تم تحميل بطاقة الـ QR' : 'QR Card Downloaded' });
                    }
                });
                return;
            }
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${student.barcodeId}&bgcolor=ffffff`;
            const response = await fetch(url);
            const blob = await response.blob();
            saveAs(blob, `${student.name.replace(/\s+/g, '_')}_Student_Card.png`);
            toast({ title: isArabic ? 'تم تحميل بطاقة الـ QR' : 'QR Card Downloaded' });
        } catch (error) {
            toast({ variant: 'destructive', title: isArabic ? 'فشل التحميل' : 'Download Failed' });
        }
    };

    const handleLogout = async () => {
        try {
            if (auth) {
                await auth.signOut();
            }
        } catch (e) {
            console.error("Logout failed:", e);
        }
        clearAllStudentAuthSessions();
        window.location.href = '/signup-options';
    };

    const themeStyles = useMemo(() => {
        return getThemeStyles(equippedTheme, isDarkMode, libraryThemesList);
    }, [equippedTheme, isDarkMode, libraryThemesList]);

    const activeCustomTheme = useMemo(() => {
        return libraryThemesList.find(t => t.themeClass === equippedTheme || t.id === equippedTheme);
    }, [libraryThemesList, equippedTheme]);

    const isDark = isDarkMode;

    if (isStudentLoading && !student) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                <Skeleton className="h-32 w-full rounded-3xl bg-blue-950/20" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 w-full rounded-3xl bg-blue-950/20" />
                    <Skeleton className="h-96 lg:col-span-2 rounded-3xl bg-blue-950/20" />
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="p-6 max-w-md mx-auto my-12 text-center space-y-4 bg-[#0d1629] border border-blue-500/20 rounded-3xl text-white">
                <AlertCircle className="w-12 h-12 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold">Student Profile Not Found</h2>
                <p className="text-xs text-zinc-400">
                    If you just created an account, your details might take a moment to initialize.
                </p>
                <div className="flex gap-3 justify-center pt-2">
                    <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-500">
                        Refresh
                    </Button>
                    <Button onClick={() => router.push('/login')} variant="outline" className="border-zinc-700">
                        Sign In
                    </Button>
                </div>
            </div>
        );
    }

    const studentDisplayName = student?.name || user?.displayName || (student?.barcodeId ? (isArabic ? `طالب [${student.barcodeId}]` : `Student [${student.barcodeId}]`) : (isArabic ? 'طالب جامعي' : 'University Scholar'));

    return (
        <div 
            className="scholar-theme min-h-screen select-none transition-colors duration-200 relative overflow-hidden"
            style={{
                ...themeStyles,
                background: 'var(--bg)',
                color: 'var(--ink)',
            }}
        >
            {/* Live Grid Overlay from Theme */}
            {activeCustomTheme?.gridPattern === 'dots' && (
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(var(--ink) 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
            )}
            {activeCustomTheme?.gridPattern === 'lines' && (
              <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: `linear-gradient(to right, var(--ink) 1px, transparent 1px), linear-gradient(to bottom, var(--ink) 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
            )}
            {activeCustomTheme?.gridPattern === 'cyber' && (
              <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: `linear-gradient(0deg, transparent 24%, var(--accent)1a 25%, var(--accent)1a 26%, transparent 27%, transparent 74%, var(--accent)1a 75%, var(--accent)1a 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, var(--accent)1a 25%, var(--accent)1a 26%, transparent 27%, transparent 74%, var(--accent)1a 75%, var(--accent)1a 76%, transparent 77%, transparent)`, backgroundSize: '32px 32px' }} />
            )}
            {activeCustomTheme?.gridPattern === 'stars' && (
              <div className="absolute inset-0 pointer-events-none opacity-30 text-center select-none text-[8px] pt-1">✨  *  ✦  ⭐  *  ✦  ✨</div>
            )}

            <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 pb-24 space-y-6 relative z-10">
                
                {/* 1. Header Banner: Welcome, Avatar & Quick Controls */}
                <div 
                    className="p-6 sm:p-8 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors"
                    style={{
                        boxShadow: activeCustomTheme?.cardCustomizations?.season_hero?.glowIntensity === 'neon' ? '0 0 24px var(--accent)' : undefined
                    }}
                >
                    {/* Floating Badge Emoji from Theme if configured */}
                    {activeCustomTheme?.cardCustomizations?.season_hero?.badgeEmoji && (
                        <div className="absolute top-3 right-3 text-2xl select-none drop-shadow animate-bounce z-20">
                            {activeCustomTheme.cardCustomizations.season_hero.badgeEmoji}
                        </div>
                    )}
                    {/* Glowing ambient background blob */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5 z-10 flex-1">
                        {/* Interactive Profile Avatar & Pen Customizer */}
                        <div className="relative group shrink-0">
                            <button
                                onClick={() => { setAvatarTab('avatar'); setThemeModalOpen(true); }}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-white/20 shadow-md flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900 transition-transform group-hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-[var(--accent)]/30"
                                title={isArabic ? 'تعديل الصورة والأفاتار' : 'Edit Avatar & Photo'}
                            >
                                {customAvatarImg ? (
                                    <img src={customAvatarImg} alt="Student Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl sm:text-4xl select-none leading-none">{avatarEmoji}</span>
                                )}
                            </button>
                            
                            {/* Pen Edit Button on avatar */}
                            <button
                                onClick={() => { setAvatarTab('avatar'); setThemeModalOpen(true); }}
                                aria-label="Edit Avatar and Theme"
                                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform border-2 border-white dark:border-slate-900"
                                title={isArabic ? 'تعديل الصورة والمظهر' : 'Customize Avatar & Theme'}
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                                    🎓 MOLA5SATY // SCHOLAR
                                </span>
                                {student.governorate && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-[var(--accent)]" />
                                        {student.governorate}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                                <span>{studentDisplayName}</span>
                            </h1>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium flex items-center gap-2 flex-wrap">
                                {student.university && (
                                    <span className="text-slate-800 dark:text-zinc-200 font-semibold flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        {student.university}
                                    </span>
                                )}
                                {student.facultyLabel && (
                                    <>
                                        <span className="text-slate-400 dark:text-zinc-600">•</span>
                                        <span className="text-[var(--accent)] font-semibold">
                                            {student.facultyLabel}
                                        </span>
                                    </>
                                )}
                                {sanitizedAcademicYear && (
                                    <>
                                        <span className="text-slate-400 dark:text-zinc-600">•</span>
                                        <span className="text-slate-700 dark:text-zinc-300 font-medium">
                                            {sanitizedAcademicYear}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons: Unified Avatar & Theme Customizer */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto z-10 shrink-0">
                        <Button
                            onClick={() => { setAvatarTab('avatar'); setThemeModalOpen(true); }}
                            variant="outline"
                            className="w-full md:w-auto h-11 px-5 rounded-2xl border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold text-xs gap-2 transition-all hover:scale-105 shadow-xs cursor-pointer"
                        >
                            <Palette className="w-4 h-4 text-[var(--accent)]" />
                            <span>{isArabic ? 'المظهر والأيقونات' : 'Themes & Icons'}</span>
                        </Button>
                    </div>
                </div>

                {/* 2. Main Content Grid: Left Column (Identity & Dossier) + Right Column (Courses & Tests) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Digital Student ID & Academic Dossier (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Digital Student Card & QR Presentation */}
                        <div 
                            className="p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md space-y-5 relative overflow-hidden transition-colors"
                            style={{
                                borderColor: isDark && activeCustomTheme?.cardCustomizations?.season_hero?.borderColor ? activeCustomTheme.cardCustomizations.season_hero.borderColor : undefined,
                                background: isDark && activeCustomTheme?.cardCustomizations?.season_hero?.bgColor ? activeCustomTheme.cardCustomizations.season_hero.bgColor : undefined,
                            }}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                <div>
                                    <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-zinc-400 font-semibold">
                                        SCHOLAR DIGITAL PASS
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">بطاقة الهوية الجامعية</h3>
                                </div>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            </div>

                            {/* Crisp High-Res QR Presentation */}
                            <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 dark:border-transparent flex flex-col items-center justify-center mx-auto max-w-[220px]">
                                {student.barcodeId ? (
                                    <>
                                        <QRCodeSVG
                                            value={student.barcodeId}
                                            size={170}
                                            level="H"
                                            includeMargin={false}
                                            className="w-[170px] h-[170px] rounded-lg"
                                        />
                                        <div className="hidden">
                                            <QRCodeCanvas
                                                id="student-qr-canvas"
                                                value={student.barcodeId}
                                                size={500}
                                                level="H"
                                                includeMargin={true}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-8 text-center text-zinc-400">
                                        <QrCode className="w-12 h-12 mx-auto mb-2 text-zinc-400" />
                                        <span className="text-xs">No Barcode</span>
                                    </div>
                                )}
                            </div>

                            {/* Barcode ID Display */}
                            <div className="text-center space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-zinc-400 font-semibold">
                                    STUDENT CODE / كود الطالب
                                </span>
                                <div className="text-xl sm:text-2xl font-black font-mono tracking-widest text-[var(--accent)]">
                                    [ {student.barcodeId} ]
                                </div>
                            </div>

                            {/* Card Control Buttons */}
                            <div className="grid grid-cols-2 gap-2.5 pt-2">
                                <button
                                    onClick={copyBarcode}
                                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                                >
                                    <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
                                    <span>{isArabic ? 'نسخ الكود' : 'Copy ID'}</span>
                                </button>
                                <button
                                    onClick={downloadQR}
                                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                                >
                                    <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                                    <span>{isArabic ? 'حفظ البطاقة' : 'Save QR'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Complete Academic Registry (بيانات القيد والتسجيل الجامعي) */}
                        <div 
                            className="p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md space-y-4 relative overflow-hidden transition-colors"
                            style={{
                                borderColor: isDark && activeCustomTheme?.cardCustomizations?.registry?.borderColor ? activeCustomTheme.cardCustomizations.registry.borderColor : undefined,
                                background: isDark && activeCustomTheme?.cardCustomizations?.registry?.bgColor ? activeCustomTheme.cardCustomizations.registry.bgColor : undefined,
                            }}
                        >
                            {activeCustomTheme?.cardCustomizations?.registry?.badgeEmoji && (
                                <div className="absolute top-3 right-3 text-xl select-none drop-shadow">
                                    {activeCustomTheme.cardCustomizations.registry.badgeEmoji}
                                </div>
                            )}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                <div>
                                    <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-zinc-400 font-semibold">
                                        ACADEMIC DOSSIER
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">بيانات القيد الجامعي</h3>
                                </div>
                                <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                            </div>

                            <div className="space-y-3 divide-y divide-slate-100 dark:divide-zinc-800">
                                {/* University */}
                                <div className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
                                    <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 shrink-0">
                                        <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        <span>{isArabic ? 'الجامعة' : 'University'}:</span>
                                    </span>
                                    <span className="text-slate-900 dark:text-white font-semibold text-right max-w-[220px]">
                                        {student.university || (isArabic ? 'غير محددة' : 'Not Specified')}
                                    </span>
                                </div>

                                {/* Faculty / Major */}
                                <div className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                                    <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 shrink-0">
                                        <School className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        <span>{isArabic ? 'الكلية / التخصص' : 'Faculty / Major'}:</span>
                                    </span>
                                    <span className="text-slate-900 dark:text-white font-semibold text-right max-w-[220px]">
                                        {student.facultyLabel || student.facultyCategory || (isArabic ? 'كلية عامة' : 'General')}
                                    </span>
                                </div>

                                {/* Academic Year with Interactive Edit Option */}
                                <div className="pt-2.5 flex items-center justify-between gap-3 text-xs">
                                    <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 shrink-0">
                                        <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        <span>{isArabic ? 'الفرقة الدراسية' : 'Academic Year'}:</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--accent)] font-bold text-right">
                                            {student.academicYearLabel || student.academicYear || student.grade || (isArabic ? 'الفرقة الأولى' : '1st Year')}
                                        </span>
                                        <button
                                            onClick={() => setAcademicYearModalOpen(true)}
                                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-[10px] transition-all hover:scale-105 active:scale-95 shadow-2xs"
                                            title={isArabic ? 'تعديل الفرقة الدراسية' : 'Change Academic Year'}
                                        >
                                            {isArabic ? 'تعديل' : 'Change'}
                                        </button>
                                    </div>
                                </div>

                                {/* Governorate */}
                                <div className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                                    <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 shrink-0">
                                        <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        <span>{isArabic ? 'المحافظة' : 'Governorate'}:</span>
                                    </span>
                                    <span className="text-slate-900 dark:text-white font-semibold text-right">
                                        {student.governorate || (isArabic ? 'جمهورية مصر العربية' : 'Egypt')}
                                    </span>
                                </div>

                                {/* University ID */}
                                {student.universityId && (
                                    <div className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 shrink-0">
                                            <QrCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                                            <span>{isArabic ? 'الرقم الجامعي' : 'University ID'}:</span>
                                        </span>
                                        <span className="text-slate-900 dark:text-white font-mono font-bold text-right">
                                            {student.universityId}
                                        </span>
                                    </div>
                                )}

                                {/* Phone Number */}
                                {student.phoneNumber && (
                                    <div className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                                        <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5 shrink-0">
                                            <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
                                            <span>{isArabic ? 'رقم الهاتف' : 'Phone'}:</span>
                                        </span>
                                        <span className="text-slate-900 dark:text-white font-mono font-medium text-right">
                                            {student.phoneNumber}
                                        </span>
                                    </div>
                                )}

                                {/* Academic Attendance Tracking (No payments, pure attendance) */}
                                <div className="pt-3 flex items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 block font-semibold">
                                            {isArabic ? 'سجل الحضور الأكاديمي' : 'ATTENDANCE LOGS'}
                                        </span>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {isArabic ? 'حساب حضور نشط' : 'Active Attendance'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsAttendanceModalOpen(true)}
                                        className="py-1.5 px-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-white/10 text-blue-700 dark:text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                                    >
                                        <History className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        <span>{isArabic ? 'عرض السجل' : 'View History'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Academic Courses & Lectures + Test Results (7 cols on lg) */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Enrolled Academic Modules & Lectures */}
                        <div 
                            className="p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md space-y-4 relative overflow-hidden transition-colors"
                            style={{
                                borderColor: isDark && activeCustomTheme?.cardCustomizations?.learning_track?.borderColor ? activeCustomTheme.cardCustomizations.learning_track.borderColor : undefined,
                                background: isDark && activeCustomTheme?.cardCustomizations?.learning_track?.bgColor ? activeCustomTheme.cardCustomizations.learning_track.bgColor : undefined,
                            }}
                        >
                            {activeCustomTheme?.cardCustomizations?.learning_track?.badgeEmoji && (
                                <div className="absolute top-3 right-3 text-xl select-none drop-shadow">
                                    {activeCustomTheme.cardCustomizations.learning_track.badgeEmoji}
                                </div>
                            )}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                <div>
                                    <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-zinc-400 font-semibold">
                                        UNIVERSITY LECTURE VAULT
                                    </span>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        {isArabic ? 'المحاضرات وملخصات الكلية' : 'Enrolled Lectures & Summaries'}
                                    </h3>
                                </div>
                                <BookOpen className="w-5 h-5 text-[var(--accent)]" />
                            </div>

                            <div className="min-h-[180px]">
                                <Suspense fallback={<div className="text-xs text-slate-500 dark:text-zinc-400 font-mono py-8 text-center">Loading university courses...</div>}>
                                    <StudentCourses studentId={studentId} />
                                </Suspense>
                            </div>
                        </div>

                        {/* Assessments & Examination Results */}
                        <div 
                            className="p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-md space-y-4 relative overflow-hidden transition-colors"
                            style={{
                                borderColor: isDark && activeCustomTheme?.cardCustomizations?.performance?.borderColor ? activeCustomTheme.cardCustomizations.performance.borderColor : undefined,
                                background: isDark && activeCustomTheme?.cardCustomizations?.performance?.bgColor ? activeCustomTheme.cardCustomizations.performance.bgColor : undefined,
                            }}
                        >
                            {activeCustomTheme?.cardCustomizations?.performance?.badgeEmoji && (
                                <div className="absolute top-3 right-3 text-xl select-none drop-shadow">
                                    {activeCustomTheme.cardCustomizations.performance.badgeEmoji}
                                </div>
                            )}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                                <div>
                                    <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-zinc-400 font-semibold">
                                        ASSESSMENT & BENCHMARKS
                                    </span>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        {isArabic ? 'نتائج الامتحانات وبنوك الأسئلة' : 'Performance & Exam Benchmarks'}
                                    </h3>
                                </div>
                                <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
                            </div>

                            <div>
                                <Suspense fallback={<div className="text-xs text-slate-500 dark:text-zinc-400 font-mono py-8 text-center">Loading assessment results...</div>}>
                                    <LatestTestResultCard 
                                        testAttemptId={student?.latestTestAttemptId} 
                                        studentId={studentId}
                                        studentPhone={student?.phoneNumber}
                                        studentBarcodeId={student?.barcodeId}
                                        playpen={false} 
                                    />
                                </Suspense>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 3. Pure Theme & Avatar Customizer Dialog */}
                <Dialog open={themeModalOpen} onOpenChange={setThemeModalOpen}>
                    <DialogContent className="max-w-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-blue-500/30 text-slate-800 dark:text-white rounded-3xl p-6 shadow-2xl backdrop-blur-2xl transition-colors">
                        <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl font-bold font-mono tracking-wider text-[var(--accent)] uppercase flex items-center gap-2">
                                <Palette className="w-5 h-5" />
                                <span>{isArabic ? 'تخصيص الحساب والمظهر والأيقونات' : 'Account, Theme & Icons'}</span>
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
                                {isArabic 
                                    ? 'خصص صورتك الشخصية، بدّل بين النمطين الداكن والنهاري، واختر أيقونة المنصة المناسبة لأساتذتك.'
                                    : 'Customize your scholar avatar, toggle dark/light mode, and choose your preferred app icon.'
                                }
                            </DialogDescription>
                        </DialogHeader>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3 mt-2 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setAvatarTab('avatar')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                                    avatarTab === 'avatar' 
                                        ? "bg-[var(--accent)] text-white shadow-xs" 
                                        : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                                )}
                            >
                                <span>🎓</span>
                                <span>{isArabic ? 'الأفاتار والصورة' : 'Avatar & Photo'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvatarTab('theme')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                                    avatarTab === 'theme' 
                                        ? "bg-[var(--accent)] text-white shadow-xs" 
                                        : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                                )}
                            >
                                {isDarkMode ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                                <span>{isArabic ? 'النمط (داكن / فاتح)' : 'Dark / Light'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAvatarTab('icons')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0",
                                    avatarTab === 'icons' 
                                        ? "bg-[var(--accent)] text-white shadow-xs" 
                                        : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800"
                                )}
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'أيقونات التطبيق' : 'App Icons'}</span>
                            </button>
                        </div>

                        {avatarTab === 'avatar' ? (
                            <div className="space-y-5 py-3 max-h-[420px] overflow-y-auto pr-1">
                                {/* Current Avatar Preview & Local Upload */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[var(--accent)] shadow-md flex items-center justify-center bg-white dark:bg-slate-800 shrink-0">
                                        {customAvatarImg ? (
                                            <img src={customAvatarImg} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl select-none leading-none">{avatarEmoji}</span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex-1 text-center sm:text-right">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                            {isArabic ? 'صورة الملف الشخصي المحلية' : 'Local Profile Picture'}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                                            {isArabic ? 'تُحفظ صورتك بأمان على متصفحك الحالي فقط.' : 'Saved securely only in your browser.'}
                                        </p>
                                        <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
                                            <label className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all">
                                                <Upload className="w-3 h-3 text-[var(--accent)]" />
                                                <span>{isArabic ? 'رفع صورة من جهازك' : 'Upload Local Photo'}</span>
                                                <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" />
                                            </label>
                                            {customAvatarImg && (
                                                <button
                                                    onClick={handleRemoveCustomAvatar}
                                                    className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-[11px] font-bold transition-all shadow-2xs"
                                                >
                                                    {isArabic ? 'إزالة الصورة' : 'Remove Photo'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Avatar Presets Grid */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                        <span>✨</span>
                                        <span>{isArabic ? 'اختر الأفاتار المناسب لشخصيتك الأكاديمية:' : 'Or choose a scholar avatar preset:'}</span>
                                    </h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                        {AVATAR_PRESETS.map((preset) => {
                                            const isSelected = !customAvatarImg && avatarEmoji === preset.emoji;
                                            return (
                                                <button
                                                    key={preset.emoji}
                                                    onClick={() => handleSelectEmoji(preset.emoji)}
                                                    className={cn(
                                                        "p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95",
                                                        isSelected 
                                                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-500" 
                                                            : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700"
                                                    )}
                                                >
                                                    <span className="text-2xl sm:text-3xl leading-none">{preset.emoji}</span>
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 truncate max-w-full">
                                                        {isArabic ? preset.labelAr : preset.labelEn}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : avatarTab === 'theme' ? (
                            /* Dark & Light Theme Mode Switcher with Teacher Enforced Theme notice */
                            <div className="space-y-4 py-3 max-h-[420px] overflow-y-auto pr-1">
                                {/* 1. Black / Dark Mode vs White / Light Mode Interactive Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Dark Mode Card */}
                                    <div
                                        onClick={() => setAppThemeMode('dark')}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group select-none",
                                            isDarkMode
                                                ? "border-blue-500 bg-slate-900 text-white shadow-[0_0_25px_rgba(59,130,246,0.25)] ring-2 ring-blue-500"
                                                : "border-slate-200 dark:border-zinc-800 bg-slate-900/80 text-white hover:border-blue-400 opacity-80 hover:opacity-100"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                                                    <Moon className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-white">
                                                        {isArabic ? 'الوضع الداكن (الأسود)' : 'Black / Dark Mode'}
                                                    </h4>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {isArabic ? 'مظهر ليلي مريح للعين' : 'Night Obsidian Theme'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isDarkMode && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                                                    {isArabic ? 'المفعل حالياً' : 'Active'}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-zinc-300 leading-relaxed mb-3">
                                            {isArabic
                                                ? 'شاشة داكنة فائقة التباين والعمق مخصصة لجلسات المذاكرة الطويلة وتقليل إجهاد العين.'
                                                : 'Ultra-contrast deep dark obsidian canvas designed for long late-night study sessions.'}
                                        </p>

                                        {/* Mini Preview Bar */}
                                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/60 border border-white/10">
                                            <div className="w-6 h-3 rounded-xs bg-[#09090b] border border-white/20" title="Dark Canvas" />
                                            <div className="w-6 h-3 rounded-xs bg-[#131316] border border-white/20" title="Dark Card" />
                                            <div className="w-6 h-3 rounded-xs bg-blue-500" title="Accent Glow" />
                                            <span className="text-[9px] text-zinc-400 mr-auto font-mono">#09090b Dark</span>
                                        </div>
                                    </div>

                                    {/* Light Mode Card */}
                                    <div
                                        onClick={() => setAppThemeMode('light')}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group select-none",
                                            !isDarkMode
                                                ? "border-amber-500 bg-white text-slate-900 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-500"
                                                : "border-slate-200 dark:border-zinc-800 bg-white text-slate-900 hover:border-amber-400 opacity-80 hover:opacity-100"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                                                    <Sun className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-xs text-slate-900">
                                                        {isArabic ? 'الوضع النهاري (الأبيض)' : 'White / Light Mode'}
                                                    </h4>
                                                    <span className="text-[10px] text-slate-500">
                                                        {isArabic ? 'إضاءة ناصعة وواضحة' : 'Daylight Crisp Theme'}
                                                    </span>
                                                </div>
                                            </div>
                                            {!isDarkMode && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                                    {isArabic ? 'المفعل حالياً' : 'Active'}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                                            {isArabic
                                                ? 'تصميم ناصع عالي الوضوح مناسب للقراءة في الأماكن المضاءة وقاعات المحاضرات النهارية.'
                                                : 'Bright, high-clarity canvas suitable for reading in well-lit study rooms and lecture halls.'}
                                        </p>

                                        {/* Mini Preview Bar */}
                                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 border border-slate-300">
                                            <div className="w-6 h-3 rounded-xs bg-[#f8fafc] border border-slate-300" title="Light Canvas" />
                                            <div className="w-6 h-3 rounded-xs bg-[#ffffff] border border-slate-300" title="Light Card" />
                                            <div className="w-6 h-3 rounded-xs bg-amber-500" title="Accent Glow" />
                                            <span className="text-[9px] text-slate-500 mr-auto font-mono">#f8fafc Light</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Teacher Enforced Theme System Notice */}
                                <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-50/60 dark:bg-blue-950/20 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
                                            <Lock className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                            <span>{isArabic ? 'نظام ثيمات المعلم الإلزامية (الربط الأكاديمي)' : 'Teacher Enforced Branding System'}</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                                            {isArabic ? 'إلزامي وتلقائي' : 'Enforced'}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                                        {isArabic 
                                            ? 'تم إلغاء اختيار الألوان العشوائية للمنصة. يتم تحديد ألوان وهوية التطبيق تلقائياً وبشكل إلزامي بواسطة أستاذ أو دكتور المادة المرتبط بحسابك. تحكمك الأكاديمي يقتصر على التبديل الحر بين النمط الليلي (الأسود) والنمط النهاري (الأبيض).'
                                            : 'Custom palette picking has been removed. Platform accent branding is strictly enforced by your connected professor. You only control the toggle between Black/Dark and White/Light mode.'
                                        }
                                    </p>

                                    <div className="flex items-center justify-between pt-1 border-t border-blue-200/60 dark:border-blue-900/40 text-[10px] text-slate-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>{isArabic ? 'حالة التزامن: مربوط بهوية الأستاذ الأكاديمية' : 'Sync Status: Linked to Professor Portal'}</span>
                                        </div>
                                        <span className="font-mono text-[9px] opacity-75">v2.4 Auto-Sync</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* 3. Dynamic App Icons Tab */
                            <div className="space-y-4 py-3 max-h-[420px] overflow-y-auto pr-1">
                                {/* Explanatory Header Banner */}
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200 space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-300">
                                        <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>{isArabic ? 'اختيار أيقونة التطبيق لشاشة الهاتف (Dynamic App Icons)' : 'Dynamic Home Screen App Icon Selector'}</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-95">
                                        {isArabic 
                                            ? 'في حال اشتراكك مع أكثر من أستاذ أو دكتور، يمكنك هنا اختيار أيقونة التطبيق وشعار المادة التي تفضلها لتظهر كأيقونة رئيسية للتطبيق على جهازك.'
                                            : 'If you are connected to multiple professors, select which professor portal icon or course badge you want displayed as your main app icon.'}
                                    </p>
                                </div>

                                {/* Icons Selection Grid */}
                                <div className="space-y-2.5">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                                        <span>{isArabic ? 'الأيقونات المتاحة حسب الأساتذة المرتبطين:' : 'Available Professor & Platform Icons:'}</span>
                                    </h4>

                                    <div className="grid grid-cols-1 gap-2.5">
                                        {availableAppIcons.map((iconItem) => {
                                            const isSelected = selectedAppIcon.toLowerCase() === iconItem.id.toLowerCase();
                                            return (
                                                <div
                                                    key={iconItem.id}
                                                    onClick={() => handleSelectAppIcon(iconItem.id)}
                                                    className={cn(
                                                        "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-99 select-none",
                                                        isSelected
                                                            ? "border-blue-500 bg-blue-500/10 shadow-sm ring-2 ring-blue-500/80"
                                                            : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-900/70"
                                                    )}
                                                >
                                                    {/* Icon Preview Box & Details */}
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-md shrink-0 transition-transform group-hover:scale-105 overflow-hidden",
                                                            iconItem.borderClass,
                                                            iconItem.bgClass
                                                        )}>
                                                            {iconItem.iconPath ? (
                                                                <img src={iconItem.iconPath} alt={iconItem.titleEn} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="select-none leading-none">{iconItem.iconEmoji}</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                    {isArabic ? iconItem.titleAr : iconItem.titleEn}
                                                                </h5>
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0",
                                                                    iconItem.borderClass,
                                                                    iconItem.bgClass
                                                                )}>
                                                                    {isArabic ? iconItem.badgeAr : iconItem.badgeEn}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                                                {isArabic ? iconItem.subtitleAr : iconItem.subtitleEn}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Active Status Badge */}
                                                    <div className="shrink-0">
                                                        {isSelected ? (
                                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                                                                <Check className="w-3 h-3" />
                                                                <span>{isArabic ? 'نشط' : 'Active'}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
                                                                {isArabic ? 'اختيار' : 'Select'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {connectedProfessors.length === 0 && (
                                            <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/30 text-center space-y-1">
                                                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                    {isArabic ? 'لم تقم بربط أي أستاذ أو دكتور بعد' : 'No professors connected yet'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                                                    {isArabic 
                                                        ? 'عند إدخال كود الدكتور في صفحة الأساتذة ستظهر أيقونته المخصصة هنا تلقائياً للاختيار.'
                                                        : 'Enter a professor code on the Professors page to unlock their custom app icon here.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Android APK note */}
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] text-slate-600 dark:text-zinc-400 flex items-start gap-2">
                                    <span className="text-amber-500 font-bold shrink-0">💡</span>
                                    <span className="leading-relaxed">
                                        {isArabic
                                            ? 'ملاحظة تقنية: تعمل هذه الميزة كنموذج أولي تفاعلي؛ وفي حزمة الأندرويد (APK) ستتزامن مباشرة مع أيقونة الهاتف الرئيسية عبر ميزة Dynamic Activity Aliases عند اكتمال الربط بنظام الأساتذة.'
                                            : 'Technical note: This functions as an interactive placeholder; in the Android APK it links directly with dynamic activity aliases to switch your home screen icon when teacher portal linking is finalized.'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="border-t border-slate-200 dark:border-zinc-800 pt-3">
                            <Button 
                                onClick={() => setThemeModalOpen(false)}
                                variant="outline"
                                className="border-slate-300 dark:border-zinc-700 text-xs px-5"
                            >
                                {isArabic ? 'إغلاق' : 'Close'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 4. Interactive Academic Year Changer Modal */}
                <Dialog open={academicYearModalOpen} onOpenChange={setAcademicYearModalOpen}>
                    <DialogContent className="max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-blue-500/30 text-slate-800 dark:text-white rounded-3xl p-6 shadow-2xl backdrop-blur-2xl transition-colors">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold font-mono tracking-wider text-[var(--accent)] uppercase flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                <span>{isArabic ? 'تعديل الفرقة الدراسية' : 'Change Academic Year'}</span>
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-zinc-400 text-xs">
                                {isArabic 
                                    ? 'حدد فرقتك الدراسية الحالية لمزامنة المحاضرات ومجموعات المواد بدقة:' 
                                    : 'Select your current academic stage to sync lecture materials and exam schedules:'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 gap-2.5 py-4 max-h-[360px] overflow-y-auto pr-1">
                            {ACADEMIC_YEARS_LIST.map((yearObj) => {
                                const isCurrent = selectedYearId === yearObj.id;
                                return (
                                    <button
                                        key={yearObj.id}
                                        onClick={() => handleSaveAcademicYear(yearObj.id)}
                                        className={cn(
                                            "w-full text-right flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-98",
                                            isCurrent 
                                                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-xs ring-1 ring-blue-500/30" 
                                                : "border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "w-3 h-3 rounded-full border",
                                                isCurrent ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-zinc-600"
                                            )} />
                                            <span className="text-xs sm:text-sm font-semibold">
                                                {isArabic ? yearObj.nameAr : yearObj.nameEn}
                                            </span>
                                        </div>
                                        {isCurrent && (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <DialogFooter className="border-t border-slate-200 dark:border-zinc-800 pt-3 flex justify-end">
                            <Button 
                                onClick={() => setAcademicYearModalOpen(false)}
                                variant="outline"
                                className="border-slate-300 dark:border-zinc-700 text-xs px-5"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* 5. Pure Attendance History Modal (Zero Payments/Zero Dues) */}
                <AttendanceHistoryModal
                    isOpen={isAttendanceModalOpen}
                    onClose={() => setIsAttendanceModalOpen(false)}
                    studentId={studentId}
                    barcodeId={student?.barcodeId}
                    studentName={student?.name}
                />
            </div>
        </div>
    );
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [offlineStudentId, setOfflineStudentId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('viewingStudentId') || null;
    }
    return null;
  });
  const [isAssistant, setIsAssistant] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      setOfflineStudentId(localStorage.getItem('viewingStudentId'));
      setIsAssistant(!!localStorage.getItem('assistantForTeacherId'));
    }
  }, []);

  useEffect(() => {
    if (!hasMounted || isUserLoading) return;

    if (isAssistant) {
      router.replace('/assistant/dashboard');
      return;
    }

    const currentSavedId = offlineStudentId || (typeof window !== 'undefined' ? localStorage.getItem('viewingStudentId') : null);

    if (!user && !currentSavedId) {
      router.replace('/login');
    }
  }, [hasMounted, isUserLoading, isAssistant, user, offlineStudentId, router]);

  if (isUserLoading || !hasMounted || isAssistant) {
    return (
        <div className="p-4 space-y-4 max-w-7xl mx-auto">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
    );
  }
  
  if (!user) {
      if (offlineStudentId) {
          return <StudentProfile studentId={offlineStudentId} />;
      }
      return (
        <div className="p-4 space-y-4 max-w-7xl mx-auto">
            <Skeleton className="h-32 w-full rounded-2xl text-center p-8 text-muted-foreground">
                Redirecting...
            </Skeleton>
        </div>
      );
  }
  
  const userEmailLower = user.email?.toLowerCase().trim();
  if (userEmailLower === 'eagle07amviii8$apfa4017@gmail.com' || userEmailLower === '6108almoamviii8chef@gmail.com') {
      return <SAdminProfile userId={user.uid} />;
  }

  // Robust Student Role Check: checks mola5saty.student, universe.student, or local student sessions
  const hasLocalStudent = typeof window !== 'undefined' && (
      !!localStorage.getItem('cached_student_profile_' + user.uid) ||
      !!localStorage.getItem('student_profile_offline_' + user.uid) ||
      localStorage.getItem('viewingStudentId') === user.uid
  );

  const isStudent = isStudentEmail(user.email) || !!offlineStudentId || hasLocalStudent;

  if (isStudent) {
      return <StudentProfile studentId={offlineStudentId || user.uid} />;
  }

  // If user is anonymous and not a student, check if they have offline student profile, else show loading while redirecting
  if (user.isAnonymous) {
      if (offlineStudentId) {
          return <StudentProfile studentId={offlineStudentId} />;
      }
      return (
        <div className="p-4 space-y-4 max-w-7xl mx-auto">
            <Skeleton className="h-32 w-full rounded-2xl text-center p-8 text-muted-foreground">
                Redirecting to login...
            </Skeleton>
        </div>
      );
  }

  return (
    <LocalDataProvider teacherId={user.uid}>
        <TeacherDashboard teacherId={user.uid} />
    </LocalDataProvider>
  );
}
