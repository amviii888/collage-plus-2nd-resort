export interface ProfessorItem {
  id?: string;
  code: string; // 2 to 4 uppercase alphanumeric characters e.g. 'VV', 'VX', 'PHYS', 'MATH', 'CS'
  name: string;
  titleAr: string;
  titleEn: string;
  subjectAr: string;
  subjectEn: string;
  facultyAr: string;
  facultyEn: string;
  avatarUrl: string;
  heroImageUrl: string;
  appIconPath: string;
  appIconEmoji: string;
  appNameAr: string;
  appNameEn: string;
  themeColor: string;
  coursesCount: number;
  studentsCount: number;
  descriptionAr: string;
  descriptionEn: string;
  assignedThemeId?: string; // assigned custom theme ID for student profile page styling
}

export interface BuiltinAppIcon {
  id: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  iconPath: string;
  color: string;
  category: string;
}

/**
 * Pre-built icon catalog in the codebase that the admin can assign to any professor profile.
 */
export const BUILTIN_APP_ICONS: BuiltinAppIcon[] = [
  {
    id: 'custom_farouk',
    nameAr: 'صورة د. وليد فاروق (ملف الكود: professors-custom)',
    nameEn: 'Dr. Waleed Farouk (Codebase: professors-custom)',
    emoji: '⚡',
    iconPath: '/professors-custom/dr-farouk.svg',
    color: '#2563eb',
    category: 'صور وملفات مخصصة بالكود'
  },
  {
    id: 'custom_khalil',
    nameAr: 'صورة د. ياسر خليل (ملف الكود: professors-custom)',
    nameEn: 'Dr. Yasser Khalil (Codebase: professors-custom)',
    emoji: '📐',
    iconPath: '/professors-custom/dr-khalil.svg',
    color: '#059669',
    category: 'صور وملفات مخصصة بالكود'
  },
  {
    id: 'biophysics',
    nameAr: 'الفيزياء الحيوية والطبية',
    nameEn: 'Biophysics & Medical Physics',
    emoji: '⚡',
    iconPath: '/icons/professors/vv.svg',
    color: '#2563eb',
    category: 'العلوم الطبية والطبيعية'
  },
  {
    id: 'calculus',
    nameAr: 'الرياضيات والتحليل المتقدم',
    nameEn: 'Calculus & Pure Math',
    emoji: '📐',
    iconPath: '/icons/professors/vx.svg',
    color: '#059669',
    category: 'الهندسة والرياضيات'
  },
  {
    id: 'physics',
    nameAr: 'الفيزياء العامة والميكانيكا',
    nameEn: 'General Physics & Thermo',
    emoji: '🔬',
    iconPath: '/icons/professors/ph.svg',
    color: '#7c3aed',
    category: 'العلوم والهندسة'
  },
  {
    id: 'computerscience',
    nameAr: 'علوم الحاسب وهندسة البرمجيات',
    nameEn: 'Computer Science & Software',
    emoji: '💻',
    iconPath: '/icons/professors/cs.svg',
    color: '#0284c7',
    category: 'الحاسبات والذكاء الاصطناعي'
  },
  {
    id: 'chemistry',
    nameAr: 'الكيمياء العضوية والصيدلانية',
    nameEn: 'Organic Chemistry & Pharmacy',
    emoji: '🧪',
    iconPath: '/icons/professors/ch.svg',
    color: '#ea580c',
    category: 'الصيدلة والكيمياء'
  },
  {
    id: 'anatomy',
    nameAr: 'الطب البشري والتشريح الإكلينيكي',
    nameEn: 'Human Anatomy & Surgery',
    emoji: '🩺',
    iconPath: '/icons/professors/md.svg',
    color: '#dc2626',
    category: 'الطب والجراحة'
  },
  {
    id: 'engineering',
    nameAr: 'الهندسة والميكاترونكس',
    nameEn: 'Engineering & Mechanics',
    emoji: '⚙️',
    iconPath: '/icons/professors/eng.svg',
    color: '#d97706',
    category: 'الهندسة التطبيقية'
  },
  {
    id: 'genetics',
    nameAr: 'علم الوراثة والعلوم الجزيئية',
    nameEn: 'Genetics & Molecular Biology',
    emoji: '🧬',
    iconPath: '/icons/professors/bio.svg',
    color: '#10b981',
    category: 'البيولوجيا والعلوم'
  },
  {
    id: 'law',
    nameAr: 'القانون والعلوم الإدارية',
    nameEn: 'Law & Jurisprudence',
    emoji: '⚖️',
    iconPath: '/icons/professors/law.svg',
    color: '#6366f1',
    category: 'الحقوق والقانون'
  },
  {
    id: 'business',
    nameAr: 'إدارة الأعمال والمحاسبة',
    nameEn: 'Business & Accounting',
    emoji: '📊',
    iconPath: '/icons/professors/bus.svg',
    color: '#0891b2',
    category: 'التجارة والاقتصاد'
  },
  {
    id: 'mola5saty_default',
    nameAr: 'شعار ملخصاتي الرسمي',
    nameEn: 'Official Mola5saty Emblem',
    emoji: '🍃',
    iconPath: '/favicon.ico',
    color: '#22c55e',
    category: 'المنظومة الرسمية'
  }
];

/**
 * Base registered professors
 */
export const REGISTERED_PROFESSORS: ProfessorItem[] = [
  {
    id: 'teacher_vv_demo',
    code: 'VV',
    name: 'د. وليد فاروق',
    titleAr: 'أستاذ الفيزياء الحيوية والطبية',
    titleEn: 'Professor of Biophysics & Medical Physics',
    subjectAr: 'الفيزياء والعلوم الحيوية',
    subjectEn: 'Biophysics & Applied Physics',
    facultyAr: 'كلية الطب البشري والعلوم',
    facultyEn: 'Faculty of Medicine & Science',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
    heroImageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200',
    appIconPath: '/icons/professors/vv.svg',
    appIconEmoji: '⚡',
    appNameAr: 'منصة د. وليد فاروق [VV]',
    appNameEn: 'Dr. Waleed Farouk Portal [VV]',
    themeColor: '#2563eb',
    coursesCount: 3,
    studentsCount: 342,
    descriptionAr: 'البوابة الأكاديمية الرسمية لمحاضرات الفيزياء الطبية الحيوية، بنوك الأسئلة، والامتحانات الدورية.',
    descriptionEn: 'Official academic portal for medical physics lectures, question banks, and scheduled tests.'
  },
  {
    id: 'teacher_vx_demo',
    code: 'VX',
    name: 'د. ياسر خليل',
    titleAr: 'أستاذ الرياضيات والتحليل العددي',
    titleEn: 'Professor of Applied Mathematics & Calculus',
    subjectAr: 'الرياضيات والتحليل المتقدم',
    subjectEn: 'Calculus & Advanced Analysis',
    facultyAr: 'كلية الهندسة والحاسبات',
    facultyEn: 'Faculty of Engineering & Computing',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400',
    heroImageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=1200',
    appIconPath: '/icons/professors/vx.svg',
    appIconEmoji: '📐',
    appNameAr: 'منصة د. ياسر خليل [VX]',
    appNameEn: 'Dr. Yasser Khalil Portal [VX]',
    themeColor: '#059669',
    coursesCount: 4,
    studentsCount: 289,
    descriptionAr: 'البوابة الأكاديمية التفاعلية لشرح التفاضل والتكامل، الجبر الخطي، ومراجعات الامتحانات النهائية.',
    descriptionEn: 'Interactive academic portal for calculus, linear algebra, and final exam preparations.'
  }
];

/**
 * Retrieves dynamic admin-assigned teacher code mappings
 */
export function getAdminCustomTeacherCodes(): Record<string, ProfessorItem> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('admin_custom_teacher_codes');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse admin teacher codes:', e);
    return {};
  }
}

/**
 * Saves/Updates an admin teacher code mapping linking a teacher account to a custom 2-4 letter code and pre-built icon
 */
export function saveAdminTeacherCodeMapping(mapping: ProfessorItem) {
  if (typeof window === 'undefined') return;
  try {
    const current = getAdminCustomTeacherCodes();
    const cleanCode = mapping.code.trim().toUpperCase();
    const updated = {
      ...current,
      [cleanCode]: {
        ...mapping,
        code: cleanCode
      }
    };
    localStorage.setItem('admin_custom_teacher_codes', JSON.stringify(updated));
    window.dispatchEvent(new Event('admin_teacher_codes_updated'));
    window.dispatchEvent(new Event('connected_professors_updated'));
  } catch (e) {
    console.error('Failed to save admin teacher code mapping:', e);
  }
}

/**
 * Saves teacher code mapping to both local storage AND Firestore cloud database
 */
export async function saveTeacherCodeMappingToCloudAndLocal(mapping: ProfessorItem, firestore?: any) {
  saveAdminTeacherCodeMapping(mapping);

  if (firestore) {
    try {
      const cleanCode = mapping.code.trim().toUpperCase();
      const { doc, setDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');

      // 1. Save to central teacher_codes collection
      const codeRef = doc(firestore, 'teacher_codes', cleanCode);
      await setDoc(codeRef, {
        id: mapping.id || `teacher_${cleanCode.toLowerCase()}`,
        code: cleanCode,
        name: mapping.name,
        titleAr: mapping.titleAr || '',
        titleEn: mapping.titleEn || '',
        subjectAr: mapping.subjectAr || '',
        subjectEn: mapping.subjectEn || '',
        facultyAr: mapping.facultyAr || '',
        facultyEn: mapping.facultyEn || '',
        avatarUrl: mapping.avatarUrl || '',
        heroImageUrl: mapping.heroImageUrl || '',
        appIconPath: mapping.appIconPath || '',
        appIconEmoji: mapping.appIconEmoji || '',
        appNameAr: mapping.appNameAr || '',
        appNameEn: mapping.appNameEn || '',
        themeColor: mapping.themeColor || '#2563eb',
        assignedThemeId: mapping.assignedThemeId || 'default',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Also update teacher document if teacher id exists
      if (mapping.id) {
        const teacherRef = doc(firestore, 'teachers', mapping.id);
        await setDoc(teacherRef, {
          code: cleanCode,
          assistantCode: cleanCode,
          teacherCode: cleanCode,
          appNameAr: mapping.appNameAr || '',
          appNameEn: mapping.appNameEn || '',
          appIconPath: mapping.appIconPath || '',
          appIconEmoji: mapping.appIconEmoji || '',
          themeColor: mapping.themeColor || '#2563eb',
          assignedThemeId: mapping.assignedThemeId || 'default',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.error('Failed to sync teacher code mapping to Firestore:', err);
    }
  }
}

/**
 * Retrieves deleted builtin/placeholder professor codes
 */
export function getDeletedBuiltinProfessors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('deleted_builtin_professors');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Returns active registered professors excluding any that were deleted by admin
 */
export function getActiveRegisteredProfessors(): ProfessorItem[] {
  const deletedRaw = getDeletedBuiltinProfessors();
  const deletedUpper = deletedRaw.map(d => (d || '').toUpperCase());
  return REGISTERED_PROFESSORS.filter(p => {
    const isCodeDeleted = deletedUpper.includes(p.code.toUpperCase());
    const isIdDeleted = p.id ? (deletedUpper.includes(p.id.toUpperCase()) || deletedRaw.includes(p.id)) : false;
    const isNameDeleted = deletedRaw.includes(p.name) || deletedUpper.includes(p.name.toUpperCase());
    return !isCodeDeleted && !isIdDeleted && !isNameDeleted;
  });
}

/**
 * Delete an admin teacher code mapping and mark builtin placeholder as deleted if applicable
 */
export function deleteAdminTeacherCodeMapping(codeOrIdOrName: string) {
  if (typeof window === 'undefined') return;
  try {
    const clean = (codeOrIdOrName || '').trim();
    if (!clean) return;
    const cleanUpper = clean.toUpperCase();

    // 1. Remove from dynamic custom mappings
    const current = getAdminCustomTeacherCodes();
    delete current[cleanUpper];
    delete current[clean];
    Object.keys(current).forEach(k => {
      const item = current[k];
      if (
        item.code?.toUpperCase() === cleanUpper || 
        item.id?.toUpperCase() === cleanUpper || 
        item.id === clean ||
        item.name === clean
      ) {
        delete current[k];
      }
    });
    localStorage.setItem('admin_custom_teacher_codes', JSON.stringify(current));

    // 2. Mark in deleted builtin list if it was a base registered professor or any custom mapped code
    const deleted = getDeletedBuiltinProfessors();
    const toAdd = [clean, cleanUpper];

    const matchedProf = REGISTERED_PROFESSORS.find(p => 
      p.code.toUpperCase() === cleanUpper || 
      (p.id && p.id.toUpperCase() === cleanUpper) ||
      (p.id && p.id === clean) ||
      p.name === clean ||
      clean.includes(p.code) ||
      p.name.includes(clean)
    );

    if (matchedProf) {
      toAdd.push(matchedProf.code, matchedProf.code.toUpperCase());
      if (matchedProf.id) {
        toAdd.push(matchedProf.id, matchedProf.id.toUpperCase());
      }
      toAdd.push(matchedProf.name);
    }

    toAdd.forEach(item => {
      if (item && !deleted.includes(item)) {
        deleted.push(item);
      }
    });

    localStorage.setItem('deleted_builtin_professors', JSON.stringify(deleted));

    window.dispatchEvent(new Event('admin_teacher_codes_updated'));
    window.dispatchEvent(new Event('connected_professors_updated'));
  } catch (e) {
    console.error('Failed to delete admin teacher code mapping:', e);
  }
}

/**
 * Completely delete a teacher (from custom codes, builtin registry, and Firestore)
 */
export async function deleteProfessorCompletely(teacherIdOrCodeOrName: string, firestore?: any) {
  if (!teacherIdOrCodeOrName) return;
  const target = teacherIdOrCodeOrName.trim();
  const cleanUpper = target.toUpperCase();

  deleteAdminTeacherCodeMapping(target);

  if (firestore) {
    try {
      const { doc, deleteDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Delete from teacher_codes
      await deleteDoc(doc(firestore, 'teacher_codes', cleanUpper)).catch(() => {});
      await deleteDoc(doc(firestore, 'teacher_codes', target)).catch(() => {});
      
      // Delete from teachers collection
      await deleteDoc(doc(firestore, 'teachers', target)).catch(() => {});
      if (cleanUpper !== target) {
        await deleteDoc(doc(firestore, 'teachers', cleanUpper)).catch(() => {});
      }

      // Record in system_deleted_teachers to prevent re-seeding
      await setDoc(doc(firestore, 'system_deleted_teachers', cleanUpper), {
        id: cleanUpper,
        target,
        deletedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Could not delete teacher from Firestore directly:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('admin_teacher_codes_updated'));
    window.dispatchEvent(new Event('connected_professors_updated'));
  }
}

/**
 * Asynchronously resolve professor by 2-4 letter code across Firestore and local registry
 */
export async function resolveProfessorFromCloudOrLocal(
  code: string | null | undefined, 
  firestore?: any
): Promise<ProfessorItem | undefined> {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 4) return undefined;

  // 1. Check local memory / custom mappings
  const localProf = findProfessorByCode(normalized);
  if (localProf) return localProf;

  // 2. Check Firestore if available
  if (firestore) {
    try {
      const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

      // Check central teacher_codes collection
      const codeSnap = await getDoc(doc(firestore, 'teacher_codes', normalized));
      if (codeSnap.exists()) {
        const data = codeSnap.data() as any;
        const prof: ProfessorItem = {
          id: data.id || codeSnap.id,
          code: normalized,
          name: data.name || 'أستاذ المادة',
          titleAr: data.titleAr || `أستاذ ${data.subjectAr || ''}`,
          titleEn: data.titleEn || `Professor of ${data.subjectEn || ''}`,
          subjectAr: data.subjectAr || 'الجامعة',
          subjectEn: data.subjectEn || 'Faculty',
          facultyAr: data.facultyAr || 'الجامعة والكلية',
          facultyEn: data.facultyEn || 'Faculty & University',
          avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
          heroImageUrl: data.heroImageUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200',
          appIconPath: data.appIconPath || '/icons/professors/vv.svg',
          appIconEmoji: data.appIconEmoji || '⚡',
          appNameAr: data.appNameAr || `منصة ${data.name} [${normalized}]`,
          appNameEn: data.appNameEn || `${data.name} Portal [${normalized}]`,
          themeColor: data.themeColor || '#2563eb',
          coursesCount: data.coursesCount || 3,
          studentsCount: data.studentsCount || 100,
          descriptionAr: data.descriptionAr || `البوابة الأكاديمية الرسمية لمحاضرات ${data.name}.`,
          descriptionEn: data.descriptionEn || `Official academic portal for ${data.name}.`,
          assignedThemeId: data.assignedThemeId || 'default'
        };
        saveAdminTeacherCodeMapping(prof);
        return prof;
      }

      // Check teachers collection by ID
      const directTeacherDoc = await getDoc(doc(firestore, 'teachers', normalized));
      let matchedDoc: any = directTeacherDoc.exists() ? { id: directTeacherDoc.id, data: directTeacherDoc.data() } : null;

      if (!matchedDoc) {
        const qCode = query(collection(firestore, 'teachers'), where('code', '==', normalized));
        const snap = await getDocs(qCode);
        if (!snap.empty) {
          matchedDoc = { id: snap.docs[0].id, data: snap.docs[0].data() };
        }
      }

      if (!matchedDoc) {
        const qAssist = query(collection(firestore, 'teachers'), where('assistantCode', '==', normalized));
        const snap = await getDocs(qAssist);
        if (!snap.empty) {
          matchedDoc = { id: snap.docs[0].id, data: snap.docs[0].data() };
        }
      }

      if (!matchedDoc) {
        const allSnap = await getDocs(collection(firestore, 'teachers'));
        allSnap.forEach(d => {
          const dt = d.data();
          const c = (dt.code || dt.assistantCode || dt.teacherCode || '').trim().toUpperCase();
          if (c === normalized || d.id.toUpperCase() === normalized) {
            matchedDoc = { id: d.id, data: dt };
          }
        });
      }

      if (matchedDoc) {
        const tDoc = matchedDoc.data;
        const prof: ProfessorItem = {
          id: matchedDoc.id,
          code: normalized,
          name: tDoc.name || 'أستاذ المادة',
          titleAr: `أستاذ ${tDoc.subjects?.[0] || ''}`,
          titleEn: `Professor of ${tDoc.subjects?.[0] || ''}`,
          subjectAr: tDoc.subjects?.[0] || 'الجامعة',
          subjectEn: tDoc.subjects?.[0] || 'Faculty',
          facultyAr: 'الجامعة والكلية',
          facultyEn: 'Faculty & University',
          avatarUrl: tDoc.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
          heroImageUrl: tDoc.heroImageUrl || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200',
          appIconPath: tDoc.appIconPath || '/icons/professors/vv.svg',
          appIconEmoji: tDoc.appIconEmoji || '⚡',
          appNameAr: tDoc.appNameAr || `منصة ${tDoc.name} [${normalized}]`,
          appNameEn: tDoc.appNameEn || `${tDoc.name} Portal [${normalized}]`,
          themeColor: tDoc.themeColor || '#2563eb',
          coursesCount: 3,
          studentsCount: 100,
          descriptionAr: `البوابة الأكاديمية الرسمية لمحاضرات ${tDoc.name}.`,
          descriptionEn: `Official academic portal for ${tDoc.name}.`,
          assignedThemeId: tDoc.assignedThemeId || 'default'
        };
        saveAdminTeacherCodeMapping(prof);
        return prof;
      }
    } catch (err) {
      console.error('Error resolving professor from cloud:', err);
    }
  }

  return undefined;
}

/**
 * Lookup professor by 2 to 4 letter code (case-insensitive & trimmed)
 * Checks dynamic admin assignments first, then active hardcoded registry.
 */
export function findProfessorByCode(code: string | null | undefined): ProfessorItem | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  
  // 1. Check dynamic admin mappings
  const adminMappings = getAdminCustomTeacherCodes();
  if (adminMappings[normalized]) {
    return adminMappings[normalized];
  }

  // 2. Check active base registered professors (excluding deleted)
  return getActiveRegisteredProfessors().find(p => p.code.toUpperCase() === normalized);
}

/**
 * Retrieve list of professors connected to the student
 */
export function getStudentConnectedProfessors(studentId?: string): ProfessorItem[] {
  const activeBase = getActiveRegisteredProfessors();
  if (typeof window === 'undefined') return activeBase;
  try {
    const key = studentId ? `student_connected_professors_${studentId}` : 'student_connected_professors_active';
    const stored = localStorage.getItem(key);
    let codes: string[] = [];
    if (stored) {
      codes = JSON.parse(stored);
    }
    // Also check global fallback
    const globalStored = localStorage.getItem('student_connected_professors_active');
    if (globalStored && (!codes || codes.length === 0)) {
      codes = JSON.parse(globalStored);
    }

    if (!Array.isArray(codes) || codes.length === 0) {
      return activeBase;
    }

    const mapped = codes
      .map(c => findProfessorByCode(c))
      .filter((p): p is ProfessorItem => Boolean(p));

    return mapped.length > 0 ? mapped : activeBase;
  } catch (e) {
    console.error('Failed to get connected professors:', e);
    return activeBase;
  }
}

/**
 * Add a professor 2 to 4 letter code to the student's connected collection
 */
export function addProfessorCodeToStudent(
  studentId: string, 
  rawCode: string
): { success: boolean; professor?: ProfessorItem; error?: string; alreadyExists?: boolean } {
  const normalized = (rawCode || '').trim().toUpperCase();
  if (!normalized || normalized.length < 2 || normalized.length > 4) {
    return { success: false, error: 'كود الدكتور يجب أن يتكون من 2 إلى 4 أحرف إنجليزية كبيرة (مثل VV أو VX أو PHYS أو MATH).' };
  }

  const professor = findProfessorByCode(normalized);
  if (!professor) {
    return { success: false, error: `كود الدكتور [ ${normalized} ] غير مسجل أو لم يتم تفعيله من لوحة الإدارة بعد.` };
  }

  if (typeof window !== 'undefined') {
    try {
      const specificKey = `student_connected_professors_${studentId}`;
      const existingSpecific: string[] = JSON.parse(localStorage.getItem(specificKey) || '[]');
      const globalKey = 'student_connected_professors_active';
      const existingGlobal: string[] = JSON.parse(localStorage.getItem(globalKey) || '[]');

      if (existingSpecific.includes(normalized)) {
        return { success: true, professor, alreadyExists: true };
      }

      const updated = Array.from(new Set([...existingSpecific, ...existingGlobal, normalized]));
      localStorage.setItem(specificKey, JSON.stringify(updated));
      localStorage.setItem(globalKey, JSON.stringify(updated));

      // Also set active professor branding automatically if it's the first or primary professor
      setActiveProfessorBranding(professor, studentId);

      window.dispatchEvent(new Event('connected_professors_updated'));
    } catch (e) {
      console.error('Error saving professor code locally:', e);
    }
  }

  return { success: true, professor };
}

/**
 * Sets the active professor branding (app icon + custom app name)
 */
export function setActiveProfessorBranding(professor: ProfessorItem, studentId?: string) {
  if (typeof window === 'undefined') return;
  try {
    const iconKey = studentId ? `student_app_icon_${studentId}` : 'student_app_icon_active';
    localStorage.setItem(iconKey, professor.code.toLowerCase());
    localStorage.setItem('student_app_icon_active', professor.code.toLowerCase());
    localStorage.setItem('app_active_selected_icon', professor.code.toLowerCase());
    
    // Save custom app title for PWA / Android
    localStorage.setItem('app_custom_branding_title', professor.appNameAr);
    localStorage.setItem('active_connected_professor_code', professor.code);

    // Automatically set and unlock the professor's assigned theme if configured
    const themeToSet = professor.assignedThemeId || 'default';
    localStorage.setItem('app_active_global_theme', themeToSet);
    if (studentId) {
      localStorage.setItem('student-equipped-theme-' + studentId, themeToSet);
    }

    window.dispatchEvent(new Event('app_icon_changed'));
    window.dispatchEvent(new Event('app_branding_changed'));
    window.dispatchEvent(new Event('app_theme_changed'));
  } catch (e) {
    console.error('Error setting professor branding:', e);
  }
}
