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
const envConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Hardcoded fallback for local development if environment variables are not set.
const hardcodedConfig = {
  apiKey: "AIzaSyDKxGOWyVi6GXpfauTRLaGPGFREkZa-epg",
  authDomain: "ms-jantri-55079957-98b95.firebaseapp.com",
  projectId: "ms-jantri-55079957-98b95",
  storageBucket: "ms-jantri-55079957-98b95.appspot.com", // Corrected domain for storage bucket
  messagingSenderId: "114108861217",
  appId: "1:114108861217:web:c3d391d66e156b570c0c60",
  measurementId: "",
};

// Priority order for configuration:
// 1. FIREBASE_CONFIG (from Firebase App Hosting)
// 2. NEXT_PUBLIC_... environment variables (from Netlify/Vercel/.env)
// 3. Hardcoded fallback (for local development without .env)
export const firebaseConfig = config || (envConfig.apiKey ? envConfig : hardcodedConfig);


export const hasFirebaseConfig =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;
