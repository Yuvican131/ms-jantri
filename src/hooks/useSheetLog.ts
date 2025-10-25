'use client';
import { useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from './use-toast';

export interface SavedSheetInfo {
  id: string;
  clientName: string;
  clientId: string;
  gameTotal: number;
  data: { [key: string]: string };
  date: string; // ISO date string
  draw: string;
}

export const useSheetLog = (userId?: string) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sheetLogColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/sheetLogs`);
  }, [firestore, userId]);

  const { data: sheetLogData, isLoading, error } = useCollection<Omit<SavedSheetInfo, 'id'>>(sheetLogColRef);

  const savedSheetLog = useMemo(() => {
    if (!sheetLogData) {
      return {};
    }
    const logByDraw: { [key: string]: SavedSheetInfo[] } = {};
    sheetLogData.forEach(log => {
      if (!logByDraw[log.draw]) {
        logByDraw[log.draw] = [];
      }
      logByDraw[log.draw].push(log);
    });
    return logByDraw;
  }, [sheetLogData]);

  const addSheetLogEntry = (entry: Omit<SavedSheetInfo, 'id'> | SavedSheetInfo) => {
    if (!sheetLogColRef) return;
    
    if ('id' in entry) {
      const docRef = doc(firestore, sheetLogColRef.path, entry.id);
      const { id, ...entryData } = entry;
      updateDocumentNonBlocking(docRef, entryData);
    } else {
      addDocumentNonBlocking(sheetLogColRef, entry);
    }
  };

  const deleteSheetLogsForClient = async (clientId: string, showToast: boolean = true) => {
    if (!userId) return;

    try {
      const q = query(collection(firestore, `users/${userId}/sheetLogs`), where("clientId", "==", clientId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        if (showToast) toast({ title: "No Data", description: "No sheet data found for this client to clear." });
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      if (showToast) toast({ title: "Success", description: `Cleared all sheet data for the client.` });
    } catch (e) {
      console.error("Error clearing sheet logs: ", e);
      if (showToast) toast({ title: "Error", description: "Could not clear sheet data.", variant: "destructive" });
    }
  };

  return { savedSheetLog, isLoading, error, addSheetLogEntry, deleteSheetLogsForClient };
};
