// ===================== firebase.js =====================
// Konfigurasi dan inisialisasi koneksi ke Google Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBsORQOnAro7ELYhQ8UOUycC1BmZsEpAHM",
  authDomain: "sistem-ta-undip.firebaseapp.com",
  projectId: "sistem-ta-undip",
  storageBucket: "sistem-ta-undip.firebasestorage.app",
  messagingSenderId: "90759526136",
  appId: "1:90759526136:web:f96954b27b775d9f7bad0d",
  measurementId: "G-BVB071ECC8"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor koneksi Database Firestore
export const db = getFirestore(app);
