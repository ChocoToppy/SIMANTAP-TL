import { collection, doc, getDocs, updateDoc, query, where, runTransaction } from 'firebase/firestore';
import { db, auth } from './firebase.js';
import { programOf, nowStamp } from './helpers.js';
import { formatNomor, idNomor, bacaNomor } from './nomorSurat.js';

// ===================== Registri nomor surat (Firestore) =====================
// nomorSurat/{tahun-bulan-urut}  satu dokumen per nomor yang pernah dipakai, diketik admin
//                           atau diisi lewat tombol "Ambil nomor". TIDAK pernah
//                           dihapus, jadi nomor yang sudah kedaluwarsa tidak mungkin
//                           dipakai lagi.
// Nomor dicatat saat data mahasiswa disimpan (catatNomorManual), lewat transaksi yang
// membaca dokumen nomor itu dulu: dua admin yang menyimpan nomor yang sama bersamaan
// tidak bisa sama-sama berhasil.

const oleh = () => (auth.currentUser && (auth.currentUser.email || auth.currentUser.uid)) || 'admin';

// Saran untuk tombol "Ambil nomor": nomor urut terkecil di bulan surat yang belum
// ada di registri dan belum dipakai record mahasiswa mana pun (`terpakai(tahun, bulan)`:
// nomor urut dari record yang belum tercatat di registri). Hanya saran; tidak menulis apa pun.
// Nomor yang diketik lebih jauh (mis. 045) dilewati saat urutan sampai ke sana.
// `tanggal` ('YYYY-MM-DD') = tanggal surat; bawaan hari ini. KP memakai tanggal surat
// tugas (1 bulan sebelum KP di perusahaan), yang boleh di bulan/tahun depan.
export async function nomorBerikutnya(terpakai = () => [], tanggal = '') {
  const [tahun, bulan] = tanggal ? tanggal.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const snap = await getDocs(query(collection(db, 'nomorSurat'), where('tahun', '==', tahun), where('bulan', '==', bulan)));
  const dipakai = new Set(typeof terpakai === 'function' ? terpakai(tahun, bulan) : terpakai);
  snap.forEach((d) => dipakai.add(Number(d.data().urut)));
  let urut = 1;
  while (dipakai.has(urut)) urut += 1;
  return formatNomor(urut, bulan, tahun);
}

// Dicatat SEBELUM record mahasiswa disimpan: nomor masuk registri, dan nomor lama
// mahasiswa ini (bila diganti atau dikosongkan) ditandai kedaluwarsa. Mengembalikan
// nomorSuratId untuk record itu ('' bila nomor dikosongkan). Menolak nomor yang dipakai
// mahasiswa lain atau yang sudah pernah diakhiri. opsi.longgar: lihat bacaNomor.
// opsi.sumber: 'saran' bila nomor berasal dari tombol "Ambil nomor".
export async function catatNomorManual(m, lama, opsi = {}) {
  const nomor = (m.nomorSurat || '').trim();
  const p = nomor ? bacaNomor(nomor, opsi) : null;
  if (nomor && !p) throw new Error('Format nomor surat tidak sesuai. Lihat panduan format di samping isian Nomor Surat.');
  const idBaru = p ? idNomor(p.tahun, p.bulan, p.urut) : '';
  const idLama = (lama && lama.nomorSuratId) || '';
  if (idBaru === idLama) return idBaru;
  return runTransaction(db, async (tx) => {
    const regBaruRef = idBaru ? doc(db, 'nomorSurat', idBaru) : null;
    const regLamaRef = idLama ? doc(db, 'nomorSurat', idLama) : null;
    const regBaru = regBaruRef ? await tx.get(regBaruRef) : null;
    const regLama = regLamaRef ? await tx.get(regLamaRef) : null;

    if (regBaru && regBaru.exists()) {
      const r = regBaru.data();
      if (r.status !== 'aktif') throw new Error(`Nomor ${r.nomor} sudah pernah dipakai ${r.nama} (${r.nim}) dan sudah diakhiri, jadi tidak bisa dipakai lagi.`);
      if (r.mahasiswaId !== m.id) throw new Error(`Nomor ${r.nomor} sudah dipakai ${r.nama} (${r.nim}).`);
    } else if (regBaru) {
      tx.set(regBaruRef, {
        id: idBaru, urut: p.urut, tahun: p.tahun, bulan: p.bulan, nomor,
        mahasiswaId: m.id, nim: m.nim || '', nama: m.nama || '', program: programOf(m),
        status: 'aktif', sumber: opsi.sumber || 'manual', diterbitkan: nowStamp(), diterbitkanOleh: oleh(),
      });
    }
    if (regLama && regLama.exists() && regLama.data().status === 'aktif') {
      tx.update(regLamaRef, {
        status: 'kedaluwarsa', diakhiri: nowStamp(), diakhiriOleh: oleh(),
        alasanAkhir: nomor ? `Diganti ke ${nomor}` : 'Nomor dikosongkan',
      });
    }
    return idBaru;
  });
}

// Mahasiswa dihapus: nomornya tetap di registri (tidak dipakai ulang), ditandai kedaluwarsa.
export async function akhiriNomorTerhapus(m) {
  if (!m || !m.nomorSuratId) return;
  await updateDoc(doc(db, 'nomorSurat', m.nomorSuratId), {
    status: 'kedaluwarsa', diakhiri: nowStamp(), diakhiriOleh: oleh(), alasanAkhir: 'Data mahasiswa dihapus',
  });
}
