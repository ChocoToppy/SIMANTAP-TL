// One-off script: copy sistem_ta/global_state from the old (previous developer's)
// Firebase project into the new simantap-tl project. Safe to delete after use.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const oldConfig = {
  apiKey: "AIzaSyBsORQOnAro7ELYhQ8UOUycC1BmZsEpAHM",
  authDomain: "sistem-ta-undip.firebaseapp.com",
  projectId: "sistem-ta-undip",
  storageBucket: "sistem-ta-undip.firebasestorage.app",
  messagingSenderId: "90759526136",
  appId: "1:90759526136:web:f96954b27b775d9f7bad0d",
  measurementId: "G-BVB071ECC8"
};

const newConfig = {
  apiKey: "AIzaSyAZp8-zyIr6nE6ydgzaWY9dtFPwBgwJjig",
  authDomain: "simantap-tl.firebaseapp.com",
  projectId: "simantap-tl",
  storageBucket: "simantap-tl.firebasestorage.app",
  messagingSenderId: "493633903702",
  appId: "1:493633903702:web:e778bff3853fda729ceff7",
  measurementId: "G-FQ5FWBDQ10"
};

async function main() {
  const oldApp = initializeApp(oldConfig, 'old');
  const newApp = initializeApp(newConfig, 'new');
  const oldDb = getFirestore(oldApp);
  const newDb = getFirestore(newApp);

  console.log('Membaca sistem_ta/global_state dari project lama (sistem-ta-undip)...');
  const snap = await getDoc(doc(oldDb, 'sistem_ta', 'global_state'));
  if (!snap.exists()) {
    console.error('GAGAL: dokumen sistem_ta/global_state tidak ditemukan di project lama.');
    process.exit(1);
  }
  const data = snap.data();
  console.log(`Ditemukan: ${(data.mahasiswa || []).length} mahasiswa, ${(data.dosen || []).length} dosen, ${(data.akun || []).length} akun.`);

  console.log('Menulis ke project baru (simantap-tl)...');
  await setDoc(doc(newDb, 'sistem_ta', 'global_state'), data);
  console.log('BERHASIL! Data sudah tersalin ke simantap-tl.');
  process.exit(0);
}

main().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
