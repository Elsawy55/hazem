// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | undefined;
let dbInstance: Firestore | undefined;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  } else {
    console.warn("Firebase keys are missing. Running without DB.");
  }
} catch (err) {
  console.error("Error initializing Firebase:", err);
}

// بدل ما نصدر db مباشرة، نصدر دالة تضمن وجوده
export function getDb(): Firestore {
  if (!dbInstance) {
    throw new Error("Firestore is not initialized. Make sure environment variables are set.");
  }
  return dbInstance;
}
