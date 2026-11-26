import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Ephemeral in-memory signing secret fallback (never persisted to disk)
const EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');

// Ephemeral in-memory first-run S-Admin passkey hash fallback (when DB/env unavailable in preview)
let memoryClaimedPasskeyHash: string | null = null;

export const ADMIN_COOKIE_NAME = 'mol5saty_admin_token';

function getSigningSecret(): string {
  const configured = process.env.SESSION_SIGNING_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SIGNING_SECRET;
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Compare against dummy buffer to minimize timing delta
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function hashPasskeyScrypt(passkey: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passkey, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasskeyScrypt(passkey: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derivedHex = crypto.scryptSync(passkey, salt, 64).toString('hex');
  return timingSafeStringEqual(derivedHex, expectedHex);
}

export function signHmacToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyHmacToken<T = Record<string, unknown>>(token: string | null | undefined): (T & { exp: number }) | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', getSigningSecret()).update(body).digest('base64url');
  if (!timingSafeStringEqual(sig, expectedSig)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded.exp !== 'number') return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded as T & { exp: number };
  } catch {
    return null;
  }
}

/**
 * Normalizes Egyptian and international phone numbers to a canonical digit form
 * so formatting differences (+20 vs 0020 vs 0 vs spaces/dashes) compare accurately.
 */
export function normalizePhoneNumber(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  // Strip WhatsApp JID domains (@s.whatsapp.net, @c.us, @lid) and multi-device suffixes (:14)
  const stripped = raw.split('@')[0].split(':')[0];
  let digits = stripped.replace(/\D/g, '');
  if (!digits) return '';

  // Strip leading 00 international prefix
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Normalize Egyptian numbers: 20010... -> 2010..., 010... -> 2010...
  if (digits.startsWith('200') && digits.length === 13) {
    digits = '20' + digits.slice(3);
  } else if (digits.startsWith('01') && digits.length === 11) {
    digits = '20' + digits.slice(1);
  } else if (digits.startsWith('1') && digits.length === 10) {
    digits = '20' + digits;
  }
  return digits;
}

/**
 * Returns a privacy-safe masked phone hint (e.g., "010****424") so attackers
 * cannot harvest phone numbers by probing student codes.
 */
export function maskPhoneNumber(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '••••••••••';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6) return '••••••';
  const local = digits.startsWith('20') && digits.length === 12 ? '0' + digits.slice(2) : digits;
  const prefix = local.slice(0, 3);
  const suffix = local.slice(-3);
  return `${prefix}****${suffix}`;
}

export function getConfiguredAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredLibrarianEmails(): string[] {
  const raw = process.env.LIBRARIAN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredSAdminPasskeys(): string[] {
  const raw = process.env.S_ADMIN_PASSKEYS || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

function getTokenVerifierAuth() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    (firebaseAppletConfig as any)?.projectId ||
    'collageplus-87d4b';
  const tokenAppName = 'token-verifier';
  const existing = getApps().find((a) => a.name === tokenAppName);
  const app = existing || initializeApp({ projectId }, tokenAppName);
  return getAuth(app);
}

/**
 * Verifies a Firebase ID token from `Authorization: Bearer <token>`.
 * Works on any Firebase project (ID token verification requires no IAM credentials).
 */
export async function verifyFirebaseRequestAuth(req: NextRequest): Promise<VerifiedFirebaseUser | null> {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 4096) return null;

  try {
    const adminInstance = getFirebaseAdmin();
    let decoded;
    if (adminInstance) {
      try {
        decoded = await adminInstance.auth().verifyIdToken(idToken);
      } catch {
        decoded = await getTokenVerifierAuth().verifyIdToken(idToken);
      }
    } else {
      decoded = await getTokenVerifierAuth().verifyIdToken(idToken);
    }

    return {
      uid: decoded.uid,
      email: (decoded.email || '').toLowerCase().trim(),
      emailVerified: Boolean(decoded.email_verified),
    };
  } catch {
    return null;
  }
}

export async function ensureFirestoreAdminRole(user: VerifiedFirebaseUser): Promise<void> {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    await adminApp.db().collection('admins').doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email,
        role: 'S Admin',
        active: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Non-blocking sync when Admin SDK or Firestore is unavailable
  }
}

export async function ensureFirestoreLibrarianRole(user: VerifiedFirebaseUser): Promise<void> {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    await adminApp.db().collection('users').doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email,
        role: 'librarian',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Non-blocking sync when Admin SDK or Firestore is unavailable
  }
}

export async function isAuthorizedAdminUser(user: VerifiedFirebaseUser | null): Promise<boolean> {
  if (!user) return false;
  const configuredEmails = getConfiguredAdminEmails();
  if (user.email && configuredEmails.includes(user.email)) {
    await ensureFirestoreAdminRole(user);
    return true;
  }

  // Also check trusted Firestore admins/{uid} collection via Admin SDK
  try {
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const adminDoc = await adminApp.db().collection('admins').doc(user.uid).get();
      if (adminDoc.exists && adminDoc.data()?.active !== false) {
        return true;
      }
    }
  } catch {
    // Fall through if Admin DB is not configured
  }
  return false;
}

export async function isAuthorizedLibrarianUser(user: VerifiedFirebaseUser | null): Promise<boolean> {
  if (!user) return false;
  if (await isAuthorizedAdminUser(user)) return true;

  const configuredEmails = getConfiguredLibrarianEmails();
  if (user.email && configuredEmails.includes(user.email)) {
    await ensureFirestoreLibrarianRole(user);
    return true;
  }

  try {
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const userDoc = await adminApp.db().collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data()?.role === 'librarian') {
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Collects all special staff (Admin + Librarian) emails and UIDs from server env
 * and Firestore role collections so they are never shown as regular teachers.
 */
export async function getHiddenStaffIdentifiers(): Promise<{ emails: string[]; uids: string[] }> {
  const emailSet = new Set<string>([
    ...getConfiguredAdminEmails(),
    ...getConfiguredLibrarianEmails(),
  ]);
  const uidSet = new Set<string>();

  try {
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const db = adminApp.db();
      const [adminsSnap, librariansSnap] = await Promise.all([
        db.collection('admins').get().catch(() => null),
        db.collection('users').where('role', 'in', ['librarian', 'admin', 'S Admin']).get().catch(() => null),
      ]);

      if (adminsSnap) {
        for (const docSnap of adminsSnap.docs) {
          uidSet.add(docSnap.id);
          const email = docSnap.data()?.email;
          if (typeof email === 'string' && email.trim()) {
            emailSet.add(email.trim().toLowerCase());
          }
        }
      }

      if (librariansSnap) {
        for (const docSnap of librariansSnap.docs) {
          uidSet.add(docSnap.id);
          const email = docSnap.data()?.email;
          if (typeof email === 'string' && email.trim()) {
            emailSet.add(email.trim().toLowerCase());
          }
        }
      }
    }
  } catch {
    // Env-configured emails remain active even if Firestore lookup fails
  }

  return {
    emails: Array.from(emailSet),
    uids: Array.from(uidSet),
  };
}

export async function getSAdminPasskeyStatus(): Promise<{
  envConfigured: boolean;
  claimedFallbackExists: boolean;
  needsFirstRunSetup: boolean;
}> {
  const envKeys = getConfiguredSAdminPasskeys();
  if (envKeys.length > 0) {
    return { envConfigured: true, claimedFallbackExists: false, needsFirstRunSetup: false };
  }

  if (memoryClaimedPasskeyHash) {
    return { envConfigured: false, claimedFallbackExists: true, needsFirstRunSetup: false };
  }

  try {
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const docSnap = await adminApp.db().collection('system_security').doc('sadmin_config').get();
      if (docSnap.exists && docSnap.data()?.passkeyHash) {
        return { envConfigured: false, claimedFallbackExists: true, needsFirstRunSetup: false };
      }
    }
  } catch {}

  return { envConfigured: false, claimedFallbackExists: false, needsFirstRunSetup: true };
}

export async function verifySAdminPasskey(candidate: string): Promise<boolean> {
  const clean = (candidate || '').trim();
  if (!clean) return false;

  // Configured env passkeys always override any claimed fallback hash
  const envKeys = getConfiguredSAdminPasskeys();
  if (envKeys.length > 0) {
    return envKeys.some((k) => timingSafeStringEqual(clean, k));
  }

  // Fallback to claimed scrypt hash (preview mode)
  if (memoryClaimedPasskeyHash && verifyPasskeyScrypt(clean, memoryClaimedPasskeyHash)) {
    return true;
  }

  try {
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const docSnap = await adminApp.db().collection('system_security').doc('sadmin_config').get();
      const storedHash = docSnap.exists ? docSnap.data()?.passkeyHash : null;
      if (typeof storedHash === 'string' && verifyPasskeyScrypt(clean, storedHash)) {
        return true;
      }
    }
  } catch {}

  return false;
}

export async function claimFirstRunSAdminPasskey(newPasskey: string, claimedByUid: string): Promise<{ ok: boolean; error?: string }> {
  const clean = (newPasskey || '').trim();
  if (clean.length < 10) {
    return { ok: false, error: 'Admin passkey must be at least 10 characters long.' };
  }

  const status = await getSAdminPasskeyStatus();
  if (!status.needsFirstRunSetup) {
    return { ok: false, error: 'Admin passkey is already configured.' };
  }

  const hash = hashPasskeyScrypt(clean);
  memoryClaimedPasskeyHash = hash;

  try {
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const ref = adminApp.db().collection('system_security').doc('sadmin_config');
      await adminApp.db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.data()?.passkeyHash) {
          throw new Error('ALREADY_CLAIMED');
        }
        tx.set(ref, {
          passkeyHash: hash,
          claimedByUid,
          claimedAt: new Date().toISOString(),
        });
      });
      // Also bootstrap the claiming user as an admin doc if none exist
      await adminApp.db().collection('admins').doc(claimedByUid).set(
        { uid: claimedByUid, role: 'S Admin', active: true, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  } catch (err: any) {
    if (err?.message === 'ALREADY_CLAIMED') {
      return { ok: false, error: 'Admin passkey is already configured.' };
    }
  }

  return { ok: true };
}

export interface AdminSessionPayload {
  uid: string;
  email: string;
  role: 'S Admin';
}

export function createAdminSessionToken(payload: AdminSessionPayload): string {
  return signHmacToken({ ...payload, scope: 's_admin_session' }, 8 * 60 * 60); // 8 hours
}

export function verifyAdminSessionRequest(req: NextRequest): AdminSessionPayload | null {
  // Check custom X-Admin-Token header first, then HttpOnly cookie
  const headerToken = req.headers.get('x-admin-token')?.trim();
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value?.trim();
  const rawToken = headerToken || cookieToken;
  if (!rawToken) return null;

  const decoded = verifyHmacToken<AdminSessionPayload & { scope: string }>(rawToken);
  if (!decoded || decoded.scope !== 's_admin_session') return null;

  return {
    uid: decoded.uid,
    email: decoded.email,
    role: 'S Admin',
  };
}

/**
 * Verifies same-origin or custom header protection on cookie-authenticated mutations.
 */
export function verifyMutationOrigin(req: NextRequest): boolean {
  const customHeader = req.headers.get('x-requested-with');
  if (customHeader === 'Mol5satyClient') return true;

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) return false;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export function getBunnyServerConfig() {
  const libraryId = (process.env.BUNNY_STREAM_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID || '').trim();
  const apiKey = (process.env.BUNNY_STREAM_API_KEY || '').trim();
  const tokenKey = (process.env.BUNNY_STREAM_TOKEN_KEY || '').trim();
  const cdnHostname = (process.env.BUNNY_STREAM_CDN_HOSTNAME || process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || '').trim();
  return { libraryId, apiKey, tokenKey, cdnHostname };
}
