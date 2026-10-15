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
    if (services.auth && services.firestore) {
      setPersistence(services.auth, browserLocalPersistence)
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one.');
          } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support all features required for persistence.');
          } else {
            console.error('Error enabling auth persistence:', err);
          }
        });
        
      enableMultiTabIndexedDbPersistence(services.firestore).catch((err) => {
          if (err.code === 'failed-precondition') {
             console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code === 'unimplemented') {
             console.warn('The current browser does not support all features required for persistence.');
          } else {
             console.error('Error enabling firestore persistence:', err);
          }
      });
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
