import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const db = admin.db();

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacherId parameter' }, { status: 400 });
    }

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
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const payload = {
      title: title.trim(),
      description: (description || '').trim(),
      grade,
      fileUrl,
      teacherId,
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

    const payload = {
      title: title.trim(),
      description: (description || '').trim(),
      grade,
      fileUrl,
      teacherId,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('questionBanks').doc(id).update(payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating question bank via admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
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

    await db.collection('questionBanks').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting question bank via admin SDK:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
