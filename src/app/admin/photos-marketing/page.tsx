'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Camera, CheckCircle, Clock, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type AdminSession = { name: string; role: string };

type PhotoPackage = {
  id: string;
  title: string;
  description: string;
  price: number;
};

export default function AdminPhotosMarketingPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Configuration States
  const [pricePerHour, setPricePerHour] = useState<number>(120);
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [isComingSoon, setIsComingSoon] = useState<boolean>(true);
  const [packages, setPackages] = useState<PhotoPackage[]>([]);
  const [offers, setOffers] = useState<string[]>([]);
  const [newOffer, setNewOffer] = useState<string>('');
  const [editingOfferIdx, setEditingOfferIdx] = useState<number | null>(null);
  const [editingOfferText, setEditingOfferText] = useState<string>('');

  // Modals / Editing States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PhotoPackage | null>(null);
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');

  // Authenticate Admin Session
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
        toast({ title: t('Access Denied'), variant: 'destructive' });
      } else {
        setAdminSession(parsedSession);
      }
    } catch (e) {
      console.error('Session validation failed');
      router.replace('/admin/access');
    }
    setIsAuthChecking(false);
  }, [router, t, toast]);

  // Load configuration from Firestore on mount
  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, 'photosMarketing', 'config');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPricePerHour(data.pricePerHour || 120);
        setPackages(data.packages || []);
        setOffers(data.offers || []);
        setShowPrices(data.showPrices !== undefined ? data.showPrices : true);
        setIsComingSoon(data.isComingSoon !== undefined ? data.isComingSoon : true);
      }
    }, (err) => {
      console.error("Error loading photo marketing config:", err);
    });
    return () => unsub();
  }, [firestore]);

  // Query Teacher Bookings / Inquiries
  const bookingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'photosBookings'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  const { data: bookings, isLoading: bookingsLoading } = useCollection<any>(bookingsQuery);

  const handleSaveConfig = async (
    updatedPackages: PhotoPackage[],
    updatedOffers: string[],
    updatedPrice: number,
    updatedShowPrices?: boolean,
    updatedComingSoon?: boolean
  ) => {
    if (!firestore) return;
    const resolvedShowPrices = updatedShowPrices !== undefined ? updatedShowPrices : showPrices;
    const resolvedComingSoon = updatedComingSoon !== undefined ? updatedComingSoon : isComingSoon;
    try {
      const docRef = doc(firestore, 'photosMarketing', 'config');
      await setDoc(docRef, {
        pricePerHour: updatedPrice,
        packages: updatedPackages,
        offers: updatedOffers,
        showPrices: resolvedShowPrices,
        isComingSoon: resolvedComingSoon,
      }, { merge: true });
      toast({ title: t('Settings Saved'), description: t('Photography campaign guidelines updated successfully.') });
    } catch (err: any) {
      toast({ title: t('Save Failed'), description: err.message, variant: 'destructive' });
    }
  };

  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setPkgTitle('');
    setPkgDescription('');
    setPkgPrice('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: PhotoPackage) => {
    setEditingPackage(pkg);
    setPkgTitle(pkg.title);
    setPkgDescription(pkg.description);
    setPkgPrice(String(pkg.price));
    setIsModalOpen(true);
  };

  const handleSavePackage = () => {
    if (!pkgTitle || !pkgPrice) {
      toast({ title: t('Validation Error'), description: t('Please fill in title and price.'), variant: 'destructive' });
      return;
    }

    let updatedPackages = [...packages];
    if (editingPackage) {
      updatedPackages = updatedPackages.map(p => p.id === editingPackage.id ? {
        ...p,
        title: pkgTitle,
        description: pkgDescription,
        price: parseFloat(pkgPrice)
      } : p);
    } else {
      updatedPackages.push({
        id: uuidv4(),
        title: pkgTitle,
        description: pkgDescription,
        price: parseFloat(pkgPrice)
      });
    }

    setPackages(updatedPackages);
    handleSaveConfig(updatedPackages, offers, pricePerHour);
    setIsModalOpen(false);
  };

  const handleDeletePackage = (pkgId: string) => {
    if (window.confirm(t('Are you sure you want to delete this photography package?'))) {
      const updatedPackages = packages.filter(p => p.id !== pkgId);
      setPackages(updatedPackages);
      handleSaveConfig(updatedPackages, offers, pricePerHour);
    }
  };

  const handleAddOffer = () => {
    if (!newOffer.trim()) return;
    const updatedOffers = [...offers, newOffer.trim()];
    setOffers(updatedOffers);
    setNewOffer('');
    handleSaveConfig(packages, updatedOffers, pricePerHour);
  };

  const handleRemoveOffer = (idx: number) => {
    const updatedOffers = offers.filter((_, i) => i !== idx);
    setOffers(updatedOffers);
    handleSaveConfig(packages, updatedOffers, pricePerHour);
  };

  const handleStartEditOffer = (idx: number, text: string) => {
    setEditingOfferIdx(idx);
    setEditingOfferText(text);
  };

  const handleSaveEditedOffer = () => {
    if (editingOfferIdx === null || !editingOfferText.trim()) return;
    const updatedOffers = offers.map((offer, i) => i === editingOfferIdx ? editingOfferText.trim() : offer);
    setOffers(updatedOffers);
    setEditingOfferIdx(null);
    setEditingOfferText('');
    handleSaveConfig(packages, updatedOffers, pricePerHour);
  };

  const handleCancelEditOffer = () => {
    setEditingOfferIdx(null);
    setEditingOfferText('');
  };

  const handleUpdatePricePerHour = (val: string) => {
    const price = parseFloat(val) || 0;
    setPricePerHour(price);
  };

  const handleSavePricePerHour = () => {
    handleSaveConfig(packages, offers, pricePerHour);
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    if (!firestore) return;
    if (window.confirm(t('Delete this inquiry record?'))) {
      try {
        await deleteDoc(doc(firestore, 'photosBookings', inquiryId));
        toast({ title: t('Record Deleted') });
      } catch (e: any) {
        toast({ title: t('Delete Failed'), description: e.message, variant: 'destructive' });
      }
    }
  };

  if (isAuthChecking || !adminSession) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Camera className="w-8 h-8 text-primary" />
          {t('Manage Photos Marketing')}
        </h1>
        <p className="text-muted-foreground">{t('Set pricing and active campaigns for teacher professional photography & branding packages.')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: pricing, campaign and offers config */}
        <div className="lg:col-span-1 space-y-6">
          {/* Base Hourly Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Hourly Shoot Pricing')}</CardTitle>
              <CardDescription>{t('Define the default hourly photography price.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">{t('PricePerHour (£)')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={pricePerHour}
                    onChange={(e) => handleUpdatePricePerHour(e.target.value)}
                  />
                  <Button onClick={handleSavePricePerHour}>{t('Save')}</Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isComingSoon ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                    {t('Coming Soon Mode')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = !isComingSoon;
                      setIsComingSoon(newVal);
                      handleSaveConfig(packages, offers, pricePerHour, showPrices, newVal);
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isComingSoon ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isComingSoon ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {isComingSoon
                    ? t('Active: Teachers see a "Coming Soon" showcase screen with features preview.')
                    : t('Live: Teachers can book photography packages directly.')}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">{t('Display Prices on Teacher App')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newVal = !showPrices;
                      setShowPrices(newVal);
                      handleSaveConfig(packages, offers, pricePerHour, newVal);
                    }}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showPrices ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                        showPrices ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {t('If disabled, prices are hidden and booking defaults to free pre-meet messages via WhatsApp.')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Banners & Promos */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Active Campaigns')}</CardTitle>
              <CardDescription>{t('Announce promotional bundles and special offers.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaignInput">{t('Add Campaign Offer')}</Label>
                <div className="flex flex-col gap-2">
                  <Textarea
                    id="campaignInput"
                    placeholder={t('e.g. Free 15-second teaser video this week!')}
                    value={newOffer}
                    onChange={(e) => setNewOffer(e.target.value)}
                  />
                  <Button onClick={handleAddOffer} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Campaign')}
                  </Button>
                </div>
              </div>

              {offers.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>{t('Current Live Campaigns')}</Label>
                  <div className="space-y-2">
                    {offers.map((offer, idx) => (
                      <div key={idx} className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 text-xs space-y-2">
                        {editingOfferIdx === idx ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingOfferText}
                              onChange={(e) => setEditingOfferText(e.target.value)}
                              className="w-full text-xs"
                              rows={2}
                            />
                            <div className="flex gap-1.5 justify-end">
                              <Button size="sm" className="h-7 text-[10px] font-bold" onClick={handleSaveEditedOffer}>
                                {t('Save')}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] font-semibold" onClick={handleCancelEditOffer}>
                                {t('Cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <p className="font-medium text-muted-foreground leading-relaxed flex-grow pr-2">{offer}</p>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => handleStartEditOffer(idx, offer)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveOffer(idx)}>
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: packages config */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('Photography Packages')}</CardTitle>
                <CardDescription>{t('Design bundled pricing tiers shown to teachers.')}</CardDescription>
              </div>
              <Button onClick={handleOpenAddModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Package')}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Package Title')}</TableHead>
                    <TableHead>{t('Price')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <p className="font-bold">{pkg.title}</p>
                        <p className="text-xs text-muted-foreground max-w-sm mt-0.5 line-clamp-2">{pkg.description}</p>
                      </TableCell>
                      <TableCell className="font-bold text-primary">£{pkg.price}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(pkg)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePackage(pkg.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {packages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        {t('No packages configured. Add one above.')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inquiry submissions tracking card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Teacher Photoshoot Inquiries')}</CardTitle>
          <CardDescription>{t('Review requests and interest expressions logged by teachers.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Teacher Name')}</TableHead>
                  <TableHead>{t('Selected Package')}</TableHead>
                  <TableHead>{t('Package Price')}</TableHead>
                  <TableHead>{t('Request Date')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings?.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-semibold">{booking.teacherName}</TableCell>
                    <TableCell>{booking.packageTitle}</TableCell>
                    <TableCell className="font-semibold text-primary">£{booking.price}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {booking.createdAt ? format(booking.createdAt.toDate(), 'PPP p') : 'Pending'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteInquiry(booking.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {bookings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('No photoshoot inquiry submissions yet.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Package Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? t('Edit Photography Package') : t('Add Photography Package')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pkgTitle">{t('Package Title')}</Label>
              <Input id="pkgTitle" value={pkgTitle} onChange={(e) => setPkgTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkgDesc">{t('Description')}</Label>
              <Textarea id="pkgDesc" value={pkgDescription} onChange={(e) => setPkgDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkgPrice">{t('Price (£)')}</Label>
              <Input id="pkgPrice" type="number" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSavePackage}>{t('Save Package')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
