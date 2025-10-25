
'use client'

import { useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Client } from '@/components/clients-manager';

export function useClients() {
  const firestore = useFirestore();
  const clientsCollection = useMemoFirebase(() => collection(firestore, 'clients'), [firestore]);
  const { data: clients, isLoading, error } = useCollection<Client>(clientsCollection);

  const addClient = async (clientData: Omit<Client, 'id'>) => {
    try {
      await addDoc(clientsCollection, {
        ...clientData,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding client: ", e);
    }
  };

  const updateClient = async (clientData: Client) => {
    try {
      const clientRef = doc(firestore, 'clients', clientData.id);
      await updateDoc(clientRef, { ...clientData });
    } catch (e) {
      console.error("Error updating client: ", e);
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      const clientRef = doc(firestore, 'clients', clientId);
      await deleteDoc(clientRef);
    } catch (e) {
      console.error("Error deleting client: ", e);
    }
  };

  const updateClientBalance = async (clientId: string, amount: number) => {
    try {
      const clientRef = doc(firestore, 'clients', clientId);
      await updateDoc(clientRef, {
        activeBalance: increment(amount)
      });
    } catch (e) {
      console.error("Error updating client balance: ", e);
    }
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
