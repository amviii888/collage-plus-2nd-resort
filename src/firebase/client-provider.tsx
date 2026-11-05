'use client';

import React, { type ReactNode, useEffect, useState } from 'react';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, type Firestore } from 'firebase/firestore';

import { FirebaseProvider } from './provider';
import { firebaseConfig } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

function getServices() {
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }
  try {
    const resolvedConfig = (firebaseConfig as any)?.firebaseConfig || firebaseConfig;
    if (!resolvedConfig || !resolvedConfig.apiKey || !resolvedConfig.projectId) {
      return { firebaseApp: null, auth: null, firestore: null };
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
    const auth = getAuth(app);
    const dbId = resolvedConfig.firestoreDatabaseId;
    const firestore = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
    
    return { firebaseApp: app, auth, firestore };
  } catch (err) {
    console.warn('Firebase init notice:', err);
    return { firebaseApp: null, auth: null, firestore: null };
  }
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services] = useState(() => getServices());

  useEffect(() => {
    if (services.auth) {
      try {
        setPersistence(services.auth, browserLocalPersistence).catch((err) => {
          console.warn('Auth persistence fallback:', err?.message || err);
        });
      } catch (authErr) {
        console.warn('Auth setPersistence notice:', authErr);
      }
    }
    if (services.firestore) {
      try {
        enableMultiTabIndexedDbPersistence(services.firestore).catch((err) => {
          console.warn('Firestore multi-tab persistence fallback:', err?.message || err);
        });
      } catch (fsErr) {
        console.warn('Firestore persistence init notice:', fsErr);
      }
    }
  }, [services]);

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
