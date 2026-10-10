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
  Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import type { LibraryBook, LibraryRequest, BookAccess } from '@/lib/library-types';
import { RequestBookDialog } from '@/components/library/RequestBookDialog';
import { ProtectedBookReader } from '@/components/library/ProtectedBookReader';
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

  const { theme, setTheme } = useTheme();

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 pb-28 selection:bg-blue-600 selection:text-white transition-colors duration-200"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* Background Ambience */}
      <div className="fixed top-0 right-1/4 w-[500px] h-[350px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-10 w-[450px] h-[400px] bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Banner / Navigation */}
      <header className="border-b border-slate-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>المكتبة الأكاديمية الرقمية</span>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                Digital Vault
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:block">
              المراجع والكتب والمذكرات المعتمدة لكافة الطلاب
            </p>
          </div>
        </div>

        {/* Action Controls - Light/Dark Mode Toggle (No public librarian button) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-2 shadow-xs"
            title="تبديل المظهر النهاري / الليلي"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">الوضع النهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">الوضع الليلي</span>
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
          className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-blue-50/70 via-white to-slate-100/80 dark:from-[#0c1122] dark:via-[#0a0d18] dark:to-[#080b12] p-6 sm:p-10 shadow-xl dark:shadow-2xl"
        >
          <div className="max-w-2xl space-y-3 relative z-10 text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>محتوى محمي ومشفر ضد النسخ وتصوير الشاشة</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              كتب ومراجع دراسية موثوقة <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:via-indigo-400 dark:to-emerald-400">
                متاحة لجميع الطلاب الآن
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              اطلب نسختك من أي كتاب مباشرة بكل سهولة. تتم مراجعة وتفعيل الكتب عبر أمين المكتبة فورياً لتتمكن من القراءة داخل العارض الأكاديمي المحمي.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 relative z-10">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم الكتاب، المؤلف، أو المادة..."
                className="h-11 pr-10 pl-4 bg-white dark:bg-zinc-950/80 border-slate-300 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-blue-500 shadow-inner"
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
                    : 'bg-white dark:bg-zinc-900/80 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800/80'
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
            <BookMarked className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">الكتب والمراجع المتاحة</span>
            <span className="text-xs text-slate-500 dark:text-zinc-500">({filteredBooks.length} كتاب)</span>
          </div>
          {unlockedBookIds.size > 0 && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
              لديك {unlockedBookIds.size} كتاب مفتوح للقراءة
            </Badge>
          )}
        </div>

        {isBooksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-80 w-full rounded-3xl bg-slate-200/70 dark:bg-zinc-900/60" />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 p-8 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-300">لم يتم العثور على كتب مطابقة</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mx-auto">
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
                  className="bg-white dark:bg-[#0b0e17] border-slate-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden hover:border-blue-400/50 dark:hover:border-zinc-700/80 transition-all duration-300 flex flex-col shadow-sm hover:shadow-xl group relative"
                >
                  {/* Top Cover / Thumbnail Area */}
                  <div className="relative aspect-[16/10] bg-slate-100 dark:bg-zinc-950 overflow-hidden border-b border-slate-200 dark:border-zinc-800/60 flex items-center justify-center">
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 dark:from-blue-900/40 via-slate-100 dark:via-zinc-900 to-slate-200 dark:to-zinc-950 flex flex-col items-center justify-center text-center p-4">
                        <BookOpen className="w-12 h-12 text-blue-500 dark:text-blue-400/60 mb-2" />
                        <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 line-clamp-1">{book.title}</span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-[#0b0e17] via-transparent to-transparent opacity-80" />

                    {/* Top Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {book.category && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                          {book.category}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      {isUnlocked ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white border border-emerald-400/40 flex items-center gap-1 backdrop-blur-md">
                          <CheckCircle2 className="w-3 h-3" /> مفتوح لك
                        </span>
                      ) : isPending ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-white border border-amber-400/40 flex items-center gap-1 backdrop-blur-md">
                          <Clock className="w-3 h-3" /> قيد المراجعة
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 text-white border border-white/20 flex items-center gap-1 backdrop-blur-md">
                          <Lock className="w-3 h-3 text-amber-300" /> مقفل
                        </span>
                      )}
                    </div>

                    {/* Price tag on bottom right of image */}
                    <div className="absolute bottom-2 right-3 z-10">
                      <div className="px-3 py-1 rounded-xl bg-black/80 dark:bg-zinc-900/90 backdrop-blur-md border border-white/20 dark:border-zinc-800 text-emerald-400 font-extrabold text-xs shadow-md">
                        {book.price > 0 ? `${book.price} EGP` : 'مجاني Free'}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                        <span>المؤلف: {book.author || 'الأستاذ المعتمد'}</span>
                        {book.pageCount && <span>{book.pageCount} صفحة</span>}
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {book.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                        {book.description || 'كتاب دراسي ومذكرة مرجعية تحتوي على الشروحات والملخصات والأسئلة التدريبية.'}
                      </p>
                    </div>

                    {/* Bottom Action Area */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                      {isUnlocked ? (
                        <Button
                          onClick={() => handleOpenReader(book)}
                          className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>فتح وقراءة الكتاب الآن</span>
                        </Button>
                      ) : isPending ? (
                        <Button
                          disabled
                          className="w-full h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Clock className="w-4 h-4" />
                          <span>طلبك قيد المراجعة لدى أمين المكتبة</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenRequest(book)}
                          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                          <Lock className="w-3.5 h-3.5 text-blue-200" />
                          <span>طلب شراء / فتح الكتاب ({book.price > 0 ? `${book.price} EGP` : 'طلب'})</span>
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
