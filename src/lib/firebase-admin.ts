import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Initialize Firebase Admin lazily
export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // 1. Resolve Project ID (with fallback to applet config)
    const projectId = (
      process.env.FIREBASE_PROJECT_ID || 
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
      (firebaseAppletConfig as any)?.projectId ||
      (firebaseAppletConfig as any)?.firebaseConfig?.projectId
    )?.trim();

    // 2. Resolve Private Key (supporting various names)
    let rawPrivateKey = (
      process.env.FIREBASE_PRIVATE_KEY || 
      process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY || 
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    )?.trim();

    // 3. Resolve Client Email (supporting various names)
    let rawClientEmail = (
      process.env.FIREBASE_CLIENT_EMAIL || 
      process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL || 
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    )?.trim();

    // Debug logs to help identify missing/misspelled variables in the dashboard logs (safe from leaking values)
    console.log("Firebase Admin Initialization Check:", {
      hasProjectId: !!projectId,
      hasPrivateKey: !!rawPrivateKey,
      hasClientEmail: !!rawClientEmail,
    });

    if (!projectId || !rawPrivateKey || !rawClientEmail) {
      console.warn("Firebase Admin credentials could not be fully resolved. Admin operations will fail.");
      return null;
    }

    // Clean up private key formatting (remove surrounding quotes if the user pasted JSON values directly)
    if (rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) {
      rawPrivateKey = rawPrivateKey.slice(1, -1);
    }
    if (rawPrivateKey.startsWith("'") && rawPrivateKey.endsWith("'")) {
      rawPrivateKey = rawPrivateKey.slice(1, -1);
    }
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    // Clean up client email formatting
    if (rawClientEmail.startsWith('"') && rawClientEmail.endsWith('"')) {
      rawClientEmail = rawClientEmail.slice(1, -1);
    }
    if (rawClientEmail.startsWith("'") && rawClientEmail.endsWith("'")) {
      rawClientEmail = rawClientEmail.slice(1, -1);
    }
    const clientEmail = rawClientEmail;

    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
      return null;
    }
  }
  
  return {
    auth: () => getAuth(),
    db: () => getFirestore()
  };
}
