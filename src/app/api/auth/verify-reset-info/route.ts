import { NextResponse } from 'next/server';

/**
 * Legacy endpoint permanently disabled.
 * Plaintext passwords are no longer stored or disclosed.
 * Password resets must go through the WhatsApp-verified flow:
 *   POST /api/auth/reset-password/start
 *   POST /api/auth/reset-password/check-verification
 *   POST /api/auth/reset-password
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This legacy endpoint has been retired. Please use the WhatsApp-verified password reset flow.',
    },
    { status: 410 }
  );
}
