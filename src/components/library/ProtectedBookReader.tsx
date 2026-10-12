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
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  FolderOpen,
  FileText,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { DynamicWatermark } from '@/components/security/DynamicWatermark';
import type { LibraryBook, BookUnit, BookUnitFile } from '@/lib/library-types';

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
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Units system navigation state
  const hasUnits = Boolean(book.units && book.units.length > 0);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  const activeUnit: BookUnit | undefined = hasUnits ? book.units?.[selectedUnitIndex] : undefined;
  const activeUnitFile: BookUnitFile | undefined = activeUnit?.files?.[selectedFileIndex];

  // Active resource determination
  const activePdfUrl = activeUnitFile ? activeUnitFile.fileUrl : book.pdfUrl;
  const activePages = activeUnitFile?.pages && activeUnitFile.pages.length > 0 
    ? activeUnitFile.pages 
    : (book.pages || []);

  const hasMultiplePages = Boolean(activePages && activePages.length > 0);
  const totalPagesCount = hasMultiplePages ? activePages.length : 0;

  // Reset page when unit or file changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedUnitIndex, selectedFileIndex]);

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
          {/* Download button if allowDownload is enabled */}
          {book.allowDownload ? (
            <Button
              size="sm"
              onClick={() => {
                const targetUrl = book.pdfUrl || (book.pages && book.pages[0]) || '';
                if (targetUrl) {
                  window.open(targetUrl, '_blank');
                }
              }}
              className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل الكتاب</span>
            </Button>
          ) : (
            <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-300 text-[10px] font-bold hidden sm:flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>معاينة محمية فقط</span>
            </Badge>
          )}

          {/* Multi-page controls if book has multiple pages */}
          {hasMultiplePages && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-mono text-zinc-200 px-1 font-bold">
                {currentPage + 1} / {totalPagesCount}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPagesCount - 1, prev + 1))}
                disabled={currentPage >= totalPagesCount - 1}
                className="p-1 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 text-xs font-mono">
            <button 
              onClick={() => setZoom(prev => Math.max(70, prev - 15))}
              className="p-1 hover:text-blue-400 cursor-pointer"
              title="تصغير Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-zinc-300 font-bold">{zoom}%</span>
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

      {/* Units Navigation Bar if book contains units */}
      {hasUnits && book.units && (
        <div className="h-12 border-b border-zinc-800/90 bg-zinc-950/95 px-4 flex items-center gap-2 overflow-x-auto shrink-0 z-20">
          <span className="text-[11px] font-bold text-emerald-400 shrink-0 flex items-center gap-1">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>الوحدات ({book.units.length}):</span>
          </span>
          {book.units.map((unit, uIdx) => (
            <button
              key={unit.id || uIdx}
              type="button"
              onClick={() => { setSelectedUnitIndex(uIdx); setSelectedFileIndex(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedUnitIndex === uIdx
                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {unit.title || `الوحدة ${uIdx + 1}`}
            </button>
          ))}

          {activeUnit && activeUnit.files && activeUnit.files.length > 1 && (
            <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-2 mr-2 shrink-0">
              {activeUnit.files.map((file, fIdx) => (
                <button
                  key={file.id || fIdx}
                  type="button"
                  onClick={() => setSelectedFileIndex(fIdx)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    selectedFileIndex === fIdx
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  <FileText className="w-3 h-3 inline ml-1" />
                  {file.title || `ملف ${fIdx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
        {/* Real Dynamic Watermark Over Paper/PDF/Images with Audio TTS & Bounce */}
        <DynamicWatermark
          studentId={studentId}
          previewStudent={{
            name: studentName,
            barcode: studentBarcode || studentId,
          }}
        />

        {/* High-Res QR Verification Stamp */}
        <div className="absolute bottom-4 right-4 z-30 pointer-events-none select-none p-2.5 rounded-2xl bg-black/85 border border-emerald-500/30 backdrop-blur-md shadow-2xl flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg">
            <QRCodeSVG value={studentBarcode || studentId || 'MOL5SATY-SECURE'} size={46} level="H" />
          </div>
          <div className="text-right font-mono">
            <div className="text-[10px] text-emerald-400 font-extrabold">SECURE DIGITAL PASS</div>
            <div className="text-[11px] text-white font-bold max-w-[130px] truncate">{studentName}</div>
            <div className="text-[9px] text-zinc-400">{studentBarcode || studentId}</div>
          </div>
        </div>

        {/* Content Viewer */}
        <div 
          className="relative z-10 w-full max-w-4xl h-full flex flex-col items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {/* Case 1: Multiple Pages uploaded as images */}
          {hasMultiplePages && activePages && activePages.length > 0 ? (
            <div className="w-full max-w-3xl flex flex-col items-center gap-3">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl w-full max-h-[75vh] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePages[currentPage]}
                  alt={`الصفحة ${currentPage + 1}`}
                  className="max-h-[75vh] w-auto object-contain select-none pointer-events-none"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
                {/* Invisible text-selection and drag barrier */}
                <div 
                  className="absolute inset-0 select-none" 
                  onContextMenu={(e) => e.preventDefault()} 
                />
              </div>

              {/* Bottom Quick Page Scroller */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full p-2 bg-zinc-950/80 rounded-2xl border border-zinc-800/80">
                {activePages.map((pgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx)}
                    className={`relative w-12 h-16 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${
                      currentPage === idx
                        ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105'
                        : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-white font-mono text-center">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : activePdfUrl ? (
            /* Case 2: Full PDF URL */
            <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl relative">
              <iframe
                src={`${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0 pointer-events-auto"
                title={book.title}
              />
              <div 
                className="absolute inset-0 pointer-events-none select-none" 
                onContextMenu={(e) => e.preventDefault()} 
              />
            </div>
          ) : (
            /* Case 3: Cover and Details if file not yet uploaded */
            <div className="w-full max-w-2xl bg-[#0c101c] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6 my-auto">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center">
                <BookOpen className="w-10 h-10" />
              </div>

              <div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 mb-2 font-bold">
                  تم التحقق من صلاحية الوصول
                </Badge>
                <h1 className="text-2xl font-black text-white">{book.title}</h1>
                <p className="text-xs text-zinc-300 mt-1">
                  المؤلف: {book.author || 'الأستاذ المعتمد'} • {book.pageCount ? `${book.pageCount} صفحة` : 'نسخة رقمية معتمدة'}
                </p>
              </div>

              {book.coverUrl && (
                <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={book.coverUrl} alt="Cover" className="w-full h-auto object-cover" />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-right space-y-2 text-sm text-zinc-300">
                <div className="font-bold text-xs text-blue-400">نبذة عن الكتاب:</div>
                <p className="leading-relaxed text-xs text-zinc-300 font-medium">
                  {book.description || 'كتاب دراسي ومذكرة مرجعية مخصصة للمطالعة الأكاديمية ومراجعة المحاضرات.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-center gap-2 font-bold">
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
