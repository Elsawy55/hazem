
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Safety check: ensure import.meta.env exists before accessing properties
// This prevents the "Cannot read properties of undefined" error
const getEnv = (key: keyof ImportMetaEnv) => {
  // @ts-ignore
  return (import.meta.env && import.meta.env[key]) ? import.meta.env[key] : undefined;
};

const firebaseConfig = {
  apiKey: import.meta.env ? import.meta.env.AIzaSyCtZ2giayw8VtCqBgjwug4yBJVqxauU_tc : undefined,
  authDomain: import.meta.env ? import.meta.envhafezapp-39395.firebaseapp.com : undefined,
  projectId: import.meta.env ? import.meta.env.hafezapp-39395 : undefined,
  storageBucket: import.meta.env ? import.meta.env.hafezapp-39395.firebasestorage.app : undefined,
  messagingSenderId: import.meta.env ? import.meta.env.41845779714 : undefined,
  appId: import.meta.env ? import.meta.env.1:41845779714:web:8c621092ed05aec571a61b : undefined
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
