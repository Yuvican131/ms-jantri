import * as admin from 'firebase-admin';

// This is a global variable that will hold the firestore instance
let firestore: admin.firestore.Firestore;

// Check if the admin app is already initialized
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    // Guard against missing environment variable during build
    if (!serviceAccountJson) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not set. Firebase Admin SDK will not be initialized. This is expected during some build stages, but is an error in a server-side environment.');
    } else {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      // Initialize firestore only after a successful app initialization
      firestore = admin.firestore();
    }
  } catch (e) {
    console.error('Firebase admin initialization error. Make sure you have set a valid FIREBASE_SERVICE_ACCOUNT_JSON environment variable.', e);
  }
} else {
  // If the app is already initialized, just get the firestore instance
  firestore = admin.firestore();
}

// Export the firestore instance. It might be undefined if initialization failed.
// The consuming code must handle this.
// @ts-ignore
export { firestore };
