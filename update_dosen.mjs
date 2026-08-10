// One-off script: overwrite ONLY the `dosen` field in Firestore with the current
// DOSEN_AWAL from src/data/seed.js, leaving mahasiswa/akun/periodeBuka untouched.
// Safe to delete after use.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { DOSEN_AWAL } from './src/data/seed.js';

const firebaseConfig = {
  apiKey: "AIzaSyAZp8-zyIr6nE6ydgzaWY9dtFPwBgwJjig",
  authDomain: "simantap-tl.firebaseapp.com",
  projectId: "simantap-tl",
  storageBucket: "simantap-tl.firebasestorage.app",
  messagingSenderId: "493633903702",
  appId: "1:493633903702:web:e778bff3853fda729ceff7",
  measurementId: "G-FQ5FWBDQ10"
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`Menulis ${DOSEN_AWAL.length} dosen dari seed.js ke sistem_ta/global_state...`);
  await updateDoc(doc(db, 'sistem_ta', 'global_state'), { dosen: DOSEN_AWAL });
  console.log('BERHASIL! Field "dosen" sudah diperbarui. Data mahasiswa/akun/periodeBuka tidak diubah.');
  process.exit(0);
}

main().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
