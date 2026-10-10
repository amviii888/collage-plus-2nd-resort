'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, ExternalLink, HelpCircle, Sparkles, ArrowLeft, Palette, Award, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';

export default function TeacherPhotosMarketingPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's profile details
  const teacherDocRef = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'teachers', user.uid);
  }, [firestore, user?.uid]);
  const { data: teacherProfile } = useDoc<any>(teacherDocRef);

  // Subscribe to photo pricing/packages configuration from Firestore
  const [photoConfig, setPhotoConfig] = useState<any>({
    pricePerHour: 120,
    showPrices: true,
    isComingSoon: true,
    packages: [
      { id: 'p1', title: 'Standard Professional Headshots', description: '3 high-resolution retouched digital headshots, 30-minute studio session, standard gray backdrop.', price: 150 },
      { id: 'p2', title: 'Premium Branding Package', description: '10 fully retouched digital branding photos, multiple outfit changes, customized backdrops, full commercial usage rights.', price: 350 },
      { id: 'p3', title: 'Complete Academy Bundle', description: '25 professional photos (portrait + candid lecturing shots), course banner mockups, customized social media headers.', price: 590 }
    ],
    offers: [
      'Book a branding package this week and get a free 15-second course intro video teaser!',
      '20% off for teachers who have enrolled more than 50 local students.'
    ]
  });

  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, 'photosMarketing', 'config');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPhotoConfig({
          pricePerHour: data.pricePerHour || 120,
          showPrices: data.showPrices !== undefined ? data.showPrices : true,
          isComingSoon: data.isComingSoon !== undefined ? data.isComingSoon : true,
          packages: data.packages || [],
          offers: data.offers || [],
        });
      }
    }, (err) => {
      console.error("Error loading photos config:", err);
    });
    return () => unsub();
  }, [firestore]);

  const handleBookShoot = async () => {
    if (!firestore || !user) return;

    const selectedPkg = photoConfig.packages.find((p: any) => p.id === selectedPackageId);
    if (!selectedPkg) {
      toast({
        title: t('Select Package'),
        description: t('Please select a photo branding package from the list to continue.'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const teacherName = teacherProfile?.name || user.email || 'Teacher';
    const bookingId = uuidv4();

    try {
      // 1. Log interest in Firestore
      const bookingRef = doc(firestore, 'photosBookings', bookingId);
      await setDoc(bookingRef, {
        id: bookingId,
        teacherId: user.uid,
        teacherName: teacherName,
        packageId: selectedPkg.id,
        packageTitle: selectedPkg.title,
        price: selectedPkg.price,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Open WhatsApp Redirect
      const whatsAppNumber = '201201921424';
      const priceText = photoConfig.showPrices ? ` (£${selectedPkg.price})` : '';
      const textMessage = `Hi! I am ${teacherName}, and I am interested in booking the "${selectedPkg.title}" photography package${priceText}. Please let me know your available times for a shoot!`;
      const whatsAppUrl = `https://wa.me/201201921424?text=${encodeURIComponent(textMessage)}`;

      toast({
        title: t('Inquiry Logged'),
        description: t('Opening WhatsApp to schedule your photoshoot with our branding team...'),
      });

      // Try multiple redirection methods to ensure it breaks through any iframe limitations
      try {
        const link = document.createElement('a');
        link.href = whatsAppUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(whatsAppUrl, '_blank');
      }

      // Also set a backup timeout redirection
      setTimeout(() => {
        window.location.href = whatsAppUrl;
      }, 600);
    } catch (err: any) {
      console.error('Photo booking failed', err);
      toast({
        title: t('Booking Failed'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (photoConfig.isComingSoon) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/profile">
              <ArrowLeft className="w-4 h-4" />
              {t('Back to Dashboard')}
            </Link>
          </Button>
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 font-mono tracking-wider font-bold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline animate-pulse" />
            COMING SOON
          </Badge>
        </div>

        <Card className="glass-card border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-transparent p-6 md:p-10 text-center space-y-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Camera className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {t('Photos & Branding Marketing')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('Professional photography and marketing assets are launching soon. Elevate your presence with studio headshots, lecture candid shoots, custom thumbnails, and social media banners.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2">
              <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('Executive Headshots')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Ultra high-res retouched teacher portraits optimized for badges and portals.')}</p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2">
              <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('Custom Branding Kits')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Bespoke course banners, social headers, and flyer marketing collateral.')}</p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-2">
              <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">{t('Classroom Action Shots')}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('Dynamic on-location photography capturing active teaching moments.')}</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="h-11 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/profile">
                {t('Return to Dashboard')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 font-bold border-zinc-700 bg-background/50 hover:bg-accent">
              <a href="https://wa.me/201201921424?text=Hi!%20I%20am%20interested%20in%20early%20access%20to%20the%20Photo%20and%20Branding%20packages." target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4 text-emerald-500" />
                {t('Inquire on WhatsApp')}
              </a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Camera className="w-8 h-8 text-primary" />
          {t('Photos & Branding Marketing')}
        </h1>
        <p className="text-muted-foreground">{t('Enhance your professional teacher presence with elite headshots and promotional branding campaigns.')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Packages Grid */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('Professional Photoshoot Packages')}</CardTitle>
              <CardDescription>{t('Carefully tailored plans to craft your professional portfolio and course promotional material.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {photoConfig.packages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`cursor-pointer border-2 rounded-xl p-6 transition-all relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      selectedPackageId === pkg.id
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border/50 bg-background/50 hover:border-primary/35'
                    }`}
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">{pkg.title}</h3>
                        {selectedPackageId === pkg.id && (
                          <Badge className="bg-primary text-primary-foreground font-black text-[10px]">
                            {t('Selected')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    </div>
                    <div className="text-left md:text-right min-w-[120px]">
                      {photoConfig.showPrices ? (
                        <>
                          <span className="text-3xl font-black text-primary">£{pkg.price}</span>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{t('One-time fee')}</p>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-primary">{t('Contact on WhatsApp')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Guidelines Section */}
          <Card className="liquid-glass border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                {t('Preparation Guidelines')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>● {t('Bring 2-3 outfit options. Professional business casual clothing with solid colors works best.')}</p>
              <p>● {t('Hair and makeup services can be booked as an add-on during scheduling on WhatsApp.')}</p>
              <p>● {t('We provide multiple backdrop colors (Classic Gray, White, Dark Blue, and environmental lecture settings).')}</p>
              <p>● {t('Digital delivery of high-res proofs takes up to 3 days. Final retouches take 2 additional days.')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action / Highlights column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Reservation Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('Book Your Session')}</CardTitle>
              <CardDescription>{t('Request a branding session now to boost your student conversion rate.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center space-y-2">
                <p className="text-xs font-black uppercase text-primary tracking-widest">{t('Hourly Shooting Rate')}</p>
                {photoConfig.showPrices ? (
                  <h3 className="text-4xl font-black text-foreground">£{photoConfig.pricePerHour}<span className="text-sm font-normal text-muted-foreground">/ hr</span></h3>
                ) : (
                  <h3 className="text-lg font-bold text-foreground">{t('Custom Rates')}</h3>
                )}
                <p className="text-xs text-muted-foreground">{t('For custom length sessions or specific location requests.')}</p>
              </div>

              {selectedPackageId ? (
                <div className="space-y-3 pt-2">
                  <div className="text-sm">
                    <span className="font-bold text-muted-foreground">{t('Selected Plan:')}</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {photoConfig.packages.find((p: any) => p.id === selectedPackageId)?.title}
                    </p>
                  </div>
                  <Button
                    onClick={handleBookShoot}
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {isSubmitting ? t('Logging inquiry...') : t('Book Shoot via WhatsApp')}
                  </Button>
                </div>
              ) : (
                <div className="text-center p-3 text-xs bg-muted rounded-lg text-muted-foreground font-medium">
                  💡 {t('Select a package on the left to activate booking options.')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Campaign Alerts */}
          {photoConfig.offers && photoConfig.offers.length > 0 && (
            <Card className="glass-card border-emerald-500/15 bg-emerald-500/[0.02]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  {t('Ongoing Campaigns')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                {photoConfig.offers.map((offer: string, idx: number) => (
                  <div key={idx} className="flex gap-2 items-start bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">
                    <span className="font-bold text-emerald-500">🎁</span>
                    <p className="leading-relaxed font-medium">{offer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
