'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, RefreshCw, BookOpen, ArrowRight, Video, CheckCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface CollectionClientProps {
  teacherId?: string;
  collectionId?: string;
}

export default function CollectionClient({ teacherId, collectionId }: CollectionClientProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [collectionData, setCollectionData] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);

  const handleClearAllCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      // Keep essential flags if any or clear everything
      toast({
        title: '🧹 تم مسح ذاكرة التخزين المؤقت بنجاح',
        description: 'تم مسح جميع بيانات التخزين المؤقت المحلي وإعادة تحميل التطبيق.',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        if (!firestore) return;

        // Fetch teacher if teacherId is present and not placeholder
        if (teacherId && teacherId !== 'placeholder-teacher') {
          const teacherRef = doc(firestore, 'teachers', teacherId);
          const teacherSnap = await getDoc(teacherRef);
          if (teacherSnap.exists()) {
            setTeacherData(teacherSnap.data());
          }
        }

        // Fetch collection or lectures
        if (collectionId && collectionId !== 'placeholder-collection') {
          const colRef = doc(firestore, 'collections', collectionId);
          const colSnap = await getDoc(colRef);
          if (colSnap.exists()) {
            setCollectionData(colSnap.data());
          }

          // Fetch lectures associated with collection or teacher
          const lecturesRef = collection(firestore, 'lectures');
          const q = query(lecturesRef, where('teacherId', '==', teacherId));
          const querySnap = await getDocs(q);
          const items: any[] = [];
          querySnap.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          setLectures(items);
        } else if (teacherId) {
          const lecturesRef = collection(firestore, 'lectures');
          const q = query(lecturesRef, where('teacherId', '==', teacherId));
          const querySnap = await getDocs(q);
          const items: any[] = [];
          querySnap.forEach((docSnap) => {
            items.push({ id: docSnap.id, ...docSnap.data() });
          });
          setLectures(items);
        }
      } catch (err) {
        console.error('Error loading collection data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [firestore, teacherId, collectionId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Control Bar with Clear Cache button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
                <ArrowRight className="w-4 h-4 ml-1.5" />
                الرئيسية
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>مجموعة المحاضرات والمقررات</span>
              </h1>
              <p className="text-xs text-slate-400">
                معرف المعلم: {teacherId || 'عام'} | المجموعة: {collectionId || 'الكل'}
              </p>
            </div>
          </div>

          <Button
            onClick={handleClearAllCache}
            variant="destructive"
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>مسح جميع ذاكرة التخزين المؤقت (Clear All Cache)</span>
          </Button>
        </div>

        {/* Main Content Card */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl text-white">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>{collectionData?.title || teacherData?.name ? `محتوى منصة الأستاذ/الدكتور: ${teacherData?.name || teacherId}` : 'قائمة المحاضرات'}</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {collectionData?.description || 'استعراض المحاضرات والدروس المتاحة ضمن هذه المجموعة الأكاديمية.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-xs text-slate-400">جاري تحميل المحتوى الأكاديمي...</p>
              </div>
            ) : lectures.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lectures.map((lecture) => (
                  <div key={lecture.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {lecture.subject || 'محاضرة أكاديمية'}
                        </span>
                        <span className="text-[11px] text-slate-400">{lecture.duration || ''}</span>
                      </div>
                      <h3 className="font-bold text-sm text-white mb-1">{lecture.title || lecture.name || 'عنوان المحاضرة'}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{lecture.description || 'لا توجد تفاصيل إضافية.'}</p>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> متاح للمشاهدة
                      </span>
                      <Link href={`/lecture/${lecture.id}`}>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-8 px-3">
                          <Video className="w-3.5 h-3.5 ml-1" />
                          مشاهدة
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="font-bold text-slate-300 text-sm">لا توجد محاضرات حالياً في هذه المجموعة</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  قم بمسح التخزين المؤقت أو العودة للرئيسية للتنقل بين الأقسام والمعلمين.
                </p>
                <div className="pt-2">
                  <Button onClick={handleClearAllCache} variant="outline" size="sm" className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                    مسح التخزين المؤقت وإعادة التحميل
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
