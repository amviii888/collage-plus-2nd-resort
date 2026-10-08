import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { studentCode, phoneNumber, parentPhoneNumber, website } = body;

        // Bot honeypot check
        if (website) {
            return NextResponse.json({ success: true, verified: true });
        }

        if (!studentCode || !studentCode.trim()) {
            return NextResponse.json({ error: 'Please enter your Student Code.' }, { status: 400 });
        }

        if (!phoneNumber && !parentPhoneNumber) {
            return NextResponse.json({ error: 'Please enter at least one phone number for verification.' }, { status: 400 });
        }

        const adminApp = getFirebaseAdmin();
        if (!adminApp) {
            // If admin SDK is not configured, we allow client-side Firestore query fallback
            return NextResponse.json({ fallbackToClient: true });
        }

        const db = adminApp.db();
        const studentQuery = await db.collection('students').where('barcodeId', '==', studentCode.trim()).limit(1).get();

        if (studentQuery.empty) {
            return NextResponse.json({ error: 'The Student Code or phone numbers you entered do not match our records.' }, { status: 400 });
        }

        const studentData = studentQuery.docs[0].data();

        const incomingPhone = (phoneNumber || '').trim();
        const incomingParentPhone = (parentPhoneNumber || '').trim();
        const recordPhone = (studentData.phoneNumber || '').trim();
        const recordParentPhone = (studentData.parentPhoneNumber || '').trim();

        // Validate that both student phone AND parent phone match if both are provided,
        // or at least one matches if only one is provided.
        const isStudentPhoneValid = !incomingPhone || (recordPhone && recordPhone === incomingPhone);
        const isParentPhoneValid = !incomingParentPhone || (recordParentPhone && recordParentPhone === incomingParentPhone);

        // Require exact match on the provided numbers
        const matchFound = (incomingPhone && recordPhone === incomingPhone) ||
                           (incomingParentPhone && recordParentPhone === incomingParentPhone);

        if (!matchFound || !isStudentPhoneValid || !isParentPhoneValid) {
            return NextResponse.json({ error: 'The Student Code or phone numbers you entered do not match our records.' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            verified: true,
            studentId: studentQuery.docs[0].id
        });

    } catch (error: any) {
        console.error('Verify reset info error:', error);
        return NextResponse.json({ error: 'Failed to verify identity. Please try again later.' }, { status: 500 });
    }
}
