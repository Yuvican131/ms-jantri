'use client';
import { useMemo, useState, useCallback } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';

export interface DeclaredNumber {
  id: string; // composite key draw-date
  number: string;
  draw: string;
  date: string; // ISO date string
}

export const useDeclaredNumbers = (userId?: string) => {
  const firestore = useFirestore();
  const [localDeclaredNumbers, setLocalDeclaredNumbers] = useState<{ [key: string]: DeclaredNumber | undefined }>({});

  const declaredNumbersColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/declaredNumbers`);
  }, [firestore, userId]);

  const { data, isLoading, error } = useCollection<Omit<DeclaredNumber, 'id'>>(declaredNumbersColRef);

  const declaredNumbers = useMemo(() => {
    const fromDb = data?.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as { [key: string]: DeclaredNumber }) || {};

    // Merge DB state with local optimistic updates
    return { ...fromDb, ...localDeclaredNumbers };
  }, [data, localDeclaredNumbers]);


  const setDeclaredNumberLocal = useCallback((draw: string, number: string, date: Date) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    setLocalDeclaredNumbers(prev => ({
        ...prev,
        [docId]: { id: docId, draw, number, date: dateStr }
    }));
  }, []);

  const getDeclaredNumber = useCallback((draw: string, date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    return declaredNumbers[docId]?.number;
  }, [declaredNumbers]);

  const setDeclaredNumber = (draw: string, number: string, date: Date) => {
    if (!userId || !date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    
    // First, apply it optimistically to local state
    setDeclaredNumberLocal(draw, number, date);
    
    // Then, send it to the database
    setDocumentNonBlocking(docRef, { number, draw, date: dateStr }, { merge: true });
    
    // Remove from local state after a short delay to allow DB state to propagate
    setTimeout(() => {
        setLocalDeclaredNumbers(prev => {
            const newState = {...prev};
            if(newState[docId]?.number === number) {
              delete newState[docId];
            }
            return newState;
        });
    }, 1000);
  };
  
  const removeDeclaredNumber = (draw: string, date: Date) => {
    if (!userId || !date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;

    // Optimistically remove from local state
    setLocalDeclaredNumbers(prev => ({ ...prev, [docId]: undefined }));

    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    deleteDocumentNonBlocking(docRef);
  };

  return { declaredNumbers, isLoading, error, setDeclaredNumber, removeDeclaredNumber, getDeclaredNumber, setDeclaredNumberLocal };
};