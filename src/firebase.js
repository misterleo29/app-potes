import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB_tDzo8-qrLHfGl3vGL0J4eYy0NnFevMc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "app-potes.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://app-potes-default-rtdb.firebaseio.com/",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "app-potes",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "app-potes.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "822737254215",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:822737254215:web:b1fce7966e9f25e9ae7e62"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;
