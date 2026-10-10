'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  BookOpen, 
  Building2, 
  User, 
  Phone, 
  Lock, 
  Calendar, 
  MapPin,
  Sparkles,
  Sun,
  Moon,
  CheckCircle,
  Loader2,
  MessageCircle,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { setDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { findProfessorByCode, addProfessorCodeToStudent, setActiveProfessorBranding, resolveProfessorFromCloudOrLocal } from '@/lib/professors-registry';
import i18next from 'i18next';
import { motion } from 'motion/react';

const EGYPTIAN_GOVERNORATES = [
  { id: 'cairo', nameAr: 'القاهرة (Cairo)', nameEn: 'Cairo' },
  { id: 'giza', nameAr: 'الجيزة (Giza)', nameEn: 'Giza' },
  { id: 'alexandria', nameAr: 'الإسكندرية (Alexandria)', nameEn: 'Alexandria' },
  { id: 'dakahlia', nameAr: 'الدقهلية - المنصورة (Dakahlia)', nameEn: 'Dakahlia' },
  { id: 'sharqia', nameAr: 'الشرقية - الزقازيق (Sharqia)', nameEn: 'Sharqia' },
  { id: 'gharbia', nameAr: 'الغربية - طنطا (Gharbia)', nameEn: 'Gharbia' },
  { id: 'qalyubia', nameAr: 'القليوبية - بنها (Qalyubia)', nameEn: 'Qalyubia' },
  { id: 'monufia', nameAr: 'المنوفية - شبين الكوم (Monufia)', nameEn: 'Monufia' },
  { id: 'kafr_sheikh', nameAr: 'كفر الشيخ (Kafr El-Sheikh)', nameEn: 'Kafr El-Sheikh' },
  { id: 'beheira', nameAr: 'البحيرة - دمنهور (Beheira)', nameEn: 'Beheira' },
  { id: 'damietta', nameAr: 'دمياط (Damietta)', nameEn: 'Damietta' },
  { id: 'port_said', nameAr: 'بورسعيد (Port Said)', nameEn: 'Port Said' },
  { id: 'ismailia', nameAr: 'الإسماعيلية (Ismailia)', nameEn: 'Ismailia' },
  { id: 'suez', nameAr: 'السويس (Suez)', nameEn: 'Suez' },
  { id: 'fayoum', nameAr: 'الفيوم (Fayoum)', nameEn: 'Fayoum' },
  { id: 'beni_suef', nameAr: 'بني سويف (Beni Suef)', nameEn: 'Beni Suef' },
  { id: 'minya', nameAr: 'المنيا (Minya)', nameEn: 'Minya' },
  { id: 'asyut', nameAr: 'أسيوط (Asyut)', nameEn: 'Asyut' },
  { id: 'sohag', nameAr: 'سوهاج (Sohag)', nameEn: 'Sohag' },
  { id: 'qena', nameAr: 'قنا (Qena)', nameEn: 'Qena' },
  { id: 'luxor', nameAr: 'الأقصر (Luxor)', nameEn: 'Luxor' },
  { id: 'aswan', nameAr: 'أسوان (Aswan)', nameEn: 'Aswan' },
  { id: 'red_sea', nameAr: 'البحر الأحمر - الغردقة (Red Sea)', nameEn: 'Red Sea' },
  { id: 'new_valley', nameAr: 'الوادي الجديد (New Valley)', nameEn: 'New Valley' },
  { id: 'matrouh', nameAr: 'مطروح - الساحل الشمالي (Matrouh)', nameEn: 'Matrouh' },
  { id: 'north_sinai', nameAr: 'شمال سيناء (North Sinai)', nameEn: 'North Sinai' },
  { id: 'south_sinai', nameAr: 'جنوب سيناء - شرم الشيخ (South Sinai)', nameEn: 'South Sinai' },
];

const EGYPTIAN_UNIVERSITIES = [
  'جامعة القاهرة (Cairo University)',
  'جامعة عين شمس (Ain Shams University)',
  'جامعة الإسكندرية (Alexandria University)',
  'جامعة المنصورة (Mansoura University)',
  'جامعة أسيوط (Assiut University)',
  'جامعة الزقازيق (Zagazig University)',
  'جامعة حلوان (Helwan University)',
  'جامعة طنطا (Tanta University)',
  'جامعة المنيا (Minia University)',
  'جامعة المنوفية (Menoufia University)',
  'جامعة قناة السويس (Suez Canal University)',
  'جامعة جنوب الوادي (South Valley University)',
  'جامعة بنها (Benha University)',
  'جامعة الفيوم (Fayoum University)',
  'جامعة بني سويف (Beni-Suef University)',
  'جامعة كفر الشيخ (Kafr El-Sheikh University)',
  'جامعة سوهاج (Sohag University)',
  'جامعة بورسعيد (Port Said University)',
  'جامعة دمنهور (Damanhour University)',
  'جامعة أسوان (Aswan University)',
  'جامعة دمياط (Damietta University)',
  'جامعة السويس (Suez University)',
  'جامعة مطروح (Matrouh University)',
  'جامعة الوادي الجديد (New Valley University)',
  'جامعة الأزهر (Al-Azhar University)',
  'جامعة الجلالة الأهلية (Galala University)',
  'جامعة الملك سلمان الدولية (King Salman University)',
  'جامعة العلمين الدولية (Alamein University)',
  'جامعة المنصورة الجديدة (New Mansoura University)',
  'مدينة زويل للعلوم والتكنولوجيا (Zewail City)',
  'الجامعة المصرية اليابانية (E-JUST)',
  'جامعة النيل (Nile University)',
  'جامعة بدر بالقاهرة (BUC)',
  'جامعة بدر بأسيوط (BUA)',
  'جامعة مصر للعلوم والتكنولوجيا (MUST)',
  'جامعة 6 أكتوبر (October 6 University)',
  'جامعة أكتوبر للآداب والعلوم (MSA)',
  'جامعة مصر الدولية (MIU)',
  'الجامعة الألمانية بالقاهرة (GUC)',
  'الجامعة البريطانية في مصر (BUE)',
  'جامعة المستقبل (FUE)',
  'الجامعة الأمريكية بالقاهرة (AUC)',
  'جامعة النهضة ببني سويف (NUB)',
  'جامعة الدلتا للعلوم والتكنولوجيا (Delta University)',
  'جامعة هليوبوليس (Heliopolis University)',
  'جامعة حورس (HUE)',
  'جامعة سفنكس (Sphinx University)',
  'جامعة دراية (Deraya University)',
  'جامعة سيناء (Sinai University)',
  'جامعة نيو جيزة (New Giza University - NGU)',
  'جامعة الأهرام الكندية (ACU)',
  'جامعة أو معهد عالٍ آخر (Other / Institute)'
];

const FACULTY_DISCIPLINES = [
  { id: 'medicine', nameAr: 'الطب البشري (Human Medicine)', nameEn: 'Human Medicine' },
  { id: 'dentistry', nameAr: 'طب وجراحة الفم والأسنان (Dentistry)', nameEn: 'Dentistry' },
  { id: 'pharmacy', nameAr: 'الصيدلة الإكلينيكية والدوائية (Clinical Pharmacy)', nameEn: 'Pharmacy' },
  { id: 'physical_therapy', nameAr: 'العلاج الطبيعي (Physical Therapy)', nameEn: 'Physical Therapy' },
  { id: 'nursing_health', nameAr: 'التمريض وتكنولوجيا العلوم الصحية (Nursing & Health Tech)', nameEn: 'Nursing & Health' },
  { id: 'engineering', nameAr: 'الهندسة (Engineering)', nameEn: 'Engineering' },
  { id: 'computer_science', nameAr: 'الحاسبات والمعلومات والذكاء الاصطناعي (CS & AI)', nameEn: 'Computer Science' },
  { id: 'business_commerce', nameAr: 'التجارة وإدارة الأعمال والاقتصاد (Business & Commerce)', nameEn: 'Business' },
  { id: 'law', nameAr: 'الحقوق والشريعة والقانون (Law & Jurisprudence)', nameEn: 'Law' },
  { id: 'science', nameAr: 'العلوم (Faculty of Science)', nameEn: 'Science' },
  { id: 'arts_languages', nameAr: 'الآداب واللغات والترجمة (Arts & Humanities)', nameEn: 'Arts & Languages' },
  { id: 'applied_arts', nameAr: 'الفنون التطبيقية والجميلة (Applied & Fine Arts)', nameEn: 'Applied Arts' },
  { id: 'mass_comm', nameAr: 'الإعلام والاتصال الرقمي (Mass Communication)', nameEn: 'Media' },
  { id: 'other_faculty', nameAr: 'كلية أو معهد عالٍ آخر (Other Faculty)', nameEn: 'Other Faculty' },
];

const ACADEMIC_YEARS = [
  { id: 'year_1', nameAr: 'الفرقة الأولى (Year 1)', nameEn: '1st Year' },
  { id: 'year_2', nameAr: 'الفرقة الثانية (Year 2)', nameEn: '2nd Year' },
  { id: 'year_3', nameAr: 'الفرقة الثالثة (Year 3)', nameEn: '3rd Year' },
  { id: 'year_4', nameAr: 'الفرقة الرابعة (Year 4)', nameEn: '4th Year' },
  { id: 'year_5', nameAr: 'الفرقة الخامسة (Year 5 - الطب والصيدلة والأسنان)', nameEn: '5th Year' },
  { id: 'year_6', nameAr: 'الفرقة السادسة (Year 6 - كليات الطب)', nameEn: '6th Year' },
  { id: 'internship', nameAr: 'سنة الامتياز (House Officer / Internship)', nameEn: 'Internship Year' },
  { id: 'postgrad', nameAr: 'دراسات عليا / ماجستير / زمالة (Postgraduate)', nameEn: 'Postgraduate' },
];

const AuthHeader = () => {
  const isArabic = i18next.language === 'ar';
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mol5saty_theme') || localStorage.getItem('app_mode_dark');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      localStorage.setItem('mol5saty_theme', next ? 'dark' : 'light');
      localStorage.setItem('app_mode_dark', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('app_theme_changed'));
    } catch (e) {}
  };

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar';
    i18next.changeLanguage(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mol5saty-lang', newLang);
    }
  };

  return (
    <header className="px-4 sm:px-8 py-3.5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 backdrop-blur-md sticky top-0 z-40 bg-white/85 dark:bg-[#070b14]/85 shadow-xs transition-colors">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e40af] p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[9px] flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#2563eb] group-hover:scale-110 transition-transform" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0f172a] dark:text-white">
            {isArabic ? 'ملخصاتي' : 'Mol5saty'}
          </span>
          <span className="text-[9px] text-[#2563eb] dark:text-blue-400 font-bold tracking-wider uppercase">
            {isArabic ? 'تسجيل طالب جامعي' : 'COLLEGE REGISTRATION'}
          </span>
        </div>
      </Link>
      
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleTheme}
          type="button"
          className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
          title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
        </button>

        <button 
          onClick={toggleLanguage} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-xs active:scale-95"
        >
          <Globe className="w-3.5 h-3.5 text-[#2563eb]"/>
          <span>{isArabic ? 'English' : 'عربي'}</span>
        </button>
        
        <Link 
          href="/signup-options" 
          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#2563eb] px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-[#2563eb] bg-white dark:bg-slate-900 rounded-xl transition-all shadow-xs"
        >
          {isArabic ? 'تغيير الدور' : 'Change Role'}
        </Link>
      </div>
    </header>
  );
};

export default function StudentSignupPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isArabic = i18next.language === 'ar';
  const { user, isUserLoading } = useUser();
  const [hasMounted, setHasMounted] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // University Student Form State
  const [governorate, setGovernorate] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const [facultyCategory, setFacultyCategory] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [professorCodeInput, setProfessorCodeInput] = useState<string>('');
  const [resolvedProfessor, setResolvedProfessor] = useState<any | null>(null);
  const [isCheckingProfCode, setIsCheckingProfCode] = useState<boolean>(false);

  // WhatsApp Real-Time Verification State
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState<string>('');
  const [botPhone, setBotPhone] = useState<string>('201201921424');
  const [isEditingBotPhone, setIsEditingBotPhone] = useState<boolean>(false);
  const [tempBotPhone, setTempBotPhone] = useState<string>('201201921424');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Initialize bot phone and code from storage/generator
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBotPhone = localStorage.getItem('mol5saty_bot_phone');
      const activeBotPhone = (savedBotPhone && savedBotPhone !== '201201402632') ? savedBotPhone : '201201921424';
      setBotPhone(activeBotPhone);
      setTempBotPhone(activeBotPhone);
      localStorage.setItem('mol5saty_bot_phone', activeBotPhone);
    }
    if (!verificationCode) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
    }
  }, [verificationCode]);

  // Real-time Firestore listener on `phone_verifications/${verificationCode}`
  useEffect(() => {
    if (!verificationCode || !firestore || isPhoneVerified) return;

    try {
      const unsub = onSnapshot(doc(firestore, 'phone_verifications', verificationCode), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.verified) {
            setIsPhoneVerified(true);
            const rawPhone = data.phoneNumber || '';
            setVerifiedPhoneNumber(rawPhone);

            // Normalize Egyptian phone format for the field display
            const clean = rawPhone.replace(/\s+/g, '');
            const localNum = clean.startsWith('+20')
              ? '0' + clean.slice(3)
              : (clean.startsWith('20') ? '0' + clean.slice(2) : clean);
            if (localNum.startsWith('01') && localNum.length === 11) {
              setPhoneInput(localNum);
            } else if (!phoneInput) {
              setPhoneInput(clean);
            }

            toast({
              title: isArabic ? '✅ تم تأكيد رقم هاتفك بنجاح!' : '✅ Phone Verified Successfully!',
              description: isArabic
                ? `تم استلام رسالة التفعيل وتأكيد الرقم [ ${rawPhone} ] بنجاح.`
                : `Verification received! Phone [ ${rawPhone} ] is verified.`,
              duration: 8000,
            });
          }
        }
      }, (err) => {
        console.warn("Verification listener notice:", err);
      });

      return () => unsub();
    } catch (err) {
      console.warn("Snapshot setup notice:", err);
    }
  }, [verificationCode, firestore, isPhoneVerified, isArabic, phoneInput, toast]);

  const handleRegenerateCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(newCode);
    setIsPhoneVerified(false);
    setVerifiedPhoneNumber('');
    toast({
      title: isArabic ? 'كود تحقق جديد' : 'New Verification Code',
      description: isArabic ? `تم إنشاء كود جديد: VERIFY-${newCode}` : `Generated code: VERIFY-${newCode}`
    });
  };

  const handleCopyCode = () => {
    const text = `VERIFY-${verificationCode}`;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    toast({
      title: isArabic ? 'تم نسخ كود التفعيل' : 'Code Copied',
      description: text
    });
  };

  const handleSaveBotPhone = () => {
    const clean = tempBotPhone.replace(/[^\d]/g, '');
    if (clean.length >= 8) {
      setBotPhone(clean);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mol5saty_bot_phone', clean);
      }
      setIsEditingBotPhone(false);
      toast({
        title: isArabic ? 'تم حفظ رقم البوت' : 'Bot Phone Saved',
        description: isArabic ? `رقم هاتف البوت المعتمد: ${clean}` : `Bot number set to: ${clean}`
      });
    } else {
      toast({
        variant: 'destructive',
        title: isArabic ? 'رقم غير صحيح' : 'Invalid Number',
        description: isArabic ? 'يرجى إدخال رقم صحيح مع كود الدولة.' : 'Please enter a valid phone number.'
      });
    }
  };

  // Live real-time check for doctor code as student types (2 to 4 letters)
  useEffect(() => {
    const code = (professorCodeInput || '').trim().toUpperCase();
    if (code.length >= 2 && code.length <= 4) {
      setIsCheckingProfCode(true);
      const timer = setTimeout(async () => {
        try {
          const found = await resolveProfessorFromCloudOrLocal(code, firestore);
          setResolvedProfessor(found || null);
        } catch (e) {
          setResolvedProfessor(null);
        } finally {
          setIsCheckingProfCode(false);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setResolvedProfessor(null);
      setIsCheckingProfCode(false);
    }
  }, [professorCodeInput, firestore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedStudentId = localStorage.getItem('viewingStudentId');
      if (storedStudentId) {
        router.replace('/profile');
        return;
      }
    }
    if (hasMounted && !isUserLoading && user) {
      router.replace('/profile');
    }
  }, [user, isUserLoading, router, hasMounted]);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    const formData = new FormData(event.currentTarget);
    const name = (formData.get('name') as string || '').trim();
    const age = (formData.get('age') as string || '').trim();
    const phone = (phoneInput || (formData.get('phone') as string) || '').trim();
    const professorCode = (formData.get('professorCode') as string || professorCodeInput || '').trim().toUpperCase();
    const password = formData.get('password') as string;

    // Strict Validation
    const currentErrors: any = {};
    if (!name || name.length < 3) {
      currentErrors.name = [isArabic ? 'يرجى إدخال اسم ثلاثي أو رباعي صحيح.' : 'Please enter your full name.'];
    }
    if (!age || Number(age) < 16 || Number(age) > 65) {
      currentErrors.age = [isArabic ? 'يرجى إدخال عمر جامعي صحيح (16-65 سنة).' : 'Please enter a valid college age.'];
    }
    
    // Strict WhatsApp Verification Requirement:
    if (!isPhoneVerified) {
      currentErrors.phone = [
        isArabic 
          ? '🔒 يجب إرسال كود التفعيل عبر واتساب وتأكيد رقم هاتفك أولاً للمتابعة.' 
          : '🔒 WhatsApp phone verification is strictly required before registering.'
      ];
    } else if (!/^01\d{9}$/.test(phone) && !phone.startsWith('+')) {
      currentErrors.phone = [isArabic ? 'رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ 01.' : 'Phone number must be 11 digits starting with 01.'];
    }
    if (!governorate) {
      currentErrors.governorate = [isArabic ? 'يرجى اختيار المحافظة.' : 'Please select your governorate.'];
    }
    if (!university) {
      currentErrors.university = [isArabic ? 'يرجى اختيار جامعتك في مصر.' : 'Please select your university.'];
    }
    if (!facultyCategory) {
      currentErrors.facultyCategory = [isArabic ? 'يرجى اختيار الكلية أو التخصص الأكاديمي.' : 'Please select your faculty.'];
    }
    if (!academicYear) {
      currentErrors.academicYear = [isArabic ? 'يرجى اختيار الفرقة الدراسية.' : 'Please select your academic year.'];
    }
    
    const cleanProfCode = (professorCode || '').trim().toUpperCase();
    let prof: any = null;

    if (!cleanProfCode || cleanProfCode.length < 2 || cleanProfCode.length > 4) {
      currentErrors.professorCode = [isArabic ? 'يرجى إدخال كود الدكتور (من 2 إلى 4 أحرف مثل VV أو PHYS أو MATH).' : 'Please enter 2 to 4 letter Doctor Code (e.g. VV or PHYS).'];
    } else {
      if (resolvedProfessor && resolvedProfessor.code === cleanProfCode) {
        prof = resolvedProfessor;
      } else {
        prof = await resolveProfessorFromCloudOrLocal(cleanProfCode, firestore);
      }

      if (!prof) {
        currentErrors.professorCode = [isArabic ? `كود الدكتور [ ${cleanProfCode} ] غير مسجل. تأكد من الكود (من 2 إلى 4 أحرف).` : `Doctor code [ ${cleanProfCode} ] not found. Verify with your doctor (2-4 letters).`];
      }
    }

    if (!password || password.length < 6) {
      currentErrors.password = [isArabic ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.'];
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      setIsSubmitting(false);
      return;
    }

    const matchedProfessor = prof;
    const governorateObj = EGYPTIAN_GOVERNORATES.find(g => g.id === governorate);
    const governorateName = governorateObj ? (isArabic ? governorateObj.nameAr : governorateObj.nameEn) : governorate;
    const academicYearLabel = ACADEMIC_YEARS.find(y => y.id === academicYear)?.nameAr || academicYear;
    const facultyLabel = FACULTY_DISCIPLINES.find(f => f.id === facultyCategory)?.nameAr || facultyCategory;

    // Offline registration fallback if network is down
    if (!navigator.onLine || !firestore || !auth) {
      try {
        const barcodeId = "9" + Math.floor(1000 + Math.random() * 9000).toString();
        const studentId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        
        const studentData = {
          id: studentId,
          barcodeId,
          name,
          age: Number(age),
          phoneNumber: phone,
          governorate: governorateName,
          university,
          facultyCategory,
          facultyLabel,
          academicYear,
          academicYearLabel,
          professorCode,
          connectedProfessors: [professorCode],
          activeProfessorCode: professorCode,
          grade: academicYearLabel,
          role: 'student',
          educationLevel: 'university',
          activeSubscriptions: [],
          createdAt: new Date().toISOString(),
          password,
          isOfflineSignup: true
        };

        localStorage.setItem('student_profile_offline_' + studentId, JSON.stringify(studentData));
        localStorage.setItem('viewingStudentId', studentId);
        localStorage.setItem('studentBarcode', barcodeId);

        if (matchedProfessor) {
          addProfessorCodeToStudent(studentId, professorCode);
          setActiveProfessorBranding(matchedProfessor, studentId);
        }

        toast({
          title: isArabic ? 'تم إنشاء الحساب الجامعي أوفلاين! 🎉' : 'Offline University Sign Up Successful! 🎉',
          description: isArabic 
            ? `كود الطالب الخاص بك هو [ ${barcodeId} ]. وتم ربطك بأستاذ المادة [ ${professorCode} ].`
            : `Your Student Code is [ ${barcodeId} ]. Linked to professor [ ${professorCode} ].`,
          duration: 12000,
        });

        router.push('/profile');
        return;
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: isArabic ? 'فشل التسجيل أوفلاين' : 'Offline Sign Up Failed',
          description: e.message || 'An unexpected error occurred locally.',
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 1. Generate unique 5-digit Student Code (Barcode) and register in Firebase Auth
      let barcodeId = '';
      let userCred: any = null;
      let attempts = 0;

      while (!userCred && attempts < 5) {
        attempts++;
        barcodeId = Math.floor(10000 + Math.random() * 90000).toString();
        const studentEmail = `${barcodeId}@mol5saty.student`;
        try {
          userCred = await createUserWithEmailAndPassword(auth, studentEmail, password);
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use' && attempts < 5) {
            continue;
          }
          throw err;
        }
      }

      if (!userCred) {
        throw new Error(isArabic ? 'تعذر توليد كود طالب فريد، يرجى المحاولة مرة أخرى.' : 'Could not generate unique student code. Please try again.');
      }

      const studentId = userCred.user.uid;

      try {
        await updateProfile(userCred.user, { displayName: name });
      } catch (profileErr) {
        console.error("Failed to update auth displayName:", profileErr);
      }

      // 2. Persist student profile document in Firestore
      const finalVerifiedPhone = (verifiedPhoneNumber || phone).trim();
      const studentData = {
        id: studentId,
        barcodeId,
        name,
        age: Number(age),
        phoneNumber: finalVerifiedPhone,
        isPhoneVerified: true,
        verifiedPhoneNumber: finalVerifiedPhone,
        phoneVerificationToken: verificationCode,
        phoneVerifiedAt: serverTimestamp(),
        governorate: governorateName,
        university,
        facultyCategory,
        facultyLabel,
        academicYear,
        academicYearLabel,
        professorCode,
        connectedProfessors: [professorCode],
        activeProfessorCode: professorCode,
        grade: academicYearLabel,
        role: 'student',
        educationLevel: 'university',
        activeSubscriptions: [],
        createdAt: serverTimestamp(),
      };

      // Write to both students and users collections for cross-system consistency
      await setDoc(doc(firestore, 'students', studentId), studentData);
      await setDoc(doc(firestore, 'users', studentId), {
        id: studentId,
        name,
        email: `${barcodeId}@mol5saty.student`,
        role: 'student',
        barcodeId,
        phoneNumber: finalVerifiedPhone,
        isPhoneVerified: true,
        verifiedPhoneNumber: finalVerifiedPhone,
        governorate: governorateName,
        university,
        facultyCategory,
        academicYear: academicYearLabel,
        professorCode,
        connectedProfessors: [professorCode],
        createdAt: serverTimestamp()
      }, { merge: true });

      // Cache locally
      localStorage.setItem('viewingStudentId', studentId);
      localStorage.setItem('studentBarcode', barcodeId);
      localStorage.setItem('studentBarcodeId', barcodeId);
      localStorage.setItem('studentCode', barcodeId);
      localStorage.setItem('cached_student_profile_' + studentId, JSON.stringify(studentData));
      localStorage.setItem('mol5saty_active_student_profile', JSON.stringify(studentData));
      localStorage.setItem('student_logged_in', 'true');

      if (matchedProfessor) {
        addProfessorCodeToStudent(studentId, professorCode);
        setActiveProfessorBranding(matchedProfessor, studentId);
        const profTheme = matchedProfessor.assignedThemeId || 'default';
        if (profTheme && profTheme !== 'default') {
          localStorage.setItem('student-equipped-theme-' + studentId, profTheme);
          localStorage.setItem('app_active_global_theme', profTheme);
          try {
            await setDoc(doc(firestore, 'students', studentId, 'customizations', 'profile'), {
              equippedTheme: profTheme
            }, { merge: true });
          } catch (e) {}
        }
      }

      toast({
        title: isArabic ? 'مرحباً بك في ملخصاتي! 🎉' : 'Welcome to Mol5saty! 🎉',
        description: isArabic 
          ? `تم إنشاء حسابك الجامعي بنجاح. كود الطالب الخاص بك هو [ ${barcodeId} ]. احفظ هذا الكود لتسجيل الدخول به دائماً.` 
          : `Your student account has been created. Your Student Code is [ ${barcodeId} ]. Save this code to sign in anytime.`,
        duration: 15000,
      });
      
      window.location.href = '/profile';
      
    } catch (error: any) {
      let message = error.message || 'An unknown error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = isArabic ? 'هذا الكود مستخدم بالفعل، يرجى إعادة الإرسال.' : 'Student code collision. Please submit again.';
      } else if (error.code === 'auth/weak-password') {
        message = isArabic ? 'كلمة المرور ضعيفة، يجب أن لا تقل عن 6 خانات.' : 'Password must be at least 6 characters.';
      }

      toast({
        variant: 'destructive',
        title: isArabic ? 'فشل إنشاء الحساب' : 'Sign Up Failed',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-white dark:bg-[#070b14] text-[#0f172a] dark:text-slate-100 selection:bg-[#2563eb] selection:text-white relative flex flex-col justify-between transition-colors" 
      dir={isArabic ? 'rtl' : 'ltr'} 
      id="student-signup-root"
    >
      {/* Background Soft Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[350px] bg-gradient-to-b from-blue-100/50 via-indigo-50/20 dark:from-blue-900/20 dark:via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-0 w-[400px] h-[400px] bg-blue-50/60 dark:bg-blue-950/20 rounded-full blur-[140px] pointer-events-none -z-10" />

      <AuthHeader />

      <main className="px-4 sm:px-6 py-10 max-w-2xl mx-auto w-full my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-[#0b1329] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/60 p-6 sm:p-10"
        >
          {/* Form Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-[#1d4ed8] dark:text-blue-400 text-xs font-bold mb-3">
              <GraduationCap className="w-4 h-4" />
              <span>{isArabic ? 'بوابة تسجيل طلاب الجامعات' : 'COLLEGE STUDENT REGISTRATION'}</span>
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-[#0f172a] dark:text-white tracking-tight">
              {isArabic ? 'إنشاء حساب طالب جامعي' : 'Register College Student Account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 font-medium">
              {isArabic 
                ? 'أدخل بياناتك الجامعية للحصول على كود الطالب والوصول لملخصات ومقررات كليتك.' 
                : 'Enter your university details to generate your Student Code and access your courses.'}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{isArabic ? 'الاسم بالكامل (ثلاثي أو رباعي) *' : 'Full Name *'}</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder={isArabic ? 'مثال: أحمد محمد علي حسن' : 'e.g. Ahmed Mohamed Ali'}
                className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white focus:border-[#2563eb] focus:ring-[#2563eb] text-sm"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name[0]}</p>}
            </div>

            {/* Age & Governorate Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>{isArabic ? 'العمر *' : 'Age *'}</span>
                </Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  min="16"
                  max="65"
                  required
                  placeholder={isArabic ? 'مثال: 20' : 'e.g. 20'}
                  className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white focus:border-[#2563eb] focus:ring-[#2563eb] text-sm"
                />
                {errors.age && <p className="text-xs text-red-500">{errors.age[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>{isArabic ? 'المحافظة *' : 'Governorate *'}</span>
                </Label>
                <Select value={governorate} onValueChange={setGovernorate}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white text-sm">
                    <SelectValue placeholder={isArabic ? 'اختر المحافظة' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {EGYPTIAN_GOVERNORATES.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        {isArabic ? g.nameAr : g.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.governorate && <p className="text-xs text-red-500">{errors.governorate[0]}</p>}
              </div>
            </div>

            {/* Dedicated WhatsApp Phone Verification Card */}
            <div className={`rounded-2xl border transition-all p-4 space-y-3 ${
              isPhoneVerified 
                ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/25 dark:border-emerald-500/40' 
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>{isArabic ? 'رقم الهاتف وتأكيد واتساب *' : 'Phone & WhatsApp Verification *'}</span>
                </Label>

                {isPhoneVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'تم التحقق بنجاح ✅' : 'Verified ✅'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <Lock className="w-3 h-3" />
                    <span>{isArabic ? 'يلزم التحقق' : 'Verification Required'}</span>
                  </span>
                )}
              </div>

              {/* Phone Input */}
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    readOnly={isPhoneVerified}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className={`h-11 rounded-xl text-sm font-mono tracking-wider transition-all ${
                      isPhoneVerified
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white'
                    }`}
                    dir="ltr"
                  />
                  {isPhoneVerified && (
                    <div className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto px-3 flex items-center text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
                {errors.phone && <p className="text-xs text-red-500 font-semibold">{errors.phone[0]}</p>}
              </div>

              {/* Verified Badge / Details */}
              {isPhoneVerified ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {isArabic 
                        ? `تم توثيق الرقم [ ${verifiedPhoneNumber || phoneInput} ] وتأكيده بنجاح.` 
                        : `Number [ ${verifiedPhoneNumber || phoneInput} ] verified via WhatsApp.`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhoneVerified(false);
                      setVerifiedPhoneNumber('');
                      handleRegenerateCode();
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline self-end sm:self-auto cursor-pointer"
                  >
                    {isArabic ? 'تغيير الرقم' : 'Change Number'}
                  </button>
                </div>
              ) : (
                /* Unverified: Interactive WhatsApp Step */
                <div className="rounded-2xl bg-white dark:bg-[#070e1f] border border-blue-200 dark:border-blue-900/60 p-3.5 sm:p-4 space-y-3 shadow-xs">
                  
                  {/* Step Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-[#25d366]" />
                        <span>{isArabic ? 'خطوة التحقق عبر واتساب:' : 'WhatsApp Verification Step:'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleRegenerateCode}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title={isArabic ? 'توليد كود جديد' : 'Generate new code'}
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{isArabic ? 'كود جديد' : 'New Code'}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {isArabic
                        ? 'أرسل كود التفعيل في رسالة إلى رقم البوت على واتساب. بمجرد الإرسال سيتفعل حسابك تلقائياً وبشكل فوري!'
                        : 'Send the verification code via WhatsApp to verify your number immediately.'}
                    </p>
                  </div>

                  {/* Verification Code Box */}
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {isArabic ? 'كود التحقق:' : 'Code:'}
                      </span>
                      <code className="px-2 py-0.5 rounded-md bg-blue-500/10 dark:bg-blue-500/20 text-[#2563eb] dark:text-blue-400 font-mono font-bold text-sm tracking-wider">
                        VERIFY-{verificationCode}
                      </code>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedCode ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>

                  {/* WhatsApp Direct Action Button */}
                  <div className="space-y-2">
                    <a
                      href={`https://wa.me/${botPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`VERIFY-${verificationCode}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all text-center"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>{isArabic ? '📱 إرسال كود التفعيل عبر واتساب بنقرة واحدة' : '📱 Send Code via WhatsApp (1-Click)'}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#2563eb]" />
                        <span>{showQrCode ? (isArabic ? 'إخفاء رمز QR' : 'Hide QR') : (isArabic ? 'مسح رمز QR من هاتف آخر' : 'Scan QR Code')}</span>
                      </button>

                      <div className="flex items-center gap-1 text-[10px]">
                        <span>{isArabic ? 'رقم البوت:' : 'Bot:'}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{botPhone}</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingBotPhone(!isEditingBotPhone)}
                          className="text-blue-500 hover:underline cursor-pointer"
                          title={isArabic ? 'تغيير رقم البوت إذا كان مختلفاً' : 'Edit Bot Number'}
                        >
                          <Edit2 className="w-3 h-3 inline ml-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Expandable View */}
                  {showQrCode && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
                      <p className="text-[11px] text-slate-500 text-center">
                        {isArabic ? 'امسح الرمز بكاميرا الهاتف لإرسال كود التفعيل فوراً عبر واتساب:' : 'Scan with your phone camera to send WhatsApp verification:'}
                      </p>
                      <div className="p-2 bg-white rounded-lg shadow-xs">
                        <QRCodeSVG
                          value={`https://wa.me/${botPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`VERIFY-${verificationCode}`)}`}
                          size={150}
                          level="M"
                        />
                      </div>
                    </div>
                  )}

                  {/* Edit Bot Phone Drawer */}
                  {isEditingBotPhone && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-2 text-xs">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isArabic ? 'تعديل رقم هاتف بوت واتساب (مع كود الدولة مثل 201201921424):' : 'Custom Bot WhatsApp Phone Number:'}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={tempBotPhone}
                          onChange={(e) => setTempBotPhone(e.target.value)}
                          placeholder="201xxxxxxxxx"
                          className="h-8 text-xs font-mono bg-white dark:bg-slate-900"
                          dir="ltr"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveBotPhone}
                          className="h-8 px-3 text-xs bg-[#2563eb] text-white"
                        >
                          {isArabic ? 'حفظ' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Live Listening Radar Indicator */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    <span className="truncate">
                      {isArabic
                        ? 'في انتظار رسالة التفعيل... يتم الاستماع تلقائياً بدون تحديث الصفحة.'
                        : 'Listening live for your message... No page reload needed.'}
                    </span>
                  </div>

                </div>
              )}

            </div>

            {/* University Selection */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{isArabic ? 'الجامعة التابع لها في مصر *' : 'University in Egypt *'}</span>
              </Label>
              <Select value={university} onValueChange={setUniversity}>
                <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white text-sm">
                  <SelectValue placeholder={isArabic ? 'اختر جامعتك (القاهرة، عين شمس، المنصورة، بدر، مصر...)' : 'Select your university in Egypt'} />
                </SelectTrigger>
                <SelectContent className="max-h-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  {EGYPTIAN_UNIVERSITIES.map(u => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.university && <p className="text-xs text-red-500">{errors.university[0]}</p>}
            </div>

            {/* Faculty / College Discipline */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{isArabic ? 'الكلية / التخصص الأكاديمي *' : 'Faculty / Discipline *'}</span>
              </Label>
              <Select value={facultyCategory} onValueChange={setFacultyCategory}>
                <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white text-sm">
                  <SelectValue placeholder={isArabic ? 'اختر كليتك (طب، أسنان، صيدلة، هندسة، حاسبات، تجارة...)' : 'Select your faculty discipline'} />
                </SelectTrigger>
                <SelectContent className="max-h-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  {FACULTY_DISCIPLINES.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {isArabic ? f.nameAr : f.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.facultyCategory && <p className="text-xs text-red-500">{errors.facultyCategory[0]}</p>}
            </div>

            {/* Academic Year & Doctor Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isArabic ? 'الفرقة الدراسية *' : 'Academic Year *'}
                </Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white text-sm">
                    <SelectValue placeholder={isArabic ? 'اختر فرقتك الدراسية' : 'Select Year'} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {ACADEMIC_YEARS.map(y => (
                      <SelectItem key={y.id} value={y.id}>
                        {isArabic ? y.nameAr : y.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.academicYear && <p className="text-xs text-red-500">{errors.academicYear[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="professorCode" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span>{isArabic ? 'كود أستاذ المادة (2-4 أحرف) *' : 'Doctor Code (2-4 letters) *'}</span>
                  </div>
                  <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    {isArabic ? 'مثل: VV أو PHYS' : 'e.g. VV or PHYS'}
                  </span>
                </Label>
                <Input
                  id="professorCode"
                  name="professorCode"
                  type="text"
                  required
                  maxLength={4}
                  placeholder="PHYS"
                  value={professorCodeInput}
                  onChange={(e) => setProfessorCodeInput(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white focus:border-[#2563eb] text-sm font-mono font-bold uppercase tracking-widest text-center"
                  style={{ textTransform: 'uppercase' }}
                />

                {/* Live verification indicator */}
                {isCheckingProfCode && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500 animate-pulse pt-0.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isArabic ? 'جاري التحقق من كود الدكتور...' : 'Verifying doctor code...'}</span>
                  </div>
                )}

                {resolvedProfessor && !isCheckingProfCode && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold">{resolvedProfessor.name}</span>
                      <span className="opacity-75 text-[10px] ml-1">({resolvedProfessor.subjectAr || resolvedProfessor.subjectEn || resolvedProfessor.code})</span>
                    </div>
                  </div>
                )}

                {professorCodeInput.trim().length >= 2 && !resolvedProfessor && !isCheckingProfCode && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    {isArabic
                      ? `⚠️ كود [ ${professorCodeInput.trim().toUpperCase()} ] غير مسجل بعد في المنظومة. تأكد من كود الدكتور.`
                      : `⚠️ Doctor code [ ${professorCodeInput.trim().toUpperCase()} ] not registered yet.`}
                  </p>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isArabic
                    ? 'أدخل كود الدكتور الخاص بك (2 إلى 4 أحرف) لربطك بفرقته وضبط هوية وأيقونة التطبيق باسمه.'
                    : 'Enter the 2-4 letter doctor code to link their portal and custom app icon.'}
                </p>
                {errors.professorCode && <p className="text-xs text-red-500">{errors.professorCode[0]}</p>}
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{isArabic ? 'كلمة المرور (6 خانات على الأقل) *' : 'Password (min. 6 characters) *'}</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white focus:border-[#2563eb] focus:ring-[#2563eb] text-sm pr-10 rtl:pl-10 rtl:pr-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password[0]}</p>}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                {isArabic 
                  ? 'أوافق على شروط الاستخدام وسياسة الخصوصية الأكاديمية للمنصة.' 
                  : 'I agree to the Terms of Service and Academic Privacy Policy.'}
              </label>
            </div>

            {/* Submit Button */}
            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !agreed || !isPhoneVerified}
                className={`w-full h-12 rounded-xl text-white font-bold text-sm shadow-lg transition-all cursor-pointer ${
                  isPhoneVerified
                    ? 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/25'
                    : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <span>{isArabic ? 'جاري إنشاء حسابك الجامعي...' : 'Creating College Account...'}</span>
                ) : !isPhoneVerified ? (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>{isArabic ? '🔒 يلزم تأكيد رقم الهاتف عبر واتساب لتفعيل التسجيل' : '🔒 WhatsApp Verification Required to Register'}</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>{isArabic ? 'إنشاء الحساب وتوليد كود الطالب' : 'Create Account & Generate Student Code'}</span>
                    {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </span>
                )}
              </Button>

              {!isPhoneVerified && (
                <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-medium">
                  {isArabic
                    ? '⚠️ الزر مقفل تلقائياً لحين إرسال كود التفعيل وتأكيده من البوت على واتساب.'
                    : '⚠️ Button is locked until the verification code is received via WhatsApp.'}
                </p>
              )}
            </div>

          </form>

          {/* Quick Sign-In Link */}
          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <span>{isArabic ? 'لديك كود طالب بالفعل؟ ' : 'Already have a Student Code? '}</span>
            <Link href="/login" className="text-[#2563eb] dark:text-blue-400 font-bold hover:underline">
              {isArabic ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          </div>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b14] text-xs max-w-2xl mx-auto w-full text-center text-slate-500 font-mono transition-colors">
        MOL5SATY // COLLEGE_STUDENT_ENROLLMENT_2026
      </footer>

    </div>
  );
}
