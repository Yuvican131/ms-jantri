
'use client';
import { useMemo, useCallback } from 'react';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from './use-toast';
import { format } from 'date-fns';

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
      const docRef = doc(firestore, sheetLogColRef.path, entry.id);
      const { id, ...entryData } = entry;
      // Optimistic UI update
      setSheetLogData(prevData => {
        if (!prevData) return [{ ...entryData, id: entry.id }];
        const existingIndex = prevData.findIndex(item => item.id === entry.id);
        if (existingIndex > -1) {
          const newData = [...prevData];
          newData[existingIndex] = { ...newData[existingIndex], ...entryData };
          return newData;
        }
        return [...prevData, { ...entryData, id: entry.id }];
      });
      updateDocumentNonBlocking(docRef, entryData);
    } else {
       addDocumentNonBlocking(sheetLogColRef, entry).then(docRef => {
         if (docRef) {
            setSheetLogData(prevData => [...(prevData || []), { ...entry, id: docRef.id }]);
         }
       });
    }
  }, [sheetLogColRef, firestore, setSheetLogData]);
  
  const deleteSheetLogEntry = useCallback((logId: string) => {
    if (!userId) return;
    setSheetLogData(prevData => prevData?.filter(log => log.id !== logId) || null);
    const docRef = doc(firestore, `users/${userId}/sheetLogs`, logId);
    deleteDocumentNonBlocking(docRef);
  }, [userId, firestore, setSheetLogData]);

  const deleteSheetLogsForClient = useCallback(async (clientId: string, showToast: boolean = true) => {
    if (!userId) return;

    const logsToDelete: string[] = [];
    try {
      const q = query(collection(firestore, `users/${userId}/sheetLogs`), where("clientId", "==", clientId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        if (showToast) toast({ title: "No Data", description: "No sheet data found for this client to clear." });
        return;
      }
      
      setSheetLogData(prevData => prevData?.filter(log => log.clientId !== clientId) || null);

      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        logsToDelete.push(doc.id);
        batch.delete(doc.ref);
      });
      await batch.commit();

      if (showToast) toast({ title: "Success", description: `Cleared all sheet data for the client.` });
    } catch (e) {
      console.error("Error clearing sheet logs: ", e);
      if (showToast) toast({ title: "Error", description: "Could not clear sheet data.", variant: "destructive" });
    }
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
      
      const logsToDelete = querySnapshot.docs.map(doc => doc.id);
      
      setSheetLogData(prevData => {
        if (!prevData) return null;
        return prevData.filter(log => !logsToDelete.includes(log.id));
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
    }
  }, [userId, firestore, setSheetLogData, toast]);

  const getPreviousDataForClient = useCallback((clientId: string, draw: string, dateStr: string) => {
    if (!sheetLogData) return undefined;
    const log = sheetLogData.find(l => l.clientId === clientId && l.draw === draw && l.date === dateStr);
    return log?.data;
  }, [sheetLogData]);

  return { savedSheetLog, isLoading, error, addSheetLogEntry, deleteSheetLogsForClient, getPreviousDataForClient, deleteSheetLogsForDraw, deleteSheetLogEntry };
};
