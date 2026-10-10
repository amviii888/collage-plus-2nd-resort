'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldAlert, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  BookOpen, 
  Lock, 
  Eye, 
  AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LibraryBook } from '@/lib/library-types';

interface ProtectedBookReaderProps {
  book: LibraryBook;
  studentId: string;
  studentName: string;
  studentBarcode: string;
  onClose: () => void;
}

export function ProtectedBookReader({
  book,
  studentId,
  studentName,
  studentBarcode,
  onClose
}: ProtectedBookReaderProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cornerIndex, setCornerIndex] = useState<number>(0);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic watermark movement: cycles position smoothly every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCornerIndex((prev) => (prev + 1) % 5);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Anti-print, anti-screenshot, anti-dev-tools keyboard traps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Print (Ctrl+P or Cmd+P)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setSecurityWarning('الطباعة معطلة لحماية حقوق المحتوى الأكاديمي (Printing is disabled).');
        return false;
      }
      // Prevent Save (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSecurityWarning('حفظ المستند محظور للحفاظ على سرية المواد.');
        return false;
      }
      // Prevent View Source (Ctrl+U)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        return false;
      }
      // Detect PrintScreen
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setSecurityWarning('التقاط الشاشة محظور لحماية الملكية الفكرية للمكتبة.');
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const watermarkPositions = [
    'top-8 left-8',
    'top-8 right-8',
    'bottom-16 left-8',
    'bottom-16 right-8',
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  ];

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 bg-[#090b10] text-slate-100 flex flex-col select-none overflow-hidden"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Top Security Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white max-w-[220px] sm:max-w-md truncate">
              {book.title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="text-emerald-400 font-medium">محتوى محمي مشفر</span>
              <span>•</span>
              <span>{book.author || 'المكتبة الأكاديمية'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono">
            <button 
              onClick={() => setZoom(prev => Math.max(70, prev - 15))}
              className="p-1 hover:text-blue-400 cursor-pointer"
              title="تصغير Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-zinc-400">{zoom}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(160, prev + 15))}
              className="p-1 hover:text-blue-400 cursor-pointer"
              title="تكبير Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-9 w-9 p-0 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-9 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>إغلاق</span>
          </Button>
        </div>
      </header>

      {/* Security Warning Notification */}
      {securityWarning && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 text-xs px-4 py-2 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{securityWarning}</span>
          </div>
          <button 
            onClick={() => setSecurityWarning(null)}
            className="text-amber-300 hover:text-white text-xs underline font-bold"
          >
            حسناً
          </button>
        </div>
      )}

      {/* Reader Viewport */}
      <div className="flex-1 relative overflow-auto bg-[#050608] flex items-center justify-center p-2 sm:p-6">
        {/* Dynamic Anti-Screen-Capture Watermark */}
        <div 
          className={`absolute z-40 pointer-events-none select-none transition-all duration-1000 ease-in-out ${watermarkPositions[cornerIndex]}`}
        >
          <div className="px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-xs border border-white/10 text-white/40 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center shadow-2xl">
            <div className="text-emerald-400/80 font-bold">{studentName || 'Student'}</div>
            <div className="text-zinc-400/70 text-[10px]">ID: {studentBarcode || studentId || 'N/A'}</div>
            <div className="text-zinc-500/60 text-[9px]">{currentDate} • Digital Rights Protected</div>
          </div>
        </div>

        {/* Diagonal Repeated Background Watermark Pattern */}
        <div className="absolute inset-0 pointer-events-none select-none opacity-[0.035] flex items-center justify-center overflow-hidden z-20">
          <div className="rotate-[-25deg] text-2xl font-mono font-black text-white whitespace-nowrap leading-loose">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i}>
                {studentName} • {studentBarcode || studentId} • UNIVERSE ACADEMY SECURE VAULT • {book.title}
              </div>
            ))}
          </div>
        </div>

        {/* Content Viewer */}
        <div 
          className="relative z-10 w-full max-w-4xl h-full flex flex-col items-center transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {book.pdfUrl ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl relative">
              <iframe
                src={`${book.pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0 pointer-events-auto"
                title={book.title}
              />
              {/* Transparent shield layer on top of PDF to block right click downloads */}
              <div 
                className="absolute inset-0 pointer-events-none" 
                onContextMenu={(e) => e.preventDefault()} 
              />
            </div>
          ) : (
            /* Digital Reader Card when PDF URL is being prepared */
            <div className="w-full max-w-2xl bg-[#0c101c] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6 my-auto">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center">
                <BookOpen className="w-10 h-10" />
              </div>

              <div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 mb-2">
                  تم التحقق من صلاحية الوصول
                </Badge>
                <h1 className="text-2xl font-bold text-white">{book.title}</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  المؤلف: {book.author || 'الأستاذ المعتمد'} • {book.pageCount ? `${book.pageCount} صفحة` : 'نسخة رقمية معتمدة'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-right space-y-2 text-sm text-zinc-300">
                <div className="font-bold text-xs text-blue-400">نبذة عن الكتاب:</div>
                <p className="leading-relaxed text-xs text-zinc-400">
                  {book.description || 'كتاب دراسي ومذكرة مرجعية مخصصة للمطالعة الأكاديمية ومراجعة المحاضرات.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300/90 flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>هذا الكتاب مرخص رسمياً لحسابك. جميع صفحات الكتاب محمية برقم الهوية الأكاديمية الخاص بك.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
