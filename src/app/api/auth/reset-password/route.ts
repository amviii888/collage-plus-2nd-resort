import { NextResponse, NextRequest } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

// Simple in-memory rate limiting map for password resets (IP -> timestamp/count)
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

export async function POST(req: NextRequest) {
    try {
        // IP-based Rate Limiting
        const reqHeaders = await headers();
        const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
        const now = Date.now();
        const limit = rateLimitMap.get(ip);
        if (limit) {
            if (now - limit.lastRequest > 15 * 60 * 1000) {
                rateLimitMap.set(ip, { count: 1, lastRequest: now });
            } else if (limit.count >= 5) {
                return NextResponse.json(
                    { error: 'Too many password reset requests from this IP. Please try again in 15 minutes.' },
                    { status: 429 }
                );
            } else {
                rateLimitMap.set(ip, { count: limit.count + 1, lastRequest: now });
            }
        } else {
            rateLimitMap.set(ip, { count: 1, lastRequest: now });
        }

        // Honeypot Field Check for Bots
        const body = await req.json();
        const { studentCode, newPassword, phoneNumber, parentPhoneNumber, website } = body;

        if (website) {
            // Bot simulation success
            return NextResponse.json({ success: true });
        }

        if (!studentCode || !newPassword || (!phoneNumber && !parentPhoneNumber)) {
            return NextResponse.json({ error: 'Incorrect student code or verification details.' }, { status: 400 });
        }

        // Validate password strength default minimum length and sequence prevention
        if (newPassword.length < 6 || /^(.)\1+$/.test(newPassword) || newPassword === '123456') {
            return NextResponse.json({ error: 'Password must be at least 6 characters and not be a simple sequence.' }, { status: 400 });
        }

        const adminApp = getFirebaseAdmin();
        if (!adminApp) {
            return NextResponse.json({ 
                error: 'Backend authentication service is not fully configured (missing service credentials). In a production environment, this would cleanly reset the Firebase Auth password.' 
            }, { status: 500 });
        }

        const auth = adminApp.auth();
        const db = adminApp.db();

        // Retrieve Student Document from Firestore to verify phone details
        const studentQuery = await db.collection('students').where('barcodeId', '==', studentCode.trim()).limit(1).get();
        if (studentQuery.empty) {
            // Return a generic error message to prevent account enumeration
            return NextResponse.json({ error: 'Incorrect student code or verification details.' }, { status: 400 });
        }

        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();

        // Strict verification of phone or parent phone
        const incomingPhone = (phoneNumber || '').trim();
        const incomingParentPhone = (parentPhoneNumber || '').trim();
        const recordPhone = (studentData.phoneNumber || '').trim();
        const recordParentPhone = (studentData.parentPhoneNumber || '').trim();

        const isPhoneVerified = (incomingPhone && recordPhone === incomingPhone) ||
                                (incomingParentPhone && recordParentPhone === incomingParentPhone);

        if (!isPhoneVerified) {
            return NextResponse.json({ error: 'Incorrect student code or verification details.' }, { status: 400 });
        }

        const studentEmail = `${studentCode.trim()}@universe.student`;
        const userRecord = await auth.getUserByEmail(studentEmail);
        
        await auth.updateUser(userRecord.uid, {
            password: newPassword
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: 'Failed to reset password. Please check your inputs or try again later.' }, { status: 500 });
    }
}
