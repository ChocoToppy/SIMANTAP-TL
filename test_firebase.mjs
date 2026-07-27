import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsORQOnAro7ELYhQ8UOUycC1BmZsEpAHM",
  authDomain: "sistem-ta-undip.firebaseapp.com",
  projectId: "sistem-ta-undip",
  storageBucket: "sistem-ta-undip.firebasestorage.app",
  messagingSenderId: "90759526136",
  appId: "1:90759526136:web:f96954b27b775d9f7bad0d",
  measurementId: "G-BVB071ECC8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebase() {
  console.log("Mencoba menulis ke Firebase...");
  try {
    await setDoc(doc(db, 'sistem_ta', 'test_koneksi'), { halo: "dunia" });
    console.log("BERHASIL! Firebase sudah aktif dan bisa ditulisi.");
  } catch (error) {
    console.error("GAGAL:", error.message);
  }
  process.exit();
}

testFirebase();
