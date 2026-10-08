
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Instagram, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function SupportPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    const contacts = [
        {
            icon: Phone,
            title: t('support.phone'),
            value: '01201402632',
            href: 'tel:01201402632',
        },
        {
            icon: MessageCircle,
            title: 'WhatsApp Support',
            value: '+20 120 140 2632',
            href: 'https://wa.me/201201402632',
        },
        {
            icon: Mail,
            title: t('support.email'),
            value: 'amviii888@gmail.com',
            href: 'mailto:amviii888@gmail.com',
        },
    ];

    const socials = [
        {
            name: 'amviii_8',
            href: 'https://instagram.com/amviii_8'
        },
        {
            name: 'Chef',
            href: 'https://instagram.com/cee_chef'
        },
        {
            name: 'almo10',
            href: 'https://instagram.com/almo10_'
        }
    ];

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <Button variant="ghost" onClick={handleBack} className="mb-4 -ml-4">
                <ArrowLeft className="mr-2"/> {t('settings.back')}
            </Button>
            
            <Card className="liquid-glass border-border">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">{t('support.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {contacts.map(contact => (
                            <a 
                                key={contact.title} 
                                href={contact.href} 
                                target={contact.href.startsWith('http') ? '_blank' : undefined}
                                rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/50 transition-colors"
                            >
                                <contact.icon className="w-6 h-6 text-primary"/>
                                <div>
                                    <p className="font-semibold text-foreground">{contact.title}</p>
                                    <p className="text-muted-foreground">{contact.value}</p>
                                </div>
                            </a>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">{t('support.connect')}</h3>
                        <div className="space-y-2">
                             {socials.map(social => (
                                <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/50 transition-colors">
                                    <Instagram className="w-6 h-6 text-pink-500"/>
                                     <div>
                                        <p className="font-semibold text-foreground">{social.name}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
