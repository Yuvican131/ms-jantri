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
  const [localDeclaredNumbers, setLocalDeclaredNumbers] = useState<{ [key: string]: DeclaredNumber | null | undefined }>({});

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

    const merged = { ...fromDb, ...localDeclaredNumbers };

    // Filter out any entries that have been explicitly set to null (optimistically deleted)
    Object.keys(merged).forEach(key => {
      if (merged[key] === null) {
        delete merged[key];
      }
    });

    return merged as { [key: string]: DeclaredNumber };
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
    const entry = declaredNumbers[docId];
    return entry ? entry.number : undefined;
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

    // Optimistically update local state to reflect deletion by setting it to null.
    // The main `declaredNumbers` memo will filter this out.
    setLocalDeclaredNumbers(prev => ({ ...prev, [docId]: null }));

    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    deleteDocumentNonBlocking(docRef);
  };

  return { declaredNumbers, isLoading, error, setDeclaredNumber, removeDeclaredNumber, getDeclaredNumber, setDeclaredNumberLocal };
};
