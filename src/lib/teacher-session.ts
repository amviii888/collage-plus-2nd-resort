'use client';

/**
 * Helper utility to get the active teacher ID reliably across Firebase auth states and local storage sessions.
 */
export function getEffectiveTeacherId(user?: any): string | null {
  if (user && !user.isAnonymous && user.uid) {
    return user.uid;
  }
  if (typeof window !== 'undefined') {
    const directId = localStorage.getItem('teacherId');
    if (directId) return directId;

    const sessionStr = localStorage.getItem('teacher_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.teacherId) return session.teacherId;
        if (session.uid) return session.uid;
        if (session.id) return session.id;
      } catch (e) {
        // Continue fallback
      }
    }

    const accountsStr = localStorage.getItem('teacher_accounts');
    if (accountsStr) {
      try {
        const accs = JSON.parse(accountsStr);
        if (Array.isArray(accs) && accs.length > 0 && accs[0].id) {
          return accs[0].id;
        }
      } catch (e) {
        // Continue fallback
      }
    }
  }
  return user?.uid || null;
}
