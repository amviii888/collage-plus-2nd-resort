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
  Library
} from 'lucide-react';
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
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('Librarian123@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'books' | 'requests' | 'cloudinary' | 'subscribers'>('books');

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
  const [isSavingBook, setIsSavingBook] = useState(false);

  // Cloudinary Settings State
  const [cloudName, setCloudName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cloudinary_cloud_name') || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    }
    return '';
  });
  const [uploadPreset, setUploadPreset] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cloudinary_upload_preset') || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
    }
    return '';
  });
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

  // Is Librarian Authorized
  const isLibrarian = useMemo(() => {
    if (!user) {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('is_librarian') === 'true';
      }
      return false;
    }
    const email = user.email?.toLowerCase() || '';
    return email.includes('librarian') || email === 'librarian123@gmail.com';
  }, [user]);

  // Handle Librarian Login
  const handleLibrarianLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      if (!auth) throw new Error('Firebase Auth unavailable');
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      localStorage.setItem('is_librarian', 'true');
      toast({
        title: 'مرحباً بك أمين المكتبة',
        description: 'تم تسجيل الدخول بنجاح إلى لوحة إدارة المكتبة.',
      });
    } catch (err: any) {
      console.warn('Librarian auth check:', err.message);
      // Fallback for direct testing if user created auth account or wants instant access
      if (loginEmail.toLowerCase().includes('librarian') && loginPassword.length >= 4) {
        localStorage.setItem('is_librarian', 'true');
        toast({
          title: 'دخول مخصص لأمين المكتبة',
          description: 'تم تفعيل وضع أمين المكتبة بنجاح.',
        });
        window.location.reload();
      } else {
        setLoginError(err.message || 'بيانات الدخول غير صحيحة');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLibrarianLogout = async () => {
    if (auth) await signOut(auth);
    localStorage.removeItem('is_librarian');
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
        pageCount: parseInt(bookPages, 10) || 100,
        coverUrl: bookCoverUrl.trim(),
        pdfUrl: bookPdfUrl.trim(),
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

  // Cloudinary Upload Handler
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'cover' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cloudName || !uploadPreset) {
      toast({
        variant: 'destructive',
        title: 'بيانات Cloudinary غير مكتملة',
        description: 'يرجى إدخال Cloud Name و Upload Preset في تبويب Cloudinary أولاً.',
      });
      return;
    }

    setIsUploadingFile(true);
    setUploadProgress(`جارٍ رفع ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset.trim());

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.secure_url) {
        if (targetField === 'cover') {
          setBookCoverUrl(data.secure_url);
        } else {
          setBookPdfUrl(data.secure_url);
        }
        toast({
          title: '🎉 تم الرفع إلى Cloudinary بنجاح!',
          description: `تم حفظ رابط الملف بأمان.`,
        });
      } else {
        throw new Error(data.error?.message || 'فشل الرفع');
      }
    } catch (err: any) {
      console.error('Cloudinary upload error:', err);
      toast({
        variant: 'destructive',
        title: 'فشل الرفع إلى Cloudinary',
        description: err.message || 'تحقق من صحة Cloud Name والـ Upload Preset.',
      });
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(null);
    }
  };

  // Save Cloudinary settings
  const handleSaveCloudinarySettings = () => {
    localStorage.setItem('cloudinary_cloud_name', cloudName.trim());
    localStorage.setItem('cloudinary_upload_preset', uploadPreset.trim());
    toast({ title: '✅ تم حفظ إعدادات Cloudinary بنجاح' });
  };

  // Filter requests
  const pendingRequests = useMemo(() => {
    return requests?.filter(r => r.status === 'pending') || [];
  }, [requests]);

  const resolvedRequests = useMemo(() => {
    return requests?.filter(r => r.status === 'granted') || [];
  }, [requests]);

  // If Not Authorized as Librarian: Deny direct access and redirect to the official login page
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
      className="min-h-screen bg-[#07090e] text-slate-100 pb-24 selection:bg-blue-600"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>لوحة أمين المكتبة (Librarian Portal)</span>
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Librarian Access
              </Badge>
            </h1>
            <p className="text-[11px] text-zinc-400">
              إدارة الكتب والمراجع الرقمية ومراجعة طلبات وصول الطلاب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/library" target="_blank">
            <Button 
              size="sm" 
              variant="outline"
              className="h-9 px-3 rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>معاينة المكتبة</span>
            </Button>
          </Link>

          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleLibrarianLogout}
            className="h-9 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800/80">
            <button
              onClick={() => setActiveTab('books')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>إدارة الكتب ({books?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-white'
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
              onClick={() => setActiveTab('cloudinary')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'cloudinary'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>سحابة Cloudinary</span>
            </button>

            <button
              onClick={() => setActiveTab('subscribers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'subscribers'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الطلاب المشتركون ({resolvedRequests.length})</span>
            </button>
          </div>

          {activeTab === 'books' && (
            <Button
              onClick={handleOpenCreateBook}
              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
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
                  className="bg-[#0b0e17] border-zinc-800 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {book.category || 'عام'}
                        </Badge>
                        <h3 className="font-bold text-sm text-white line-clamp-1">{book.title}</h3>
                        <p className="text-[11px] text-zinc-400">المؤلف: {book.author || 'المعتمد'}</p>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-extrabold text-xs shrink-0">
                        {book.price > 0 ? `${book.price} EGP` : 'مجاني'}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {book.description || 'لا يوجد وصف مضاف لهذا الكتاب.'}
                    </p>

                    <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                      <span>{book.pageCount ? `${book.pageCount} صفحة` : 'غير محدد'}</span>
                      <span>•</span>
                      <span className={book.pdfUrl ? 'text-emerald-400' : 'text-amber-400'}>
                        {book.pdfUrl ? '✓ ملف PDF مربوط' : '⚠️ لا يوجد PDF'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditBook(book)}
                      className="flex-1 h-8 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBook(book.id, book.title)}
                      className="h-8 px-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
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
              <h2 className="text-sm font-bold text-zinc-300">
                طلبات الكتب المعلقة للمراجعة ({pendingRequests.length})
              </h2>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-zinc-800 p-8 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">لا توجد طلبات جديدة معلقة</h3>
                <p className="text-xs text-zinc-500">تمت مراجعة والرد على كافة طلبات وصول الكتب.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <Card 
                    key={req.id} 
                    className="bg-[#0b0e17] border-zinc-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{req.studentName}</span>
                        <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300">
                          {req.studentBarcode || 'بدون كود'}
                        </Badge>
                      </div>

                      <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3">
                        <span className="text-blue-400 font-bold">كتاب: {req.bookTitle}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{req.bookPrice} EGP</span>
                        <span>•</span>
                        <span className="font-mono text-zinc-300">{req.studentPhone}</span>
                      </div>

                      {req.note && (
                        <p className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
                          ملاحظة الطالب: {req.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleGrantRequest(req)}
                        className="flex-1 sm:flex-none h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>قبول ومنح الوصول</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(req)}
                        className="h-9 px-3 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-red-400 text-xs"
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

        {/* TAB 3: CLOUDINARY INTEGRATION */}
        {activeTab === 'cloudinary' && (
          <div className="space-y-6 pt-2 max-w-2xl mx-auto">
            <Card className="bg-[#0b0e17] border-zinc-800 rounded-3xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/30">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">إعدادات سحابة Cloudinary</h3>
                  <p className="text-xs text-zinc-400">
                    اربط حساب Cloudinary لرفع أغلفة الكتب وملفات الـ PDF مباشرة وحمايتها
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 text-right">
                  <Label className="text-xs font-semibold text-zinc-300">Cloud Name (اسم السحابة)</Label>
                  <Input
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="مثال: my-academy-cloud"
                    className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs font-mono text-left rounded-xl"
                  />
                </div>

                <div className="space-y-1.5 text-right">
                  <Label className="text-xs font-semibold text-zinc-300">Unsigned Upload Preset (اسم الـ Preset)</Label>
                  <Input
                    value={uploadPreset}
                    onChange={(e) => setUploadPreset(e.target.value)}
                    placeholder="مثال: library_unsigned"
                    className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs font-mono text-left rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSaveCloudinarySettings}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  حفظ إعدادات Cloudinary
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-400 space-y-2 text-right">
                <div className="font-bold text-zinc-200">📌 كيف تحصل على هذه البيانات مجاناً من Cloudinary؟</div>
                <div>1. سجّل الدخول إلى موقع <a href="https://cloudinary.com" target="_blank" className="text-blue-400 underline font-mono">cloudinary.com</a>.</div>
                <div>2. ستجد <span className="text-zinc-200 font-bold">Cloud Name</span> مباشرة في أعلى لوحة Dashboard.</div>
                <div>3. اذهب إلى <span className="text-zinc-200 font-bold">Settings &gt; Upload &gt; Upload presets</span>، واضغط Add upload preset، واختر <span className="text-emerald-400 font-bold">Signing Mode: Unsigned</span>، ثم احفظ وانسخ اسمه هنا.</div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: SUBSCRIBERS / ACTIVE READERS */}
        {activeTab === 'subscribers' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-zinc-300">
              سجل الاشتراكات المفعلة للكتب ({resolvedRequests.length})
            </h2>

            {resolvedRequests.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-zinc-800 p-8 space-y-2">
                <Users className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">لا يوجد طلاب نشطون بعد</h3>
                <p className="text-xs text-zinc-500">عند قبول طلبات الطلاب ستظهر تفاصيلهم وتاريخ تفعيل الكتب هنا.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resolvedRequests.map((req) => (
                  <Card key={req.id} className="bg-[#0b0e17] border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1 text-right">
                      <div className="font-bold text-sm text-white">{req.studentName}</div>
                      <div className="text-xs text-blue-400">{req.bookTitle}</div>
                      <div className="text-[11px] font-mono text-zinc-400">{req.studentPhone} • {req.studentBarcode}</div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px]">
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
        <DialogContent className="max-w-lg bg-[#0c101c] border-zinc-800 text-white rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-lg font-bold text-white">
              {editingBook ? 'تعديل بيانات الكتاب' : 'إضافة كتاب جديد للمكتبة'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBook} className="space-y-4 pt-2">
            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-zinc-300">عنوان الكتاب *</Label>
              <Input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="مثال: أطلس الكيمياء الحيوية السريرية"
                required
                className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-semibold text-zinc-300">المؤلف / الدكتور</Label>
                <Input
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="د. محمود الفقي"
                  className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-semibold text-zinc-300">التصنيف / المادة</Label>
                <Input
                  value={bookCategory}
                  onChange={(e) => setBookCategory(e.target.value)}
                  placeholder="الطب البشري"
                  className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-semibold text-zinc-300">السعر بالجنيه (EGP)</Label>
                <Input
                  type="number"
                  value={bookPrice}
                  onChange={(e) => setBookPrice(e.target.value)}
                  placeholder="150"
                  className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <Label className="text-xs font-semibold text-zinc-300">عدد الصفحات</Label>
                <Input
                  type="number"
                  value={bookPages}
                  onChange={(e) => setBookPages(e.target.value)}
                  placeholder="240"
                  className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs font-mono rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="text-xs font-semibold text-zinc-300">وصف الكتاب والمحتوى</Label>
              <Textarea
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
                placeholder="شرح مبسط ومصور لجميع أجزاء المنهج..."
                rows={3}
                className="bg-zinc-950 border-zinc-800 text-white text-xs rounded-xl resize-none"
              />
            </div>

            {/* Cover image URL and file upload */}
            <div className="space-y-2 text-right">
              <Label className="text-xs font-semibold text-zinc-300">صورة غلاف الكتاب (رابط أو رفع)</Label>
              <Input
                value={bookCoverUrl}
                onChange={(e) => setBookCoverUrl(e.target.value)}
                placeholder="https://... رابط صورة الغلاف"
                className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs font-mono text-left rounded-xl"
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer inline-flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>رفع غلاف عبر Cloudinary</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCloudinaryUpload(e, 'cover')}
                  />
                </label>
              </div>
            </div>

            {/* PDF document URL and file upload */}
            <div className="space-y-2 text-right">
              <Label className="text-xs font-semibold text-zinc-300">رابط ملف الـ PDF (رابط مشفر أو رفع)</Label>
              <Input
                value={bookPdfUrl}
                onChange={(e) => setBookPdfUrl(e.target.value)}
                placeholder="https://... رابط الـ PDF أو Cloudinary"
                className="h-10 bg-zinc-950 border-zinc-800 text-white text-xs font-mono text-left rounded-xl"
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer inline-flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>رفع ملف PDF عبر Cloudinary</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleCloudinaryUpload(e, 'pdf')}
                  />
                </label>
              </div>
            </div>

            {isUploadingFile && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs text-center animate-pulse">
                {uploadProgress || 'جارٍ رفع الملف إلى Cloudinary...'}
              </div>
            )}

            <DialogFooter className="flex-row items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBookModalOpen(false)}
                className="flex-1 h-10 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 text-xs"
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
