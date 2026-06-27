'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, hasFirebaseConfig } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';


interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<{
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
    error: string | null;
  }>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const firebaseServices = initializeFirebase();
      if (!firebaseServices.firebaseApp) {
        const msg = hasFirebaseConfig
          ? "Firebase initialization failed. Check console for details."
          : "Firebase config missing. Set FIREBASE_CONFIG or NEXT_PUBLIC_FIREBASE_* vars.";
        setInitError(msg);
        setServices({ firebaseApp: null, auth: null, firestore: null, error: msg });
      } else {
        setServices({ ...firebaseServices, error: null });
      }
    } catch (e: any) {
      const msg = `Firebase init error: ${e?.message || e}`;
      console.error(msg, e);
      setInitError(msg);
      setServices({ firebaseApp: null, auth: null, firestore: null, error: msg });
    } finally {
      setIsLoading(false);
    }
  }, []);

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
