import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// نستخدم متغيرات البيئة الخاصة بـ Vite
// Vercel سيقوم بحقن هذه القيم أثناء البناء
const firebaseConfig = {
  apiKey: import.meta.env.AIzaSyCtZ2giayw8VtCqBgjwug4yBJVqxauU_tc,
  authDomain: import.meta.env.hafezapp-39395.firebaseapp.com,
  projectId: import.meta.env.hafezapp-39395,
  storageBucket: import.meta.env.hafezapp-39395.firebasestorage.app,
  messagingSenderId: import.meta.env.41845779714,
  appId: import.meta.env.1:41845779714:web:8c621092ed05aec571a61b
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
