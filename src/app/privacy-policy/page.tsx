
'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Lock, EyeCheck, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyPage() {
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
                            <Shield className="w-7 h-7" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl md:text-3xl font-extrabold text-foreground">
                                {isArabic ? 'سياسة الخصوصية وحماية البيانات الأكاديمية' : 'Privacy Policy & Academic Data Protection'}
                            </CardTitle>
                            <p className="text-xs text-blue-500 font-mono mt-1">
                                {isArabic ? 'منصة ملخصاتي الجامعية (Mol5saty) — لعام 2026' : 'Mol5saty University Academic Platform — 2026'}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6 text-sm md:text-base pt-6">
                    <p className="text-xs font-mono border-b border-border pb-3 text-muted-foreground">
                        {isArabic ? 'تاريخ التحديث: 2026 // خصوصية مشددة وحماية بيانات كاملة' : 'Last Updated: 2026 // Maximum Privacy & Data Security'}
                    </p>
                    
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-blue-500" />
                                {isArabic ? '1. الالتزام المطلق بالخصوصية والأمان' : '1. Absolute Commitment to Privacy & Security'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'تلتزم منصة ملخصاتي (Mol5saty) بأعلى المعايير العالمية في حماية خصوصية وأمان الطلاب، وأساتذة الجامعات، والمشرفين الأكاديميين. توضح هذه السياسة كيف نقوم بتأمين بياناتك الأكاديمية والشخصية مع فرض أعلى درجات التشفير والحماية الرقمية.'
                                    : 'Mol5saty University Platform is strictly committed to the highest global standards for student, professor, and faculty privacy. This policy outlines how academic records and personal credentials are encrypted, protected, and managed.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-500" />
                                {isArabic ? '2. البيانات التي نقوم بجمعها وتأمينها' : '2. Information Collected & Secured'}
                            </h2>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>
                                    <strong>{isArabic ? 'بيانات الحساب الجامعي والتسجيل:' : 'University Profile & Account Data:'}</strong>{' '}
                                    {isArabic 
                                        ? 'الاسم، البريد الإلكتروني، الكلية، الفرقة الدراسية، رقم الهاتف، ومعرّف الطالب الجامعي الفريد (Barcode / Student ID).'
                                        : 'Full name, institutional email, faculty department, academic year, phone number, and unique Student Barcode ID.'}
                                </li>
                                <li>
                                    <strong>{isArabic ? 'السجلات الأكاديمية وبنوك الأسئلة:' : 'Academic Logs & Exam Progress:'}</strong>{' '}
                                    {isArabic 
                                        ? 'سجلات مشاهدة المحاضرات، حل بنوك الأسئلة، تقييمات الامتحانات الدورية، وطلبات الانضمام المعتمدة للمقررات الدراسية.'
                                        : 'Lecture playback history, MCQ question bank progress, quiz scores, and verified course access enrollments.'}
                                </li>
                                <li>
                                    <strong>{isArabic ? 'بيانات الأجهزة والبصمة الرقمية للعلامة المائية:' : 'Device Fingerprint & Forensic Watermarking Data:'}</strong>{' '}
                                    {isArabic 
                                        ? 'يتم تشفير بصمة الجهاز ورقم الهوية لعرض العلامة المائية العائمة أثناء تشغيل المحاضرات لحماية ملكية الأساتذة ومنع محاولات التسريب.'
                                        : 'Encrypted hardware fingerprints and student IDs used exclusively for dynamic DRM watermarking on protected lecture streams.'}
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2">
                                {isArabic ? '3. معمارية التخزين الآمن والمزامنة الذكية' : '3. Secure Storage & Offline Smart Sync'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'تعتمد المنصة على بنية التخزين الهجين السريع (One-Way Smart Push) حيث يتم تشفير البيانات محلياً داخل جهازك للعمل بدون إنترنت داخل المدرجات، وتُرفع التعديلات بأمان إلى قواعد البيانات السحابية المشفرة دون مشاركة أي معلومات مع أطراف خارجية.'
                                    : 'We deploy an encrypted offline-first engine (One-Way Smart Push) buffering study data securely in your local environment before pushing authorized updates to cloud databases with zero third-party disclosure.'}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 text-foreground space-y-2">
                            <div className="flex items-center gap-2 font-bold text-blue-500">
                                <EyeCheck className="w-5 h-5" />
                                <span>{isArabic ? '4. عدم بيع أو مشاركة البيانات الشخصية' : '4. Zero Commercial Data Selling or Third-Party Sharing'}</span>
                            </div>
                            <p className="text-sm">
                                {isArabic 
                                    ? 'لا نقوم على الإطلاق ببيع، أو تأجير، أو مشاركة أي بيانات تخص الطلاب أو الأساتذة مع أي شركات تسويق أو أطراف خارجية. تُستخدم كافة البيانات حصرياً لتمكينك من متابعة مقرراتك الأكاديمية بنجاح وأمان.'
                                    : 'We never sell, rent, monetize, or transfer student or faculty data to advertising companies or commercial third parties. All stored data is strictly dedicated to delivering high-performance academic instruction.'}
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-foreground mb-2">
                                {isArabic ? '5. حقوق المستخدم والتحكم في الحساب' : '5. Student Rights & Account Management'}
                            </h2>
                            <p>
                                {isArabic 
                                    ? 'يحق لكل مستخدم مراجعة بياناته، تحديث ملفه الشخصي، أو طلب الحذف النهائي لحسابه وسجلاته بالكامل عبر مراسلة الدعم الفني الرسمي للمنصة.'
                                    : 'Users have full authority to inspect, update, or request permanent deletion of their account records by contacting our official support desk.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
