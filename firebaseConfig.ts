
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Safety check: ensure import.meta.env exists before accessing properties
// This prevents the "Cannot read properties of undefined" error
const getEnv = (key: keyof ImportMetaEnv) => {
  // @ts-ignore
  return (import.meta.env && import.meta.env[key]) ? import.meta.env[key] : undefined;
};

const firebaseConfig = {
  apiKey: import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : undefined,
  authDomain: import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined,
  projectId: import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined,
  storageBucket: import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined,
  messagingSenderId: import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined,
  appId: import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : undefined
};

// تهيئة التطبيق
let app;
let dbInstance;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  } else {
    console.warn("Firebase keys are missing. The app will run without a DB connection.");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export const db = dbInstance;
