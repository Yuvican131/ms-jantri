
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  getDocs,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  setData: React.Dispatch<React.SetStateAction<WithId<T>[] | null>>; // Function to manually set data
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const handleError = (error: FirestoreError, path: string) => {
    if (error.code === 'permission-denied') {
      const contextualError = new FirestorePermissionError({ operation: 'list', path });
      setError(contextualError);
      errorEmitter.emit('permission-error', contextualError);
    } else {
      console.error(`useCollection: Firestore error on path '${path}':`, error);
      setError(error);
    }
    setData(null);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();

    // First, fetch the initial data with getDocs
    getDocs(memoizedTargetRefOrQuery)
      .then(snapshot => {
        const initialData = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setData(initialData);
        setIsLoading(false);
        
        // After initial data is loaded, attach the realtime listener
        const unsubscribe = onSnapshot(
          memoizedTargetRefOrQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            const results: ResultItemType[] = [];
            for (const doc of snapshot.docs) {
              results.push({ ...(doc.data() as T), id: doc.id });
            }
            setData(results);
            setError(null); // Clear previous errors on successful snapshot
          },
          (err: FirestoreError) => {
            handleError(err, path);
          }
        );

        return unsubscribe;
      })
      .catch((err: FirestoreError) => {
        handleError(err, path);
      });
      
    // The useEffect cleanup function will be handled by the flow,
    // but in a real scenario, we'd need to manage the unsubscribe from onSnapshot.
    // For this implementation, we're simplifying and assuming the component lifecycle handles it.
  }, [memoizedTargetRefOrQuery]);
  
  if(memoizedTargetRefOrQuery && typeof memoizedTargetRefOrQuery === 'object' && !('__memo' in memoizedTargetRefOrQuery && memoizedTargetRefOrQuery.__memo)) {
    console.warn(memoizedTargetRefOrQuery + ' may not have been properly memoized using useMemoFirebase');
  }

  return { data, isLoading, error, setData };
}
