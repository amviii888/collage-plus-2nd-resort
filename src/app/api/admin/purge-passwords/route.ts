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

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK credentials are not configured on the server.' },
        { status: 500 }
      );
    }

    const db = adminApp.db();
    let studentsCleaned = 0;
    let teachersCleaned = 0;
    let credentialsDocsDeleted = 0;

    // 1. Strip plaintext password fields from all students documents
    const studentSnaps = await db.collection('students').get();
    for (const docSnap of studentSnaps.docs) {
      const data = docSnap.data();
      if ('password' in data || 'passcode' in data || 'initialPassword' in data) {
        await docSnap.ref.update({
          password: FieldValue.delete(),
          passcode: FieldValue.delete(),
          initialPassword: FieldValue.delete(),
        });
        studentsCleaned++;
      }
    }

    // 2. Strip plaintext password fields from all teachers documents and legacy private/credentials docs
    const teacherSnaps = await db.collection('teachers').get();
    for (const docSnap of teacherSnaps.docs) {
      const data = docSnap.data();
      if ('password' in data || 'passcode' in data || 'initialPassword' in data) {
        await docSnap.ref.update({
          password: FieldValue.delete(),
          passcode: FieldValue.delete(),
          initialPassword: FieldValue.delete(),
        });
        teachersCleaned++;
      }

      const credsRef = docSnap.ref.collection('private').doc('credentials');
      const credsSnap = await credsRef.get();
      if (credsSnap.exists) {
        await credsRef.delete();
        credentialsDocsDeleted++;
      }
    }

    return NextResponse.json({
      success: true,
      studentsCleaned,
      teachersCleaned,
      credentialsDocsDeleted,
    });
  } catch (error: any) {
    console.error('Legacy password purge error:', error);
    return NextResponse.json({ error: error?.message || 'Purge failed.' }, { status: 500 });
  }
}
