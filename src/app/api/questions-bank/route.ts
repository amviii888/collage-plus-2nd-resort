import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  verifyFirebaseRequestAuth,
  isAuthorizedAdminUser,
  isAuthorizedTeacherUser,
} from '@/lib/server-security';

export async function GET(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacherId parameter' }, { status: 400 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ data: [] });
    }
    const db = admin.db();

    const snapshot = await db.collection('questionBanks')
      .where('teacherId', '==', teacherId)
      .get();

    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? {
          seconds: data.createdAt.seconds || 0,
          nanoseconds: data.createdAt.nanoseconds || 0,
        } : null,
        updatedAt: data.updatedAt ? {
          seconds: data.updatedAt.seconds || 0,
          nanoseconds: data.updatedAt.nanoseconds || 0,
        } : null,
      };
    });

    return NextResponse.json({ data: items });
  } catch (error: any) {
    console.error('Error fetching question banks via admin SDK:', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const isTeacher = await isAuthorizedTeacherUser(user);
    if (!isTeacher) {
      return NextResponse.json({ error: 'Only teachers and admins can create question banks.' }, { status: 403 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const db = admin.db();

    const body = await req.json();
    const { title, description, grade, fileUrl, teacherId } = body;

    if (!title || !grade || !fileUrl || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isAdmin = await isAuthorizedAdminUser(user);
    if (!isAdmin && teacherId !== user.uid) {
      return NextResponse.json({ error: 'You can only manage your own question banks.' }, { status: 403 });
    }

    const payload = {
      title: String(title).trim(),
      description: String(description || '').trim(),
      grade: String(grade),
      fileUrl: String(fileUrl),
      teacherId: String(teacherId),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('questionBanks').add(payload);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error('Error creating question bank via admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const isTeacher = await isAuthorizedTeacherUser(user);
    if (!isTeacher) {
      return NextResponse.json({ error: 'Only teachers and admins can update question banks.' }, { status: 403 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const db = admin.db();

    const body = await req.json();
    const { id, title, description, grade, fileUrl, teacherId } = body;

    if (!id || !title || !grade || !fileUrl || !teacherId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingDoc = await db.collection('questionBanks').doc(String(id)).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: 'Question bank not found.' }, { status: 404 });
    }

    const isAdmin = await isAuthorizedAdminUser(user);
    const existingOwner = existingDoc.data()?.teacherId;
    if (!isAdmin && existingOwner !== user.uid) {
      return NextResponse.json({ error: 'You can only update your own question banks.' }, { status: 403 });
    }

    const payload = {
      title: String(title).trim(),
      description: String(description || '').trim(),
      grade: String(grade),
      fileUrl: String(fileUrl),
      teacherId: isAdmin ? String(teacherId) : user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('questionBanks').doc(String(id)).update(payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating question bank via admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyFirebaseRequestAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const isTeacher = await isAuthorizedTeacherUser(user);
    if (!isTeacher) {
      return NextResponse.json({ error: 'Only teachers and admins can delete question banks.' }, { status: 403 });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const db = admin.db();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    const existingDoc = await db.collection('questionBanks').doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: 'Question bank not found.' }, { status: 404 });
    }

    const isAdmin = await isAuthorizedAdminUser(user);
    if (!isAdmin && existingDoc.data()?.teacherId !== user.uid) {
      return NextResponse.json({ error: 'You can only delete your own question banks.' }, { status: 403 });
    }

    await db.collection('questionBanks').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting question bank via admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
