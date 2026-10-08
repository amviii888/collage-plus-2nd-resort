
'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Lock, Scale, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function TermsOfServicePage() {
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
                            <Scale className="w-7 h-7" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl md:text-3xl font-extrabold text-foreground">
                                {isArabic ? 'شروط الخدمة والاتفاقية القانونية الملزمة' : 'Terms of Service & Binding Legal Agreement'}
                            </CardTitle>
                            <p className="text-xs text-blue-500 font-mono mt-1">
                                {isArabic ? 'منصة ملخصاتي الجامعية (Mola5saty) — لعام 2026' : 'Mola5saty University Academic Platform — 2026'}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6 text-sm md:text-base pt-6">
                    <p className="text-xs font-mono border-b border-border pb-3 text-muted-foreground">
                        {isArabic ? 'تاريخ السريان: 2026 // سارٍ وملزم فور دخول التطبيق' : 'Effective Date: 2026 // Legally Binding Upon Entry'}
                    </p>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                {isArabic ? '1. المقدمة وقبول الشروط الإلزامي' : '1. Introduction & Mandatory Acceptance'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'مرحباً بك في منصة ملخصاتي الجامعية (Mola5saty). تحكم هذه الاتفاقية القانونية كافة استخداماتك للمنصة، تطبيقات الهواتف الذكية (iOS & Android)، وخدمات الويب المرتبطة بها. بمجرد فتح المنصة، أو إنشاء حساب، أو استعراض أي ملخص أو محاضرة، فإنك تقر وتوافق صراحة ودون قيد أو شرط على الالتزام الكامل بجميع البنود والشروط الواردة في هذه الوثيقة.'
                                    : 'Welcome to Mola5saty University Academic Platform. This legally binding Terms of Service agreement governs your access and usage of the platform, native mobile apps (iOS & Android), and associated web services. By opening, browsing, or utilizing any course, summary, or lecture, you unconditionally agree to be fully bound by these terms.'}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-foreground space-y-2">
                            <div className="flex items-center gap-2 font-bold text-red-500">
                                <ShieldAlert className="w-5 h-5" />
                                <span>{isArabic ? '2. الملكية الحصرية الشاملة وحظر الاستيلاء على المحتوى' : '2. Complete Proprietary Ownership & Strict Anti-Piracy Policy'}</span>
                            </div>
                            <p className="text-sm">
                                {isArabic 
                                    ? 'نحن نمتلك بالكامل وبشكل مطلق كافة أجزاء المنصة، بما في ذلك التصاميم، الأكواد البرمجية، بنوك الأسئلة، الملخصات الجامعية، الكبسولات الطبية والهندسية، تسجيلات المحاضرات، والعلامات التجارية. لا يحق لأي طالب أو مستخدم أو جهة خارجية نسخ، أو اقتباس، أو تفريغ، أو استغلال، أو إعادة نشر أي محتوى من داخل المنصة تحت أي ظرف من الظروف.'
                                    : 'We hold absolute and exclusive ownership of all platform assets, including user interface designs, underlying source code, question banks, academic summaries, clinical and engineering capsules, recorded lectures, and brand marks. No user, student, or third party is permitted to copy, transcribe, extract, exploit, or republish any content under any circumstances.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-blue-500" />
                                {isArabic ? '3. الحظر الصارم لتصوير الشاشة وتسجيل الفيديو (Zero Screenshot / DRM Policy)' : '3. Strict Zero-Screenshot & Screen Recording DRM Enforcement'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'يُمنع منعاً باتاً وقاطعاً القيام بأي محاولة لالتقاط لقطات الشاشة (Screenshots)، أو تسجيل مقاطع الفيديو (Screen Recording)، أو تشغيل أدوات النسخ المتطابق للشاشة (AirPlay / Screen Mirroring / Miracast)، أو مشاركة الشاشة عبر برامج مثل Zoom أو Teams أو Discord أو OBS، أو استخدام كاميرات خارجية لتصوير شاشة الهاتف أو الكمبيوتر.'
                                    : 'It is strictly and categorically forbidden to take screenshots, record video screencasts, engage screen mirroring (AirPlay, Miracast), broadcast via Zoom, Teams, Discord, or OBS, or use external recording devices to film content displayed within the app.'}
                            </p>
                            <p className="mt-2 text-xs font-mono bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                {isArabic 
                                    ? 'تنبيه أمني: تطبق المنصة تقنية العلامة المائية الديناميكية المشفرة (Dynamic Floating Watermark) برقم الطالب وبصمة جهازه، إضافة إلى طبقات الحماية البرمجية المباشرة (Instant Blur & Blackout Guard). أي محاولة تصوير ستؤدي إلى توثيق بصمة جهاز الطالب وحظر حسابه فوراً.'
                                    : 'SECURITY NOTICE: The platform deploys dynamic floating student watermarks with encrypted identifiers and hardware fingerprints, coupled with real-time blur and blackout guards. Any capture attempt triggers immediate forensic logging and instant account suspension.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2">
                                {isArabic ? '4. القيود والمحظورات القانونية' : '4. Prohibited Conduct & Violations'}
                            </h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>
                                    {isArabic 
                                        ? 'الهندسة العكسية، فك تجميع الكود البرمجي (Decompilation)، أو محاولة استخراج ملفات الفيديو والمذكرات بأي طريقة آلية أو يدوية.'
                                        : 'Decompiling, reverse engineering, scraping, or attempting to extract raw video streams and study handouts.'}
                                </li>
                                <li>
                                    {isArabic 
                                        ? 'مشاركة بيانات الحساب أو كلمات المرور أو الأكواد التعريفية (QR / Barcode) مع أي شخص آخر لتمكينه من المشاهدة غير المصرح بها.'
                                        : 'Sharing account credentials, passwords, or personal barcode/QR identifiers with unauthorized individuals.'}
                                </li>
                                <li>
                                    {isArabic 
                                        ? 'التلاعب في أنظمة المزامنة الهجينة أو محاولة تعطيل برمجيات حماية الحقوق الرقمية (DRM).'
                                        : 'Tampering with the synchronization engine or bypassing DRM screen protection layers.'}
                                </li>
                            </ul>
                        </div>

                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-foreground space-y-2">
                            <h3 className="font-bold text-amber-500 text-lg">
                                {isArabic ? '5. الملاحقة القضائية، الجنائية، والتعويضات المالية الضخمة' : '5. Relentless Criminal Prosecution & Substantial Monetary Damages'}
                            </h3>
                            <p>
                                {isArabic 
                                    ? 'أي اختراق لهذه الشروط أو محاولة تسريب أو تصوير أي جزء من محتوى المنصة سيواجه بإجراءات قانونية صارمة وفورية دون أي إنذار مسبق. تحتفظ إدارة المنصة بالحق الكامل في تحريك الدعاوى الجنائية والمدنية ضد الفاعل للمطالبة بتعويضات مالية رادعة تشمل التعويض عن الأضرار المادية والمعنوية، مصادرة كافة الأجهزة المستخدمة، وتحمل الجاني لكافة أتعاب المحاماة والتقاضي والتحقيقات الجنائية الرقمية.'
                                    : 'Any breach of these terms, unauthorized leak, or screenshot attempt will trigger immediate and relentless legal action without warning. Management reserves the full legal right to initiate criminal and civil litigation, seeking substantial monetary and punitive damages, confiscation of recording apparatuses, and full compensation for legal, investigation, and statutory damages.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2">
                                {isArabic ? '6. إنهاء وإلغاء الحسابات' : '6. Immediate Account Revocation'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'نحتفظ بالحق المطلق في تعليق أو حذف حساب أي مستخدم بشكل دائم ودون استرداد لأي مبالغ مدفوعة إذا تبين وجود أي شبهة لانتهاك حقوق الملكية الفكرية أو مخالفة إرشادات الأمان.'
                                    : 'We reserve the unrestricted right to terminate or permanently ban any user account without refunds if any security breach or intellectual property violation is detected.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
