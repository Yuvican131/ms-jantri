import * as admin from 'firebase-admin';

let firestore: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    // When deployed to a Google Cloud environment like App Hosting,
    // the Admin SDK is automatically initialized with the project's credentials.
    // For local development, it falls back to the service account JSON file.
    if (process.env.GCP_PROJECT) { // GCP_PROJECT is a standard env var in Google Cloud
        admin.initializeApp();
    } else {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (!serviceAccountJson) {
            console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not set for local development. Firebase Admin SDK will not be initialized.');
        } else {
            const serviceAccount = JSON.parse(serviceAccountJson);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    }
    firestore = admin.firestore();
  } catch (e) {
    console.error('Firebase admin initialization error.', e);
  }
} else {
  firestore = admin.firestore();
}

// @ts-ignore
export { firestore };
