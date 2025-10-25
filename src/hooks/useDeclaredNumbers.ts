
'use client'

import { useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';

type DeclaredNumberDoc = {
  id: string; // Corresponds to draw name
  number: string;
};

export function useDeclaredNumbers() {
  const firestore = useFirestore();
  const declaredNumbersCollection = useMemoFirebase(() => collection(firestore, 'declaredNumbers'), [firestore]);
  const { data, isLoading, error } = useCollection<DeclaredNumberDoc>(declaredNumbersCollection);

  const declaredNumbers = useMemo(() => {
    if (!data) return {};
    return data.reduce((acc, item) => {
      acc[item.id] = item.number;
      return acc;
    }, {} as { [key: string]: string });
  }, [data]);

  const setDeclaredNumber = async (draw: string, number: string) => {
    try {
      const docRef = doc(firestore, 'declaredNumbers', draw);
      await setDoc(docRef, { number, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error setting declared number: ", e);
    }
  };

  const removeDeclaredNumber = async (draw: string) => {
    try {
      const docRef = doc(firestore, 'declaredNumbers', draw);
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Error removing declared number: ", e);
    }
  };

  return {
    declaredNumbers,
    isLoading,
    error,
    setDeclaredNumber,
    removeDeclaredNumber,
  };
}
