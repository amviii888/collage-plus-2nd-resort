
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
            subtitle: 'متاح للاتصال المباشر',
            value: '01201921424',
            href: 'tel:01201921424',
        },
        {
            icon: MessageCircle,
            title: 'WhatsApp Support',
            subtitle: 'دعم فني وأكاديمي سريع',
            value: '+20 120 192 1424',
            href: 'https://wa.me/201201921424',
        },
        {
            icon: Mail,
            title: t('support.email'),
            subtitle: 'للاستفسارات الرسمية',
            value: 'amviii888@gmail.com',
            href: 'mailto:amviii888@gmail.com',
        },
    ];

    const team = [
        {
            name: 'amviii8',
            roleAr: 'المؤسس ومطور النظام',
            roleEn: 'Founder & Software Architect',
            tag: '#01_FOUNDER',
            instagram: 'amviii_8',
            href: 'https://instagram.com/amviii_8',
            type: 'instagram'
        },
        {
            name: 'Ahmed',
            roleAr: 'المؤسس ومدير العلاقات الأكاديمية',
            roleEn: 'Founder & Academic Strategy Director',
            tag: '#02_FOUNDER',
            phone: '+20 120 192 1424',
            href: 'https://wa.me/201201921424',
            type: 'whatsapp'
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
                    <p className="text-xs text-muted-foreground mt-1">
                        منظومة الدعم الفني والأكاديمي المباشر لمنصة ملخصاتي (Mol5saty)
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        {contacts.map(contact => (
                            <a 
                                key={contact.title} 
                                href={contact.href} 
                                target={contact.href.startsWith('http') ? '_blank' : undefined}
                                rel={contact.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/50 hover:border-primary/40 transition-all group"
                            >
                                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                                    <contact.icon className="w-5 h-5"/>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-foreground text-sm">{contact.title}</p>
                                    <p className="text-xs text-muted-foreground">{contact.subtitle}</p>
                                </div>
                                <p className="font-mono font-bold text-sm text-primary dir-ltr">{contact.value}</p>
                            </a>
                        ))}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border/40">
                        <h3 className="font-semibold text-sm text-foreground flex items-center justify-between">
                            <span>{t('support.connect')}</span>
                            <span className="text-xs text-muted-foreground font-mono">Founders & Leadership</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {team.map(member => (
                                <a 
                                    key={member.name} 
                                    href={member.href} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-muted/50 hover:border-primary/40 transition-all group block"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {member.type === 'instagram' ? (
                                                <Instagram className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform"/>
                                            ) : (
                                                <MessageCircle className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform"/>
                                            )}
                                            <span className="font-black text-foreground text-base">{member.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                            {member.tag}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {member.roleAr}
                                    </p>
                                    <p className="text-[11px] font-mono text-primary/80 mt-2 font-semibold">
                                        {member.type === 'instagram' ? `@${member.instagram} ➔` : `${member.phone} ➔`}
                                    </p>
                                </a>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
