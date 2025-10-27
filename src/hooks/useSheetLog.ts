
'use client';
import { useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from './use-toast';
import { format, isSameDay } from 'date-fns';

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
  
  const deleteSheetLogsForDraw = async (draw: string, date: Date) => {
    if (!userId) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      const q = query(
        collection(firestore, `users/${userId}/sheetLogs`),
        where("draw", "==", draw)
      );
      const querySnapshot = await getDocs(q);
      
      const logsForDate = querySnapshot.docs.filter(d => isSameDay(new Date(d.data().date), date));

      if (logsForDate.length === 0) {
        toast({ title: "No Data", description: `No sheet data found for draw ${draw} on this date.` });
        return;
      }

      const batch = writeBatch(firestore);
      logsForDate.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      toast({ title: "Success", description: `Cleared all sheet data for draw ${draw} on ${dateStr}.` });
    } catch (e) {
      console.error("Error clearing draw sheet logs: ", e);
      toast({ title: "Error", description: `Could not clear sheet data for draw ${draw}.`, variant: "destructive" });
    }
  };

  const getPreviousDataForClient = (clientId: string, draw: string, dateStr: string) => {
    if (!sheetLogData) return undefined;
    const log = sheetLogData.find(l => l.clientId === clientId && l.draw === draw && l.date === dateStr);
    return log?.data;
  };

  return { savedSheetLog, isLoading, error, addSheetLogEntry, deleteSheetLogsForClient, getPreviousDataForClient, deleteSheetLogsForDraw };
};

    