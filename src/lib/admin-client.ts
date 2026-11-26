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

export async function verifyAdminSessionClient(): Promise<{ id: string; name: string; role: string } | null> {
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
    if (data.authenticated && data.session?.role === 'S Admin') {
      return {
        id: data.session.uid || 'admin',
        name: 'Super Admin',
        role: data.session.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}
