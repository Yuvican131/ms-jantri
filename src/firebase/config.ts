// This file is responsible for loading the Firebase config.
// On Firebase App Hosting, the FIREBASE_CONFIG environment variable is automatically
// populated. For local development, it falls back to NEXT_PUBLIC_ environment variables.

let config;

try {
  // In a Firebase Hosting environment, the config is provided as a JSON string.
  if (process.env.FIREBASE_CONFIG) {
    config = JSON.parse(process.env.FIREBASE_CONFIG);
  }
} catch (e) {
  // This can happen during local development or if the env var is malformed.
  // The fallback to NEXT_PUBLIC_ variables will handle it.
  console.warn("Could not parse FIREBASE_CONFIG from environment. Falling back to NEXT_PUBLIC_ variables.");
}

// For local development, use environment variables from .env
// For Firebase Hosting, these will be undefined, and the `config` above will be used.
export const firebaseConfig = config || {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};


export const hasFirebaseConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;
