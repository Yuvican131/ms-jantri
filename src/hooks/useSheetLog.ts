
'use client';
import { useMemo, useCallback } from 'react';
import { collection, doc, writeBatch, query, where, getDocs, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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

  const { data: rawSheetLogData, isLoading, error, setData: setSheetLogData } = useCollection<Omit<SavedSheetInfo, 'id'>>(sheetLogColRef);

  const sheetLogData = useMemo(() => {
    if (!rawSheetLogData) return null;

    return [...rawSheetLogData].sort((a, b) => {
      const aHasTimestamp = a.createdAt && a.createdAt.seconds;
      const bHasTimestamp = b.createdAt && b.createdAt.seconds;

      if (aHasTimestamp && bHasTimestamp) {
        // Sort descending (newest first)
        return b.createdAt.seconds - a.createdAt.seconds;
      }
      if (aHasTimestamp) return -1;
      if (bHasTimestamp) return 1;
      
      // Fallback for entries without a createdAt timestamp
      return b.id.localeCompare(a.id);
    });
  }, [rawSheetLogData]);


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

  const addSheetLogEntry = useCallback((entry: Omit<SavedSheetInfo, 'id'>) => {
    if (!userId) return;
    const docId = `${entry.clientId}-${entry.draw}-${entry.date}`;
    const docRef = doc(firestore, `users/${userId}/sheetLogs`, docId);

    // Optimistically upsert the UI by deterministic id (one entry per client+draw+date).
    setSheetLogData(prev => {
      const existing = prev?.find(l => l.id === docId);
      const merged: SavedSheetInfo = existing
        ? {
            ...existing,
            ...entry,
            id: docId,
            gameTotal: (existing.gameTotal || 0) + (entry.gameTotal || 0),
            data: mergeCellData(existing.data, entry.data),
            rawInput: mergeRawInput(existing.rawInput, entry.rawInput),
            createdAt: existing.createdAt || new Date(),
          }
        : {
            ...entry,
            id: docId,
            createdAt: new Date(),
          };

      const without = prev?.filter(l => l.id !== docId) || [];
      return [merged, ...without];
    });

    runTransaction(firestore, async (tx) => {
      const snap = await tx.get(docRef);

      if (!snap.exists()) {
        tx.set(docRef, { ...entry, createdAt: serverTimestamp() });
        return;
      }

      const existing = snap.data() as Omit<SavedSheetInfo, 'id'>;
      const mergedData = mergeCellData(existing.data || {}, entry.data || {});
      const mergedRawInput = mergeRawInput(existing.rawInput, entry.rawInput);
      const mergedGameTotal = (existing.gameTotal || 0) + (entry.gameTotal || 0);

      tx.set(
        docRef,
        {
          ...existing,
          ...entry,
          data: mergedData,
          rawInput: mergedRawInput,
          gameTotal: mergedGameTotal,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    })
      .catch(error => {
          console.error("Error adding document: ", error);
          // Revert optimistic update on error by reloading from existing state (best-effort).
          // We can't fully restore without a snapshot; at least notify the user.
          toast({ title: "Save Failed", description: "Could not save the entry.", variant: "destructive" });
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: docRef.path,
              operation: 'create',
              requestResourceData: entry,
            })
          )
      });
  }, [userId, firestore, setSheetLogData, toast]);
  
  const deleteSheetLogEntry = useCallback((logId: string) => {
    if (!userId || !sheetLogData) return;
    
    // Find the log to remove for potential revert
    const logToRemove = sheetLogData.find(log => log.id === logId);

    // Optimistically update the UI by removing the item
    setSheetLogData(prevData => prevData?.filter(log => log.id !== logId) || null);
    
    const docRef = doc(firestore, `users/${userId}/sheetLogs`, logId);

    deleteDoc(docRef)
        .then(() => {
            toast({ title: "Entry Deleted", description: "The log entry has been removed." });
        })
        .catch(error => {
            console.error("Error deleting document: ", error);
            // Revert optimistic delete on error
            if (logToRemove) {
                setSheetLogData(prev => prev ? [...prev, logToRemove] : [logToRemove]);
            }
            toast({ title: "Delete Failed", description: "Could not delete the entry.", variant: "destructive" });
        });
  }, [userId, firestore, setSheetLogData, toast, sheetLogData]);

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

function mergeCellData(
  base: { [key: string]: string } = {},
  incoming: { [key: string]: string } = {}
) {
  const merged: { [key: string]: string } = { ...base };
  for (const [k, v] of Object.entries(incoming)) {
    const next = parseFloat(v) || 0;
    const prev = parseFloat(merged[k]) || 0;
    merged[k] = String(prev + next);
  }
  return merged;
}

function mergeRawInput(a?: string, b?: string) {
  const left = (a || '').trim();
  const right = (b || '').trim();
  if (!left) return right || undefined;
  if (!right) return left || undefined;
  return `${left}\n${right}`;
}
