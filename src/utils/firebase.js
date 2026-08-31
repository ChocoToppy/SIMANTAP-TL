// ===================== firebase.js =====================
// Konfigurasi dan inisialisasi koneksi ke Google Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

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

// Ekspor koneksi Firebase Storage (berkas tanda tangan/nilai mahasiswa) —
// aktif setelah project di-upgrade ke paket Blaze.
export const storage = getStorage(app);

// Ekspor koneksi Firebase Authentication (login mahasiswa/dosen/admin) dan
// Cloud Functions (pendaftaran mandiri, kelola akun & reset password admin).
export const auth = getAuth(app);
export const functions = getFunctions(app);
