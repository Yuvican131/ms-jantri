'use client';

import { firebaseConfig, hasFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // On the server, we don't want to initialize the client SDK
  if (typeof window === 'undefined') {
    // This will be handled gracefully by the providers
    return { firebaseApp: null, auth: null, firestore: null };
  }
  
  if (getApps().length) {
    return getSdks(getApp());
  }

  // If no config is available, do not initialize
  if (!hasFirebaseConfig) {
      console.error("Firebase config is missing. Please set up your environment variables.");
      return { firebaseApp: null, auth: null, firestore: null };
  }

  const firebaseApp = initializeApp(firebaseConfig);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID;

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export { hasFirebaseConfig } from './config';
