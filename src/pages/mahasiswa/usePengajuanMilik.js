import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase.js';

// Semua pengajuan milik satu mahasiswa, langsung dari Firestore. Daftar admin tidak memuat
// pengajuan Lulus dari periode lama, jadi pengecekan lintas pengajuan tidak bisa
// mengandalkan allMahasiswa saja. aktif=false: tidak membaca apa pun.
export function usePengajuanMilik(owner, aktif) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!aktif || !owner) { setList([]); return undefined; }
    let batal = false;
    getDocs(query(collection(db, 'mahasiswa'), where('owner', '==', owner)))
      .then((snap) => { if (!batal) setList(snap.docs.map((d) => ({ ...d.data(), id: d.id }))); })
      .catch((e) => console.error('Gagal membaca pengajuan mahasiswa:', e));
    return () => { batal = true; };
  }, [owner, aktif]);
  return list;
}
