import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { verifyAdminSessionRequest, verifyMutationOrigin } from '@/lib/server-security';

export async function POST(req: NextRequest) {
  try {
    if (!verifyMutationOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }

    const adminSession = verifyAdminSessionRequest(req);
    if (!adminSession) {
      return NextResponse.json({ error: 'Verified S-Admin session required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';

    if (!teacherId || !/^[a-zA-Z0-9_-]{2,128}$/.test(teacherId)) {
      return NextResponse.json({ error: 'Valid teacherId is required.' }, { status: 400 });
    }

    if (newPassword.length < 6 || newPassword.length > 128 || /^(.)\1+$/.test(newPassword) || newPassword === '123456') {
      return NextResponse.json({ error: 'Password must be at least 6 characters and not a simple sequence.' }, { status: 400 });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Server Firebase Admin credentials are required to reset passwords.' },
        { status: 500 }
      );
    }

    const auth = adminApp.auth();
    const db = adminApp.db();

    // Update password strictly in Firebase Authentication
    await auth.updateUser(teacherId, { password: newPassword });

    // Strip any legacy plaintext password fields from Firestore
    const teacherRef = db.collection('teachers').doc(teacherId);
    await teacherRef.set(
      {
        password: FieldValue.delete(),
        initialPassword: FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const legacyCredsRef = teacherRef.collection('private').doc('credentials');
    await legacyCredsRef.delete().catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin reset teacher password error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update teacher password.' },
      { status: 500 }
    );
  }
}
