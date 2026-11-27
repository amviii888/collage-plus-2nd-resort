'use client';
import {
  Auth, // Import Auth type for type hinting
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

/** Anonymous sign-in is disabled; users must sign in with a real account. */
export function initiateAnonymousSignIn(_authInstance: Auth): void {
  console.warn('[Firebase Auth] Anonymous sign-in is disabled.');
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((err) => {
    console.warn('[Firebase Auth] Sign-up network notice:', err?.message || err);
  });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch((err) => {
    console.warn('[Firebase Auth] Sign-in network notice:', err?.message || err);
  });
}
