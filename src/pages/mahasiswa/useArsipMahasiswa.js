import { useEffect, useMemo, useState } from 'react';
import {
  collection, documentId, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where,
} from 'firebase/firestore';
import { db } from '../../utils/firebase.js';
import { todayISO, tambahHari } from '../../utils/helpers.js';

// ===================== Tabel arsip "Semua periode" =====================
// Satu halaman per kali dari indeksMahasiswa (dijaga trigger jagaIndeksArsip, lihat
// functions/indeksArsip.js), lalu record mahasiswa untuk baris halaman itu diambil per id.
// Indeks komposit untuk setiap kombinasi ada di firestore.indexes.json.
// Batasan dibanding tampilan biasa: cari = awalan nama/NIM, dan urutan hanya No./nama/
// tahap/deadline. No. = posisi baris di hasil saat ini (bawaan: urut masuk, terlama dulu).

export const URUT_ARSIP = { no: 'dibuatPada', nama: 'nama', tahap: 'tahap', deadline: 'batasAkhir' };
const KOSONG = []; // referensi tetap, supaya efek yang bergantung pada kursor tidak berulang
const STATUS_INDEKS = { aktif: 'aktif', lulus: 'lulus', batal: 'ditutup' };

// Dua filter rentang di field berbeda butuh indeks lain; pencarian menang atas filter deadline.
export function bangunArsip({ program, q, fAngkatan, fBidang, fStatus, fVerif, fDosen, sortBy, sortDir, groupMode }) {
  const syarat = [where('program', '==', program)];
  if (fAngkatan) syarat.push(where('angkatan', '==', String(fAngkatan)));
  if (fBidang) syarat.push(where('bidang', '==', fBidang));
  if (fVerif) syarat.push(where('verif', '==', fVerif));
  if (fDosen) syarat.push(where('dosen', 'array-contains', fDosen));
  if (STATUS_INDEKS[fStatus]) syarat.push(where('status', '==', STATUS_INDEKS[fStatus]));

  const kata = q.trim().toLowerCase();
  const deadline = fStatus === 'lewat' || fStatus === 'mendekati';
  let paksa = null;
  if (deadline) syarat.push(where('status', '==', 'aktif'));
  if (kata) {
    paksa = /^\d+$/.test(kata) ? 'nim' : 'nama';
    syarat.push(where(paksa, '>=', kata), where(paksa, '<=', kata + ''));
  } else if (deadline) {
    paksa = 'batasAkhir';
    const hariIni = todayISO();
    if (fStatus === 'lewat') syarat.push(where('batasAkhir', '>', ''), where('batasAkhir', '<', hariIni));
    else syarat.push(where('batasAkhir', '>=', hariIni), where('batasAkhir', '<=', tambahHari(hariIni, 30)));
  }

  let urutan;
  if (paksa) urutan = [orderBy(paksa, 'asc')];
  else if (groupMode === 'periode') urutan = [orderBy('periode', 'asc'), orderBy('dibuatPada', 'asc')];
  else urutan = [orderBy(URUT_ARSIP[sortBy] || 'dibuatPada', sortDir === 'desc' ? 'desc' : 'asc')];
  return { syarat, urutan, deadlineDiabaikan: !!kata && deadline, urutDipaksa: !!paksa || groupMode === 'periode' };
}

async function ambilRecord(ids) {
  const potongan = [];
  for (let i = 0; i < ids.length; i += 30) potongan.push(ids.slice(i, i + 30));
  const hasil = await Promise.all(potongan.map((p) => getDocs(query(collection(db, 'mahasiswa'), where(documentId(), 'in', p)))));
  const byId = new Map(hasil.flatMap((s) => s.docs.map((d) => [d.id, { ...d.data(), id: d.id }])));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function pesanGalat(e) {
  if (e && e.code === 'failed-precondition') {
    return 'Kombinasi filter dan urutan ini butuh indeks Firestore yang belum ada. Tautan pembuatannya ada di console browser.';
  }
  if (e && e.code === 'permission-denied') {
    return 'Arsip belum bisa dibaca: aturan Firestore untuk indeksMahasiswa belum di-deploy.';
  }
  return 'Data arsip gagal dimuat. Coba lagi beberapa saat lagi.';
}

// versi: naikkan setelah simpan/hapus supaya halaman ini diambil ulang.
export function useArsipMahasiswa({ aktif, filter, pageSize, versi }) {
  const susunan = useMemo(() => (aktif ? bangunArsip(filter) : null), [aktif, filter]);
  const kunci = aktif ? JSON.stringify(filter) + '|' + pageSize : '';
  // Dokumen terakhir tiap halaman sebelumnya, terikat ke kunci query-nya: kursor dari query
  // lain tidak boleh dipakai (startAfter akan gagal), jadi ganti filter = halaman 1.
  const [kursorState, setKursorState] = useState({ kunci: '', list: [] });
  const kursor = kursorState.kunci === kunci ? kursorState.list : KOSONG;
  const setKursor = (f) => setKursorState((s) => ({ kunci, list: f(s.kunci === kunci ? s.list : []) }));
  const [hasil, setHasil] = useState({ rows: [], akhir: null, penuh: false });
  const [total, setTotal] = useState(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    if (!susunan) return undefined;
    let batal = false;
    getCountFromServer(query(collection(db, 'indeksMahasiswa'), ...susunan.syarat))
      .then((s) => { if (!batal) setTotal(s.data().count); })
      .catch((e) => { if (!batal) setTotal(null); console.error('Arsip: gagal menghitung', e); });
    return () => { batal = true; };
  }, [kunci, versi]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!susunan) return undefined;
    let batal = false;
    setMemuat(true);
    setGalat('');
    const terakhir = kursor[kursor.length - 1];
    const q = query(collection(db, 'indeksMahasiswa'), ...susunan.syarat, ...susunan.urutan,
      ...(terakhir ? [startAfter(terakhir)] : []), limit(pageSize));
    getDocs(q)
      .then(async (snap) => {
        const rows = await ambilRecord(snap.docs.map((d) => d.id));
        if (batal) return;
        setHasil({ rows, akhir: snap.docs[snap.docs.length - 1] || null, penuh: snap.size === pageSize });
      })
      .catch((e) => {
        console.error('Arsip: gagal memuat halaman', e);
        if (!batal) { setHasil({ rows: [], akhir: null, penuh: false }); setGalat(pesanGalat(e)); }
      })
      .finally(() => { if (!batal) setMemuat(false); });
    return () => { batal = true; };
  }, [kunci, kursor, versi]); // eslint-disable-line react-hooks/exhaustive-deps

  const mulai = kursor.length * pageSize;
  return {
    rows: hasil.rows,
    total,
    mulai,
    halaman: kursor.length + 1,
    memuat,
    galat,
    deadlineDiabaikan: !!(susunan && susunan.deadlineDiabaikan),
    urutDipaksa: !!(susunan && susunan.urutDipaksa),
    bisaMundur: kursor.length > 0,
    // "penuh" saja tidak cukup: halaman terakhir yang pas sebanyak pageSize ditolak lewat total.
    bisaMaju: hasil.penuh && (total == null || mulai + pageSize < total),
    keAwal: () => setKursor(() => []),
    mundur: () => setKursor((k) => k.slice(0, -1)),
    maju: () => { if (hasil.akhir) setKursor((k) => [...k, hasil.akhir]); },
    // Ekspor: semua baris yang cocok, diambil per 500 saat diminta saja.
    async semua() {
      const ids = [];
      let akhir = null;
      for (;;) {
        const snap = await getDocs(query(collection(db, 'indeksMahasiswa'), ...susunan.syarat, ...susunan.urutan,
          ...(akhir ? [startAfter(akhir)] : []), limit(500)));
        snap.docs.forEach((d) => ids.push(d.id));
        if (snap.size < 500) break;
        akhir = snap.docs[snap.docs.length - 1];
      }
      return ambilRecord(ids);
    },
  };
}
