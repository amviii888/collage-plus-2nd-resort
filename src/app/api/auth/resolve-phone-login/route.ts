import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { normalizePhoneNumber } from '@/lib/server-security';

const phoneLookupRateLimit = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 15;

function allowLookup(ip: string): boolean {
  const now = Date.now();
  const entry = phoneLookupRateLimit.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    phoneLookupRateLimit.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

/**
 * Resolves a phone number to a student/user login email on the server
 * so client code never needs unauthenticated read access to `students` or `users`.
 * Never returns passwords or other personal information.
 */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!allowLookup(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawIdentifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';

    if (!rawIdentifier || rawIdentifier.length < 6 || rawIdentifier.length > 32) {
      return NextResponse.json({ found: false });
    }

    const normalized = normalizePhoneNumber(rawIdentifier);
    const localVariant =
      normalized.startsWith('20') && normalized.length === 12
        ? '0' + normalized.slice(2)
        : rawIdentifier;

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json({ found: false });
    }

    const db = adminApp.db();
    const candidates = Array.from(new Set([rawIdentifier, localVariant, normalized, `+${normalized}`].filter(Boolean)));

    for (const candidate of candidates) {
      const studentSnap = await db
        .collection('students')
        .where('phoneNumber', '==', candidate)
        .limit(1)
        .get();

      if (!studentSnap.empty) {
        const data = studentSnap.docs[0].data();
        const barcode = (data.barcodeId || '').trim();
        const email = data.email || (barcode ? `${barcode.toLowerCase()}@mol5saty.student` : '');
        if (email) {
          return NextResponse.json({
            found: true,
            loginEmail: email,
            altLoginEmail: barcode ? `${barcode.toLowerCase()}@universe.student` : undefined,
          });
        }
      }
    }

    for (const candidate of candidates) {
      const userSnap = await db
        .collection('users')
        .where('phoneNumber', '==', candidate)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const data = userSnap.docs[0].data();
        if (typeof data.email === 'string' && data.email.includes('@')) {
          return NextResponse.json({
            found: true,
            loginEmail: data.email.trim().toLowerCase(),
          });
        }
      }
    }

    return NextResponse.json({ found: false });
  } catch (error) {
    console.error('Resolve phone login error:', error);
    return NextResponse.json({ found: false });
  }
}
