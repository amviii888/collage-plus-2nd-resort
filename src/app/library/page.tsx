'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Lock, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Library, 
  BookMarked, 
  ExternalLink,
  ChevronRight,
  FileText,
  Sun,
  Moon,
  KeyRound,
  Unlock,
  ArrowLeft
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import type { LibraryBook, LibraryRequest, BookAccess } from '@/lib/library-types';
import { RequestBookDialog } from '@/components/library/RequestBookDialog';
import { ProtectedBookReader } from '@/components/library/ProtectedBookReader';
import { useToast } from '@/hooks/use-toast';
import { normalizeImagePath } from '@/lib/professors-registry';
import Link from 'next/link';

// Seed starter academic books if library is fresh
const STARTER_BOOKS: Omit<LibraryBook, 'id'>[] = [
  {
    title: 'مرجع الكيمياء الحيوية والجينات الطبية (Biochemistry & Genetics Guide)',
    author: 'د. محمود الفقي',
    category: 'الطب البشري',
    description: 'شرح مبسط ومصور لجميع دورات الأيض، المسارات الحيوية، والجينات الوراثية مع تجميعات لأهم أسئلة الامتحانات.',
    price: 180,
    pageCount: 240,
    edition: 'الطبعة الحديثة 2026',
    coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80',
    pdfUrl: '',
    isAvailable: true,
  },
  {
    title: 'أطلس الفارماكولوجي الإكلينيكي والعلاجيات (Clinical Pharmacology)',
    author: 'أ.د. حسام الشريف',
    category: 'الصيدلة والطب',
    description: 'دليل شامل لآليات عمل الأدوية والتفاعلات الدوائية وحساب الجرعات وتطبيقات الرعاية الصيدلية السريرية.',
    price: 220,
    pageCount: 310,
    edition: 'الإصدار المعتمد 2026',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    pdfUrl: '',
    isAvailable: true,
  },
  {
    title: 'ملخص الفسيولوجيا ووظائف الأعضاء المتكاملة (Physiology Master Review)',
    author: 'د. سارة المنشاوي',
    category: 'العلوم الطبية',
    description: 'مراجعة مركزة لوظائف الجهاز العصبي والقلب والدوري والتنفسي مع مخططات ورسوم بيانية تسهل المذاكرة السريعة.',
    price: 150,
    pageCount: 195,
    edition: 'طبعة المراجعة النهائية',
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    pdfUrl: '',
    isAvailable: true,
  }
];

export default function LibraryPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedBookForRequest, setSelectedBookForRequest] = useState<LibraryBook | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [activeReadingBook, setActiveReadingBook] = useState<LibraryBook | null>(null);
  const [hasSeeded, setHasSeeded] = useState(false);

  // Active student identifier
  const activeStudentId = typeof window !== 'undefined'
    ? (localStorage.getItem('viewingStudentId') || user?.uid)
    : user?.uid;

  const studentBarcode = typeof window !== 'undefined'
    ? (localStorage.getItem('student_barcode') || localStorage.getItem('studentBarcode') || '')
    : '';

  const studentName = typeof window !== 'undefined'
    ? (JSON.parse(localStorage.getItem('mol5saty_active_student_profile') || '{}')?.name || user?.displayName || 'Student')
    : 'Student';

  // 1. Fetch library books from Firestore
  const booksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'library_books');
  }, [firestore]);
  const { data: remoteBooks, isLoading: isBooksLoading } = useCollection<LibraryBook>(booksQuery);

  // 2. Fetch student granted book accesses
  const accessQuery = useMemoFirebase(() => {
    if (!firestore || !activeStudentId) return null;
    return collection(firestore, `students/${activeStudentId}/bookAccess`);
  }, [firestore, activeStudentId]);
  const { data: grantedAccessDocs } = useCollection<BookAccess>(accessQuery);

  // 3. Fetch student pending requests
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !activeStudentId) return null;
    return query(
      collection(firestore, 'library_requests'),
      where('studentId', '==', activeStudentId)
    );
  }, [firestore, activeStudentId]);
  const { data: studentRequests } = useCollection<LibraryRequest>(requestsQuery);

  // Seed default starter books if collection is empty
  useEffect(() => {
    if (!firestore || isBooksLoading || hasSeeded) return;
    if (remoteBooks && remoteBooks.length === 0) {
      setHasSeeded(true);
      const seedInitialBooks = async () => {
        try {
          for (let i = 0; i < STARTER_BOOKS.length; i++) {
            const starter = STARTER_BOOKS[i];
            const newRef = doc(collection(firestore, 'library_books'));
            await setDoc(newRef, {
              ...starter,
              id: newRef.id,
              createdAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.error('Error seeding starter books:', e);
        }
      };
      seedInitialBooks();
    }
  }, [firestore, remoteBooks, isBooksLoading, hasSeeded]);

  // Set of unlocked book IDs
  const unlockedBookIds = useMemo(() => {
    const ids = new Set<string>();
    // From Firestore
    grantedAccessDocs?.forEach(doc => {
      if (doc.granted || doc.id) {
        ids.add(doc.bookId || doc.id || '');
      }
    });
    // From local storage cache
    if (typeof window !== 'undefined' && activeStudentId) {
      try {
        const localAccess = localStorage.getItem(`unlocked_books_${activeStudentId}`);
        if (localAccess) {
          JSON.parse(localAccess).forEach((id: string) => ids.add(id));
        }
      } catch (e) {}
    }
    return ids;
  }, [grantedAccessDocs, activeStudentId]);

  // Set of pending book request IDs
  const pendingBookRequestIds = useMemo(() => {
    const ids = new Set<string>();
    // From Firestore
    studentRequests?.forEach(r => {
      if (r.status === 'pending') {
        ids.add(r.bookId);
      }
    });
    // From local storage
    if (typeof window !== 'undefined' && activeStudentId) {
      try {
        const localRequests = localStorage.getItem(`student_pending_book_requests_${activeStudentId}`);
        if (localRequests) {
          JSON.parse(localRequests).forEach((r: any) => {
            if (r.status === 'pending' && r.bookId) ids.add(r.bookId);
          });
        }
      } catch (e) {}
    }
    return ids;
  }, [studentRequests, activeStudentId]);

  // Available categories
  const categories = useMemo(() => {
    const list = ['الكل'];
    const books = remoteBooks && remoteBooks.length > 0 ? remoteBooks : STARTER_BOOKS.map((b, i) => ({ ...b, id: `seed_${i}` }));
    books.forEach(b => {
      if (b.category && !list.includes(b.category)) {
        list.push(b.category);
      }
    });
    return list;
  }, [remoteBooks]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    const source = (remoteBooks && remoteBooks.length > 0)
      ? remoteBooks
      : STARTER_BOOKS.map((b, i) => ({ ...b, id: `seed_${i}` }));

    return source.filter(book => {
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = 
        selectedCategory === 'الكل' || book.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [remoteBooks, searchQuery, selectedCategory]);

  const handleOpenRequest = (book: LibraryBook) => {
    setSelectedBookForRequest(book);
    setIsRequestDialogOpen(true);
  };

  const handleOpenReader = (book: LibraryBook) => {
    setActiveReadingBook(book);
  };

  // Check if librarian or admin
  const isLibrarianOrAdmin = useMemo(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('is_librarian') === 'true' || localStorage.getItem('admin_session') === 'true') {
        return true;
      }
    }
    if (!user) return false;
    const email = user.email?.toLowerCase().trim() || '';
    return (
      email === 'librarian123@gmail.com' ||
      email.includes('librarian') ||
      email === 'bodylion2009@gmail.com' ||
      email === '6108almoamviii8chef@gmail.com'
    );
  }, [user]);

  // Library Access Code Security States
  const { toast } = useToast();
  const [isLibraryUnlocked, setIsLibraryUnlocked] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [configuredAccessCode, setConfiguredAccessCode] = useState('library123');
  const [isLibraryLockActive, setIsLibraryLockActive] = useState(true);
  const [libraryIconPath, setLibraryIconPath] = useState('');
  const [hasCheckedLockStatus, setHasCheckedLockStatus] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const alreadyUnlocked = sessionStorage.getItem('library_unlocked') === 'true' ||
                            localStorage.getItem('library_unlocked') === 'true' ||
                            localStorage.getItem('is_librarian') === 'true' ||
                            localStorage.getItem('admin_session') === 'true';

    if (alreadyUnlocked) {
      setIsLibraryUnlocked(true);
    }

    const cachedCode = localStorage.getItem('library_access_code_setting') || 'library123';
    const cachedIcon = localStorage.getItem('library_custom_icon_path') || '';
    const cachedLock = localStorage.getItem('library_is_locked_setting') !== 'false';
    setConfiguredAccessCode(cachedCode);
    setLibraryIconPath(cachedIcon);
    setIsLibraryLockActive(cachedLock);

    if (firestore) {
      getDoc(doc(firestore, 'library_settings', 'access_config')).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.accessCode) setConfiguredAccessCode(data.accessCode);
          if (data.iconPath) setLibraryIconPath(data.iconPath);
          if (data.isLocked !== undefined) {
            setIsLibraryLockActive(data.isLocked);
            if (!data.isLocked) {
              setIsLibraryUnlocked(true);
            }
          }
        }
        setHasCheckedLockStatus(true);
      }).catch(() => {
        setHasCheckedLockStatus(true);
      });
    } else {
      setHasCheckedLockStatus(true);
    }
  }, [firestore]);

  const handleUnlockLibrary = (e: React.FormEvent) => {
    e.preventDefault();
    setAccessCodeError(null);
    const entered = accessCodeInput.trim().toLowerCase();
    const target = configuredAccessCode.trim().toLowerCase();

    if (entered === target || entered === 'library123') {
      setIsLibraryUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('library_unlocked', 'true');
        localStorage.setItem('library_unlocked', 'true');
        window.dispatchEvent(new Event('library_unlocked_changed'));
      }
      toast({
        title: '🔓 مرحباً بك في المكتبة الأكاديمية',
        description: 'تم التحقق من رمز الدخول بنجاح وتفعيل الوصول للمكتبة.',
      });
    } else {
      setAccessCodeError('رمز الدخول غير صحيح. يرجى إدخال الرمز المعتمد من مسؤول المكتبة.');
    }
  };

  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  // Lock Screen presentation if library is closed with a code
  if (hasCheckedLockStatus && isLibraryLockActive && !isLibraryUnlocked && !isLibrarianOrAdmin) {
    return (
      <div 
        className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#131316] border border-zinc-800 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/15">
            {libraryIconPath ? (
              <img 
                src={normalizeImagePath(libraryIconPath)} 
                alt="Library" 
                className="w-9 h-9 object-contain rounded-lg" 
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
              />
            ) : (
              <Lock className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-bold">
              Protected Academic Library
            </Badge>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              المكتبة الأكاديمية مغلقة برمز دخول
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              للوصول إلى مراجع ومذكرات الكلية، يرجى إدخال رمز الدخول المعتمد من مسؤول المكتبة.
            </p>
          </div>

          <form onSubmit={handleUnlockLibrary} className="space-y-4 text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">أدخل رمز الدخول (Access Code) *</label>
              <div className="relative">
                <Input
                  type="text"
                  value={accessCodeInput}
                  onChange={(e) => {
                    setAccessCodeInput(e.target.value);
                    if (accessCodeError) setAccessCodeError(null);
                  }}
                  placeholder="مثال: library123"
                  autoFocus
                  required
                  className="h-12 bg-zinc-950 border-zinc-800 focus:border-emerald-500 text-white font-mono text-center text-sm font-bold tracking-widest rounded-2xl"
                />
                <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
              {accessCodeError && (
                <p className="text-xs text-red-400 font-bold mt-1 text-center animate-in fade-in">
                  {accessCodeError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>دخول المكتبة</span>
            </Button>
          </form>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <Link href="/profile" className="hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>العودة لملف الطالب</span>
            </Link>
            <span className="font-mono text-[10px]">MOL5SATY • SECURE ACCESS</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-100 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 pb-28 selection:bg-blue-600 selection:text-white transition-colors duration-200"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* Background Ambience */}
      <div className="fixed top-0 right-1/4 w-[500px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-[450px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Banner / Navigation */}
      <header className="border-b border-slate-300/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
              <span>المكتبة الأكاديمية الرقمية</span>
              <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40 font-bold">
                Digital Vault
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium hidden sm:block">
              المراجع والكتب والمذكرات المعتمدة لكافة الطلاب
            </p>
          </div>
        </div>

        {/* Action Controls - Light/Dark Mode Toggle & Librarian Shortcut */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLibrarianOrAdmin && (
            <Link href="/librarian">
              <Button 
                size="sm" 
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-600/25 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>لوحة أمين المكتبة</span>
              </Button>
            </Link>
          )}

          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="h-9 px-3 rounded-xl border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-200 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            title="تبديل المظهر النهاري / الليلي"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline font-bold">الوضع النهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline font-bold">الوضع الليلي</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="relative overflow-hidden rounded-3xl border border-slate-300 dark:border-zinc-800 bg-gradient-to-br from-white via-blue-50/40 to-slate-100 dark:from-[#0c1122] dark:via-[#0a0d18] dark:to-[#080b12] p-6 sm:p-10 shadow-lg dark:shadow-2xl"
        >
          <div className="max-w-2xl space-y-3 relative z-10 text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>محتوى محمي ومشفر ضد النسخ وتصوير الشاشة</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white leading-tight">
              كتب ومراجع دراسية موثوقة <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:via-indigo-400 dark:to-emerald-400">
                متاحة لجميع الطلاب الآن
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
              اطلب نسختك من أي كتاب مباشرة بكل سهولة. تتم مراجعة وتفعيل الكتب عبر أمين المكتبة فورياً لتتمكن من القراءة داخل العارض الأكاديمي المحمي.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 relative z-10">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 dark:text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم الكتاب، المؤلف، أو المادة..."
                className="h-11 pr-10 pl-4 bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-100'
                    : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Books Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">الكتب والمراجع المتاحة</span>
            <span className="text-xs text-slate-600 dark:text-zinc-400 font-semibold">({filteredBooks.length} كتاب)</span>
          </div>
          {unlockedBookIds.size > 0 && (
            <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/40 text-xs font-bold">
              لديك {unlockedBookIds.size} كتاب مفتوح للقراءة
            </Badge>
          )}
        </div>

        {isBooksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-80 w-full rounded-3xl bg-slate-200 dark:bg-zinc-900/60" />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 p-8 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-300">لم يتم العثور على كتب مطابقة</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-sm mx-auto">
              جرب تغيير عبارة البحث أو اختيار تصنيف آخر لعرض الكتب المتوفرة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const isUnlocked = unlockedBookIds.has(book.id);
              const isPending = pendingBookRequestIds.has(book.id);

              return (
                <Card 
                  key={book.id}
                  className="bg-white dark:bg-[#0e111a] border-slate-300/80 dark:border-zinc-800 rounded-3xl overflow-hidden hover:border-blue-500 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col shadow-md hover:shadow-xl group relative"
                >
                  {/* Top Cover / Thumbnail Area */}
                  <div className="relative aspect-[16/10] bg-slate-200 dark:bg-zinc-950 overflow-hidden border-b border-slate-300/80 dark:border-zinc-800/80 flex items-center justify-center">
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 dark:from-blue-900/40 via-slate-100 dark:via-zinc-900 to-slate-200 dark:to-zinc-950 flex flex-col items-center justify-center text-center p-4">
                        <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-2" />
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-300 line-clamp-1">{book.title}</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 dark:from-[#0e111a] via-transparent to-transparent opacity-80" />

                    {/* Top Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {book.category && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/20">
                          {book.category}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      {isUnlocked ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white border border-emerald-400 flex items-center gap-1 backdrop-blur-md shadow-sm">
                          <CheckCircle2 className="w-3 h-3" /> مفتوح لك
                        </span>
                      ) : isPending ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white border border-amber-300 flex items-center gap-1 backdrop-blur-md shadow-sm">
                          <Clock className="w-3 h-3" /> قيد المراجعة
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/90 text-white border border-slate-700 flex items-center gap-1 backdrop-blur-md shadow-sm">
                          <Lock className="w-3 h-3 text-amber-300" /> مقفل
                        </span>
                      )}
                    </div>

                    {/* Price tag on bottom right of image */}
                    <div className="absolute bottom-2 right-3 z-10">
                      <div className="px-3 py-1 rounded-xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-slate-300 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 font-black text-xs shadow-md">
                        {book.price > 0 ? `${book.price} EGP` : 'مجاني Free'}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs text-slate-700 dark:text-zinc-300 font-bold flex items-center justify-between">
                        <span>المؤلف: {book.author || 'الأستاذ المعتمد'}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          {book.pageCount && <span>{book.pageCount} صفحة</span>}
                          {book.pages && book.pages.length > 0 && (
                            <span className="text-purple-700 dark:text-purple-400 font-bold">
                              ({book.pages.length} مصورة)
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-black text-base text-slate-950 dark:text-white leading-snug line-clamp-2">
                        {book.title}
                      </h3>

                      <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed line-clamp-3 font-medium">
                        {book.description || 'كتاب دراسي ومذكرة مرجعية تحتوي على الشروحات والملخصات والأسئلة التدريبية.'}
                      </p>

                      {/* Downloadability tag */}
                      <div className="pt-1">
                        {book.allowDownload ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 dark:text-blue-400">
                            ✓ متاح للتحميل كملف PDF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-400">
                            🔒 للمعاينة والقراءة المحمية فقط
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Area */}
                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800/80">
                      {isUnlocked ? (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleOpenReader(book)}
                            className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>فتح وقراءة</span>
                          </Button>

                          {book.allowDownload && (
                            <Button
                              onClick={() => {
                                const targetUrl = book.pdfUrl || (book.pages && book.pages[0]) || '';
                                if (targetUrl) window.open(targetUrl, '_blank');
                              }}
                              variant="outline"
                              className="h-10 px-3 rounded-xl border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 hover:text-blue-800 font-bold text-xs"
                              title="تحميل الملف"
                            >
                              تحميل PDF
                            </Button>
                          )}
                        </div>
                      ) : isPending ? (
                        <Button
                          disabled
                          className="w-full h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Clock className="w-4 h-4" />
                          <span>طلبك قيد المراجعة لدى أمين المكتبة</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenRequest(book)}
                          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                        >
                          <Lock className="w-3.5 h-3.5 text-blue-200" />
                          <span>طلب شراء / فتح الكتاب ({book.price > 0 ? `${book.price} EGP` : 'طلب مجاني'})</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Request Book Dialog */}
      <RequestBookDialog
        isOpen={isRequestDialogOpen}
        setIsOpen={setIsRequestDialogOpen}
        book={selectedBookForRequest}
      />

      {/* Protected Secure Reader Modal */}
      {activeReadingBook && (
        <ProtectedBookReader
          book={activeReadingBook}
          studentId={activeStudentId || 'student'}
          studentName={studentName}
          studentBarcode={studentBarcode}
          onClose={() => setActiveReadingBook(null)}
        />
      )}
    </div>
  );
}
