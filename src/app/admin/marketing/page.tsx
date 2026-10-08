
'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import type { Teacher, Course } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import Image from 'next/image';

import { MarketingPostTemplate, layoutOptions, type LayoutStyle, type PfpShape } from '@/components/admin/marketing/MarketingPostTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Download, Palette, User, Settings, Image as ImageIcon, Brush, Phone, Shapes, Move, Maximize, Crown, Type, Trophy, Bell, CheckCircle2, AlertTriangle, Send, Volume2, ShieldCheck, Smartphone, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';

type AdminSession = { name: string; role: string };

function FeaturedCoursesManager() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

    const teachersQuery = useMemoFirebase(() => collection(firestore, 'teachers'), [firestore]);
    const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

    const teacherOptions = useMemo(() => {
        return teachers?.map(t => ({ value: t.id, label: t.name })) || [];
    }, [teachers]);

    const coursesQuery = useMemoFirebase(() => {
        if (!firestore || !selectedTeacherId) return null;
        return collection(firestore, `teachers/${selectedTeacherId}/courses`);
    }, [firestore, selectedTeacherId]);
    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    const handleToggleFeatured = async (course: Course, isFeatured: boolean) => {
        const selectedTeacher = teachers?.find(t => t.id === selectedTeacherId);
        if (!selectedTeacher) return;
        
        const courseRef = doc(firestore, 'teachers', selectedTeacher.id, 'courses', course.id);
        const featuredCourseRef = doc(firestore, 'featuredCourses', course.id);

        try {
            const batch = writeBatch(firestore);
            batch.update(courseRef, { isFeatured });
            
            if (isFeatured) {
                const featuredCourseData = {
                    ...course,
                    isFeatured: true,
                    teacherName: selectedTeacher.name,
                    teacherProfilePictureUrl: selectedTeacher.profilePictureUrl
                };
                batch.set(featuredCourseRef, featuredCourseData);
            } else {
                batch.delete(featuredCourseRef);
            }
            
            await batch.commit();

            toast({
                title: 'Course Updated',
                description: `${course.title} is ${isFeatured ? 'now featured' : 'no longer featured'}.`
            });
        } catch (error: any) {
             toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy /> {t('Manage Featured Courses')}</CardTitle>
                <CardDescription>{t('Search for a teacher to view their courses and select which ones to feature on the Discover page.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>{t('Select Teacher')}</Label>
                    {teachersLoading ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Combobox
                            options={teacherOptions}
                            value={selectedTeacherId || ''}
                            onChange={(value) => setSelectedTeacherId(value)}
                            placeholder={t("Select a teacher to see their courses...")}
                            searchPlaceholder={t("Search teachers...")}
                            emptyText={t("No teachers found.")}
                        />
                    )}
                </div>

                {selectedTeacherId && (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 border-t pt-4">
                        {coursesLoading ? (
                            <Skeleton className="h-32 w-full" />
                        ) : courses && courses.length > 0 ? (
                            courses.map(course => (
                                <div key={course.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Image src={course.thumbnailUrl} alt={course.title} width={80} height={45} className="rounded-md object-cover" />
                                        <div>
                                            <p className="font-semibold">{course.title}</p>
                                            <p className="text-sm text-muted-foreground">{course.locked ? "Locked" : "Public"}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={course.isFeatured || false}
                                        onCheckedChange={(checked) => handleToggleFeatured(course, checked)}
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">{t('This teacher has no courses.')}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MarketingGenerator({ adminSession }: { adminSession: AdminSession | null }) {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const postRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
    const [selectedLayout, setSelectedLayout] = useState<LayoutStyle>(layoutOptions[0].id);
    const [pfpShape, setPfpShape] = useState<PfpShape>('circle');
    
    const [customBgColor, setCustomBgColor] = useState('#FFFFFF');
    const [customTextColor, setCustomTextColor] = useState('#000000');

    const [headerText, setHeaderText] = useState('New Course Available!');
    const [subHeaderText, setSubHeaderText] = useState('Enroll in our latest program.');
    const [descriptionText, setDescriptionText] = useState('This course covers advanced topics to help you excel. Join now to unlock your full potential.');
    const [offerText, setOfferText] = useState('25% OFF FOR A LIMITED TIME');
    const [schedule, setSchedule] = useState('');
    const [time, setTime] = useState('');
    const [place, setPlace] = useState('');
    const [contactInfo, setContactInfo] = useState('Call 555-123-4567');
    
    const [pfpSize, setPfpSize] = useState(150);
    const [pfpX, setPfpX] = useState(50);
    const [pfpY, setPfpY] = useState(50);
    
    const [fontFamily, setFontFamily] = useState("'Cairo', sans-serif");
    
    const isSuperAdmin = adminSession?.role === 'S Admin';

    const teachersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'teachers'), where('approved', '==', true));
    }, [firestore]);
    const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);
    
    const arabicFonts = [
      { value: "'Cairo', sans-serif", label: "Cairo" },
      { value: "'Tajawal', sans-serif", label: "Tajawal" },
      { value: "'Lalezar', cursive", label: "Lalezar" },
      { value: "'Amiri', serif", label: "Amiri" },
      { value: "'Markazi Text', serif", label: "Markazi Text" },
      { value: "'Changa', sans-serif", label: "Changa" },
      { value: "'El Messiri', sans-serif", label: "El Messiri" },
      { value: "'Kufam', sans-serif", label: "Kufam" },
      { value: "'Mada', sans-serif", label: "Mada" },
      { value: "'Scheherazade New', serif", label: "Scheherazade New" },
      { value: "'Almarai', sans-serif", label: "Almarai" },
      { value: "'Noto Sans Arabic', sans-serif", label: "Noto Sans Arabic" },
    ];

    const englishFonts = [
      { value: "'Roboto', sans-serif", label: "Roboto" },
      { value: "'Open Sans', sans-serif", label: "Open Sans" },
      { value: "'Lato', sans-serif", label: "Lato" },
      { value: "'Montserrat', sans-serif", label: "Montserrat" },
      { value: "'Oswald', sans-serif", label: "Oswald" },
      { value: "'Raleway', sans-serif", label: "Raleway" },
      { value: "'Poppins', sans-serif", label: "Poppins" },
      { value: "'Nunito Sans', sans-serif", label: "Nunito Sans" },
      { value: "'Merriweather', serif", label: "Merriweather" },
      { value: "'Playfair Display', serif", label: "Playfair Display" },
      { value: "'Source Sans Pro', sans-serif", label: "Source Sans Pro" },
      { value: "'Ubuntu', sans-serif", label: "Ubuntu" },
    ];

    useEffect(() => {
        if (teachers && teachers.length > 0 && !selectedTeacherId) {
            setSelectedTeacherId(teachers[0].id);
        }
    }, [teachers, selectedTeacherId]);

    const teacherToDisplay = useMemo(() => {
        return teachers?.find(t => t.id === selectedTeacherId) || null;
    }, [teachers, selectedTeacherId]);

    
    const handleDownload = async () => {
        if (!postRef.current) {
            toast({
                title: t('Error'),
                description: t('Could not find the post element to download.'),
                variant: 'destructive',
            });
            return;
        }
        
        toast({ title: t('Generating image...'), description: t('This may take a moment.') });

        try {
            const dataUrl = await toPng(postRef.current, { cacheBust: true, pixelRatio: 1.5 });
            const link = document.createElement('a');
            link.download = `marketing_post_${teacherToDisplay?.name.replace(/ /g, '_') || 'custom'}.png`;
            link.href = dataUrl;
            link.click();
            toast({ title: t('Download Complete!'), description: t('Your post image has been saved.') });
        } catch (err) {
            console.error('oops, something went wrong!', err);
            toast({
                title: t('Image Generation Failed'),
                description: t('Could not generate the image. Please try again.'),
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings /> {t('Post Controls')}</CardTitle>
                        <CardDescription>{t('Customize the content and style of your marketing post.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="teacher-select" className="flex items-center gap-2"><User /> {t('Select Teacher')}</Label>
                            {teachersLoading ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedTeacherId || ''} onValueChange={setSelectedTeacherId}>
                                    <SelectTrigger id="teacher-select">
                                        <SelectValue placeholder={t('Select a teacher...')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers?.map(teacher => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                {teacher.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="layout-select" className="flex items-center gap-2"><Brush /> {t('Select Layout Style')}</Label>
                             <Select value={selectedLayout} onValueChange={(v) => setSelectedLayout(v as LayoutStyle)}>
                                <SelectTrigger id="layout-select">
                                    <SelectValue placeholder={t("Select a layout...")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {layoutOptions.map((layout) => (
                                        <SelectItem key={layout.id} value={layout.id}>
                                            {t(layout.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="font-select" className="flex items-center gap-2"><Type /> {t('Select Font')}</Label>
                             <Select value={fontFamily} onValueChange={setFontFamily}>
                                <SelectTrigger id="font-select">
                                    <SelectValue placeholder={t("Select a font...")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>English</SelectLabel>
                                        {englishFonts.map((font) => (
                                            <SelectItem key={font.value} value={font.value} style={{fontFamily: font.value}}>
                                                {font.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    <SelectSeparator />
                                     <SelectGroup>
                                        <SelectLabel>Arabic</SelectLabel>
                                        {arabicFonts.map((font) => (
                                            <SelectItem key={font.value} value={font.value} style={{fontFamily: font.value}}>
                                                {font.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon /> {t('Image Controls')}</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pfp-shape-select" className="flex items-center gap-2"><Shapes /> {t('Profile Picture Shape')}</Label>
                            <Select value={pfpShape} onValueChange={(v) => setPfpShape(v as PfpShape)}>
                                <SelectTrigger id="pfp-shape-select">
                                    <SelectValue placeholder={t("Select a shape...")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="circle">{t('Circle')}</SelectItem>
                                    <SelectItem value="square">{t('Square')}</SelectItem>
                                    <SelectItem value="rectangle">{t('Rectangle')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-3">
                            <Label className="flex items-center gap-2"><Maximize /> {t('PFP Size')}</Label>
                            <Slider defaultValue={[150]} min={50} max={300} step={10} onValueChange={(v) => setPfpSize(v[0])} />
                         </div>
                         <div className="space-y-3">
                            <Label className="flex items-center gap-2"><Move /> {t('PFP Horizontal Offset')}</Label>
                            <Slider defaultValue={[50]} min={0} max={100} step={1} onValueChange={(v) => setPfpX(v[0])} />
                         </div>
                         <div className="space-y-3">
                            <Label className="flex items-center gap-2"><Move /> {t('PFP Vertical Offset')}</Label>
                            <Slider defaultValue={[50]} min={0} max={100} step={1} onValueChange={(v) => setPfpY(v[0])} />
                         </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon /> {t('Post Content')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="header-text">{t('Header Text')}</Label>
                            <Input id="header-text" value={headerText} onChange={e => setHeaderText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sub-header-text">{t('Sub-header Text')}</Label>
                            <Input id="sub-header-text" value={subHeaderText} onChange={e => setSubHeaderText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description-text">{t('Description')}</Label>
                            <Textarea id="description-text" value={descriptionText} onChange={e => setDescriptionText(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="offer-text">{t('Highlighted Offer Text')}</Label>
                            <Input id="offer-text" value={offerText} onChange={e => setOfferText(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="schedule-text">{t('Schedule (Optional)')}</Label>
                            <Input id="schedule-text" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="e.g., Mon, Wed, Fri"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="time-text">{t('Time (Optional)')}</Label>
                            <Input id="time-text" value={time} onChange={e => setTime(e.target.value)} placeholder="e.g., 6PM - 8PM"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="place-text">{t('Place (Optional)')}</Label>
                            <Input id="place-text" value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g., Online via Zoom"/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="contact-info" className="flex items-center gap-2"><Phone /> {t('Contact Info')}</Label>
                            <Input id="contact-info" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="e.g., Call 555-123-4567"/>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Palette /> {t('Custom Colors')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bg-color-picker">{t('Background Color')}</Label>
                            <div className="flex items-center gap-2">
                               <Input id="bg-color-picker" type="color" value={customBgColor} onChange={e => setCustomBgColor(e.target.value)} className="p-1 h-10 w-14" />
                               <Input value={customBgColor} onChange={e => setCustomBgColor(e.target.value)} placeholder="#ffffff" />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="text-color-picker">{t('Text Color')}</Label>
                             <div className="flex items-center gap-2">
                               <Input id="text-color-picker" type="color" value={customTextColor} onChange={e => setCustomTextColor(e.target.value)} className="p-1 h-10 w-14" />
                               <Input value={customTextColor} onChange={e => setCustomTextColor(e.target.value)} placeholder="#000000" />
                            </div>
                        </div>
                    </CardContent>
                 </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('Live Preview')}</CardTitle>
                         <CardDescription>{t('This is what your downloaded image will look like.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-4 bg-muted/50 rounded-lg overflow-hidden">
                        <div className="w-[800px] h-[800px] shrink-0">
                            <div ref={postRef} className="w-[800px] h-[800px]">
                                <MarketingPostTemplate
                                    layoutId={selectedLayout}
                                    teacher={teacherToDisplay}
                                    header={headerText}
                                    subHeader={subHeaderText}
                                    description={descriptionText}
                                    offer={offerText}
                                    schedule={schedule}
                                    time={time}
                                    place={place}
                                    contact={contactInfo}
                                    pfpShape={pfpShape}
                                    pfpSize={pfpSize}
                                    pfpX={pfpX}
                                    pfpY={pfpY}
                                    customBgColor={customBgColor}
                                    customTextColor={customTextColor}
                                    fontFamily={fontFamily}
                                    logo={<Image src="/icon.png" alt="Logo" width={48} height={48} />}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Button onClick={handleDownload} className="w-full" size="lg" disabled={!teacherToDisplay}>
                    <Download className="mr-2 h-5 w-5"/> {t('Download Post')}
                </Button>
            </div>
        </div>
    );
}

function NotificationCenter() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';
    const firestore = useFirestore();
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'parents' | 'teachers' | 'clearance' | 'sales'>('all');
    const [specificStudentCode, setSpecificStudentCode] = useState('');
    const [permissionState, setPermissionState] = useState<string>('default');
    const [isSending, setIsSending] = useState(false);
    const [isTestingLocal, setIsTestingLocal] = useState(false);
    const [lastActionTime, setLastActionTime] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionState(Notification.permission);
        }
    }, []);

    const playChime = () => {
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
            osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        } catch (e) {
            console.log('Chime sound failed:', e);
        }
    };

    const requestPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            toast({
                title: t('Not Supported'),
                description: t('This browser does not support system notifications.'),
                variant: 'destructive',
            });
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionState(permission);
            if (permission === 'granted') {
                toast({
                    title: isArabic ? 'تم تفعيل إذن الإشعارات بنجاح! ✅' : 'Notification Permission Granted! ✅',
                    description: isArabic ? 'جهازك جاهز الآن لاستقبال وتجربة الإشعارات الحقيقية.' : 'Your device is now ready to receive and test real push notifications.',
                });
                return true;
            } else {
                toast({
                    title: isArabic ? 'تم رفض الإذن' : 'Permission Denied',
                    description: isArabic ? 'يرجى السماح بالإشعارات من إعدادات المتصفح أو الهاتف.' : 'Please allow notifications in your phone/browser settings.',
                    variant: 'destructive',
                });
                return false;
            }
        } catch (err) {
            console.error('Permission error:', err);
            return false;
        }
    };

    const handleTestLocalDevice = async () => {
        const notifTitle = title.trim() || (isArabic ? '📢 تجربة إشعار أكاديمية يونيفرس' : '📢 Universe Academy Test Alert');
        const notifBody = body.trim() || (isArabic ? 'هذا إشعار تجريبي لاختبار ظهور التنبيهات في شريط إشعارات الهاتف بنجاح!' : 'This is a test notification verifying real native status-bar alerts on your device!');

        setIsTestingLocal(true);
        playChime();

        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission !== 'granted') {
                const granted = await requestPermission();
                if (!granted) {
                    setIsTestingLocal(false);
                    return;
                }
            }
        }

        let triggered = false;
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration && 'showNotification' in registration) {
                    await registration.showNotification(notifTitle, {
                        body: notifBody,
                        icon: '/icon.png',
                        badge: '/icon.png',
                        vibrate: [200, 100, 200, 100, 200],
                        tag: 'admin-test-' + Date.now(),
                        renotify: true,
                        data: { url: window.location.href },
                    });
                    triggered = true;
                }

                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'TRIGGER_NOTIFICATION',
                        title: notifTitle,
                        body: notifBody,
                        url: window.location.href,
                    });
                }
            } catch (err) {
                console.warn('SW notification fallback:', err);
            }
        }

        if (!triggered && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(notifTitle, {
                    body: notifBody,
                    icon: '/icon.png',
                });
                triggered = true;
            } catch (e) {
                console.error('Standard notification error:', e);
            }
        }

        toast({
            title: `🔔 ${notifTitle}`,
            description: notifBody,
        });

        setLastActionTime(new Date().toLocaleTimeString());
        setIsTestingLocal(false);
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        if (!title.trim() || !body.trim()) {
            toast({
                title: t('Error'),
                description: t('Title and body cannot be empty.'),
                variant: 'destructive',
            });
            return;
        }

        setIsSending(true);
        try {
            // Also trigger locally on admin device
            playChime();

            const isGlobalBroadcast = targetAudience === 'all' && !specificStudentCode.trim();
            const notificationsRef = collection(firestore, 'notifications');
            const newDocRef = doc(notificationsRef);
            
            await setDoc(newDocRef, {
                id: newDocRef.id,
                title: title.trim(),
                body: body.trim(),
                type: targetAudience === 'clearance' ? 'clearance' : targetAudience === 'sales' ? 'sales' : 'broadcast',
                targetAudience: targetAudience,
                targetStudentBarcode: specificStudentCode.trim() || null,
                targetUserId: isGlobalBroadcast ? 'all' : undefined,
                isBroadcast: isGlobalBroadcast,
                createdAt: new Date().toISOString(),
            });

            // Trigger local native shade test simultaneously
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then((reg) => {
                        reg.showNotification(title.trim(), {
                            body: body.trim(),
                            icon: '/icon.png',
                            badge: '/icon.png',
                            tag: newDocRef.id,
                            vibrate: [200, 100, 200, 100, 200],
                            renotify: true,
                        });
                    }).catch(() => {});
                }
            }

            const audienceLabel = 
                targetAudience === 'students' ? (isArabic ? 'الطلاب فقط' : 'Students Only') :
                targetAudience === 'parents' ? (isArabic ? 'أولياء الأمور فقط' : 'Parents Only') :
                targetAudience === 'teachers' ? (isArabic ? 'المعلمون فقط' : 'Teachers Only') :
                targetAudience === 'clearance' ? (isArabic ? 'الطلاب ذوو المستحقات' : 'Clearance Students Only') :
                targetAudience === 'sales' ? (isArabic ? 'العروض والخصومات' : 'Offers & Sales') :
                (isArabic ? 'جميع مستخدمي المنصة' : 'All Academy Users');

            toast({
                title: isArabic ? 'تم إرسال الإشعار بنجاح! 🚀' : 'Notification Sent Successfully! 🚀',
                description: isArabic 
                    ? `تم توجيه الإشعار للفئة: (${audienceLabel})${specificStudentCode.trim() ? ` — كود الطالب: ${specificStudentCode.trim()}` : ''}`
                    : `Notification targeted to: (${audienceLabel})${specificStudentCode.trim() ? ` — Student Code: ${specificStudentCode.trim()}` : ''}`,
            });
            setLastActionTime(new Date().toLocaleTimeString());
        } catch (error: any) {
            toast({
                title: t('Broadcast Failed'),
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSending(false);
        }
    };

    const applyPreset = (type: string) => {
        if (type === 'holiday') {
            setTitle(isArabic ? '🌴 إجازة رسمية' : '🌴 Official Academy Holiday');
            setBody(isArabic ? 'نحيطكم علماً بأن الأكاديمية في عطلة رسمية غداً بمناسبة العيد. تستأنف الحصص يوم الأحد القادم.' : 'Please note the academy will be closed tomorrow for the holiday. Regular classes resume Sunday.');
        } else if (type === 'exam') {
            setTitle(isArabic ? '📅 جدول الامتحانات النهائية' : '📅 Final Exam Schedule Published');
            setBody(isArabic ? 'تم اعتماد ونشر جدول الامتحانات لجميع المواد. يرجى الاطلاع على المواعيد في التطبيق.' : 'The final exam schedule has been officially posted. Check your schedule tab for dates and times.');
        } else if (type === 'offer') {
            setTitle(isArabic ? '🎁 خصم خاص على الاشتراكات' : '🎁 Exclusive Enrollment Offer');
            setBody(isArabic ? 'لفترة محدودة: احصل على خصم ٢٠٪ عند تجديد الاشتراك الشهري أو حجز الباقات الجديدة.' : 'Limited time: Enjoy a 20% discount on monthly course renewals and new semester bundles.');
        } else if (type === 'maintenance') {
            setTitle(isArabic ? '⚙️ تحديث هام للنظام' : '⚙️ System Update & Upgrades');
            setBody(isArabic ? 'تم إطلاق التحديث الجديد مع ميزات متطورة للتقارير وسرعة أكبر في التصفح.' : 'A new platform update is live with faster syncing, improved analytics, and instant alerts.');
        }
    };

    return (
        <Card className="glass-card border border-border shadow-2xl relative overflow-hidden" id="admin-notification-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                            <span className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
                                <Radio className="w-5 h-5 animate-pulse" />
                            </span>
                            <span>{t('System Notification Broadcast & Live Device Engine')}</span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {t('Instantly broadcast a real native system notification to the notification shade of every parent, student, and teacher device.')}
                        </CardDescription>
                    </div>

                    {/* Permission status pill */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        {permissionState === 'granted' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'الإشعارات مفعلة بجهازك' : 'Device Alerts Enabled'}</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={requestPermission}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{isArabic ? 'اضغط لتفعيل إذن الهاتف' : 'Enable Device Permission'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-black/30 border border-border">
                    <span className="text-xs font-mono text-muted-foreground mr-1">
                        {isArabic ? 'قوالب سريعة جاهزة:' : 'Quick Presets:'}
                    </span>
                    <button
                        type="button"
                        onClick={() => applyPreset('holiday')}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-all cursor-pointer"
                    >
                        🌴 {isArabic ? 'عطلة رسمية' : 'Holiday'}
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('exam')}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-all cursor-pointer"
                    >
                        📅 {isArabic ? 'جدول امتحانات' : 'Exam Schedule'}
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('offer')}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-all cursor-pointer"
                    >
                        🎁 {isArabic ? 'عروض وباقات' : 'Special Offer'}
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset('maintenance')}
                        className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-all cursor-pointer"
                    >
                        ⚙️ {isArabic ? 'تحديث منصة' : 'Platform Update'}
                    </button>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="broadcast-title" className="text-foreground font-semibold flex items-center justify-between">
                                <span>{t('Notification Title')}</span>
                                <span className="text-[11px] text-muted-foreground font-normal">{title.length}/60</span>
                            </Label>
                            <Input
                                id="broadcast-title"
                                placeholder={isArabic ? 'مثال: إعلان هام بخصوص عطلة عيد الفطر' : 'e.g., General Holiday Announcement'}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="bg-background border-border focus-visible:ring-primary"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground font-semibold">
                                {isArabic ? 'الفئة المستهدفة' : 'Target Audience'}
                            </Label>
                            <Select value={targetAudience} onValueChange={(val: any) => setTargetAudience(val)}>
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{isArabic ? '🌐 جميع مستخدمي الأكاديمية (الكل)' : '🌐 All Universe Academy'}</SelectItem>
                                    <SelectItem value="students">{isArabic ? '🎓 الطلاب فقط' : '🎓 Students Only'}</SelectItem>
                                    <SelectItem value="parents">{isArabic ? '👨‍👩‍👧 أولياء الأمور فقط' : '👨‍👩‍👧 Parents Only'}</SelectItem>
                                    <SelectItem value="teachers">{isArabic ? '👨‍🏫 المعلمون فقط' : '👨‍🏫 Teachers Only'}</SelectItem>
                                    <SelectItem value="clearance">{isArabic ? '💳 الطلاب ذوو المستحقات والرسوم (Clearance)' : '💳 Clearance / Debt Students Only'}</SelectItem>
                                    <SelectItem value="sales">{isArabic ? '🎁 العروض والخصومات التسويقية (Sales)' : '🎁 Sales & Promotions Only'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="specific-student-code" className="text-foreground text-xs font-semibold flex items-center justify-between">
                            <span>{isArabic ? 'كود طالب محدد (اختياري - لتوجيه الإشعار لطالب وولي أمره فقط):' : 'Specific Student Code (Optional - targets student & their parent only):'}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">{isArabic ? 'اتركه فارغاً للإرسال العام' : 'Leave empty for general audience'}</span>
                        </Label>
                        <Input
                            id="specific-student-code"
                            placeholder={isArabic ? 'مثال: 12345 أو اتركه فارغاً' : 'e.g. 12345 or leave empty'}
                            value={specificStudentCode}
                            onChange={e => setSpecificStudentCode(e.target.value)}
                            className="bg-background border-border focus-visible:ring-primary font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="broadcast-body" className="text-foreground font-semibold flex items-center justify-between">
                            <span>{t('Notification Message')}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">{body.length}/240</span>
                        </Label>
                        <Textarea
                            id="broadcast-body"
                            placeholder={isArabic ? 'اكتب نص الإشعار الذي سيظهر في شريط التنبيهات وشاشة القفل...' : 'Type the push notification body text here...'}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            className="bg-background border-border min-h-[100px] focus-visible:ring-primary"
                            required
                        />
                    </div>

                    {/* Live Preview of Phone Status Bar Banner */}
                    <div className="p-4 rounded-2xl bg-[#09090b]/80 border border-primary/20 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                            <span className="flex items-center gap-1.5 text-primary">
                                <Smartphone className="w-3.5 h-3.5" />
                                {isArabic ? 'معاينة شريط إشعارات الهاتف المباشر:' : 'Live Phone Notification Shade Preview:'}
                            </span>
                            <span>{isArabic ? 'الآن' : 'now'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-card border border-border flex items-start gap-3 shadow-md">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                    {title.trim() || (isArabic ? 'عنوان الإشعار التجريبي...' : 'Notification Title Preview...')}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {body.trim() || (isArabic ? 'محتوى الرسالة التي ستصل لهواتف المستخدمين مع صوت الرنين والاهتزاز...' : 'Message body will appear here on students and parents devices with sound and vibration...')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Dual Action Buttons: Test Local vs Broadcast Remote */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestLocalDevice}
                            disabled={isTestingLocal}
                            className="w-full sm:w-1/2 border-primary/40 text-foreground hover:bg-primary/10 font-bold gap-2 cursor-pointer"
                            id="admin-test-local-device-btn"
                        >
                            <Bell className="w-4 h-4 text-primary" />
                            <span>{isTestingLocal ? t('Testing...') : (isArabic ? '🔔 تجربة فورية على جهازي' : '🔔 Test On My Device')}</span>
                        </Button>

                        <Button
                            type="submit"
                            disabled={isSending}
                            className="w-full sm:w-1/2 bg-primary hover:bg-primary/95 text-primary-foreground font-black gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                            id="admin-broadcast-notification-btn"
                        >
                            <Send className="w-4 h-4" />
                            <span>{isSending ? t('Broadcasting...') : (isArabic ? '🚀 بث الإشعار لجميع الأجهزة' : '🚀 Broadcast To All Devices')}</span>
                        </Button>
                    </div>
                </form>

                {lastActionTime && (
                    <div className="text-center text-xs font-mono text-emerald-400/90 pt-1">
                        {isArabic ? `✓ آخر عملية تمت بنجاح في: ${lastActionTime}` : `✓ Latest operation completed at: ${lastActionTime}`}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminMarketingPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        try {
            const sessionData = localStorage.getItem('admin-session');
            if (!sessionData) {
                router.replace('/admin/access');
                return;
            }

            const parsedSession: AdminSession = JSON.parse(sessionData);
            if (parsedSession.role !== 'S Admin' && parsedSession.role !== 'Manager') {
                router.replace('/admin/check-in');
                toast({ title: t("Access Denied"), variant: "destructive" });
            } else {
                setAdminSession(parsedSession);
            }
        } catch (e) {
             console.error("Session storage not available.");
             router.replace('/admin/access');
        }
        setIsAuthChecking(false);
    }, [router, t, toast]);

    if (isAuthChecking || !adminSession) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <MarketingGenerator adminSession={adminSession} />
            <Separator />
            <FeaturedCoursesManager />
            <Separator />
            <NotificationCenter />
        </div>
    );
}
