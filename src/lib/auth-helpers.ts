/**
 * Mola5saty Unified Authentication & Role Helpers
 */

export const isStudentEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean.endsWith('@mola5saty.student') || clean.endsWith('@universe.student');
};

export const getStudentBarcodeFromEmail = (email?: string | null): string => {
  if (!email) return '';
  const clean = email.toLowerCase().trim();
  if (clean.endsWith('@mola5saty.student') || clean.endsWith('@universe.student')) {
    return clean.split('@')[0];
  }
  return '';
};

export const isStudentSessionOrUser = (user?: any, studentSessionId?: string | null): boolean => {
  // Real authenticated teacher account always takes precedence and is NEVER a student
  if (user && !user.isAnonymous && user.email && !isStudentEmail(user.email)) {
    return false;
  }
  if (studentSessionId) return true;
  if (!user) return false;
  if (user.isAnonymous) return true;
  if (isStudentEmail(user.email)) return true;
  return false;
};

/**
 * Completely purges all student session keys, cached student profiles,
 * and teacher code branding from local storage.
 */
export const clearAllStudentAuthSessions = () => {
  if (typeof window === 'undefined') return;
  try {
    const studentKeys = [
      'viewingStudentId',
      'active_connected_professor_code',
      'studentBarcode',
      'studentBarcodeId',
      'studentCode',
      'student_barcode',
      'offline_student_id',
      'app_student_auth_session',
      'student_logged_in',
      'mola5saty_active_student_profile',
      'parentForStudentBarcode',
      'parentPhoneNumber',
      'assistantForTeacherId',
      'assistantTeacherName',
      'admin-session'
    ];

    studentKeys.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    // Clean up any dynamic cached student profiles
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('cached_student_profile_') || 
        key.startsWith('student_profile_offline_') ||
        key.startsWith('student_custom_avatar_') ||
        key.startsWith('student_avatar_')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    try {
      sessionStorage.clear();
    } catch (e) {}

    // Dispatch system events to immediately re-render branding and auth state
    window.dispatchEvent(new Event('app_branding_changed'));
    window.dispatchEvent(new Event('connected_professors_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to clear student sessions:', err);
  }
};

