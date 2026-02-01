
'use client';
import { useMemo, useCallback } from 'react';
import { collection, doc, writeBatch, query, where, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from './use-toast';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export interface SavedSheetInfo {
  id: string;
  clientName: string;
  clientId: string;
  gameTotal: number;
  data: { [key: string]: string };
  date: string; // ISO date string
  draw: string;
  rawInput?: string;
  createdAt?: any; // Can be Firebase Timestamp
}

export const useSheetLog = (userId?: string) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const sheetLogColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/sheetLogs`);
  }, [firestore, userId]);

  const { data: sheetLogData, isLoading, error, setData: setSheetLogData } = useCollection<Omit<SavedSheetInfo, 'id'>>(sheetLogColRef);

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

  const addSheetLogEntry = useCallback((entry: Omit<SavedSheetInfo, 'id'> | SavedSheetInfo) => {
    if (!sheetLogColRef) return;
    
    if ('id' in entry) {
      // This is an update to an existing entry
      const docRef = doc(firestore, sheetLogColRef.path, entry.id);
      const { id, ...entryData } = entry;
      updateDocumentNonBlocking(docRef, entryData);
    } else {
      // This is a new entry, add server-side timestamp
      addDoc(sheetLogColRef, { ...entry, createdAt: serverTimestamp() })
        .catch(error => {
            errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: sheetLogColRef.path,
                operation: 'create',
                requestResourceData: entry,
              })
            )
        });
    }
  }, [sheetLogColRef, firestore]);
  
  const deleteSheetLogEntry = useCallback((logId: string) => {
    if (!userId) return;
    setSheetLogData(prevData => prevData?.filter(log => log.id !== logId) || null);
    const docRef = doc(firestore, `users/${userId}/sheetLogs`, logId);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Entry Deleted", description: "The log entry has been removed." });
  }, [userId, firestore, setSheetLogData, toast]);

  const deleteSheetLogsForClient = useCallback(async (clientId: string, showToast: boolean = true) => {
    if (!userId) return Promise.resolve();

    return new Promise(async (resolve, reject) => {
        try {
            const q = query(collection(firestore, `users/${userId}/sheetLogs`), where("clientId", "==", clientId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                if (showToast) toast({ title: "No Data", description: "No sheet data found for this client to clear." });
                resolve();
                return;
            }

            const batch = writeBatch(firestore);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // After successful deletion, update the local state.
            setSheetLogData(currentLogs => {
                if (!currentLogs) return null;
                return currentLogs.filter(log => log.clientId !== clientId);
            });

            if (showToast) toast({ title: "Success", description: `Cleared all sheet data for the client.` });
            resolve();

        } catch (e) {
            console.error("Error clearing sheet logs: ", e);
            if (showToast) toast({ title: "Error", description: "Could not clear sheet data.", variant: "destructive" });
            reject(e);
        }
    });
  }, [userId, firestore, setSheetLogData, toast]);
  
  const deleteSheetLogsForDraw = useCallback(async (draw: string, date: Date) => {
    if (!userId) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      const q = query(
        collection(firestore, `users/${userId}/sheetLogs`),
        where("draw", "==", draw),
        where("date", "==", dateStr)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "No Data", description: `No sheet data found for draw ${draw} on this date.` });
        return;
      }
      
      const logsToDeleteIds = querySnapshot.docs.map(doc => doc.id);
      
      // Optimistically update the UI by filtering out the logs that are about to be deleted.
      setSheetLogData(prevData => {
        if (!prevData) return null;
        return prevData.filter(log => !logsToDeleteIds.includes(log.id));
      });

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      toast({ title: "Success", description: `Cleared all sheet data for draw ${draw} on ${dateStr}.` });
    } catch (e) {
      console.error("Error clearing draw sheet logs: ", e);
      toast({ title: "Error", description: `Could not clear sheet data for draw ${draw}.`, variant: "destructive" });
      // Optionally, you could revert the optimistic update here if the batch commit fails.
    }
  }, [userId, firestore, setSheetLogData, toast]);

  const getPreviousDataForClient = useCallback((clientId: string, draw: string, dateStr: string) => {
    if (!sheetLogData) return undefined;
    const log = sheetLogData.find(l => l.clientId === clientId && l.draw === draw && l.date === dateStr);
    return log?.data;
  }, [sheetLogData]);

  return { savedSheetLog, isLoading, error, addSheetLogEntry, deleteSheetLogsForClient, getPreviousDataForClient, deleteSheetLogsForDraw, deleteSheetLogEntry };
};
