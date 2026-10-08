
'use client';

import Link from 'next/link';
import { ArrowLeft, Copyright as CopyrightIcon, ShieldAlert, Cpu, Sparkles, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function CopyrightPage() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    return (
        <div 
            className="max-w-4xl mx-auto p-4 md:p-8 space-y-6"
            dir={isArabic ? 'rtl' : 'ltr'}
            style={{ fontFamily: isArabic ? "'Cairo', sans-serif" : "'Inter', sans-serif" }}
        >
            <Button asChild variant="ghost" className="mb-4 -ml-4">
                <Link href="/settings">
                    <ArrowLeft className={isArabic ? "ml-2" : "mr-2"} /> 
                    {isArabic ? 'العودة إلى الإعدادات' : t('settings.back')}
                </Link>
            </Button>
            
            <Card className="glass-card border-blue-500/20 shadow-2xl">
                <CardHeader className="border-b border-border/40 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                            <CopyrightIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl md:text-3xl font-extrabold text-foreground">
                                {isArabic ? 'حقوق الملكية الفكرية، قوانين النشر واتفاقية الملاك © 2026' : 'Copyright, Intellectual Property & Ownership Agreement © 2026'}
                            </CardTitle>
                            <p className="text-xs text-blue-500 font-mono mt-1">
                                {isArabic ? 'منصة ملخصاتي الجامعية (Mola5saty) — الحماية القانونية الشاملة' : 'Mola5saty University Academic Platform — Comprehensive Legal Protection'}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6 text-sm md:text-base pt-6">
                    <p className="text-xs font-mono border-b border-border pb-3 text-muted-foreground">
                        {isArabic ? 'سجل التوثيق القانوني الرسمي: 2026 // جميع الحقوق محفوظة ومحمية دولياً' : 'Official Legal Registry: 2026 // All Rights Reserved & Globally Protected'}
                    </p>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <Scale className="w-5 h-5 text-blue-500" />
                                {isArabic ? '1. هيكل التأسيس وحقوق التطبيق التجارية (Ownership & App Rights)' : '1. Co-Founders & Exclusive Business App Rights'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'تم تأسيس وقيادة منصة ملخصاتي الجامعية (Mola5saty) بواسطة الشركاء المؤسسين المعتمدين والمدرجين رسمياً في المنصة:'
                                    : 'Mola5saty University Academic Platform is founded and directed by the official co-founders listed on our primary portal:'}
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 not-prose">
                                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                                    <div className="text-xs font-mono text-blue-500 font-bold mb-1">#01_FOUNDER // LEAD ARCHITECT</div>
                                    <div className="font-extrabold text-foreground text-lg">amviii8</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {isArabic 
                                            ? 'المؤسس ومطور النظام — المالك الحصري لكافة حقوق التطبيق التجارية، البرمجية، المعمارية التحتية، وتراخيص التشغيل.'
                                            : 'Founder & Software Architect — Sole & Exclusive Owner of all Business App Rights, Software Architecture, and Platform IP.'}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                                    <div className="text-xs font-mono text-blue-500 font-bold mb-1">#02_FOUNDER // STRATEGY DIRECTOR</div>
                                    <div className="font-extrabold text-foreground text-lg">Ahmed</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {isArabic 
                                            ? 'المؤسس ومدير العلاقات الأكاديمية — قيادة التنسيق الجامعي، الشراكات مع الأساتذة والدكاترة، واستراتيجيات التوسع.'
                                            : 'Founder & Academic Strategy Director — Driving University Faculty Partnerships and Academic Growth Models.'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-500/10 text-foreground">
                                <h3 className="text-base font-bold text-blue-500 mb-1 flex items-center gap-2">
                                    <Cpu className="w-4 h-4" />
                                    {isArabic ? 'الإقرار الحصري لحقوق التطبيق والأعمال (Business App Rights Agreement)' : 'Sole Business App Rights Declaration'}
                                </h3>
                                <p className="text-xs md:text-sm leading-relaxed">
                                    {isArabic 
                                        ? 'يُقر ويُعتمد رسمياً بأن كافة حقوق الملكية التجارية للتطبيق، الأصول البرمجية، شيفرات المصدر، الخوارزميات، نماذج الحماية ضد التسريب (DRM Shield)، وقواعد البيانات والهوية البصرية للمنصة تعود بالكامل وبشكل حصري ومطلق إلى المؤسس (amviii8)، وله وحده حق الإدارة، الترخيص، والتصرف القانوني والتجاري في المنصة.'
                                        : 'It is strictly established and legally recognized that all commercial app rights, proprietary source code, software engineering frameworks, DRM anti-piracy shields, database architectures, and digital trademark rights belong solely, exclusively, and perpetually to Founder (amviii8).'}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-foreground space-y-2">
                            <div className="flex items-center gap-2 font-bold text-red-500">
                                <ShieldAlert className="w-5 h-5" />
                                <span>{isArabic ? '2. الملكية التامة للمحتوى وحظر الاستخدام أو النقل' : '2. Complete Content Ownership & Zero-Tolerance Extraction'}</span>
                            </div>
                            <p className="text-sm">
                                {isArabic 
                                    ? 'نحن نمتلك بالكامل وبشكل قطعي ومطلق كل ما يحتويه التطبيق: الشروحات، الكبسولات الجامعية، المذكرات، بنوك الأسئلة، تسجيلات المحاضرات، والاختبارات التفاعلية. يُحظر تماماً على أي شخص، طالب، سنتر تعليمي، أو منصة منافسة، استخدام، أو نسخ، أو اقتباس، أو طباعة، أو تسريب أي جزء من المحتوى المعروض داخل التطبيق لأي غرض كان.'
                                    : 'We retain total, unrestricted ownership over all academic content within the app: high-yield capsules, lecture recordings, clinical handouts, and interactive question banks. No individual, student, tutoring center, or competitor is permitted to copy, mirror, print, screenshot, or distribute any material from within the app for any reason.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-500" />
                                {isArabic ? '3. الحظر البات لتصوير وتسجيل الشاشة (Strict DRM Laws)' : '3. Absolute Prohibition of Screenshots & Screen Recordings'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'تعتبر أي محاولة لالتقاط لقطة شاشة (Screenshot)، أو تشغيل تسجيل الشاشة (Screen Recording)، أو استخدام أدوات بث الشاشة أو الكاميرات الخارجية لتصوير شاشات المحاضرات والملخصات، جريمة قرصنة معلوماتية واعتداءً مباشراً على حقوق الملكية الفكرية المحمية بموجب القوانين الجنائية الدولية والمحلية.'
                                    : 'Any attempt to capture screenshots, initiate screen recordings, mirror video feeds, or utilize external cameras to capture lecture materials constitutes digital piracy and a direct criminal violation of international copyright treaties and computer crime statutes.'}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-foreground space-y-2">
                            <h3 className="font-bold text-amber-500 text-lg">
                                {isArabic ? '4. الملاحقة الجنائية والمدنية والتعويضات المالية' : '4. Criminal Prosecution & Maximum Statutory Damages'}
                            </h3>
                            <p className="text-sm">
                                {isArabic 
                                    ? 'أي انتهاك لهذه الحقوق أو محاولة سرقة المحتوى ستواجه بملاحقة قضائية فورية وصارمة دون أي تهاون أو إنذار. سنقوم فوراً برفع دعاوى قضائية ومطالبات مالية ضخمة بالتعويض عن الأضرار المادية والمعنوية، بالإضافة إلى المطالبة بالمصادرة الفورية لكافة الأجهزة والمعدات وتحميل المخالف كافة أتعاب المحاماة والتقاضي.'
                                    : 'Any violation of these intellectual property rights will trigger immediate, uncompromising criminal and civil prosecution. We will pursue statutory and punitive financial damages to the maximum extent permitted by law, seize infringing hardware, and mandate the complete reimbursement of all legal counsel and forensics expenses.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
