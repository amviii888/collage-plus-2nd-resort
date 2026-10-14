/**
 * Mol5saty Unified Authentication & Role Helpers
 */

export const isStudentEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean.endsWith('@mol5saty.student') || clean.endsWith('@mola5saty.student') || clean.endsWith('@universe.student');
};

export const getStudentBarcodeFromEmail = (email?: string | null): string => {
  if (!email) return '';
  const clean = email.toLowerCase().trim();
  if (clean.endsWith('@mol5saty.student') || clean.endsWith('@mola5saty.student') || clean.endsWith('@universe.student')) {
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

export const recordDeviceLogoutLockout = (_studentCode?: string) => {
  // Disabled
};

export const isDeviceLockedOutForStudent = (_studentCode?: string): boolean => {
  return false;
};

export const unlockDeviceForStudent = (_studentCode?: string) => {
  // Disabled
};

/**
 * Completely purges all student session keys, cached student profiles,
 * and teacher code branding from local storage.
 */
export const clearAllStudentAuthSessions = (studentCodeForLockout?: string, markDeviceLockout = false) => {
  if (typeof window === 'undefined') return;
  try {
    const activeCode = studentCodeForLockout || 
                       localStorage.getItem('studentBarcode') || 
                       localStorage.getItem('studentCode') || 
                       localStorage.getItem('viewingStudentId');

    if (markDeviceLockout) {
      recordDeviceLogoutLockout(activeCode || undefined);
    }

    const studentKeys = [
      'viewingStudentId',
      'active_connected_professor_code',
      'studentBarcode',
      'studentBarcodeId',
      'studentCode',
      'student_barcode',
      'student_name',
      'studentName',
      'student_phone',
      'studentPhoneNumber',
      'student_profile',
      'student_user_profile',
      'offline_student_id',
      'app_student_auth_session',
      'student_logged_in',
      'mol5saty_active_student_profile',
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
    // Also clear any firebase auth cached keys in localStorage if present
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firebase:authUser') || key.startsWith('firebase:host'))) {
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

/**
 * Executes a complete, reliable sign-out from Firebase Auth and purges local storage.
 * Works across both web and mobile environments.
 */
export async function performFullLogout(authInstance?: any, studentCodeForLockout?: string) {
  try {
    if (authInstance) {
      const { signOut } = await import('firebase/auth');
      await signOut(authInstance);
    } else {
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth();
      if (auth && auth.currentUser) {
        await signOut(auth);
      }
    }
  } catch (err) {
    console.warn('[Auth] Primary signOut notice:', err);
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const fallbackAuth = getAuth();
      if (fallbackAuth && fallbackAuth.currentUser) {
        await signOut(fallbackAuth);
      }
    } catch (fallbackErr) {
      console.warn('[Auth] Fallback signOut notice:', fallbackErr);
    }
  }

  // Purge all student/session keys
  clearAllStudentAuthSessions(studentCodeForLockout);
}
