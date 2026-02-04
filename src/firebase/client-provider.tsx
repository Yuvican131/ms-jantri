'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
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

  useEffect(() => {
    try {
      const firebaseServices = initializeFirebase();
      if (!firebaseServices.firebaseApp) {
        setServices({
          firebaseApp: null,
          auth: null,
          firestore: null,
          error: hasFirebaseConfig
            ? "Firebase initialization failed. Please check your console for errors."
            : "Firebase configuration is missing. Please set up your environment variables.",
        });
      } else {
        setServices({ ...firebaseServices, error: null });
      }
    } catch (e: any) {
      console.error("Firebase initialization failed:", e);
      setServices({
        firebaseApp: null,
        auth: null,
        firestore: null,
        error: `An unexpected error occurred during Firebase initialization: ${e.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Initializing App...</p>
        </div>
      </div>
    );
  }

  if (services.error || !services.firebaseApp) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Application Error</CardTitle>
            <CardDescription>Could not connect to required services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium text-destructive">{services.error}</p>
            <p className="text-xs text-muted-foreground">
              This usually happens if the environment variables for Firebase are not set correctly. Please verify them in your hosting provider's dashboard (e.g., Netlify, Vercel) and try again.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth!}
      firestore={services.firestore!}
    >
      {children}
    </FirebaseProvider>
  );
}
