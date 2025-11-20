import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// نستخدم متغيرات البيئة الخاصة بـ Vite
// Vercel سيقوم بحقن هذه القيم أثناء البناء
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// تهيئة التطبيق
// نقوم بتهيئة التطبيق فقط إذا كانت المفاتيح موجودة لتجنب توقف الموقع بالكامل
let app;
let dbInstance;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  } else {
    console.warn("Firebase keys are missing. The app will not connect to the DB until keys are added in Vercel.");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

export const db = dbInstance;
