'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
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
  // --- الجامعات الحكومية (Public Universities) ---
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
  'جامعة الأقصر (Luxor University)',
  'جامعة الأزهر (Al-Azhar University)',
  'مدينة زويل للعلوم والتكنولوجيا (Zewail City)',
  'الجامعة المصرية اليابانية للعلوم والتكنولوجيا (E-JUST)',

  // --- الجامعات الأهلية والدولية (National Universities) ---
  'جامعة الجلالة الأهلية (Galala University)',
  'جامعة الملك سلمان الدولية (King Salman University)',
  'جامعة العلمين الدولية (Alamein University)',
  'جامعة المنصورة الجديدة (New Mansoura University)',
  'جامعة النيل الأهلية (Nile University)',
  'جامعة مصر للمعلوماتية (Egypt University of Informatics - EUI)',
  'الجامعة الفرنسية في مصر (UFE)',
  'جامعة حلوان الأهلية (Helwan National University)',
  'جامعة بنها الأهلية (Benha National University)',
  'جامعة المنصورة الأهلية (Mansoura National University)',
  'جامعة الإسكندرية الأهلية (Alexandria National University)',
  'جامعة الزقازيق الأهلية (Zagazig National University)',
  'جامعة أسيوط الأهلية (Assiut National University)',
  'جامعة المنيا الأهلية (Minia National University)',
  'جامعة بني سويف الأهلية (Beni-Suef National University)',
  'جامعة المنوفية الأهلية (Menoufia National University)',
  'جامعة شرق بورسعيد الأهلية (East Port Said National University)',
  'جامعة الإسماعيلية الجديدة الأهلية (New Ismailia National University)',
  'جامعة جنوب الوادي الأهلية (South Valley National University)',

  // --- الجامعات التكنولوجية (Technological Universities) ---
  'جامعة القاهرة الجديدة التكنولوجية (New Cairo Tech)',
  'جامعة الدلتا التكنولوجية بقويسنا (Delta Tech)',
  'جامعة بني سويف التكنولوجية (Beni Suef Tech)',
  'جامعة 6 أكتوبر التكنولوجية (6th of October Tech)',
  'جامعة برج العرب التكنولوجية (Borg El Arab Tech)',
  'جامعة مصر التكنولوجية الدولية (MIU Tech)',
  'جامعة سمنود التكنولوجية (Samanoud Tech)',
  'جامعة شرق بورسعيد التكنولوجية (East Port Said Tech)',
  'جامعة أسيوط الجديدة التكنولوجية (New Assiut Tech)',
  'جامعة طيبة التكنولوجية بالأقصر (Thebes Tech)',

  // --- الجامعات الخاصة (Private Universities) ---
  'جامعة 6 أكتوبر (October 6 University)',
  'جامعة أكتوبر للآداب والعلوم الحديثة (MSA)',
  'جامعة مصر للعلوم والتكنولوجيا (MUST)',
  'جامعة مصر الدولية (MIU)',
  'جامعة بدر بالقاهرة (BUC)',
  'جامعة بدر بأسيوط (BUA)',
  'الجامعة الألمانية بالقاهرة (GUC)',
  'الجامعة البريطانية في مصر (BUE)',
  'جامعة المستقبل بمصر (FUE)',
  'الجامعة الأمريكية بالقاهرة (AUC)',
  'جامعة النهضة ببني سويف (NUB)',
  'جامعة الدلتا للعلوم والتكنولوجيا (Delta University)',
  'جامعة هليوبوليس للتنمية المستدامة (Heliopolis University)',
  'جامعة حورس بمصر (Horus University - HUE)',
  'جامعة سفنكس بأسيوط (Sphinx University)',
  'جامعة دراية بالمنيا (Deraya University)',
  'جامعة سيناء (Sinai University)',
  'جامعة نيو جيزة (New Giza University - NGU)',
  'جامعة الأهرام الكندية (ACU)',
  'الجامعة الحديثة للتكنولوجيا والمعلومات (MTI)',
  'جامعة فاروس بالإسكندرية (Pharos University - PUA)',
  'الجامعة المصرية الصينية (ECU)',
  'جامعة ميريت بسوهاج (Merit University)',
  'جامعة السلام بالغربية (Al-Salam University)',
  'جامعة الصالحية الجديدة (New Salhia University)',
  'جامعة مايو بالقاهرة (May University - MUC)',
  'جامعة الحياة بالقاهرة (AlHayah University in Cairo)',
  'الجامعة الألمانية الدولية بالعاصمة الإدارية (GIU)',
  'الجامعات الأوروبية في مصر بالعاصمة الإدارية (EUE)',
  'مؤسسة جامعات المعرفة الدولية بالعاصمة الإدارية (TKH)',
  'جامعة كوفنتري بالعاصمة الإدارية (Coventry University)',
  'جامعة لندن بالعاصمة الإدارية (University of London Branch)',
  'جامعة هيرتفوردشاير بالعاصمة الإدارية (University of Hertfordshire)',

  // --- الأكاديميات والمعاهد العليا المتخصصة (Specialized Academies & Institutes) ---
  'الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري (AASTMT)',
  'أكاديمية السادات للعلوم الإدارية (Sadat Academy)',
  'أكاديمية الفنون (Academy of Arts)',
  'أكاديمية الشروق (El Shorouk Academy)',
  'المعهد التكنولوجي العالي بالعاشر من رمضان (HTI)',
  'المعهد الكندي العالي لتكنولوجيا الهندسة والإدارة (CIC)',
  'أكاديمية طيبة المتكاملة للعلوم (Thebes Academy)',
  'أكاديمية أخبار اليوم (Akhbar El Yom Academy)',
  'المعهد العالي للهندسة والتكنولوجيا (Higher Engineering Institute)',
  'المعهد العالي للحاسبات وتكنولوجيا المعلومات (Higher Computer Institute)',
  'المعهد العالي للعلوم الإدارية والتجارة (Higher Business Institute)',
  'معهد الفراعنة العالي (Pharaohs Higher Institute)',
  'معهد العبور العالي للهندسة والتكنولوجيا (Obour Higher Institute)',
  'معهد الجزيرة العالي (Gezira Higher Institute)'
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

  // Personal Details Controlled Inputs
  const [nameInput, setNameInput] = useState<string>('');
  const [ageInput, setAgeInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  // University Student Form State
  const [governorate, setGovernorate] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const [customUniversity, setCustomUniversity] = useState<string>('');
  const [isCustomUniversityMode, setIsCustomUniversityMode] = useState<boolean>(false);
  const [facultyCategory, setFacultyCategory] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [professorCodeInput, setProfessorCodeInput] = useState<string>('');
  const [resolvedProfessor, setResolvedProfessor] = useState<any | null>(null);
  const [isCheckingProfCode, setIsCheckingProfCode] = useState<boolean>(false);

  // WhatsApp Real-Time Verification State
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isPhoneLocked, setIsPhoneLocked] = useState<boolean>(false);
  const [lockedPhone, setLockedPhone] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState<string>('');
  const [botPhone, setBotPhone] = useState<string>('201201921424');
  const [isEditingBotPhone, setIsEditingBotPhone] = useState<boolean>(false);
  const [tempBotPhone, setTempBotPhone] = useState<string>('201201921424');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Form Draft Persistence Helper
  const saveFormDraft = useCallback((overrides: Record<string, any> = {}) => {
    if (typeof window === 'undefined') return;
    try {
      const draft = {
        name: overrides.name !== undefined ? overrides.name : nameInput,
        age: overrides.age !== undefined ? overrides.age : ageInput,
        password: overrides.password !== undefined ? overrides.password : passwordInput,
        governorate: overrides.governorate !== undefined ? overrides.governorate : governorate,
        phone: overrides.phone !== undefined ? overrides.phone : phoneInput,
        isPhoneLocked: overrides.isPhoneLocked !== undefined ? overrides.isPhoneLocked : isPhoneLocked,
        lockedPhone: overrides.lockedPhone !== undefined ? overrides.lockedPhone : lockedPhone,
        isPhoneVerified: overrides.isPhoneVerified !== undefined ? overrides.isPhoneVerified : isPhoneVerified,
        verifiedPhoneNumber: overrides.verifiedPhoneNumber !== undefined ? overrides.verifiedPhoneNumber : verifiedPhoneNumber,
        verificationCode: overrides.verificationCode !== undefined ? overrides.verificationCode : verificationCode,
        university: overrides.university !== undefined ? overrides.university : university,
        customUniversity: overrides.customUniversity !== undefined ? overrides.customUniversity : customUniversity,
        isCustomUniversityMode: overrides.isCustomUniversityMode !== undefined ? overrides.isCustomUniversityMode : isCustomUniversityMode,
        facultyCategory: overrides.facultyCategory !== undefined ? overrides.facultyCategory : facultyCategory,
        academicYear: overrides.academicYear !== undefined ? overrides.academicYear : academicYear,
        professorCode: overrides.professorCode !== undefined ? overrides.professorCode : professorCodeInput,
        agreed: overrides.agreed !== undefined ? overrides.agreed : agreed,
        updatedAt: Date.now()
      };
      const json = JSON.stringify(draft);
      localStorage.setItem('mol5saty_signup_form_draft', json);
      sessionStorage.setItem('mol5saty_signup_form_draft', json);
    } catch (e) {
      console.warn('Draft save notice:', e);
    }
  }, [
    nameInput, ageInput, passwordInput, governorate, phoneInput, isPhoneLocked, lockedPhone,
    isPhoneVerified, verifiedPhoneNumber, verificationCode, university, customUniversity,
    isCustomUniversityMode, facultyCategory, academicYear, professorCodeInput, agreed
  ]);

  // Restore Form Draft on Mount & Setup
  useEffect(() => {
    setHasMounted(true);
    if (typeof window === 'undefined') return;

    // 1. Initialize Bot Phone
    const savedBotPhone = localStorage.getItem('mol5saty_bot_phone');
    const activeBotPhone = (savedBotPhone && savedBotPhone !== '201201402632') ? savedBotPhone : '201201921424';
    setBotPhone(activeBotPhone);
    setTempBotPhone(activeBotPhone);
    localStorage.setItem('mol5saty_bot_phone', activeBotPhone);

    // 2. Restore Full Form Draft
    try {
      const rawDraft = localStorage.getItem('mol5saty_signup_form_draft') || sessionStorage.getItem('mol5saty_signup_form_draft');
      if (rawDraft) {
        const d = JSON.parse(rawDraft);
        if (d.name) setNameInput(d.name);
        if (d.age) setAgeInput(d.age);
        if (d.password) setPasswordInput(d.password);
        if (d.governorate) setGovernorate(d.governorate);
        if (d.phone) setPhoneInput(d.phone);
        if (d.isPhoneLocked) setIsPhoneLocked(true);
        if (d.lockedPhone) setLockedPhone(d.lockedPhone);
        if (d.isPhoneVerified) setIsPhoneVerified(true);
        if (d.verifiedPhoneNumber) setVerifiedPhoneNumber(d.verifiedPhoneNumber);
        if (d.verificationCode) setVerificationCode(d.verificationCode);
        if (d.university) setUniversity(d.university);
        if (d.customUniversity) setCustomUniversity(d.customUniversity);
        if (d.isCustomUniversityMode) setIsCustomUniversityMode(true);
        if (d.facultyCategory) setFacultyCategory(d.facultyCategory);
        if (d.academicYear) setAcademicYear(d.academicYear);
        if (d.professorCode) setProfessorCodeInput(d.professorCode);
        if (d.agreed) setAgreed(true);

        const storedDirectPhone = localStorage.getItem('verified_student_phone') || localStorage.getItem('student_phone');
        if (storedDirectPhone && !d.phone) {
          setPhoneInput(storedDirectPhone);
          setLockedPhone(storedDirectPhone);
          setIsPhoneLocked(true);
        }
      } else {
        const storedDirectPhone = localStorage.getItem('verified_student_phone') || localStorage.getItem('student_phone');
        if (storedDirectPhone) {
          setPhoneInput(storedDirectPhone);
          setLockedPhone(storedDirectPhone);
          setIsPhoneLocked(true);
        }
      }
    } catch (err) {
      console.warn('Draft restore notice:', err);
    }
  }, []);

  // Continuous Auto-Save Draft on Change
  useEffect(() => {
    if (!hasMounted) return;
    saveFormDraft();
  }, [
    nameInput, ageInput, passwordInput, governorate, phoneInput, isPhoneLocked, lockedPhone,
    isPhoneVerified, verifiedPhoneNumber, verificationCode, university, customUniversity,
    isCustomUniversityMode, facultyCategory, academicYear, professorCodeInput, agreed,
    hasMounted, saveFormDraft
  ]);

  // Ensure Verification Code Exists Without Overwriting Restored Code
  useEffect(() => {
    if (!verificationCode) {
      if (typeof window !== 'undefined') {
        try {
          const rawDraft = localStorage.getItem('mol5saty_signup_form_draft');
          if (rawDraft) {
            const d = JSON.parse(rawDraft);
            if (d.verificationCode) {
              setVerificationCode(d.verificationCode);
              return;
            }
          }
        } catch (e) {}
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
    }
  }, [verificationCode]);

  // Window Focus / Visibility Event: Check for WhatsApp Verification Arrival on Return
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkVerificationOnReturn = async () => {
      // Re-read draft in case memory was paused by external browser tab
      try {
        const rawDraft = localStorage.getItem('mol5saty_signup_form_draft');
        if (rawDraft) {
          const d = JSON.parse(rawDraft);
          if (d.name && !nameInput) setNameInput(d.name);
          if (d.age && !ageInput) setAgeInput(d.age);
          if (d.phone && !phoneInput) setPhoneInput(d.phone);
          if (d.verificationCode && !verificationCode) setVerificationCode(d.verificationCode);
        }
      } catch (e) {}

      // One-off direct fetch from Firestore for current verification code
      const currentCode = verificationCode || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mol5saty_signup_form_draft') || '{}')?.verificationCode : null);
      if (currentCode && firestore && !isPhoneVerified) {
        try {
          const { getDoc, doc: fsDoc } = await import('firebase/firestore');
          const snap = await getDoc(fsDoc(firestore, 'phone_verifications', currentCode));
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.verified) {
              setIsPhoneVerified(true);
              const authorPhone = (lockedPhone || phoneInput || data.phoneNumber || '').trim();
              setVerifiedPhoneNumber(authorPhone);
              setIsPhoneLocked(true);
              setLockedPhone(authorPhone);
              if (authorPhone) {
                localStorage.setItem('verified_student_phone', authorPhone);
                localStorage.setItem('student_phone', authorPhone);
              }
              toast({
                title: isArabic ? '✅ تم استلام تفعيل واتساب بنجاح!' : '✅ WhatsApp Verification Confirmed!',
                description: isArabic
                  ? `تم استلام رسالة التفعيل وتثبيت رقم هاتفك [ ${authorPhone} ] بنجاح.`
                  : `Verification received! Phone [ ${authorPhone} ] confirmed via WhatsApp.`,
                duration: 7000
              });
            }
          }
        } catch (err) {
          console.warn('Check on return note:', err);
        }
      }
    };

    window.addEventListener('focus', checkVerificationOnReturn);
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        checkVerificationOnReturn();
      }
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      window.removeEventListener('focus', checkVerificationOnReturn);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [verificationCode, firestore, isPhoneVerified, lockedPhone, phoneInput, nameInput, ageInput, isArabic, toast]);

  const handleLockPhone = (overrideVal?: string) => {
    const candidate = (overrideVal || phoneInput || '').trim();
    const clean = candidate.replace(/[^\d+]/g, '');
    if (clean.length < 10) {
      toast({
        variant: 'destructive',
        title: isArabic ? 'رقم الهاتف غير مكتمل' : 'Incomplete Phone Number',
        description: isArabic ? 'يرجى كتابة رقم الهاتف المكون من 11 رقماً أولاً (مثل 01012345678).' : 'Please enter an 11-digit phone number first.'
      });
      return false;
    }
    setIsPhoneLocked(true);
    setLockedPhone(candidate);
    setVerifiedPhoneNumber(candidate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_phone', candidate);
      localStorage.setItem('last_entered_phone', candidate);
      localStorage.setItem('verified_student_phone', candidate);
    }
    saveFormDraft({
      phone: candidate,
      lockedPhone: candidate,
      verifiedPhoneNumber: candidate,
      isPhoneLocked: true
    });
    toast({
      title: isArabic ? '🔒 تم قفل وتثبيت رقم هاتفك' : '🔒 Phone Number Confirmed & Locked',
      description: isArabic ? `تم اعتماد وتثبيت الرقم [ ${candidate} ] لحسابك وللعلامة المائية.` : `Number [ ${candidate} ] locked for your account and watermark.`,
      duration: 5000
    });
    return true;
  };

  const handleUnlockPhone = () => {
    setIsPhoneLocked(false);
    saveFormDraft({ isPhoneLocked: false });
    toast({
      title: isArabic ? 'تم إلغاء قفل الرقم' : 'Phone Unlocked',
      description: isArabic ? 'يمكنك الآن تعديل رقم هاتفك.' : 'You can now edit your phone number.'
    });
  };

  // Real-time Firestore listener on `phone_verifications/${verificationCode}`
  useEffect(() => {
    if (!verificationCode || !firestore || isPhoneVerified) return;

    try {
      const unsub = onSnapshot(doc(firestore, 'phone_verifications', verificationCode), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.verified) {
            setIsPhoneVerified(true);
            
            // CRITICAL FIX: The student's own typed/confirmed number is the single source of truth.
            // Never overwrite with arbitrary bot numbers or mock data from Firestore!
            const studentOwnNumber = (lockedPhone || phoneInput || '').trim();
            const authoritativePhone = studentOwnNumber.length >= 10 
              ? studentOwnNumber 
              : (data.phoneNumber || '');

            setVerifiedPhoneNumber(authoritativePhone);
            setPhoneInput(authoritativePhone);
            setIsPhoneLocked(true);
            setLockedPhone(authoritativePhone);

            if (typeof window !== 'undefined') {
              localStorage.setItem('student_phone', authoritativePhone);
              localStorage.setItem('last_entered_phone', authoritativePhone);
              localStorage.setItem('verified_student_phone', authoritativePhone);
            }

            toast({
              title: isArabic ? '✅ تم تأكيد رقم هاتفك بنجاح!' : '✅ Phone Verified Successfully!',
              description: isArabic
                ? `تم استلام رسالة التفعيل وتثبيت رقمك الشخصي [ ${authoritativePhone} ] لحسابك وللعلامة المائية.`
                : `Verification received! Your true phone [ ${authoritativePhone} ] is locked for your account and watermark.`,
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
  }, [verificationCode, firestore, isPhoneVerified, isArabic, phoneInput, lockedPhone, toast]);

  const handleRegenerateCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(newCode);
    setIsPhoneVerified(false);
    setVerifiedPhoneNumber('');
    saveFormDraft({ verificationCode: newCode, isPhoneVerified: false, verifiedPhoneNumber: '' });
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

  // Do not trap or auto-redirect the user away from student-signup so they can register new accounts

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    const formData = new FormData(event.currentTarget);
    const name = (nameInput || (formData.get('name') as string) || '').trim();
    const age = (ageInput || (formData.get('age') as string) || '').trim();
    const phone = (lockedPhone || verifiedPhoneNumber || phoneInput || (formData.get('phone') as string) || '').trim();
    const professorCode = (professorCodeInput || (formData.get('professorCode') as string) || '').trim().toUpperCase();
    const password = (passwordInput || (formData.get('password') as string) || '');

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
    } else {
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const isLocalValid = /^01\d{9}$/.test(cleanPhone);
      const isIntlValid = cleanPhone.length >= 10 && (cleanPhone.startsWith('+') || cleanPhone.startsWith('20'));
      if (!isLocalValid && !isIntlValid) {
        currentErrors.phone = [isArabic ? 'رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ 01 (أو بصيغة دولية صحيح).' : 'Phone number must be 11 digits starting with 01 or a valid international format.'];
      }
    }
    if (!governorate) {
      currentErrors.governorate = [isArabic ? 'يرجى اختيار المحافظة.' : 'Please select your governorate.'];
    }
    const isCustomUni = university === '__custom__' || isCustomUniversityMode;
    const finalUniversity = (isCustomUni ? customUniversity : university).trim();
    if (!finalUniversity || (isCustomUni && customUniversity.trim().length < 2)) {
      currentErrors.university = [isArabic ? 'يرجى اختيار أو كتابة اسم جامعتك في مصر.' : 'Please select or type your university.'];
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
    const finalVerifiedPhone = (lockedPhone || verifiedPhoneNumber || phone || phoneInput).trim();

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
          phoneNumber: finalVerifiedPhone,
          verifiedPhoneNumber: finalVerifiedPhone,
          isPhoneVerified: true,
          governorate: governorateName,
          university: finalUniversity,
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
        localStorage.setItem('student_phone', finalVerifiedPhone);
        localStorage.setItem('student_phone_' + studentId, finalVerifiedPhone);
        localStorage.setItem('verified_student_phone', finalVerifiedPhone);
        localStorage.setItem('student_university', finalUniversity);
        localStorage.setItem('mol5saty_last_valid_password', password);
        sessionStorage.setItem('mol5saty_app_unlocked', 'true');

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

        localStorage.removeItem('mol5saty_signup_form_draft');
        sessionStorage.removeItem('mol5saty_signup_form_draft');

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
        university: finalUniversity,
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
        university: finalUniversity,
        facultyCategory,
        academicYear: academicYearLabel,
        professorCode,
        connectedProfessors: [professorCode],
        createdAt: serverTimestamp()
      }, { merge: true });

      // Purge any residual teacher session keys
      localStorage.removeItem('teacher_session');
      localStorage.removeItem('teacherId');
      localStorage.removeItem('teacher_accounts');
      localStorage.removeItem('current_teacher_id');
      localStorage.removeItem('active_role');
      localStorage.removeItem('last_login_role');

      // Cache locally
      localStorage.setItem('viewingStudentId', studentId);
      localStorage.setItem('studentBarcode', barcodeId);
      localStorage.setItem('studentBarcodeId', barcodeId);
      localStorage.setItem('studentCode', barcodeId);
      localStorage.setItem('student_university', finalUniversity);
      localStorage.setItem('mol5saty_last_valid_password', password);
      sessionStorage.setItem('mol5saty_app_unlocked', 'true');
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
      
      localStorage.removeItem('mol5saty_signup_form_draft');
      sessionStorage.removeItem('mol5saty_signup_form_draft');
      
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

      <main className="px-3 sm:px-6 py-6 sm:py-10 max-w-2xl mx-auto w-full my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-[#0b1329] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/60 p-4 sm:p-8 md:p-10"
        >
          {/* Form Header */}
          <div className="text-center mb-6 sm:mb-8">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-[#1d4ed8] dark:text-blue-400 text-[11px] sm:text-xs font-bold mb-2.5 sm:mb-3">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isArabic ? 'بوابة تسجيل طلاب الجامعات' : 'COLLEGE STUDENT REGISTRATION'}</span>
            </span>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0f172a] dark:text-white tracking-tight">
              {isArabic ? 'إنشاء حساب طالب جامعي' : 'Register College Student Account'}
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1.5 sm:mt-2 font-medium">
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
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (errors.name) setErrors((prev: any) => ({ ...prev, name: undefined }));
                }}
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
                  value={ageInput}
                  onChange={(e) => {
                    setAgeInput(e.target.value);
                    if (errors.age) setErrors((prev: any) => ({ ...prev, age: undefined }));
                  }}
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
                <Select value={governorate} onValueChange={(val) => {
                  setGovernorate(val);
                  if (errors.governorate) setErrors((prev: any) => ({ ...prev, governorate: undefined }));
                }}>
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

              {/* Phone Input with Interactive Lock & Confirm Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span>{isArabic ? 'رقم الهاتف الخاص بك (11 رقماً) *' : 'Your Personal Phone Number *'}</span>
                  </div>
                  {isPhoneLocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <Lock className="w-3 h-3" />
                      <span>{isArabic ? 'الرقم مؤكد ومغلق' : 'Number Locked'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">
                      {isArabic ? 'اكتب رقمك ثم اضغط قفل وتأكيد' : 'Type number then lock'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      readOnly={isPhoneLocked || isPhoneVerified}
                      value={phoneInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPhoneInput(val);
                        if (val.replace(/[^\d+]/g, '').length === 11 && !isPhoneLocked) {
                          // Auto-lock when 11 digits are reached
                          handleLockPhone(val);
                        }
                      }}
                      placeholder="01xxxxxxxxx"
                      className={`h-11 rounded-xl text-sm font-mono tracking-wider transition-all ${
                        isPhoneLocked || isPhoneVerified
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white'
                      }`}
                      dir="ltr"
                    />
                    {(isPhoneLocked || isPhoneVerified) && (
                      <div className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto px-3 flex items-center text-emerald-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Lock / Unlock Confirmation Button */}
                  {!isPhoneVerified && (
                    isPhoneLocked ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUnlockPhone}
                        className="h-11 px-3 text-xs font-bold rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0"
                        title={isArabic ? 'تعديل الرقم' : 'Edit Number'}
                      >
                        {isArabic ? 'تعديل الرقم' : 'Edit'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleLockPhone()}
                        className="h-11 px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0 flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'قفل وتأكيد' : 'Lock & Confirm'}</span>
                      </Button>
                    )
                  )}
                </div>
                {errors.phone && <p className="text-xs text-red-500 font-semibold">{errors.phone[0]}</p>}

                {isPhoneLocked && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>
                      {isArabic
                        ? `تم اعتماد رقمك الشخصي [ ${lockedPhone || phoneInput} ] للعرض على المحاضرات والعلامة المائية.`
                        : `Your number [ ${lockedPhone || phoneInput} ] is confirmed for your account and video watermark.`}
                    </span>
                  </p>
                )}
              </div>

              {/* Verified Badge / Details */}
              {isPhoneVerified ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {isArabic 
                        ? `تم توثيق وتأكيد رقمك الشخصي [ ${lockedPhone || verifiedPhoneNumber || phoneInput} ] بنجاح.` 
                        : `Personal number [ ${lockedPhone || verifiedPhoneNumber || phoneInput} ] verified via WhatsApp.`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhoneVerified(false);
                      setIsPhoneLocked(false);
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
                      onClick={() => {
                        // 1. Auto-lock student's entered phone
                        const curPhone = (phoneInput || '').trim();
                        if (curPhone) {
                          handleLockPhone(curPhone);
                        }
                        // 2. Explicitly persist entire form state to local and session storage
                        saveFormDraft({
                          name: nameInput,
                          age: ageInput,
                          password: passwordInput,
                          phone: curPhone,
                          lockedPhone: curPhone,
                          isPhoneLocked: true,
                          verificationCode: verificationCode,
                          governorate,
                          university,
                          customUniversity,
                          isCustomUniversityMode,
                          facultyCategory,
                          academicYear,
                          professorCode: professorCodeInput,
                          agreed
                        });
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all text-center cursor-pointer"
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
                        <span>{isArabic ? 'رقم خادم التفعيل:' : 'Verification Server:'}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+{botPhone}</span>
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>{isArabic ? 'الجامعة أو المعهد المقيد به في مصر *' : 'University or Institute in Egypt *'}</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !(isCustomUniversityMode || university === '__custom__');
                    setIsCustomUniversityMode(nextMode);
                    if (nextMode) {
                      setUniversity('__custom__');
                    } else {
                      setUniversity('');
                      setCustomUniversity('');
                    }
                    if (errors.university) {
                      setErrors((prev: any) => ({ ...prev, university: undefined }));
                    }
                  }}
                  className="text-[11px] text-[#2563eb] dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>
                    {isCustomUniversityMode || university === '__custom__'
                      ? (isArabic ? 'العودة للاختيار من القائمة' : 'Pick from list')
                      : (isArabic ? '✏️ غير مدرجة؟ اكتبها يدوياً' : '✏️ Not listed? Type name')}
                  </span>
                </button>
              </div>

              {!(isCustomUniversityMode || university === '__custom__') ? (
                <Select
                  value={university}
                  onValueChange={(val) => {
                    setUniversity(val);
                    if (val === '__custom__') {
                      setIsCustomUniversityMode(true);
                    }
                    if (errors.university) {
                      setErrors((prev: any) => ({ ...prev, university: undefined }));
                    }
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-white text-sm">
                    <SelectValue placeholder={isArabic ? 'اختر جامعتك (القاهرة، عين شمس، المنصورة، بدر، أو اكتب يدوياً...)' : 'Select your university in Egypt'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectItem value="__custom__" className="font-extrabold text-[#2563eb] dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 mb-1 py-2 cursor-pointer">
                      {isArabic ? '✏️ أخرى - كتابة اسم الجامعة أو المعهد يدوياً (اكتب اسم جامعتك)' : '✏️ Other - Type Your Custom University Name'}
                    </SelectItem>
                    {EGYPTIAN_UNIVERSITIES.map(u => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-[#2563eb]" />
                      <span>{isArabic ? 'اسم الجامعة أو المعهد العالي (كتابة يدوية):' : 'Custom University or Institute Name:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUniversityMode(false);
                        setUniversity('');
                        setCustomUniversity('');
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      {isArabic ? 'إلغاء والعودة للقائمة' : 'Back to list'}
                    </button>
                  </div>

                  <Input
                    type="text"
                    required
                    value={customUniversity}
                    onChange={(e) => {
                      setCustomUniversity(e.target.value);
                      if (errors.university) {
                        setErrors((prev: any) => ({ ...prev, university: undefined }));
                      }
                    }}
                    placeholder={isArabic ? 'مثال: أكاديمية الشروق، معهد العبور العالي، الجامعة الفرنسية...' : 'e.g. El Shorouk Academy, Obour Institute, etc.'}
                    className="h-11 rounded-xl border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-medium focus:border-blue-500 text-[#0f172a] dark:text-white"
                    autoFocus
                  />
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    {isArabic
                      ? '💡 سيتم اعتماد هذا الاسم في حسابك وكارنيه الطالب الجامعي وفي العلامة المائية للمحاضرات.'
                      : '💡 This custom name will appear on your student pass and lecture watermarks.'}
                  </p>
                </div>
              )}
              {errors.university && <p className="text-xs text-red-500">{errors.university[0]}</p>}
            </div>

            {/* Faculty / College Discipline */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>{isArabic ? 'الكلية / التخصص الأكاديمي *' : 'Faculty / Discipline *'}</span>
              </Label>
              <Select value={facultyCategory} onValueChange={(val) => {
                setFacultyCategory(val);
                if (errors.facultyCategory) setErrors((prev: any) => ({ ...prev, facultyCategory: undefined }));
              }}>
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
                <Select value={academicYear} onValueChange={(val) => {
                  setAcademicYear(val);
                  if (errors.academicYear) setErrors((prev: any) => ({ ...prev, academicYear: undefined }));
                }}>
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
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errors.password) setErrors((prev: any) => ({ ...prev, password: undefined }));
                  }}
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
