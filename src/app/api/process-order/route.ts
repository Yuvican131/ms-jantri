import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { processOrder } from '@/ai/flows/process-order-flow';
import { format } from 'date-fns';

// This endpoint is designed to be called by a service like n8n.
// It expects a JSON body with:
// {
//   "message": "The client's message content",
//   "clientPhoneNumber": "The client's phone number"
// }

export async function POST(request: Request) {
  const { firestore } = initializeFirebase();
  try {
    const body = await request.json();
    const { message, clientPhoneNumber } = body;

    if (!message || !clientPhoneNumber) {
      return NextResponse.json({ error: 'Missing message or clientPhoneNumber' }, { status: 400 });
    }

    // 1. Find the user who has this client.
    // This is a simplified approach. A real-world app might need a more robust way
    // to map a phone number to a user and client, perhaps by storing phone numbers
    // on the client documents. For now, we assume phone numbers are unique across all clients.
    // NOTE: This approach has scalability limitations.
    const usersCollection = collection(firestore, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    let targetUserId: string | null = null;
    let targetClientId: string | null = null;
    let targetClientName: string | null = null;

    // This loop is inefficient and not suitable for large scale.
    // A better approach would be a dedicated 'clients' root collection with phone number fields.
    for (const userDoc of usersSnapshot.docs) {
      const clientsCollectionRef = collection(firestore, `users/${userDoc.id}/clients`);
      // Assuming 'inOut' field stores the phone number. This should be a dedicated field.
      const q = query(clientsCollectionRef, where("inOut", "==", clientPhoneNumber));
      const clientsSnapshot = await getDocs(q);

      if (!clientsSnapshot.empty) {
        targetUserId = userDoc.id;
        targetClientId = clientsSnapshot.docs[0].id;
        targetClientName = clientsSnapshot.docs[0].data().name;
        break;
      }
    }

    if (!targetUserId || !targetClientId) {
      return NextResponse.json({ error: `Client with phone number ${clientPhoneNumber} not found.` }, { status: 404 });
    }

    // 2. Use AI to parse the message
    const processedData = await processOrder({ message, clientPhoneNumber });
    const { draw, orders } = processedData;

    if (!draw || !orders || orders.length === 0) {
        return NextResponse.json({ error: 'AI could not process the order from the message.' }, { status: 400 });
    }

    // 3. Prepare to save the data to a sheet log
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const sheetLogId = `${targetClientId}-${draw}-${todayStr}`; // Predictable ID
    const sheetLogRef = doc(firestore, `users/${targetUserId}/sheetLogs`, sheetLogId);

    const sheetLogSnapshot = await getDoc(sheetLogRef);
    const existingData = sheetLogSnapshot.exists() ? sheetLogSnapshot.data().data : {};
    let newGameTotal = sheetLogSnapshot.exists() ? sheetLogSnapshot.data().gameTotal : 0;
    const mergedData = { ...existingData };

    orders.forEach(order => {
        const key = order.number.padStart(2, '0');
        const amount = order.amount;
        
        const existingAmount = parseFloat(mergedData[key]) || 0;
        mergedData[key] = String(existingAmount + amount);
        newGameTotal += amount;
    });

    const logEntry = {
        clientId: targetClientId,
        clientName: targetClientName,
        draw: draw,
        date: todayStr,
        gameTotal: newGameTotal,
        data: mergedData,
    };
    
    // Using set with merge is like an "upsert" - it creates or updates.
    await setDoc(sheetLogRef, logEntry, { merge: true });

    return NextResponse.json({ success: true, message: `Order processed for ${targetClientName} in draw ${draw}.` });

  } catch (e: any) {
    console.error('Error processing order:', e);
    return NextResponse.json({ error: 'An internal error occurred.', details: e.message }, { status: 500 });
  }
}
