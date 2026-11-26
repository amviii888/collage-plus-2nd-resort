import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/server-security';

const startRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = startRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    startRateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const ua = req.headers.get('user-agent') || '';
    if (!ua || ua.length < 6) {
      return NextResponse.json({ error: 'Invalid request client.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body.studentCode === 'string' ? body.studentCode.trim() : '';
    const website = typeof body.website === 'string' ? body.website.trim() : '';

    // Honeypot field for bots
    if (website) {
      return NextResponse.json({
        success: true,
        challengeId: crypto.randomBytes(12).toString('hex'),
        verificationCode: String(crypto.randomInt(100000, 999999)),
        maskedPhone: '010****000',
        botPhone: process.env.WHATSAPP_BOT_PHONE || '201201921424',
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });
    }

    if (!rawCode || rawCode.length < 2 || rawCode.length > 64) {
      return NextResponse.json({ error: 'Please enter a valid Student Code.' }, { status: 400 });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Password reset service is temporarily unavailable. Server credentials are not configured.' },
        { status: 503 }
      );
    }

    const db = adminApp.db();
    const upperCode = rawCode.toUpperCase();

    // Look up student by barcodeId (exact or uppercase) or studentCode
    let snap = await db.collection('students').where('barcodeId', '==', rawCode).limit(1).get();
    if (snap.empty && upperCode !== rawCode) {
      snap = await db.collection('students').where('barcodeId', '==', upperCode).limit(1).get();
    }
    if (snap.empty) {
      snap = await db.collection('students').where('studentCode', '==', rawCode).limit(1).get();
    }

    if (snap.empty) {
      return NextResponse.json(
        { error: 'We could not find an account matching that Student Code.' },
        { status: 404 }
      );
    }

    const studentDoc = snap.docs[0];
    const studentData = studentDoc.data();
    const rawPhone = typeof studentData.phoneNumber === 'string' ? studentData.phoneNumber.trim() : '';
    const expectedPhoneNormalized = normalizePhoneNumber(rawPhone);

    if (!expectedPhoneNormalized || expectedPhoneNormalized.length < 8) {
      return NextResponse.json(
        { error: 'This account does not have a registered phone number. Please contact your teacher or support.' },
        { status: 400 }
      );
    }

    const challengeId = crypto.randomBytes(18).toString('hex');
    const verificationCode = String(crypto.randomInt(100000, 999999));
    const expiresAtMs = Date.now() + CHALLENGE_TTL_MS;
    const botPhone = (process.env.WHATSAPP_BOT_PHONE || '201201921424').replace(/\D/g, '');

    await db.collection('password_reset_challenges').doc(challengeId).set({
      challengeId,
      studentDocId: studentDoc.id,
      studentCode: (studentData.barcodeId || rawCode).trim(),
      expectedPhoneNormalized,
      verificationCode,
      phoneVerified: false,
      used: false,
      attempts: 0,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAtMs,
    });

    // Clear any stale verification doc with the same 6-digit code
    await db.collection('phone_verifications').doc(verificationCode).delete().catch(() => {});

    return NextResponse.json({
      success: true,
      challengeId,
      verificationCode,
      maskedPhone: maskPhoneNumber(rawPhone),
      botPhone,
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
  } catch (error) {
    console.error('Reset password start error:', error);
    return NextResponse.json(
      { error: 'Unable to initiate password reset right now. Please try again.' },
      { status: 500 }
    );
  }
}
