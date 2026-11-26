import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { normalizePhoneNumber, signHmacToken } from '@/lib/server-security';

const checkRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_CHECKS = 60;

function allowCheck(ip: string): boolean {
  const now = Date.now();
  const entry = checkRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    checkRateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_CHECKS) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!allowCheck(ip)) {
      return NextResponse.json({ error: 'Too many verification checks. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';

    if (!challengeId || challengeId.length > 100) {
      return NextResponse.json({ error: 'Invalid verification session.' }, { status: 400 });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json({ error: 'Verification service unavailable.' }, { status: 503 });
    }

    const db = adminApp.db();
    const challengeRef = db.collection('password_reset_challenges').doc(challengeId);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      return NextResponse.json({ status: 'expired', error: 'Reset session not found or expired.' }, { status: 404 });
    }

    const challenge = challengeSnap.data()!;
    if (challenge.used) {
      return NextResponse.json({ status: 'used', error: 'This reset session has already been used.' }, { status: 410 });
    }

    if (typeof challenge.expiresAt === 'number' && Date.now() > challenge.expiresAt) {
      return NextResponse.json({ status: 'expired', error: 'Verification code expired. Please request a new code.' }, { status: 410 });
    }

    // Check WhatsApp bot record at phone_verifications/{verificationCode}
    const verifRef = db.collection('phone_verifications').doc(String(challenge.verificationCode));
    const verifSnap = await verifRef.get();

    if (!verifSnap.exists) {
      return NextResponse.json({ status: 'pending' });
    }

    const verifData = verifSnap.data()!;
    if (verifData.verified !== true) {
      return NextResponse.json({ status: 'pending' });
    }

    // Extract the actual WhatsApp sender number recorded by the bot
    const rawSenderPhone =
      verifData.phoneNumber ||
      verifData.senderPhone ||
      verifData.from ||
      verifData.phone ||
      '';

    const senderNormalized = normalizePhoneNumber(String(rawSenderPhone));
    const expectedNormalized = String(challenge.expectedPhoneNormalized || '');

    if (!senderNormalized || senderNormalized !== expectedNormalized) {
      // Security critical: reject mismatched phone & invalidate the verification record so it cannot be reused
      await verifRef.delete().catch(() => {});
      await challengeRef.update({
        lastMismatchAt: new Date().toISOString(),
        attempts: (challenge.attempts || 0) + 1,
      }).catch(() => {});

      return NextResponse.json(
        {
          status: 'phone_mismatch',
          error:
            'The WhatsApp message was sent from a different phone number than the one registered to this account. Please send the code from your exact registered WhatsApp number.',
        },
        { status: 403 }
      );
    }

    // Exact registered phone number match confirmed!
    await challengeRef.update({
      phoneVerified: true,
      verifiedAt: new Date().toISOString(),
    });

    const resetToken = signHmacToken(
      {
        scope: 'password_reset',
        challengeId,
        studentDocId: challenge.studentDocId,
        studentCode: challenge.studentCode,
      },
      300 // 5 minutes to submit new password
    );

    return NextResponse.json({
      status: 'verified',
      resetToken,
    });
  } catch (error) {
    console.error('Check verification error:', error);
    return NextResponse.json({ error: 'Unable to check verification status.' }, { status: 500 });
  }
}
