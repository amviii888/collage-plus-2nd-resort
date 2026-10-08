
'use client';

import Link from 'next/link';
import { ArrowLeft, Scale, ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function TermsAndConditionsPage() {
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
                                {isArabic ? 'الشروط والأحكام العامة وقواعد الاستخدام' : 'General Terms & Conditions of Use'}
                            </CardTitle>
                            <p className="text-xs text-blue-500 font-mono mt-1">
                                {isArabic ? 'منصة ملخصاتي الجامعية (Mola5saty) — لعام 2026' : 'Mola5saty University Academic Platform — 2026'}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6 text-sm md:text-base pt-6">
                    <p className="text-xs font-mono border-b border-border pb-3 text-muted-foreground">
                        {isArabic ? 'سارية المفعول: 2026 // الامتثال الأكاديمي والقانوني الصارم' : 'Effective: 2026 // Strict Academic & Legal Compliance'}
                    </p>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                                {isArabic ? '1. نطاق وسريان الاتفاقية' : '1. Scope of Agreement'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'تحكم هذه الشروط والأحكام العامة استخدام كافة الخدمات، والأقسام، والمذكرات، وبنوك الأسئلة، والمشغلات الآمنة المتوفرة عبر منصة وتطبيق ملخصاتي (Mola5saty). يعد وصولك للمنصة إقراراً قانونياً ملزماً بموافقتك الكاملة على كافة القواعد المذكورة دون أي استثناء.'
                                    : 'These Terms and Conditions govern the utilization of all services, course sections, lecture notes, MCQ banks, and secure streaming players available through Mola5saty. Your access constitutes a binding legal agreement to comply with all established rules without exception.'}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-foreground space-y-2">
                            <div className="flex items-center gap-2 font-bold text-red-500">
                                <AlertOctagon className="w-5 h-5" />
                                <span>{isArabic ? '2. الملكية الحصرية الكاملة لكافة المحتويات' : '2. Complete & Exclusive Content Ownership'}</span>
                            </div>
                            <p className="text-sm">
                                {isArabic 
                                    ? 'كافة المواد المعروضة، والملخصات، والامتحانات، والمحاضرات المصورة، والرسوم التوضيحية داخل المنصة هي ملكية خاصة وحصرية بالكامل. لا يُسمح لأي شخص بالاستيلاء على أي محتوى أو تصويره أو تفريغه أو تداوله خارج التطبيق تحت طائلة المسؤولية الجنائية والمدنية المباشرة.'
                                    : 'All academic materials, summaries, exams, video lectures, and medical/engineering diagrams within the platform are our exclusive property. Nobody is permitted to take, copy, screenshot, transcribe, or redistribute any content outside the application under penalty of direct criminal and civil liability.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                {isArabic ? '3. التزامات الطالب والمستخدم الأكاديمي' : '3. Student & Academic User Obligations'}
                            </h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>
                                    {isArabic 
                                        ? 'الالتزام بعدم محاولة تصوير الشاشة (Screenshot) أو تسجيل الفيديو (Screen Record) أو استخدام أدوات التقاط الفيديو أثناء دراسة المواد.'
                                        : 'Full adherence to the zero-screenshot and zero-screen-recording DRM policy while viewing academic lectures and materials.'}
                                </li>
                                <li>
                                    {isArabic 
                                        ? 'الحفاظ على سرية بيانات تسجيل الدخول وعدم منح الحساب لأي طالب آخر.'
                                        : 'Maintaining confidentiality of account credentials and strictly avoiding account sharing.'}
                                </li>
                                <li>
                                    {isArabic 
                                        ? 'الامتناع التام عن أي محاولات قرصنة أو تعطيل للمنصة أو تجاوز معايير الحماية الأمنية.'
                                        : 'Refraining from any hacking, tampering, or attempting to circumvent DRM security shields.'}
                                </li>
                            </ul>
                        </div>

                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-foreground space-y-2">
                            <h3 className="font-bold text-amber-500 text-lg">
                                {isArabic ? '4. الإجراءات القانونية والملاحقة القضائية الفورية' : '4. Legal Consequences & Immediate Prosecution'}
                            </h3>
                            <p className="text-sm">
                                {isArabic 
                                    ? 'أي تجاوز أو محاولة لتسريب المحتوى ستؤدي فوراً إلى حظر الحساب، إدراج الجهاز في القائمة السوداء، والبدء الفوري في إجراءات التقاضي والمطالبة بتعويضات مالية رادعة تشمل قيمة الأضرار المادية وخسائر الملكية الفكرية وأتعاب المحاماة كاملة.'
                                    : 'Any breach or leak attempt will immediately result in permanent account termination, device hardware blacklisting, and the immediate filing of lawsuits seeking massive damages, compensation for intellectual property losses, and total coverage of legal costs.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
