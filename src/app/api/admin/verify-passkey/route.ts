import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  ADMIN_COOKIE_NAME,
  verifyFirebaseRequestAuth,
  isAuthorizedAdminUser,
  ensureFirestoreAdminRole,
  getSAdminPasskeyStatus,
  verifySAdminPasskey,
  claimFirstRunSAdminPasskey,
  createAdminSessionToken,
  verifyAdminSessionRequest,
  verifyMutationOrigin,
} from '@/lib/server-security';

const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.lastRequest > 15 * 60 * 1000) {
    rateLimitMap.set(ip, { count: 1, lastRequest: now });
    return true;
  }
  if (entry.count >= 12) {
    return false;
  }
  rateLimitMap.set(ip, { count: entry.count + 1, lastRequest: now });
  return true;
}

function setAdminSessionCookie(response: NextResponse, value: string, maxAge: number) {
  try {
    response.cookies.set(ADMIN_COOKIE_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
      maxAge,
    });
  } catch {
    response.cookies.set(ADMIN_COOKIE_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = verifyAdminSessionRequest(req);
    const status = await getSAdminPasskeyStatus();
    if (!session) {
      return NextResponse.json({
        authorized: false,
        authenticated: false,
        needsFirstRunSetup: status.needsFirstRunSetup,
      });
    }
    return NextResponse.json({
      authorized: true,
      authenticated: true,
      session: {
        id: session.uid,
        uid: session.uid,
        name: 'Super Admin',
        role: session.role,
      },
      needsFirstRunSetup: false,
    });
  } catch (error) {
    console.error('Admin session check error:', error);
    return NextResponse.json({
      authorized: false,
      authenticated: false,
      needsFirstRunSetup: false,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const reqHeaders = await headers();
    const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || reqHeaders.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait 15 minutes.' },
        { status: 429 }
      );
    }

    const fbUser = await verifyFirebaseRequestAuth(req);
    if (!fbUser) {
      return NextResponse.json({ error: 'Authentication required. Please sign in again.' }, { status: 401 });
    }

    // Must be an authorized admin email/doc whenever ADMIN_EMAILS is configured
    const hasAdminEmailConfig = (process.env.ADMIN_EMAILS || '').trim().length > 0;
    const isAdmin = await isAuthorizedAdminUser(fbUser);
    if (hasAdminEmailConfig && !isAdmin) {
      return NextResponse.json({ error: 'Access denied for this account.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const passkey = typeof body.passkey === 'string' ? body.passkey.trim() : '';
    const isSetupRequest = body.mode === 'setup' || body.setupPasskey === true;

    if (!passkey) {
      return NextResponse.json({ error: 'Verification key is required.' }, { status: 400 });
    }

    const status = await getSAdminPasskeyStatus();

    if (isSetupRequest && status.needsFirstRunSetup) {
      const claimRes = await claimFirstRunSAdminPasskey(passkey, fbUser.uid);
      if (!claimRes.ok) {
        return NextResponse.json({ error: claimRes.error || 'Setup failed.' }, { status: 400 });
      }
    } else {
      const valid = await verifySAdminPasskey(passkey);
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect verification key.' }, { status: 403 });
      }
    }

    await ensureFirestoreAdminRole(fbUser);

    const token = createAdminSessionToken({
      uid: fbUser.uid,
      email: fbUser.email,
      role: 'S Admin',
    });

    const response = NextResponse.json({
      success: true,
      authorized: true,
      authenticated: true,
      adminToken: token,
      session: {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: 'Super Admin',
        role: 'S Admin',
      },
    });

    setAdminSessionCookie(response, token, 8 * 60 * 60);

    return response;
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json({ error: 'Verification failed on server. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyMutationOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const response = NextResponse.json({ success: true });
  setAdminSessionCookie(response, '', 0);
  return response;
}
