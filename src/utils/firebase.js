// ===================== firebase.js =====================
// Konfigurasi dan inisialisasi koneksi ke Google Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAZp8-zyIr6nE6ydgzaWY9dtFPwBgwJjig",
  authDomain: "simantap-tl.firebaseapp.com",
  projectId: "simantap-tl",
  storageBucket: "simantap-tl.firebasestorage.app",
  messagingSenderId: "493633903702",
  appId: "1:493633903702:web:e778bff3853fda729ceff7",
  measurementId: "G-FQ5FWBDQ10"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor koneksi Database Firestore
export const db = getFirestore(app);
