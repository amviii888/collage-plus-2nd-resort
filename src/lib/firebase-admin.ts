import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

function resolveDefaultAdminApp(): App | null {
  const existingDefault = getApps().find((a) => a.name === '[DEFAULT]');
  if (existingDefault) {
    return existingDefault;
  }

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

  if (!projectId || !rawPrivateKey || !rawClientEmail) {
    return null;
  }

  // Clean up private key formatting (remove surrounding quotes if pasted from JSON)
  if ((rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')) ||
      (rawPrivateKey.startsWith("'") && rawPrivateKey.endsWith("'"))) {
    rawPrivateKey = rawPrivateKey.slice(1, -1);
  }
  const privateKey = rawPrivateKey.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // Clean up client email formatting
  if ((rawClientEmail.startsWith('"') && rawClientEmail.endsWith('"')) ||
      (rawClientEmail.startsWith("'") && rawClientEmail.endsWith("'"))) {
    rawClientEmail = rawClientEmail.slice(1, -1);
  }
  const clientEmail = rawClientEmail.trim();

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Initialize Firebase Admin lazily
export function getFirebaseAdmin() {
  const app = resolveDefaultAdminApp();
  if (!app) {
    return null;
  }

  const databaseId = (firebaseAppletConfig as any)?.firestoreDatabaseId;
  const hasNamedDb = typeof databaseId === 'string' && databaseId.length > 0 && databaseId !== '(default)';

  return {
    auth: () => getAuth(app),
    db: () => (hasNamedDb ? getFirestore(app, databaseId) : getFirestore(app)),
  };
}
