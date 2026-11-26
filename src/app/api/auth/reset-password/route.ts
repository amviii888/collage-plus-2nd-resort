import { NextResponse, NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { verifyHmacToken } from '@/lib/server-security';

const completeRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function allowComplete(ip: string): boolean {
  const now = Date.now();
  const entry = completeRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    completeRateLimitMap.set(ip, { count: 1, windowStart: now });
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

    if (!allowComplete(ip)) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const resetToken = typeof body.resetToken === 'string' ? body.resetToken.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const website = typeof body.website === 'string' ? body.website.trim() : '';

    // Honeypot check
    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: 'Verified reset token and new password are required.' }, { status: 400 });
    }

    if (
      newPassword.length < 6 ||
      newPassword.length > 128 ||
      /^(.)\1+$/.test(newPassword) ||
      newPassword === '123456' ||
      newPassword === '12345678' ||
      newPassword.toLowerCase() === 'password'
    ) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters and cannot be a simple sequence.' },
        { status: 400 }
      );
    }

    const tokenPayload = verifyHmacToken<{
      scope: string;
      challengeId: string;
      studentDocId: string;
      studentCode: string;
    }>(resetToken);

    if (!tokenPayload || tokenPayload.scope !== 'password_reset' || !tokenPayload.challengeId) {
      return NextResponse.json(
        { error: 'Reset session expired or invalid. Please verify your WhatsApp number again.' },
        { status: 401 }
      );
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Password reset service is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const auth = adminApp.auth();
    const db = adminApp.db();
    const challengeRef = db.collection('password_reset_challenges').doc(tokenPayload.challengeId);

    // Atomically verify and consume single-use challenge
    let verificationCodeToClean = '';
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(challengeRef);
        if (!snap.exists) {
          throw new Error('CHALLENGE_NOT_FOUND');
        }
        const data = snap.data()!;
        if (data.used === true) {
          throw new Error('CHALLENGE_ALREADY_USED');
        }
        if (data.phoneVerified !== true) {
          throw new Error('PHONE_NOT_VERIFIED');
        }
        if (
          typeof data.verifiedSenderPhone !== 'string' ||
          typeof data.expectedPhoneNormalized !== 'string' ||
          data.expectedPhoneNormalized.length < 8 ||
          data.verifiedSenderPhone !== data.expectedPhoneNormalized
        ) {
          throw new Error('PHONE_MISMATCH');
        }
        if (typeof data.expiresAt === 'number' && Date.now() > data.expiresAt + 5 * 60 * 1000) {
          throw new Error('CHALLENGE_EXPIRED');
        }
        if (data.studentDocId !== tokenPayload.studentDocId) {
          throw new Error('CHALLENGE_MISMATCH');
        }
        verificationCodeToClean = String(data.verificationCode || '');
        tx.update(challengeRef, {
          used: true,
          completedAt: new Date().toISOString(),
        });
      });
    } catch (txErr: any) {
      const code = txErr?.message || '';
      if (code === 'CHALLENGE_ALREADY_USED') {
        return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 410 });
      }
      if (code === 'PHONE_NOT_VERIFIED') {
        return NextResponse.json({ error: 'WhatsApp phone verification has not been completed.' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Reset session expired or invalid. Please start again.' }, { status: 401 });
    }

    // Clean up consumed WhatsApp verification doc
    if (verificationCodeToClean) {
      await db.collection('phone_verifications').doc(verificationCodeToClean).delete().catch(() => {});
    }

    const studentRef = db.collection('students').doc(tokenPayload.studentDocId);
    const studentSnap = await studentRef.get();
    const studentData = studentSnap.exists ? studentSnap.data() : null;
    const studentCode = (studentData?.barcodeId || tokenPayload.studentCode || '').trim();

    // Update Firebase Auth ONLY (never store plaintext password in Firestore!)
    let authUpdated = false;
    const candidateEmails = new Set<string>();
    if (studentCode) {
      candidateEmails.add(`${studentCode}@mol5saty.student`);
      candidateEmails.add(`${studentCode.toLowerCase()}@mol5saty.student`);
      candidateEmails.add(`${studentCode}@universe.student`);
      candidateEmails.add(`${studentCode.toLowerCase()}@universe.student`);
    }
    if (typeof studentData?.email === 'string' && studentData.email.includes('@')) {
      candidateEmails.add(studentData.email.trim().toLowerCase());
    }

    // 1. Try updating directly by studentDocId (which is usually the Firebase Auth UID)
    try {
      await auth.updateUser(tokenPayload.studentDocId, { password: newPassword });
      authUpdated = true;
    } catch {
      // Fall through to email lookup
    }

    // 2. Also sync any matching email accounts
    for (const email of candidateEmails) {
      try {
        const userRecord = await auth.getUserByEmail(email);
        if (userRecord) {
          await auth.updateUser(userRecord.uid, { password: newPassword });
          authUpdated = true;
        }
      } catch {
        // Not found under this email alias
      }
    }

    if (!authUpdated && studentCode) {
      // Create auth user if this was a legacy student who only existed in Firestore
      try {
        await auth.createUser({
          uid: tokenPayload.studentDocId,
          email: `${studentCode.toLowerCase()}@mol5saty.student`,
          password: newPassword,
          displayName: studentData?.name || studentCode,
        });
        authUpdated = true;
      } catch (createErr) {
        console.error('Could not create fallback Firebase Auth user during reset:', createErr);
      }
    }

    // Remove any legacy plaintext password fields from Firestore student doc
    if (studentSnap.exists) {
      await studentRef.update({
        password: FieldValue.delete(),
        passcode: FieldValue.delete(),
        initialPassword: FieldValue.delete(),
        passwordResetAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!authUpdated) {
      return NextResponse.json(
        { error: 'Unable to update authentication credentials. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset completion error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
