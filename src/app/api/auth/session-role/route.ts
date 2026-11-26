import { NextRequest, NextResponse } from 'next/server';
import {
  verifyFirebaseRequestAuth,
  isAuthorizedAdminUser,
  isAuthorizedLibrarianUser,
  verifyAdminSessionRequest,
  getSAdminPasskeyStatus,
} from '@/lib/server-security';

export async function GET(req: NextRequest) {
  try {
    const fbUser = await verifyFirebaseRequestAuth(req);
    const adminSession = verifyAdminSessionRequest(req);
    const passkeyStatus = await getSAdminPasskeyStatus();

    if (!fbUser) {
      return NextResponse.json({
        authenticated: false,
        isAdmin: false,
        isLibrarian: false,
        hasAdminSession: Boolean(adminSession),
        needsPasskeySetup: passkeyStatus.needsFirstRunSetup,
      });
    }

    const [isAdmin, isLibrarian] = await Promise.all([
      isAuthorizedAdminUser(fbUser),
      isAuthorizedLibrarianUser(fbUser),
    ]);

    return NextResponse.json({
      authenticated: true,
      uid: fbUser.uid,
      isAdmin: isAdmin || Boolean(adminSession && adminSession.uid === fbUser.uid),
      isLibrarian,
      hasAdminSession: Boolean(adminSession && adminSession.uid === fbUser.uid),
      needsPasskeySetup: passkeyStatus.needsFirstRunSetup,
    });
  } catch (error) {
    console.error('Session role resolution error:', error);
    return NextResponse.json({ authenticated: false, isAdmin: false, isLibrarian: false, hasAdminSession: false }, { status: 500 });
  }
}
