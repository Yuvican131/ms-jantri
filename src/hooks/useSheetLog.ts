
'use client'

import { useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { SavedSheetInfo } from '@/app/page';

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

  const addSheetLogEntry = async (entry: Omit<SavedSheetInfo, 'id'>) => {
    try {
      await addDoc(sheetLogCollection, {
        ...entry,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding sheet log entry: ", e);
    }
  };

  const mergeSheetLogEntry = async (docId: string, dataToMerge: Partial<SavedSheetInfo>) => {
    try {
      const docRef = doc(firestore, 'sheetLogs', docId);
      await updateDoc(docRef, {
        ...dataToMerge,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error merging sheet log entry: ", e);
    }
  };

  return {
    savedSheetLog: groupedSheetLog,
    isLoading,
    error,
    addSheetLogEntry,
    mergeSheetLogEntry,
  };
}
