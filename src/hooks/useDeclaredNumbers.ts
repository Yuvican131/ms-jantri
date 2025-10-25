
'use client'

import { useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

  const setDeclaredNumber = (draw: string, number: string) => {
    const docRef = doc(firestore, 'declaredNumbers', draw);
    const dataToSet = { number, updatedAt: serverTimestamp() };
    setDoc(docRef, dataToSet).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: dataToSet,
        })
      );
    });
  };

  const removeDeclaredNumber = (draw: string) => {
    const docRef = doc(firestore, 'declaredNumbers', draw);
    deleteDoc(docRef).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      );
    });
  };

  return {
    declaredNumbers,
    isLoading,
    error,
    setDeclaredNumber,
    removeDeclaredNumber,
  };
}
