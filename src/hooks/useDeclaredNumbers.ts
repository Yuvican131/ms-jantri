'use client';
import { useMemo } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface DeclaredNumber {
  id: string; // draw name
  number: string;
}

export const useDeclaredNumbers = (userId?: string) => {
  const firestore = useFirestore();

  const declaredNumbersColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/declaredNumbers`);
  }, [firestore, userId]);

  const { data, isLoading, error } = useCollection<Omit<DeclaredNumber, 'id'>>(declaredNumbersColRef);

  const declaredNumbers = useMemo(() => {
    if (!data) return {};
    return data.reduce((acc, item) => {
      acc[item.id] = item.number;
      return acc;
    }, {} as { [key: string]: string });
  }, [data]);

  const setDeclaredNumber = (draw: string, number: string) => {
    if (!userId) return;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, draw);
    setDocumentNonBlocking(docRef, { number }, { merge: true });
  };
  
  const removeDeclaredNumber = (draw: string) => {
    if (!userId) return;
    const docRef = doc(firestore, `users/${userId}/declaredNumbers`, draw);
    deleteDocumentNonBlocking(docRef);
  };

  return { declaredNumbers, isLoading, error, setDeclaredNumber, removeDeclaredNumber };
};
