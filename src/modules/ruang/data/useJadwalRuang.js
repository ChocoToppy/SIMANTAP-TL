import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../host.js';
import { FITUR_EKSPERIMENTAL } from '../host.js';
import { rancangImpor } from '../logic/ruangBooking.js';
import { rancangSinkronProgram } from '../logic/sinkronRuang.js';

// ===================== useJadwalRuang.js =====================
// Koleksi Firestore: ruang, semesterRuang, booking (satu dokumen per baris).
// Admin mendengarkan semuanya; selain admin hanya semester berstatus 'terbit'
// dan booking ber-flag terbit:true (lihat firestore.rules — flag ini disalin dari
// status semester saat Terbitkan/Tarik supaya rules bisa memfilter tanpa get()).
// Hanya aktif di build eksperimental.

const CHUNK = 400; // batas batch Firestore 500 operasi

async function jalankanBatch(ops) {
  for (let i = 0; i < ops.length; i += CHUNK) {
    const b = writeBatch(db);
    ops.slice(i, i + CHUNK).forEach((op) => op(b));
    await b.commit();
  }
}

export function useJadwalRuang(authUser, claims) {
  const [ruang, setRuang] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [bookings, setBookings] = useState([]);
  const isAdmin = claims?.role === 'admin';

  useEffect(() => {
    if (!FITUR_EKSPERIMENTAL || !authUser) { setRuang([]); setSemesters([]); setBookings([]); return; }
    const baca = (ref, set, nama) => onSnapshot(ref, (snap) => set(snap.docs.map((d) => ({ ...d.data(), id: d.id }))), (e) => { console.error(`jadwal ruang: gagal membaca ${nama}:`, e); set([]); });
    const unsubs = [
      baca(collection(db, 'ruang'), setRuang, 'ruang'),
      baca(isAdmin ? collection(db, 'semesterRuang') : query(collection(db, 'semesterRuang'), where('status', '==', 'terbit')), setSemesters, 'semesterRuang'),
      baca(isAdmin ? collection(db, 'booking') : query(collection(db, 'booking'), where('terbit', '==', true)), setBookings, 'booking'),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authUser, isAdmin]);

  const data = useMemo(() => (FITUR_EKSPERIMENTAL ? { ruang, semesters, bookings } : null), [ruang, semesters, bookings]);

  // ----- Aksi admin (melempar error ke pemanggil supaya UI bisa menampilkannya) -----
  const aksi = useMemo(() => ({
    simpanRuang: (r) => jalankanBatch([(b) => b.set(doc(db, 'ruang', r.id), r)]),
    hapusRuang: (id) => jalankanBatch([(b) => b.delete(doc(db, 'ruang', id))]),
    simpanSemester: (s) => jalankanBatch([(b) => b.set(doc(db, 'semesterRuang', s.id), s)]),

    // Tulis/hapus booking dalam satu batch; flag terbit mengikuti status semester.
    tulisBooking: ({ set, hapus }, semester) => jalankanBatch([
      ...set.map((x) => (b) => b.set(doc(db, 'booking', x.id), { ...x, semesterId: semester.id, terbit: semester.status === 'terbit', diperbarui: new Date().toISOString() })),
      ...hapus.map((id) => (b) => b.delete(doc(db, 'booking', id))),
    ]),

    // Tulis booking apa adanya (sudah membawa semesterId/terbit) — dipakai sinkron program.
    tulisBookingLangsung: ({ set, hapus }) => jalankanBatch([
      ...set.map((x) => (b) => b.set(doc(db, 'booking', x.id), { ...x, diperbarui: new Date().toISOString() })),
      ...hapus.map((id) => (b) => b.delete(doc(db, 'booking', id))),
    ]),

    // Hapus semester + seluruh booking-nya.
    hapusSemester: (semester) => jalankanBatch([
      ...bookings.filter((x) => x.semesterId === semester.id).map((x) => (b) => b.delete(doc(db, 'booking', x.id))),
      (b) => b.delete(doc(db, 'semesterRuang', semester.id)),
    ]),

    // Terbitkan / tarik kembali ke draft: status semester + flag terbit tiap booking.
    setTerbit: (semester, terbit) => jalankanBatch([
      (b) => b.update(doc(db, 'semesterRuang', semester.id), { status: terbit ? 'terbit' : 'draft' }),
      ...bookings.filter((x) => x.semesterId === semester.id).map((x) => (b) => b.update(doc(db, 'booking', x.id), { terbit })),
    ]),

    // Impor ulang dari Excel: hapus booking sumber 'impor' milik semester ini (booking
    // manual tetap), buat ruang baru bila perlu, tulis booking baru sebagai draft.
    imporKeSemester: async (semester, hasil) => {
      if (semester.status === 'terbit') throw new Error('Semester sudah terbit. Tarik ke draft dulu sebelum impor ulang.');
      const { ruangBaru, bookings: baru } = rancangImpor(hasil, ruang, semester);
      const nowIso = new Date().toISOString();
      await jalankanBatch([
        ...bookings.filter((x) => x.semesterId === semester.id && x.sumber === 'impor').map((x) => (b) => b.delete(doc(db, 'booking', x.id))),
        ...ruangBaru.map((r) => (b) => b.set(doc(db, 'ruang', r.id), r)),
        ...baru.map((x) => (b) => b.set(doc(db, 'booking', x.id), { ...x, terbit: false, dibuat: nowIso })),
        (b) => b.update(doc(db, 'semesterRuang', semester.id), { imporTerakhir: { sumber: hasil.sumber, waktu: nowIso, jumlah: baru.length } }),
      ]);
      return { ruangBaru: ruangBaru.length, booking: baru.length };
    },
  }), [ruang, bookings]);

  return { data, aksi };
}

// Rekonsiliasi jadwal program -> booking, dijalankan di sesi ADMIN (hanya admin yang
// boleh menulis booking). Idempoten: id booking deterministik, hanya selisih yang
// ditulis, jadi beberapa admin sekaligus tidak saling merusak. Ditunda sebentar
// supaya data cache -> server sempat selesai dimuat sebelum menghapus apa pun.
// Konsekuensi: perubahan oleh mahasiswa (mis. membatalkan jadwal terkonfirmasi)
// baru tercermin di grid saat admin membuka aplikasi.
export function useSinkronProgram({ aktif, mahasiswa, data, aksi }) {
  const [tidakMasuk, setTidakMasuk] = useState([]);
  useEffect(() => {
    if (!FITUR_EKSPERIMENTAL || !aktif || !data || !data.ruang.length || !data.semesters.length) { setTidakMasuk([]); return undefined; }
    const t = setTimeout(() => {
      const r = rancangSinkronProgram(mahasiswa, data);
      setTidakMasuk(r.tidakMasuk);
      if (r.set.length || r.hapus.length) aksi.tulisBookingLangsung(r).catch((e) => console.error('sinkron ruang:', e));
    }, 1500);
    return () => clearTimeout(t);
  }, [aktif, mahasiswa, data, aksi]);
  return tidakMasuk;
}
