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
  if (studentSessionId) return true;
  if (!user) return false;
  if (user.isAnonymous) return true;
  if (isStudentEmail(user.email)) return true;
  return false;
};
