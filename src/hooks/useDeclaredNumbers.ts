'use client';
import { useMemo, useState } from 'react';
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
  const [localDeclaredNumbers, setLocalDeclaredNumbers] = useState<{ [key: string]: DeclaredNumber }>({});

  const declaredNumbersColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/declaredNumbers`);
  }, [firestore, userId]);

  const { data, isLoading, error } = useCollection<Omit<DeclaredNumber, 'id'>>(declaredNumbersColRef);

  const declaredNumbers = useMemo(() => {
    if (!data) {
      return localDeclaredNumbers;
    }
    const fromDb = data.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {} as { [key: string]: DeclaredNumber });
    return { ...fromDb, ...localDeclaredNumbers };
  }, [data, localDeclaredNumbers]);

  const setDeclaredNumberLocal = (draw: string, number: string, date: Date) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    setLocalDeclaredNumbers(prev => ({
        ...prev,
        [docId]: { id: docId, draw, number, date: dateStr }
    }));
  };

  const getDeclaredNumber = (draw: string, date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    return declaredNumbers[docId]?.number;
  };

  const setDeclaredNumber = (draw: string, number: string, date: Date) => {
    if (!userId || !date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    setDocumentNonBlocking(docRef, { number, draw, date: dateStr }, { merge: true });
    // Remove from local state once it's being sent to DB
    setLocalDeclaredNumbers(prev => {
        const newState = {...prev};
        delete newState[docId];
        return newState;
    });
  };
  
  const removeDeclaredNumber = (draw: string, date: Date) => {
    if (!userId || !date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    deleteDocumentNonBlocking(docRef);
    setLocalDeclaredNumbers(prev => {
        const newState = {...prev};
        delete newState[docId];
        return newState;
    });
  };

  return { declaredNumbers, isLoading, error, setDeclaredNumber, removeDeclaredNumber, getDeclaredNumber, setDeclaredNumberLocal };
};

    