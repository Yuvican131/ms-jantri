
'use client'

import { useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Client } from '@/components/clients-manager';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useClients() {
  const firestore = useFirestore();
  const clientsCollection = useMemoFirebase(() => collection(firestore, 'clients'), [firestore]);
  const { data: clients, isLoading, error } = useCollection<Client>(clientsCollection);

  const addClient = (clientData: Omit<Client, 'id'>) => {
    const dataWithTimestamp = {
      ...clientData,
      createdAt: serverTimestamp(),
    };
    addDoc(clientsCollection, dataWithTimestamp).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: clientsCollection.path,
          operation: 'create',
          requestResourceData: dataWithTimestamp,
        })
      );
    });
  };

  const updateClient = (clientData: Client) => {
    const clientRef = doc(firestore, 'clients', clientData.id);
    const { id, ...dataToUpdate } = clientData;
    updateDoc(clientRef, dataToUpdate).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: clientRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        })
      );
    });
  };

  const deleteClient = (clientId: string) => {
    const clientRef = doc(firestore, 'clients', clientId);
    deleteDoc(clientRef).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: clientRef.path,
          operation: 'delete',
        })
      );
    });
  };

  const updateClientBalance = (clientId: string, amount: number) => {
    const clientRef = doc(firestore, 'clients', clientId);
    const updateData = { activeBalance: increment(amount) };
    updateDoc(clientRef, updateData).catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: clientRef.path,
          operation: 'update',
          requestResourceData: updateData,
        })
      );
    });
  };

  return {
    clients: clients || [],
    isLoading,
    error,
    addClient,
    updateClient,
    deleteClient,
    updateClientBalance,
  };
}
