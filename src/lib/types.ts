import { Timestamp } from "firebase/firestore";

export type Grade = 
  | 'Year 1 (First Year)' | 'Year 2 (Second Year)' | 'Year 3 (Third Year)' | 'Year 4 (Fourth Year)' | 'Year 5 (Fifth Year)' | 'Year 6 (Sixth Year)'
  | 'Undergraduate' | 'Postgraduate / Master\'s' | 'PhD / Doctorate'
  | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6'
  | 'Prep 1' | 'Prep 2' | 'Prep 3' 
  | 'Sec 1' | 'Sec 2' | 'Sec 3'
  | string;

export type Video = {
  id: string;
  title: string;
  url: string;
};

export type Unit = {
  id: string;
  title: string;
  videos: Video[];
};

export type Teacher = {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  phoneNumber?: string; // NEW
  bio: string;
  heroImageUrl: string;
  profilePictureUrl: string;
  subjects: string[];
  gradesTaught: Grade[];
  assistantCode: string;
  approved: boolean; // Admin approval status
  approvalExpiresAt?: Timestamp | string; // For temporary approvals
  paymentDueDate?: Timestamp | string; // For subscription payments
  hasPersonalAttendance?: boolean; // New field for personal attendance system
  ratingCount?: number;
  totalRating?: number;
  averageRating?: number;
  isFeatured?: boolean;
  planId?: 'basic' | 'pro' | 'enterprise'; // ID of the chosen subscription plan
  planName?: string; // Name of the chosen plan
  viewCount?: number;
  joinedCenterIds?: string[];
  requestedCenterIds?: string[];
  codeUsage?: {
    date: string; // YYYY-MM-DD
    count: number;
    limit: number;
    extraRequested: boolean;
  };
  createdAt?: Timestamp; // Added for sorting by newest
  password?: string;
  initialPassword?: string;
};

export type TeacherRating = {
    id: string; // student's UID
    rating: number;
    createdAt: Timestamp;
}

export type Student = {
  id: string; // This will be the anonymous Firebase Auth UID
  name: string;
  phoneNumber: string;
  age?: number;
  parentPhoneNumber?: string;
  schoolName?: string;
  grade?: Grade;
  barcodeId: string;
  governorate?: string;
  university?: string;
  facultyCategory?: string;
  facultyLabel?: string;
  academicYear?: string;
  academicYearLabel?: string;
  universityId?: string;
  role?: string;
  educationLevel?: string;
  notes?: string;
  message?: EnrolledStudentMessage;
  activeSubscriptions?: StudentSubscription[];
  lastCheckInTime?: string;
  lastCheckInPlanName?: string;
  createdAt?: Timestamp; // Added for tracking new students
  latestTestAttemptId?: string;
  xp?: number;
  streak?: number;
  lastStreakDate?: string;
};

export type StudentSyncData = {
  lastCheckIn: string;
  planName: string;
  debtStatus: number;
  teacherId: string;
}

export type SyncJob = {
  studentBarcodeId: string;
  lastCheckIn: string;
  planName: string;
  debtStatus: number;
  teacherId: string;
}

export type Parent = {
  id: string;
  phoneNumber: string;
  studentBarcodeId: string;
};

export type Course = {
  id: string;
  teacherId: string; // Reference to the teacher who owns the course
  title: string;
  description: string;
  videoUrl: string; // DEPRECATED: Kept for backward compatibility
  units?: Unit[]; // NEW: Replaces the flat 'videos' array
  videos?: Video[]; // DEPRECATED: Kept for backward compatibility, will be migrated to units
  thumbnailUrl: string;
  attachmentUrl?: string; // Optional link to a PDF or other resource
  videoNote?: string; // Optional note displayed with the video
  grades: Grade[];
  subjects: string[]; // Added subjects to course
  locked: boolean;
  lockMode?: 'requests_only' | 'codes_only' | 'both';
  price?: number;
  viewLimit?: number; // The number of times a student can open the course after unlocking it. 0 or undefined means unlimited views.
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  ratingCount?: number;
  totalRating?: number;
  averageRating?: number;
  isFeatured?: boolean; // New field
  teacherName?: string; // Denormalized
  teacherProfilePictureUrl?: string; // Denormalized
  homeworkId?: string; // NEW
  testId?: string; // NEW
};

export type CollectionCustomItem = {
    id: string;
    type: 'course' | 'unit' | 'lesson' | 'file';
    courseId?: string;
    courseTitle?: string;
    unitId?: string;
    unitTitle?: string;
    unitIndex?: number;
    videoId?: string;
    videoTitle?: string;
    videoUrl?: string;
    fileTitle?: string;
    fileUrl?: string;
};

export type CourseCollection = {
    id: string;
    teacherId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    courseIds: string[];
    customItems?: CollectionCustomItem[];
    locked: boolean; // Always true for collections
};

export type CourseRequest = {
    id: string;
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentBarcode?: string;
    studentGrade?: string;
    studentFaculty?: string;
    studentUniversity?: string;
    teacherId: string;
    requestType: 'course' | 'unit' | 'collection';
    courseId?: string;
    courseTitle?: string;
    unitId?: string;
    unitTitle?: string;
    unitIndex?: number;
    collectionId?: string;
    collectionTitle?: string;
    status: 'pending' | 'granted' | 'rejected';
    createdAt: Timestamp | any;
    grantedAt?: Timestamp | any;
    note?: string;
};

export type WatchHistory = {
  id: string; // courseId
  watchedVideoIds?: string[];
  lastWatched: Timestamp;
};


export type CourseRating = {
    id: string; // student's UID
    rating: number;
    createdAt: Timestamp;
}

export type CourseViewer = {
  id: string; // studentId
  studentId: string;
  studentName: string;
  studentCode?: string;
  studentEmail?: string;
  studentPhotoUrl?: string;
  lastWatchedVideoId?: string;
  lastWatchedUnitTitle?: string;
  lastWatchedLessonTitle?: string;
  lastWatchedUnitIndex?: number;
  lastWatchedLessonIndex?: number;
  watchedVideoIds?: string[];
  lastWatchedAt?: Timestamp;
  updatedAt?: Timestamp;
  firstViewedAt?: Timestamp;
};

export type Comment = {
  id: string;
  studentId: string;
  studentName: string;
  text: string;
  createdAt: Timestamp;
}

export type CalendarEvent = {
  id: string;
  teacherId: string; // Reference to the teacher who owns the event
  grade: Grade;
  startTime: string;
  endTime: string;
  place: string;
  title: string;
  recurrence: 'single' | 'weekly';
};

export type Announcement = {
  id:string;
  text: string;
  startTime: Timestamp;
  endTime: Timestamp;
};

export type ShareCode = {
  id: string;
  code: string;
  courseId?: string; // Optional: for single course
  collectionId?: string; // Optional: for course collection
  teacherId: string; // Keep track of which teacher generated the code
  used: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdAt: Timestamp;
  hidden?: boolean;
};

export type CourseAccess = {
  courseId: string;
  teacherId: string;
  unlockedAt: Timestamp;
  viewCount?: number;
  viewLimit?: number;
  unlockedUnitIds?: string[];
  fullAccess?: boolean;
  grantedVia?: 'code' | 'request' | 'package';
};

export type CourseCollectionAccess = {
  collectionId: string;
  studentId: string;
  unlockedAt: Timestamp;
};


export type Assistant = {
  id: string; // Firebase Auth UID
  teacherId: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
};


// Educational Hub Types
export type Hub = {
  id: string;
  name: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  socialNote?: string;
};

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export type TeacherSchedule = {
  name: string;
  sessionDays: DayOfWeek[];
  schedule: string; // e.g. "6PM - 8PM"
};

export type EnrollmentPlan = {
    id: string;
    name: string;
    price: number;
    description: string;
    durationValue: number;
    durationUnit: 'days' | 'months';
    grades: string[];
    type: 'Private' | 'Package';
    // For Private Plans
    tutor?: string; 
    schedule?: string;
    sessionDays?: DayOfWeek[];
    // For Package Plans
    teacherSchedules?: TeacherSchedule[];
    priceDivisor?: number;
};

export type StudentSubscription = {
    subscriptionId: string;
    planId: string;
    planName: string;
    planType: 'Private' | 'Package';
    price: number;
    paid: number;
    remaining: number;
    startDate: string;
    endDate: string;
    // This will now store the full teacher schedule for packages, or just the one for private
    teacherSchedules?: TeacherSchedule[];
    // This is now legacy/redundant but kept for backward compatibility if needed.
    teachers?: string[];
};

export type EnrolledStudentMessage = {
    text: string;
    from: string;
};

// This type is now deprecated as its properties are merged into the main Student type.
export type EnrolledStudent = Student;

export type Transaction = {
    id: string;
    studentId: string;
    studentName: string;
    planId: string; // ID of the plan involved in the transaction
    planName: string;
    duration: string;
    totalPrice: number;
    paidAmount: number;
    remaining: number;
    note: string;
    type: 'New Enrollment' | 'Extend/Payment' | 'Payment';
    aide: string;
    date: string;
};

export type AideRole = 'S Admin' | 'Check-in Staff';

export const adminPages = [
    { id: '/admin/check-in', href: '/admin/check-in', label: 'Attendance' },
    { id: '/admin/sessions', href: '/admin/sessions', label: 'Sessions' },
    { id: '/admin/dashboard', href: '/admin/dashboard', label: 'Approvals' },
    { id: '/admin/management', href: '/admin/management', label: 'Management' },
    { id: '/admin/plans', href: '/admin/plans', label: 'Plans' },
    { id: '/admin/seasons', href: '/admin/seasons', label: 'Seasons & Rewards' },
    { id: '/admin/offers', href: '/admin/offers', label: 'Offers' },
    { id: '/admin/recordings', href: '/admin/recordings', label: 'Recordings' },
    { id: '/admin/marketing', href: '/admin/marketing', label: 'Marketing' },
    { id: '/admin/analytics', href: '/admin/analytics', label: 'Hub Analytics' },
] as const;


export type AdminPageId = typeof adminPages[number]['id'];

export const dataCategories = [
    { id: 'students', label: 'All Students' },
    { id: 'transactions', label: 'All Transactions' },
    { id: 'attendance', label: 'All Attendance Records' },
    { id: 'offers', label: 'All Offers' },
    { id: 'recordingOffers', label: 'All Recording Offers' },
    { id: 'recordingBookings', label: 'All Recording Bookings' },
    { id: 'plans', label: 'All Plans' },
    { id: 'aides', label: 'All Aide Accounts' },
] as const;


export type DataCategoryId = typeof dataCategories[number]['id'];

export type Aide = {
    id: string;
    name: string;
    role: AideRole;
};

export type AttendanceRecord = {
    id: string;
    barcodeId: string;
    checkInTime: string;
    aideName: string;
    studentName: string;
    studentPhone: string;
    planId: string; // The specific plan they are checking in for
    planName: string;
    planType: 'Private' | 'Package';
    teacherName?: string; // For package plans, which teacher was selected
};

export type Offer = {
    id: string;
    title: string;
    endDate: string;
};

export type RecordingOffer = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'per-hour' | 'per-package';
  videoCount?: number;
};

export type RecordingBooking = {
  id: string;
  teacherId: string;
  teacherName:string;
  offerId: string;
  offerTitle: string;
  requestedDate: string; // ISO date string
  requestedTime: string; // "HH:mm" format
  status: 'pending' | 'approved' | 'declined';
  createdAt: string; // ISO datetime string
};

// Teacher's Personal Attendance System Types
export type LocalPlan = {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  sessionDays?: DayOfWeek[];
  createdAt?: Timestamp;
  totalProfit?: number;
  synced?: boolean;
  updatedAt?: string;
};

export type LocalStudent = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  grade?: Grade | string;
  parentPhone?: string;
  barcodeId?: string;
  planId: string;
  planName: string;
  endDate: string; // ISO string
  price: number;
  paid: number;
  remaining: number;
  createdAt: Timestamp;
  lastAttendedAt: Timestamp | null;
  attendanceCount: number;
  isInDebt: boolean;
  notes?: string;
  synced?: boolean;
  updatedAt?: string;
};

export interface LocalEnrollment extends LocalStudent {
  teacherName: string;
  teacherId: string;
  lastCheckIn?: string;
}


export type LocalAttendanceRecord = {
  id: string;
  studentId: string;
  barcodeId?: string;
  studentName?: string;
  planId?: string;
  planName?: string;
  status?: string;
  teacherName?: string;
  checkInTime: string; // ISO string
  sessionId: string; // e.g., 'planId_YYYY-MM-DD'
  synced?: boolean;
  updatedAt?: string;
};

export type LocalTransaction = {
  id: string;
  teacherId?: string;
  studentId: string;
  studentName: string;
  planId: string;
  type: 'enrollment' | 'payment';
  amount: number;
  date: string; // ISO string
  note?: string;
  synced?: boolean;
  updatedAt?: string;
};

export type CanvasConfigItem = {
    id: string;
    name: string;
    amount: number;
}

export type CanvasConfig = {
    activeTeachers?: number;
    teacherQuota?: number;
    serviceTeacherCost?: number;
    workers?: { id: string; name: string; salary: number; }[];
    expenses?: CanvasConfigItem[];
    incomes?: CanvasConfigItem[];
}

export type Homework = {
    id: string;
    teacherId: string;
    planName: string;
    grade: Grade;
    title?: string;
    content: string;
    resourceLink?: string;
    createdAt: Timestamp;
    expiresAt?: Timestamp;
};

export type TestQuestion = {
    type: 'mcq' | 'true_false';
    questionText?: string;
    questionMedia?: string; // URL to image/pdf on Google Drive
    options?: string[];
    correctAnswer: string | boolean;
    points: number;
};

export type Test = {
    id: string;
    teacherId: string;
    courseId?: string;
    title: string;
    questions: TestQuestion[];
    timeLimit?: number; // in minutes
    rulesText: string;
    testCode: string; // a unique, short code for students to enter
    createdAt: Timestamp;
};

export type TestAttempt = {
    id: string;
    testId: string;
    studentId: string;
    studentName?: string;
    studentPhone?: string;
    teacherId?: string;
    testTitle: string;
    answers: (string | boolean | null)[];
    score: number;
    totalPoints: number;
    submittedAt: Timestamp;
    status: 'completed' | 'auto_submitted_exit';
    incorrectQuestions: {
        question: string;
        yourAnswer: string | boolean | null;
        correctAnswer: string | boolean;
    }[];
};

export type QuestionBankItem = {
    id: string;
    teacherId: string;
    teacherName?: string;
    title: string;
    description: string;
    grade: Grade;
    fileUrl: string;
    fileName?: string;
    createdAt?: Timestamp | any;
    updatedAt?: Timestamp | any;
};

