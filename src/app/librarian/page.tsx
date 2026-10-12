'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Clock, 
  UploadCloud, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Search, 
  CloudRain, 
  Settings, 
  Eye, 
  FileText, 
  LogOut, 
  KeyRound, 
  Copy, 
  Check, 
  Library,
  Sun,
  Moon,
  Download,
  Layers,
  ImageIcon,
  EyeOff
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { uploadFileToCloudinary, uploadMultiplePagesToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { LibraryBook, LibraryRequest } from '@/lib/library-types';
import Link from 'next/link';

export default function LibrarianPortalPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === 'dark' : false;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'books' | 'requests' | 'subscribers'>('books');

  // Book Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('الطب البشري');
  const [bookPrice, setBookPrice] = useState('150');
  const [bookDescription, setBookDescription] = useState('');
  const [bookPages, setBookPages] = useState('200');
  const [bookCoverUrl, setBookCoverUrl] = useState('');
  const [bookPdfUrl, setBookPdfUrl] = useState('');
  const [allowDownload, setAllowDownload] = useState(false);
  const [bookPagesList, setBookPagesList] = useState<string[]>([]);
  const [isSavingBook, setIsSavingBook] = useState(false);

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Search queries
  const [searchBookQuery, setSearchBookQuery] = useState('');
  const [searchRequestQuery, setSearchRequestQuery] = useState('');

  // 1. Fetch Books
  const booksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'library_books');
  }, [firestore]);
  const { data: books, isLoading: isBooksLoading } = useCollection<LibraryBook>(booksQuery);

  // 2. Fetch Requests
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'library_requests'));
  }, [firestore]);
  const { data: requests, isLoading: isRequestsLoading } = useCollection<LibraryRequest>(requestsQuery);

  // Is Librarian Authorized - Allows librarian123@gmail.com, bodylion2009@gmail.com, and admins
  const isLibrarian = useMemo(() => {
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

  const handleLibrarianLogout = async () => {
    if (auth) await signOut(auth);
    window.location.href = '/login';
  };

  // Open Create Book
  const handleOpenCreateBook = () => {
    setEditingBook(null);
    setBookTitle('');
    setBookAuthor('د. محمود الفقي');
    setBookCategory('الطب البشري');
    setBookPrice('150');
    setBookDescription('');
    setBookPages('200');
    setBookCoverUrl('');
    setBookPdfUrl('');
    setAllowDownload(false);
    setBookPagesList([]);
    setIsBookModalOpen(true);
  };

  // Open Edit Book
  const handleOpenEditBook = (book: LibraryBook) => {
    setEditingBook(book);
    setBookTitle(book.title);
    setBookAuthor(book.author || '');
    setBookCategory(book.category || 'الطب البشري');
    setBookPrice(String(book.price || 0));
    setBookDescription(book.description || '');
    setBookPages(String(book.pageCount || 100));
    setBookCoverUrl(book.coverUrl || '');
    setBookPdfUrl(book.pdfUrl || '');
    setAllowDownload(!!book.allowDownload);
    setBookPagesList(book.pages || []);
    setIsBookModalOpen(true);
  };

  // Save Book
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) {
      toast({ variant: 'destructive', title: 'عنوان الكتاب مطلوب' });
      return;
    }

    setIsSavingBook(true);

    try {
      if (!firestore) throw new Error('Firestore unavailable');

      const bookData: any = {
        title: bookTitle.trim(),
        author: bookAuthor.trim() || 'المكتبة الأكاديمية',
        category: bookCategory.trim(),
        price: parseFloat(bookPrice) || 0,
        description: bookDescription.trim(),
        pageCount: parseInt(bookPages, 10) || (bookPagesList.length > 0 ? bookPagesList.length : 100),
        coverUrl: bookCoverUrl.trim(),
        pdfUrl: bookPdfUrl.trim(),
        pages: bookPagesList,
        allowDownload: !!allowDownload,
        isAvailable: true,
        updatedAt: serverTimestamp(),
      };

      if (editingBook) {
        await updateDoc(doc(firestore, 'library_books', editingBook.id), bookData);
        toast({ title: '✅ تم تحديث الكتاب بنجاح' });
      } else {
        const newRef = doc(collection(firestore, 'library_books'));
        bookData.id = newRef.id;
        bookData.createdAt = serverTimestamp();
        await setDoc(newRef, bookData);
        toast({ title: '🎉 تم إضافة الكتاب إلى المكتبة بنجاح' });
      }

      setIsBookModalOpen(false);
    } catch (err: any) {
      console.error('Error saving book:', err);
      toast({ variant: 'destructive', title: 'فشل حفظ الكتاب', description: err.message });
    } finally {
      setIsSavingBook(false);
    }
  };

  // Delete Book
  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف كتاب (${title}) من المكتبة؟`)) return;

    try {
      if (!firestore) return;
      await deleteDoc(doc(firestore, 'library_books', bookId));
      toast({ title: '🗑️ تم حذف الكتاب من المكتبة' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'فشل حذف الكتاب', description: err.message });
    }
  };

  // Grant Access to Request
  const handleGrantRequest = async (req: LibraryRequest) => {
    try {
      if (!firestore) return;

      // 1. Write book access in student's subcollection
      const accessRef = doc(firestore, `students/${req.studentId}/bookAccess`, req.bookId);
      await setDoc(accessRef, {
        bookId: req.bookId,
        bookTitle: req.bookTitle,
        studentId: req.studentId,
        studentName: req.studentName,
        granted: true,
        grantedAt: serverTimestamp(),
        grantedBy: user?.email || 'Librarian123@gmail.com',
      }, { merge: true });

      // 2. Update request status to granted
      if (req.id && !req.id.startsWith('local_')) {
        await updateDoc(doc(firestore, 'library_requests', req.id), {
          status: 'granted',
          resolvedAt: serverTimestamp(),
          resolvedBy: user?.email || 'Librarian123@gmail.com',
        });
      }

      // 3. Update localStorage cache for instant student response
      try {
        const cacheKey = `unlocked_books_${req.studentId}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        if (!existing.includes(req.bookId)) {
          existing.push(req.bookId);
          localStorage.setItem(cacheKey, JSON.stringify(existing));
        }
      } catch (e) {}

      toast({
        title: '✅ تم منح الوصول بنجاح!',
        description: `تم تفعيل كتاب (${req.bookTitle}) للطالب (${req.studentName}) بنجاح.`,
      });
    } catch (err: any) {
      console.error('Error granting access:', err);
      toast({ variant: 'destructive', title: 'فشل تفعيل الوصول', description: err.message });
    }
  };

  // Reject Request
  const handleRejectRequest = async (req: LibraryRequest) => {
    try {
      if (!firestore) return;
      if (req.id && !req.id.startsWith('local_')) {
        await updateDoc(doc(firestore, 'library_requests', req.id), {
          status: 'rejected',
          resolvedAt: serverTimestamp(),
          resolvedBy: user?.email || 'Librarian123@gmail.com',
        });
      }
      toast({ title: 'تم رفض طلب الكتاب' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'فشل رفض الطلب', description: err.message });
    }
  };

  // Cloudinary Direct Upload Handler (Images or PDF)
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'cover' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadProgress(`جارٍ رفع ${file.name}... (0%)`);

    try {
      const url = await uploadFileToCloudinary(
        file,
        targetField === 'cover' ? 'library/covers' : 'library/books',
        (pct) => setUploadProgress(`جارٍ رفع ${file.name}... (${pct}%)`)
      );

      if (targetField === 'cover') {
        setBookCoverUrl(url);
      } else {
        setBookPdfUrl(url);
      }

      toast({
        title: '🎉 تم رفع الملف بنجاح!',
        description: `تم حفظ الملف وتجهيزه فوراً للكتاب.`,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        variant: 'destructive',
        title: 'فشل الرفع',
        description: err.message || 'حدث خطأ أثناء الرفع.',
      });
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(null);
    }
  };

  // Upload Multiple Page Images at once
  const handleUploadMultiplePages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsUploadingFile(true);
    setUploadProgress(`جارٍ تجهيز ${files.length} صفحة للرفع...`);

    try {
      const urls = await uploadMultiplePagesToCloudinary(
        files,
        'library/pages',
        (completed, total, pct) => {
          setUploadProgress(`جارٍ رفع الصفحة ${completed} من أصل ${total} (${pct}%)...`);
        }
      );

      const newList = [...bookPagesList, ...urls];
      setBookPagesList(newList);
      setBookPages(String(newList.length));

      toast({
        title: '🎉 تم رفع جميع الصفحات بنجاح!',
        description: `تم حفظ ${urls.length} صفحة في السحابة.`,
      });
    } catch (err: any) {
      console.error('Multi-page upload error:', err);
      toast({
        variant: 'destructive',
        title: 'فشل رفع الصفحات',
        description: err.message || 'حدث خطأ أثناء رفع الصفحات إلى السحابة.',
      });
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(null);
    }
  };

  // Filter requests
  const pendingRequests = useMemo(() => {
    return requests?.filter(r => r.status === 'pending') || [];
  }, [requests]);

  const resolvedRequests = useMemo(() => {
    return requests?.filter(r => r.status === 'granted') || [];
  }, [requests]);

  if (isUserLoading) {
    return (
      <div 
        className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">جاري التحقق من صلاحيات أمين المكتبة...</p>
        </div>
      </div>
    );
  }

  // If Not Authorized as Librarian: Deny direct access completely and redirect to /login
  if (!isLibrarian) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return (
      <div 
        className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <Card className="w-full max-w-md bg-[#0c101c] border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white">منطقة إدارية محمية</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            يجب تسجيل الدخول من صفحة الدخول الرسمية باستخدام حساب أمين المكتبة المعتمد.
          </p>
          <Button
            onClick={() => { window.location.href = '/login'; }}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            الانتقال لصفحة تسجيل الدخول الرسمية
          </Button>
        </Card>
      </div>
    );
  }

  // Authorized Librarian Dashboard
  return (
    <div 
      className="min-h-screen bg-slate-100 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 pb-24 selection:bg-blue-600 transition-colors duration-200"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* Top Navbar */}
      <header className="border-b border-slate-300 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
              <span>لوحة أمين المكتبة (Librarian Portal)</span>
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/40 font-bold">
                Librarian Access
              </Badge>
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
              إدارة الكتب والمراجع الرقمية ومراجعة طلبات وصول الطلاب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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

          <Link href="/library" target="_blank">
            <Button 
              size="sm" 
              variant="outline"
              className="h-9 px-3 rounded-xl border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>معاينة المكتبة</span>
            </Button>
          </Link>

          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleLibrarianLogout}
            className="h-9 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Quick Action & Status Banner */}
        <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-emerald-900/20 border border-slate-300 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1 text-right w-full md:w-auto">
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white">
              مركز رفع الكتب والمذكرات وإدارة طلبات وصول الطلاب
            </h2>
            <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
              ارفع صفحات متعددة مصورة أو ملف PDF كامل وحدد السعر وتصريح التحميل أو المعاينة المحمية فقط.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Button
              onClick={handleOpenCreateBook}
              className="flex-1 md:flex-none h-11 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              <UploadCloud className="w-5 h-5" />
              <span>رفع كتاب جديد / صفحات متعددة</span>
            </Button>

            {pendingRequests.length > 0 && (
              <Button
                onClick={() => setActiveTab('requests')}
                className="h-11 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer animate-pulse"
              >
                <Clock className="w-4 h-4" />
                <span>مراجعة {pendingRequests.length} طلب معلق</span>
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex items-center gap-2 bg-slate-200/90 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-slate-300 dark:border-zinc-800/80">
            <button
              onClick={() => setActiveTab('books')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-800 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>إدارة الكتب ({books?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-800 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>طلبات الطلاب</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px]">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('subscribers')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'subscribers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-800 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الطلاب المشتركون ({resolvedRequests.length})</span>
            </button>
          </div>

          {activeTab === 'books' && (
            <Button
              onClick={handleOpenCreateBook}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة كتاب جديد</span>
            </Button>
          )}
        </div>

        {/* TAB 1: BOOKS CATALOG */}
        {activeTab === 'books' && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {books?.map((book) => (
                <Card 
                  key={book.id}
                  className="bg-white dark:bg-[#0c101c] border-slate-300/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-md flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    {/* Cover Preview Thumbnail */}
                    {book.coverUrl && (
                      <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 font-bold">
                          {book.category || 'عام'}
                        </Badge>
                        <h3 className="font-black text-sm text-slate-950 dark:text-white line-clamp-1">{book.title}</h3>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 font-bold">المؤلف: {book.author || 'المعتمد'}</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/30 text-emerald-800 dark:text-emerald-300 font-black text-xs shrink-0">
                        {book.price > 0 ? `${book.price} EGP` : 'مجاني'}
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-zinc-200 line-clamp-2 leading-relaxed font-medium">
                      {book.description || 'لا يوجد وصف مضاف لهذا الكتاب.'}
                    </p>

                    <div className="text-xs text-slate-700 dark:text-zinc-300 flex flex-wrap items-center gap-2 font-bold">
                      <span>{book.pageCount ? `${book.pageCount} صفحة` : 'غير محدد'}</span>
                      <span>•</span>
                      <span className={book.pdfUrl ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-amber-700 dark:text-amber-400 font-black'}>
                        {book.pdfUrl ? '✓ PDF متاح' : '⚠️ بدون PDF'}
                      </span>
                      <span>•</span>
                      {book.allowDownload ? (
                        <span className="text-blue-700 dark:text-blue-400 font-black flex items-center gap-0.5">
                          <Download className="w-3 h-3 inline" /> متاح للتحميل
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-black flex items-center gap-0.5">
                          <EyeOff className="w-3 h-3 inline" /> معاينة فقط (محمي)
                        </span>
                      )}
                      {book.pages && book.pages.length > 0 && (
                        <span className="text-purple-700 dark:text-purple-400 font-black">
                          • {book.pages.length} ص مصورة
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditBook(book)}
                      className="flex-1 h-8 rounded-xl border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white text-xs font-black flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBook(book.id, book.title)}
                      className="h-8 px-2.5 rounded-xl text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 text-xs font-bold"
                      title="حذف الكتاب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {(!books || books.length === 0) && (
              <div className="text-center py-20 rounded-3xl border border-dashed border-zinc-800 p-8 space-y-4">
                <BookOpen className="w-12 h-12 text-zinc-600 mx-auto" />
                <h3 className="text-base font-bold text-zinc-300">لا توجد كتب مضافة بعد في المكتبة</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  ابدأ بإضافة أول كتاب دراسي أو مرجع إلى المكتبة لإتاحته للطلاب.
                </p>
                <Button 
                  onClick={handleOpenCreateBook}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  إضافة كتاب الآن
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-zinc-200">
                طلبات الكتب المعلقة للمراجعة ({pendingRequests.length})
              </h2>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 p-8 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-300">لا توجد طلبات جديدة معلقة</h3>
                <p className="text-xs text-slate-600 dark:text-zinc-500">تمت مراجعة والرد على كافة طلبات وصول الكتب.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <Card 
                    key={req.id} 
                    className="bg-white dark:bg-[#0c101c] border-slate-300 dark:border-zinc-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1.5 text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-950 dark:text-white">{req.studentName}</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-bold">
                          {req.studentBarcode || 'بدون كود'}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-800 dark:text-zinc-200 flex flex-wrap items-center gap-3 font-bold">
                        <span className="text-blue-700 dark:text-blue-400 font-black">كتاب: {req.bookTitle}</span>
                        <span>•</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">{req.bookPrice} EGP</span>
                        <span>•</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100 font-black">{req.studentPhone}</span>
                      </div>

                      {req.note && (
                        <p className="text-xs text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-900/90 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 font-medium">
                          ملاحظة الطالب: {req.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleGrantRequest(req)}
                        className="flex-1 sm:flex-none h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>قبول ومنح الوصول</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(req)}
                        className="h-9 px-3 rounded-xl border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold cursor-pointer"
                      >
                        رفض
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: SUBSCRIBERS / ACTIVE READERS */}
        {activeTab === 'subscribers' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-black text-slate-900 dark:text-zinc-200">
              سجل الاشتراكات المفعلة للكتب ({resolvedRequests.length})
            </h2>

            {resolvedRequests.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 p-8 space-y-2">
                <Users className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-300">لا يوجد طلاب نشطون بعد</h3>
                <p className="text-xs text-slate-600 dark:text-zinc-500">عند قبول طلبات الطلاب ستظهر تفاصيلهم وتاريخ تفعيل الكتب هنا.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resolvedRequests.map((req) => (
                  <Card key={req.id} className="bg-white dark:bg-[#0b0e17] border-slate-300/80 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-1 text-right">
                      <div className="font-extrabold text-sm text-slate-950 dark:text-white">{req.studentName}</div>
                      <div className="text-xs text-blue-700 dark:text-blue-400 font-bold">{req.bookTitle}</div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">{req.studentPhone} • {req.studentBarcode}</div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold">
                      مفعل وقيد القراءة
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT BOOK MODAL */}
      <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-[#0c101c] border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-lg font-black text-slate-950 dark:text-white">
              {editingBook ? 'تعديل بيانات الكتاب' : 'إضافة كتاب جديد للمكتبة'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBook} className="space-y-4 pt-2">
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">عنوان الكتاب *</Label>
              <Input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="مثال: أطلس الكيمياء الحيوية السريرية"
                required
                className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">المؤلف / الدكتور</Label>
                <Input
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="د. محمود الفقي"
                  className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">التصنيف / المادة</Label>
                <Input
                  value={bookCategory}
                  onChange={(e) => setBookCategory(e.target.value)}
                  placeholder="الطب البشري"
                  className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">السعر بالجنيه (EGP)</Label>
                <Input
                  type="number"
                  value={bookPrice}
                  onChange={(e) => setBookPrice(e.target.value)}
                  placeholder="150"
                  className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">عدد الصفحات</Label>
                <Input
                  type="number"
                  value={bookPages}
                  onChange={(e) => setBookPages(e.target.value)}
                  placeholder="240"
                  className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">وصف الكتاب والمحتوى</Label>
              <Textarea
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
                placeholder="شرح مبسط ومصور لجميع أجزاء المنهج..."
                rows={3}
                className="bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs rounded-xl resize-none font-normal"
              />
            </div>

            {/* Download vs Protected Preview Setting */}
            <div className="space-y-2 text-right">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                نوع إتاحة الكتاب للطلاب (صلاحية التحميل)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAllowDownload(false)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                    !allowDownload
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>للمعاينة والقراءة المحمية فقط (افتراضي)</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                    الكتاب محمي من التحميل والنسخ؛ يُسمح للطلاب فقط بقراءته داخل عارض المكتبة المشفر.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAllowDownload(true)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                    allowDownload
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>متاح للتحميل كملف PDF</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-zinc-400 leading-relaxed font-normal">
                    يُسمح للطالب بعد تفعيل الكتاب بتحميل نسخة PDF مباشرة على جهازه أو هاتفه.
                  </p>
                </button>
              </div>
            </div>

            {/* Cover image URL and file upload */}
            <div className="space-y-2 text-right">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">صورة غلاف الكتاب (رابط أو رفع من جهازك)</Label>
              <div className="flex gap-2">
                <Input
                  value={bookCoverUrl}
                  onChange={(e) => setBookCoverUrl(e.target.value)}
                  placeholder="https://... رابط صورة الغلاف أو ارفع من جهازك"
                  className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono text-left rounded-xl flex-1"
                />
                <label className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs">
                  <UploadCloud className="w-4 h-4" />
                  <span>رفع غلاف</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCloudinaryUpload(e, 'cover')}
                  />
                </label>
              </div>
              {bookCoverUrl && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bookCoverUrl} alt="Cover" className="w-10 h-10 object-cover rounded-lg" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate">تم تعيين صورة الغلاف بنجاح</span>
                </div>
              )}
            </div>

            {/* PDF document URL and file upload */}
            <div className="space-y-2 text-right">
              <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">ملف الكتاب PDF الكامل (رابط أو رفع من جهازك)</Label>
              <div className="flex gap-2">
                <Input
                  value={bookPdfUrl}
                  onChange={(e) => setBookPdfUrl(e.target.value)}
                  placeholder="https://... رابط ملف PDF أو ارفع من جهازك"
                  className="h-10 bg-slate-50 dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white text-xs font-mono text-left rounded-xl flex-1"
                />
                <label className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs">
                  <UploadCloud className="w-4 h-4" />
                  <span>رفع PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleCloudinaryUpload(e, 'pdf')}
                  />
                </label>
              </div>
            </div>

            {/* Multiple Pages Image Uploader */}
            <div className="space-y-2 text-right p-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>رفع صفحات الكتاب مصورة (اختيار عدة صفحات)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                    يمكنك تحديد عدة صور لصفحات الكتاب في وقت واحد لرفعها معاً وحفظها داخل الكتاب.
                  </p>
                </div>
                <label className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>اختيار صفحات</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadMultiplePages}
                  />
                </label>
              </div>

              {bookPagesList.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center justify-between">
                    <span>الصفحات المرفوعة ({bookPagesList.length} صفحة):</span>
                    <button
                      type="button"
                      onClick={() => setBookPagesList([])}
                      className="text-red-500 hover:text-red-600 text-[10px] underline cursor-pointer"
                    >
                      مسح الكل
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                    {bookPagesList.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] text-center font-mono py-0.5">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookPagesList(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isUploadingFile && (
              <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs text-center font-bold animate-pulse">
                {uploadProgress || 'جارٍ رفع الملف وحفظه...'}
              </div>
            )}

            <DialogFooter className="flex-row items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBookModalOpen(false)}
                className="flex-1 h-10 rounded-xl border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSavingBook || isUploadingFile}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                {isSavingBook ? 'جارٍ الحفظ...' : editingBook ? 'حفظ التعديلات' : 'إضافة الكتاب'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
