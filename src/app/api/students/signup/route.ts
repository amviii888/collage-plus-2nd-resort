import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

// Simple in-memory rate limiting map for registration attempts (IP -> timestamp/count)
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

async function generateUniqueBarcodeOnServer(db: any): Promise<string> {
  let barcode = '';
  let isUnique = false;

  while (!isUnique) {
    // Generate a random 5-digit numeric string
    barcode = Math.floor(10000 + Math.random() * 90000).toString();
    const snapshot = await db.collection('students').where('barcodeId', '==', barcode).limit(1).get();
    if (snapshot.empty) {
      isUnique = true;
    }
  }
  return barcode;
}

export async function POST(req: NextRequest) {
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
    
    // IP Cooldown and Registration Throttling
    const now = Date.now();
    const limit = rateLimitMap.get(ip);
    if (limit) {
      if (now - limit.lastRequest > 10 * 60 * 1000) {
        rateLimitMap.set(ip, { count: 1, lastRequest: now });
      } else if (limit.count >= 3) {
        return NextResponse.json(
          { error: 'Too many registration requests from this IP. Please try again in 10 minutes.' },
          { status: 429 }
        );
      } else {
        rateLimitMap.set(ip, { count: limit.count + 1, lastRequest: now });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, lastRequest: now });
    }

    // Client/User-Agent Validation
    const userAgent = reqHeaders.get('user-agent') || '';
    if (!userAgent || userAgent.includes('curl') || userAgent.includes('python-requests') || userAgent.includes('postman')) {
      return NextResponse.json(
        { error: 'Access denied. Suspicious client agent.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Honeypot validation
    const { website } = body;
    if (website) {
      // Simulate success for automated bots to prevent further brute-forcing
      return NextResponse.json({
        success: true,
        student: {
          id: 'sim_bot_' + Math.random().toString(36).substring(2, 9),
          barcodeId: '99999',
          name: 'Verified User',
          age: 18,
          phoneNumber: '0100000000',
          parentPhoneNumber: '0100000000',
          schoolName: 'Bot School',
          grade: 'Grade 10',
        }
      });
    }

    const {
      name,
      age,
      phoneNumber,
      parentPhoneNumber,
      schoolName,
      grade,
      password,
    } = body;
    let { barcodeId } = body;

    if (!name || !age || !phoneNumber || !parentPhoneNumber || !schoolName || !password) {
      return NextResponse.json(
        { error: 'Missing required signup fields.' },
        { status: 400 }
      );
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK is not initialized. Please configure environment variables.' },
        { status: 500 }
      );
    }

    const auth = adminApp.auth();
    const db = adminApp.db();

    // Check if barcodeId is provided (from offline signup) and unique, otherwise generate one.
    if (barcodeId) {
      const existingQuery = await db.collection('students').where('barcodeId', '==', barcodeId).limit(1).get();
      if (!existingQuery.empty) {
        // Barcode is already taken. Let's generate a unique one.
        barcodeId = await generateUniqueBarcodeOnServer(db);
      }
    } else {
      barcodeId = await generateUniqueBarcodeOnServer(db);
    }

    const email = `${barcodeId}@universe.student`;

    // Check if user already exists with this email (or barcodeId)
    try {
      const existingUser = await auth.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this student ID already exists.', barcodeId },
          { status: 409 }
        );
      }
    } catch (e: any) {
      // User does not exist, safe to proceed
    }

    // Create the user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    const studentId = userRecord.uid;

    // Create the student profile document in Firestore
    const studentRef = db.collection('students').doc(studentId);
    const studentData = {
      id: studentId,
      barcodeId,
      name,
      age: Number(age),
      phoneNumber,
      parentPhoneNumber,
      schoolName,
      grade: grade || 'Not specified',
      activeSubscriptions: [],
      xp: 0,
      streak: 1,
      equippedAvatar: '👦',
      createdAt: new Date().toISOString(),
    };

    await studentRef.set(studentData);

    return NextResponse.json({
      success: true,
      student: {
        id: studentId,
        barcodeId,
        name,
        age: Number(age),
        phoneNumber,
        parentPhoneNumber,
        schoolName,
        grade,
      }
    });

  } catch (error: any) {
    console.error('Error during secure student registration/sync:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
