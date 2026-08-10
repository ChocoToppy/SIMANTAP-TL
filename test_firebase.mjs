import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAZp8-zyIr6nE6ydgzaWY9dtFPwBgwJjig",
  authDomain: "simantap-tl.firebaseapp.com",
  projectId: "simantap-tl",
  storageBucket: "simantap-tl.firebasestorage.app",
  messagingSenderId: "493633903702",
  appId: "1:493633903702:web:e778bff3853fda729ceff7",
  measurementId: "G-FQ5FWBDQ10"
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
