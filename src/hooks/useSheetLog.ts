
'use client'

import { useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { SavedSheetInfo } from '@/app/page';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useSheetLog() {
  const firestore = useFirestore();
  const sheetLogCollection = useMemoFirebase(() => collection(firestore, 'sheetLogs'), [firestore]);
  const { data: sheetLog, isLoading, error } = useCollection<SavedSheetInfo>(sheetLogCollection);

  const groupedSheetLog = useMemo(() => {
    if (!sheetLog) return {};
    return sheetLog.reduce((acc, entry) => {
      if (!acc[entry.draw]) {
        acc[entry.draw] = [];
      }
      acc[entry.draw].push(entry);
      return acc;
    }, {} as { [key: string]: SavedSheetInfo[] });
  }, [sheetLog]);

  const addSheetLogEntry = (entry: Omit<SavedSheetInfo, 'id'>) => {
    const dataWithTimestamp = {
      ...entry,
      createdAt: serverTimestamp(),
    };
    addDoc(sheetLogCollection, dataWithTimestamp).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: sheetLogCollection.path,
          operation: 'create',
          requestResourceData: dataWithTimestamp,
        })
      );
    });
  };

  const mergeSheetLogEntry = (docId: string, dataToMerge: Partial<SavedSheetInfo>) => {
    const docRef = doc(firestore, 'sheetLogs', docId);
    const dataWithTimestamp = {
      ...dataToMerge,
      updatedAt: serverTimestamp(),
    };
    updateDoc(docRef, dataWithTimestamp).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataWithTimestamp,
        })
      );
    });
  };

  return {
    savedSheetLog: groupedSheetLog,
    isLoading,
    error,
    addSheetLogEntry,
    mergeSheetLogEntry,
  };
}
