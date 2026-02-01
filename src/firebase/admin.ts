import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Firebase admin initialization error. Make sure you have set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable.', e);
  }
}

const firestore = admin.firestore();
export { firestore };
