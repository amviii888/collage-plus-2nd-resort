import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { studentCode, phoneNumber, website } = body;

        // Bot honeypot check
        if (website) {
            return NextResponse.json({ success: true, verified: true });
        }

        if (!studentCode || !studentCode.trim()) {
            return NextResponse.json({ error: 'Please enter your Student Code.' }, { status: 400 });
        }

        if (!phoneNumber || !phoneNumber.trim()) {
            return NextResponse.json({ error: 'Please enter your registered student phone number.' }, { status: 400 });
        }

        const adminApp = getFirebaseAdmin();
        if (!adminApp) {
            // If admin SDK is not configured, we allow client-side Firestore query fallback
            return NextResponse.json({ fallbackToClient: true });
        }

        const db = adminApp.db();
        const studentQuery = await db.collection('students').where('barcodeId', '==', studentCode.trim()).limit(1).get();

        if (studentQuery.empty) {
            return NextResponse.json({ error: 'The Student Code or phone number you entered does not match our records.' }, { status: 400 });
        }

        const studentData = studentQuery.docs[0].data();

        const incomingPhone = (phoneNumber || '').trim();
        const recordPhone = (studentData.phoneNumber || '').trim();

        // Check if student phone matches
        if (recordPhone !== incomingPhone) {
            return NextResponse.json({ error: 'The Student Code or phone number you entered does not match our records.' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            verified: true,
            studentId: studentQuery.docs[0].id,
            studentName: studentData.name || '',
            phoneNumber: recordPhone,
            currentPassword: studentData.password || recordPhone
        });

    } catch (error: any) {
        console.error('Verify reset info error:', error);
        return NextResponse.json({ error: 'Failed to verify identity. Please try again later.' }, { status: 500 });
    }
}
