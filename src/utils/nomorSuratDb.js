import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from './firebase.js';
import { programOf, nowStamp } from './helpers.js';
import { formatNomor, idNomor } from './nomorSurat.js';

// ===================== Registri nomor surat (Firestore) =====================
// nomorSurat/{tahun-urut}   satu dokumen per nomor yang pernah diterbitkan — TIDAK
//                           pernah dihapus, jadi nomor yang sudah kedaluwarsa tidak
//                           mungkin dipakai lagi.
// nomorSuratCounter/{tahun} { terakhir } nomor urut terakhir tahun itu.
// Penerbitan & pengakhiran selalu lewat transaksi yang sekaligus menulis ke dokumen
// mahasiswa (nomorSurat, nomorSuratId), supaya registri dan record tidak bisa selisih
// dan dua admin yang menekan tombol bersamaan tidak mendapat nomor yang sama.

const oleh = () => (auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || 'admin';

// Nomor yang AKAN diterbitkan kalau diminta sekarang — hanya untuk pratinjau;
// nomor sebenarnya ditentukan ulang di dalam transaksi.
export async function pratinjauNomor() {
  const now = new Date();
  const tahun = now.getFullYear();
  const snap = await getDoc(doc(db, 'nomorSuratCounter', String(tahun)));
  const urut = (snap.exists() ? snap.data().terakhir : 0) + 1;
  return { urut, nomor: formatNomor(urut, now.getMonth() + 1, tahun) };
}

export async function terbitkanNomor(m) {
  const now = new Date();
  const tahun = now.getFullYear();
  const bulan = now.getMonth() + 1;
  const counterRef = doc(db, 'nomorSuratCounter', String(tahun));
  const mhsRef = doc(db, 'mahasiswa', m.id);
  return runTransaction(db, async (tx) => {
    const mhsSnap = await tx.get(mhsRef);
    if (!mhsSnap.exists()) throw new Error('Simpan data mahasiswa ini dulu sebelum meminta nomor surat.');
    if (mhsSnap.data().nomorSuratId) throw new Error('Mahasiswa ini sudah punya nomor surat aktif.');
    const counterSnap = await tx.get(counterRef);
    const urut = (counterSnap.exists() ? counterSnap.data().terakhir : 0) + 1;
    const id = idNomor(tahun, urut);
    const nomor = formatNomor(urut, bulan, tahun);
    tx.set(doc(db, 'nomorSurat', id), {
      id, urut, tahun, bulan, nomor,
      mahasiswaId: m.id, nim: m.nim || '', nama: m.nama || '', program: programOf(m),
      status: 'aktif', diterbitkan: nowStamp(), diterbitkanOleh: oleh(),
    });
    tx.set(counterRef, { terakhir: urut });
    tx.update(mhsRef, { nomorSurat: nomor, nomorSuratId: id });
    return { id, nomor };
  });
}

// Tandai nomor aktif milik `m` sebagai kedaluwarsa, lalu terapkan `patch` ke
// dokumen mahasiswa dalam transaksi yang sama (mengosongkan nomor + perubahan
// tambahan, mis. reset pendaftaran untuk "daftar ulang").
export async function akhiriNomor(m, alasan, patch = {}) {
  const mhsRef = doc(db, 'mahasiswa', m.id);
  return runTransaction(db, async (tx) => {
    const mhsSnap = await tx.get(mhsRef);
    if (!mhsSnap.exists()) throw new Error('Data mahasiswa tidak ditemukan di server.');
    const id = mhsSnap.data().nomorSuratId;
    const regRef = id ? doc(db, 'nomorSurat', id) : null;
    const regSnap = regRef ? await tx.get(regRef) : null;
    if (regSnap && regSnap.exists()) {
      tx.update(regRef, { status: 'kedaluwarsa', diakhiri: nowStamp(), diakhiriOleh: oleh(), alasanAkhir: alasan });
    }
    const penuh = { nomorSurat: '', nomorSuratId: '', ...patch };
    tx.update(mhsRef, penuh);
    return penuh;
  });
}
