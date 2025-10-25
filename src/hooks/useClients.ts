'use client';
import { useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';

export type Client = {
  id: string;
  name: string;
  pair: string;
  comm: string;
  inOut: string;
  patti: string;
  activeBalance: number;
};

export const useClients = (userId?: string) => {
  const firestore = useFirestore();

  const clientsColRef = useMemoFirebase(() => {
    if (!userId) return null;
    return collection(firestore, `users/${userId}/clients`);
  }, [firestore, userId]);

  const { data: clients = [], isLoading, error } = useCollection<Omit<Client, 'id'>>(clientsColRef);

  const addClient = (client: Omit<Client, 'id'>) => {
    if (!clientsColRef) return;
    addDocumentNonBlocking(clientsColRef, client);
  };

  const updateClient = (client: Client) => {
    if (!userId) return;
    const clientRef = doc(firestore, `users/${userId}/clients`, client.id);
    const { id, ...clientData } = client;
    updateDocumentNonBlocking(clientRef, clientData);
  };

  const deleteClient = (id: string) => {
    if (!userId) return;
    const clientRef = doc(firestore, `users/${userId}/clients`, id);
    deleteDocumentNonBlocking(clientRef);
  };

  const handleClientTransaction = (clientId: string, amount: number) => {
    if (!userId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const newBalance = (client.activeBalance || 0) + amount;
      updateClient({ ...client, activeBalance: newBalance });
    }
  };

  return { clients, isLoading, error, addClient, updateClient, deleteClient, handleClientTransaction };
};
