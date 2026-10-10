'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as tus from 'tus-js-client';
import {
  Upload,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Info,
  X,
  FileVideo,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export interface BunnyUploadResult {
  videoId: string;
  libraryId: string;
  title: string;
  embedUrl: string;
  thumbnailUrl: string;
  duration?: number;
}

interface BunnyVideoUploaderProps {
  initialTitle?: string;
  onUploadSuccess: (result: BunnyUploadResult) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function BunnyVideoUploader({
  initialTitle = '',
  onUploadSuccess,
  onCancel,
  compact = false,
}: BunnyVideoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<
    'idle' | 'creating' | 'uploading' | 'processing' | 'ready' | 'error'
  >('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<number>(0);
  const [bytesTotal, setBytesTotal] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadedVideo, setUploadedVideo] = useState<BunnyUploadResult | null>(null);
  const [activeUpload, setActiveUpload] = useState<tus.Upload | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Clean up any in-progress upload on unmount
  useEffect(() => {
    return () => {
      if (activeUpload) {
        try {
          activeUpload.abort();
        } catch {}
      }
    };
  }, [activeUpload]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video type
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(file.name)) {
      toast({
        title: 'ملف غير مدعوم',
        description: 'يرجى اختيار ملف فيديو صالح (MP4, MOV, MKV, WebM)',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setUploadState('idle');
    setProgressPercent(0);
    setErrorMessage('');
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadState('creating');
      setErrorMessage('');
      setProgressPercent(0);

      // Determine video title from input or file name
      const cleanFileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      const finalTitle = initialTitle?.trim() || cleanFileName;

      // 1. Create video object in Bunny Stream via server-side API
      const createRes = await fetch('/api/bunny/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalTitle }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في إنشاء مسار الرفع على Bunny');
      }

      const uploadInfo = await createRes.json();
      const { videoId, libraryId, embedUrl, thumbnailUrl, tus: tusConfig } = uploadInfo;

      setUploadState('uploading');
      setBytesTotal(selectedFile.size);

      // 2. Perform resumable chunked upload using TUS protocol
      const tusUpload = new tus.Upload(selectedFile, {
        endpoint: tusConfig.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: tusConfig.signature,
          AuthorizationExpire: String(tusConfig.expire),
          VideoId: videoId,
          LibraryId: String(libraryId),
        },
        metadata: {
          filetype: selectedFile.type || 'video/mp4',
          title: finalTitle,
        },
        onError: async (error) => {
          console.warn('TUS Direct Upload failed, attempting server proxy fallback...', error);
          // Fallback to server-side streaming proxy if direct upload fails
          try {
            await fallbackProxyUpload(selectedFile, videoId, libraryId, finalTitle, embedUrl, thumbnailUrl);
          } catch (fallbackError: any) {
            setUploadState('error');
            setErrorMessage(fallbackError.message || error.message || 'فشل الرفع');
            toast({
              title: 'خطأ أثناء رفع الفيديو',
              description: fallbackError.message || error.message,
              variant: 'destructive',
            });
          }
        },
        onProgress: (bytesSent, total) => {
          setBytesUploaded(bytesSent);
          setBytesTotal(total);
          const percent = Math.round((bytesSent / total) * 100);
          setProgressPercent(percent);
        },
        onSuccess: () => {
          handleUploadFinished({
            videoId,
            libraryId,
            title: finalTitle,
            embedUrl,
            thumbnailUrl,
          });
        },
      });

      setActiveUpload(tusUpload);
      tusUpload.start();
    } catch (err: any) {
      console.error('Upload initiation error:', err);
      setUploadState('error');
      setErrorMessage(err.message || 'حدث خطأ أثناء بدء الرفع');
      toast({
        title: 'فشل بدء الرفع',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Fallback proxy upload if direct TUS is blocked by mobile firewall/network
  const fallbackProxyUpload = (
    file: File,
    videoId: string,
    libraryId: string,
    title: string,
    embedUrl: string,
    thumbnailUrl: string
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `/api/bunny/upload-proxy/${videoId}`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setBytesUploaded(event.loaded);
          setBytesTotal(event.total);
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgressPercent(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          handleUploadFinished({
            videoId,
            libraryId,
            title,
            embedUrl,
            thumbnailUrl,
          });
          resolve();
        } else {
          reject(new Error(`Server proxy upload returned status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during proxy upload'));
      xhr.send(file);
    });
  };

  const handleUploadFinished = (result: BunnyUploadResult) => {
    setUploadState('processing');
    setProgressPercent(100);
    setUploadedVideo(result);

    // Call onUploadSuccess immediately so the form fills instantly
    onUploadSuccess(result);

    toast({
      title: '🎉 تم رفع الفيديو بنجاح!',
      description: 'تم ربط الفيديو وتعيين كود Bunny تلقائياً في الدرس.',
    });

    // Check status after a couple seconds to confirm transcoding
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/bunny/status?videoId=${result.videoId}`);
        if (res.ok) {
          const statusData = await res.json();
          if (statusData.status === 'ready') {
            setUploadState('ready');
          } else {
            setUploadState('ready'); // It's uploaded and streaming, Bunny encodes in background
          }
        } else {
          setUploadState('ready');
        }
      } catch {
        setUploadState('ready');
      }
    }, 2500);
  };

  const handleReset = () => {
    if (activeUpload) {
      try {
        activeUpload.abort();
      } catch {}
    }
    setSelectedFile(null);
    setUploadState('idle');
    setProgressPercent(0);
    setBytesUploaded(0);
    setBytesTotal(0);
    setUploadedVideo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 sm:p-5 shadow-xl text-zinc-100">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.mkv,.webm"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <span>رفع فيديو مباشر إلى Bunny Stream</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" /> DRM Protection
              </Badge>
            </h4>
            <p className="text-[11px] text-zinc-400">
              رفع سريع من الموبايل أو الكمبيوتر مع دعم الاستئناف التلقائي وجودات متعددة (1080p, 720p).
            </p>
          </div>
        </div>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* State: Idle / No file selected */}
      {!selectedFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group cursor-pointer rounded-xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/40 hover:bg-zinc-900/70 p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center gap-3"
        >
          <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 group-hover:bg-emerald-500/20 border border-zinc-700/60 group-hover:border-emerald-500/40 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 transition-all">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200 group-hover:text-white">
              اضغط لاختيار فيديو من هاتفك أو جهازك (Select Video File)
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              يدعم MP4, MOV, WebM بحجم حتى عدة جيجابايت
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30"
          >
            <FileVideo className="w-3.5 h-3.5 mr-1.5" />
            تصفح الملفات / الكاميرا
          </Button>
        </div>
      )}

      {/* State: File Selected (Ready to upload) */}
      {selectedFile && uploadState === 'idle' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileVideo className="w-7 h-7 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-zinc-400 font-mono">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-rose-400"
            >
              تغيير الملف
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={startUpload}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm h-11 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              بدء الرفع المباشر إلى Bunny ({formatBytes(selectedFile.size)})
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-zinc-800 bg-zinc-900 text-zinc-300 text-sm h-11 rounded-xl"
              >
                إلغاء
              </Button>
            )}
          </div>
        </div>
      )}

      {/* State: Creating / Uploading / Processing */}
      {(uploadState === 'creating' || uploadState === 'uploading' || uploadState === 'processing') && (
        <div className="space-y-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="font-semibold text-emerald-400">
                {uploadState === 'creating' && 'جاري تهيئة مسار الفيديو وتشفيره...'}
                {uploadState === 'uploading' && `جاري رفع الفيديو (${progressPercent}%)...`}
                {uploadState === 'processing' && 'تم الرفع! جاري تجهيز المعالجة التلقائية...'}
              </span>
            </div>
            <span className="font-mono text-zinc-400">
              {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Progress value={progressPercent} className="h-2.5 bg-zinc-800" />
            <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
              <span>الاستئناف التلقائي مفعل (Resumable TUS)</span>
              <span>{progressPercent}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              يرجى ترك هذه الصفحة مفتوحة حتى يكتمل شريط الرفع.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-rose-400 h-7 px-2"
            >
              إلغاء الرفع
            </Button>
          </div>
        </div>
      )}

      {/* State: Ready / Finished */}
      {uploadState === 'ready' && uploadedVideo && (
        <div className="space-y-3.5 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>تم رفع وربط الفيديو بنجاح!</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] py-0 px-1 font-mono">
                    ID: {uploadedVideo.videoId.slice(0, 8)}...
                  </Badge>
                </h5>
                <p className="text-xs text-zinc-300 mt-0.5">
                  تم وضع كود الفيديو تلقائياً في خانة الرابط. الفيديو محمي ومتاح للطلاب.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="h-8 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs rounded-lg shrink-0 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {previewOpen ? 'إخفاء المعاينة' : 'معاينة المشغل'}
            </Button>
          </div>

          {previewOpen && (
            <div className="space-y-2 mt-2">
              <div className="rounded-xl overflow-hidden aspect-video w-full bg-black border border-emerald-500/30 shadow-2xl">
                <iframe
                  src={uploadedVideo.embedUrl}
                  className="w-full h-full border-0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-[11px] text-zinc-400 bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800 flex items-start gap-1.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>تنبيه إعدادات الحماية في Bunny:</strong> إذا ظهرت لك شاشة 403 داخل المشغل، تأكد من الدخول إلى لوحة Bunny.net &gt; Stream &gt; Security وإضافة رابط الموقع إلى قائمة <strong>Allowed Domains</strong> (أو وضع <code>*</code> للسماح بجميع النطاقات أثناء التجربة).
                </span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
            <span className="text-[11px] text-zinc-400 font-mono">
              Bunny ID: {uploadedVideo.videoId}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-zinc-400 hover:text-white h-7 px-2 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              رفع فيديو آخر
            </Button>
          </div>
        </div>
      )}

      {/* State: Error */}
      {uploadState === 'error' && (
        <div className="space-y-3 p-4 rounded-xl bg-rose-950/30 border border-rose-500/30">
          <div className="flex items-center gap-2.5 text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">فشل في رفع الفيديو</p>
              <p className="text-xs text-rose-200/80">{errorMessage}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs h-8 rounded-lg"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={startUpload}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-8 rounded-lg"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      )}

      {/* Cost & Info Transparency Banner */}
      <div className="mt-3 pt-2.5 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-emerald-500" />
          <span>تكلفة Bunny Stream: التخزين ~$0.01/GB شهرياً (الترميز والتحويل مجاني 100%)</span>
        </span>
        <span className="font-mono text-zinc-600 hidden sm:inline">Library #775464</span>
      </div>
    </div>
  );
}
