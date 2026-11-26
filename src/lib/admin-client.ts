import type { Auth } from 'firebase/auth';

// Module-memory-only S-Admin bearer token (never stored in localStorage/sessionStorage)
let inMemoryAdminToken: string | null = null;

export function setInMemoryAdminToken(token: string | null) {
  inMemoryAdminToken = token;
}

export function getInMemoryAdminToken(): string | null {
  return inMemoryAdminToken;
}

export function clearInMemoryAdminToken() {
  inMemoryAdminToken = null;
}

export async function getFirebaseIdToken(auth?: Auth | null): Promise<string | null> {
  try {
    const user = auth?.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function buildAuthHeaders(
  auth?: Auth | null,
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'Mol5satyClient',
    ...extra,
  };
  const idToken = await getFirebaseIdToken(auth);
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  if (inMemoryAdminToken) {
    headers['X-Admin-Token'] = inMemoryAdminToken;
  }
  return headers;
}

export interface SessionRoleResult {
  authenticated: boolean;
  uid: string | null;
  isAdmin: boolean;
  isLibrarian: boolean;
  hasAdminSession: boolean;
  needsPasskeySetup: boolean;
}

export async function fetchSessionRole(auth?: Auth | null): Promise<SessionRoleResult> {
  const fallback: SessionRoleResult = {
    authenticated: false,
    uid: null,
    isAdmin: false,
    isLibrarian: false,
    hasAdminSession: false,
    needsPasskeySetup: false,
  };
  try {
    const headers = await buildAuthHeaders(auth);
    const res = await fetch('/api/auth/session-role', {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export interface HiddenStaffIdentifiers {
  emails: string[];
  uids: string[];
}

let cachedHiddenStaff: HiddenStaffIdentifiers = { emails: [], uids: [] };

export function setHiddenStaffIdentifiers(staff?: Partial<HiddenStaffIdentifiers> | null) {
  if (!staff) return;
  cachedHiddenStaff = {
    emails: Array.isArray(staff.emails)
      ? staff.emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : [],
    uids: Array.isArray(staff.uids)
      ? staff.uids.map((u) => String(u).trim()).filter(Boolean)
      : [],
  };
}

export function getHiddenStaffIdentifiersClient(): HiddenStaffIdentifiers {
  return cachedHiddenStaff;
}

export function isSpecialStaffRecord(
  record?: { id?: string; uid?: string; email?: string; role?: string } | null,
  overrideHidden?: Partial<HiddenStaffIdentifiers> | null
): boolean {
  if (!record) return false;
  const role = typeof record.role === 'string' ? record.role.trim().toLowerCase() : '';
  if (role === 'admin' || role === 's admin' || role === 'super admin' || role === 'librarian') {
    return true;
  }

  const emails = new Set<string>([
    ...cachedHiddenStaff.emails,
    ...(overrideHidden?.emails || []).map((e) => String(e).trim().toLowerCase()),
  ]);
  const uids = new Set<string>([
    ...cachedHiddenStaff.uids,
    ...(overrideHidden?.uids || []).map((u) => String(u).trim()),
  ]);

  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const uid = typeof record.uid === 'string' ? record.uid.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';

  if ((id && uids.has(id)) || (uid && uids.has(uid))) {
    return true;
  }
  if (email && emails.has(email)) {
    return true;
  }
  return false;
}

export async function verifyAdminSessionClient(): Promise<{ id: string; name: string; role: string; hiddenStaff?: HiddenStaffIdentifiers } | null> {
  try {
    const headers: Record<string, string> = { 'X-Requested-With': 'Mol5satyClient' };
    if (inMemoryAdminToken) {
      headers['X-Admin-Token'] = inMemoryAdminToken;
    }
    const res = await fetch('/api/admin/verify-passkey', {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if ((data.authenticated || data.authorized) && data.session?.role === 'S Admin') {
      if (data.hiddenStaff) {
        setHiddenStaffIdentifiers(data.hiddenStaff);
      }
      return {
        id: data.session.uid || data.session.id || 'admin',
        name: 'Super Admin',
        role: data.session.role,
        hiddenStaff: data.hiddenStaff,
      };
    }
    return null;
  } catch {
    return null;
  }
}
