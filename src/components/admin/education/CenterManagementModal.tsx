
'use client';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Center } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Save, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { CldUploadButton } from 'next-cloudinary';


type CenterManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (centers: Center[]) => void;
  centers: Center[];
  hubId: string;
};

export function CenterManagementModal({ isOpen, onClose, onSave, centers }: CenterManagementModalProps) {
  const { t } = useTranslation();
  const [localCenters, setLocalCenters] = useState<Center[]>([]);
  const [newCenterName, setNewCenterName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLocalCenters(centers.map(f => ({...f})));
      setNewCenterName('');
    }
  }, [isOpen, centers]);

  const handleFieldChange = (id: string, field: 'name' | 'password', value: string) => {
    setLocalCenters(localCenters.map(f => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleLogoUpload = (id: string, result: any) => {
    const secureUrl = result.info.secure_url;
    setLocalCenters(prevCenters => 
        prevCenters.map(c => c.id === id ? { ...c, logoUrl: secureUrl } : c)
    );
  };

  const handleAddNewCenter = () => {
    if (newCenterName.trim() === '') {
      toast({ title: t('Please enter a center name'), variant: 'destructive' });
      return;
    }
    const newCenter: Center = { id: uuidv4(), name: newCenterName.trim(), password: '' };
    setLocalCenters([...localCenters, newCenter]);
    setNewCenterName('');
  };

  const handleRemoveCenter = (id: string) => {
    setLocalCenters(localCenters.filter(f => f.id !== id));
  };
  
  const handleSave = () => {
    if (localCenters.some(f => f.name.trim() === '')) {
        toast({ title: t('Empty names found'), description: t('Center names cannot be empty.'), variant: 'destructive' });
        return;
    }
    const names = localCenters.map(f => f.name.toLowerCase().trim());
    if (new Set(names).size !== names.length) {
        toast({ title: t('Duplicate names found'), description: t('Center names must be unique.'), variant: 'destructive' });
        return;
    }
    onSave(localCenters);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Manage Center Accounts')}</DialogTitle>
          <DialogDescription>
            {t('Add, edit, or remove center accounts. Each center needs a password to log in.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <Label>{t('Center Account List')}</Label>
            <div className="space-y-3">
                {localCenters.map((center) => (
                    <div key={center.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                             {center.logoUrl ? (
                                <Image src={center.logoUrl} width={40} height={40} alt="logo" className="rounded-full object-cover"/>
                             ) : <div className="w-10 h-10 rounded-full bg-muted"/>}
                            <div onPointerDown={(e) => e.preventDefault()}>
                                <CldUploadButton
                                    uploadPreset="unsigned_pfp_upload"
                                    onSuccess={(result) => handleLogoUpload(center.id, result)}
                                    className="text-xs h-8 px-2 gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium flex items-center justify-center"
                                >
                                    <UploadCloud className="w-3 h-3"/> {t('Logo')}
                                </CldUploadButton>
                            </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`name-${center.id}`} className="text-xs">{t('Center Name')}</Label>
                          <Input 
                              id={`name-${center.id}`}
                              value={center.name || ''}
                              onChange={(e) => handleFieldChange(center.id, 'name', e.target.value)}
                              placeholder={t('Center name')}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="flex-grow space-y-1">
                                <Label htmlFor={`password-${center.id}`} className="text-xs">{t('Password')}</Label>
                                <Input 
                                    id={`password-${center.id}`}
                                    value={center.password || ''}
                                    onChange={(e) => handleFieldChange(center.id, 'password', e.target.value)}
                                    placeholder={t('Login Password')}
                                />
                           </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveCenter(center.id)} aria-label={t('Remove center')}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-2 border-t pt-4">
                <Label>{t('Add New Center')}</Label>
                 <div className="flex items-center gap-2">
                    <Input 
                        value={newCenterName}
                        onChange={(e) => setNewCenterName(e.target.value)}
                        placeholder={t('New center name')}
                    />
                    <Button variant="outline" size="icon" onClick={handleAddNewCenter} aria-label={t('Add new center')}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" onClick={handleSave}><Save className="mr-2 h-4 w-4"/><span>{t('Save Changes')}</span></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
