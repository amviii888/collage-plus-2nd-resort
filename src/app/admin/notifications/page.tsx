'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  History, 
  Trash2, 
  ShieldAlert, 
  BookOpen, 
  Tag 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminNotificationsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'teachers'>('all');
  const [category, setCategory] = useState<'announcement' | 'security' | 'exam' | 'offer'>('announcement');
  const [isSending, setIsSending] = useState(false);

  // Fetch recent notifications history
  const notifsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
  }, [firestore]);

  const { data: historyNotifs, isLoading } = useCollection<any>(notifsQuery);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({
        variant: 'destructive',
        title: 'بيانات ناقصة',
        description: 'يرجى كتابة عنوان الإشعار ونص الرسالة.'
      });
      return;
    }

    setIsSending(true);

    try {
      if (firestore) {
        await addDoc(collection(firestore, 'notifications'), {
          title: title.trim(),
          body: body.trim(),
          target: targetAudience,
          category: category,
          createdAt: serverTimestamp(),
          sentBy: 'Admin Control Panel',
          readCount: 0
        });
      }

      // Trigger local browser OS notification if permission granted
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/icon.png',
            badge: '/icon.png'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
              new Notification(title, {
                body: body,
                icon: '/icon.png'
              });
            }
          });
        }
      }

      toast({
        title: 'تم إرسال الإشعار بنجاح! 🚀',
        description: 'تم بث الإشعار إلى الفئة المحددة وتسجيله في النظام.'
      });

      setTitle('');
      setBody('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'فشل الإرسال',
        description: err.message || 'حدث خطأ أثناء بث الإشعار.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTestLiveNotification = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'غير مدعوم',
        description: 'المتصفح الحالي لا يدعم إشعارات النظام المباشرة.'
      });
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title || 'تنبيه اختباري من يونيفرس أكاديمي', {
          body: body || 'هذا إشعار تجريبي لاختبار الصوت والاهتزاز على الهاتف والمستعرض.',
          icon: '/icon.png'
        });
        toast({
          title: 'تم تشغيل الإشعار التجريبي!',
          description: 'يجب أن يظهر الإشعار في شريط التنبيهات علوياً.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'الإشعارات محظورة',
          description: 'يرجى السماح بالإشعارات في إعدادات المتصفح.'
        });
      }
    });
  };

  const handleDeleteNotif = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'notifications', id));
      toast({ title: 'تم حذف الإشعار من السجل' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'فشل الحذف', description: e.message });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-400" />
            مركز التنبيهات والإشعارات (Notification Center)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            بث التنبيهات الفورية والتحديثات الأكاديمية إلى الطلاب والمعلمين مباشرة.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Compose Form */}
        <Card className="lg:col-span-7 bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              إنشاء وبث إشعار جديد (New Broadcast)
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              اختر الفئة المستهدفة ونوع الإشعار ليتم إرساله عبر النظام والمستعرض.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Audience & Category Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">الفئة المستهدفة (Target)</Label>
                  <Select value={targetAudience} onValueChange={(val: any) => setTargetAudience(val)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      <SelectItem value="all">الجميع (All Users)</SelectItem>
                      <SelectItem value="students">الطلاب فقط (Students)</SelectItem>
                      <SelectItem value="teachers">المعلمين فقط (Teachers)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300">نوع الإشعار (Category)</Label>
                  <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      <SelectItem value="announcement">إعلان عام (Announcement)</SelectItem>
                      <SelectItem value="security">تنبيه أمني (Security Alert)</SelectItem>
                      <SelectItem value="exam">موعد اختبار (Exam Notice)</SelectItem>
                      <SelectItem value="offer">عرض أو خصم (Special Offer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">عنوان الإشعار (Title)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تم إتاحة المحاضرة الجديدة م. وليد فاروق"
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-sm"
                  required
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">نص الإشعار (Notification Message)</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب تفاصيل الإشعار هنا..."
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 text-xs h-28"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  onClick={handleTestLiveNotification}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>اختبار التنبيه الحكلي (Test Sound)</span>
                </Button>

                <Button
                  type="submit"
                  disabled={isSending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-6 shadow-lg shadow-emerald-500/20"
                >
                  {isSending ? 'جاري البث...' : 'إرسال الإشعار فوراً (Send Notification)'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Recent Notifications History */}
        <Card className="lg:col-span-5 bg-zinc-900 border-zinc-800 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              سجل الإشعارات المرسلة (History)
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              آخر التنبيهات التي تم إرسالها عبر النظام.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-xs text-zinc-500 text-center py-8">جاري تحميل السجل...</div>
            ) : historyNotifs && historyNotifs.length > 0 ? (
              historyNotifs.map((notif: any) => (
                <div 
                  key={notif.id} 
                  className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1.5 relative group hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2">
                        {notif.target === 'all' ? 'الجميع' : notif.target === 'students' ? 'الطلاب' : 'المعلمين'}
                      </Badge>
                      <span className="font-bold text-xs text-white truncate max-w-[180px]">
                        {notif.title}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteNotif(notif.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
                لا توجد إشعارات مرسلة في السجل بعد.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
