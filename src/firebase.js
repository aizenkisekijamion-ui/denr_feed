import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBfTfDZ9cCjkcl0tHgdTyNYjMkUQXeX0us",
  authDomain: "denr-de13b.firebaseapp.com",
  projectId: "denr-de13b",
  storageBucket: "denr-de13b.firebasestorage.app",
  messagingSenderId: "579969232506",
  appId: "1:579969232506:web:f84a570f75da1ee585d5c3",
  measurementId: "G-QF8CKXL80D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
