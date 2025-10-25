'use client';
import { useMemo } from 'react';
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

  const declaredNumbersColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/declaredNumbers`);
  }, [firestore, userId]);

  const { data, isLoading, error } = useCollection<Omit<DeclaredNumber, 'id'>>(declaredNumbersColRef);

  const declaredNumbers = useMemo(() => {
    if (!data) {
      return {};
    }
    return data.reduce((acc, item) => {
      // The id from useCollection is the document ID (e.g., "DD-2025-10-26")
      acc[item.id] = item;
      return acc;
    }, {} as { [key: string]: DeclaredNumber });
  }, [data]);

  const setDeclaredNumber = (draw: string, number: string, date: Date) => {
    if (!userId) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    setDocumentNonBlocking(docRef, { number, draw, date: dateStr }, { merge: true });
  };
  
  const removeDeclaredNumber = (draw: string, date: Date) => {
    if (!userId) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${draw}-${dateStr}`;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, docId);
    deleteDocumentNonBlocking(docRef);
  };

  return { declaredNumbers, isLoading, error, setDeclaredNumber, removeDeclaredNumber };
};
