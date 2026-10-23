// ===================== indeksArsip.js =====================
// Tampilan "Semua periode" admin tidak memuat seluruh koleksi mahasiswa (lihat
// src/pages/mahasiswa/useArsipMahasiswa.js). Trigger di sini menjaga dua hal dari setiap
// tulisan ke mahasiswa/{id}:
//   indeksMahasiswa/{id}  field yang di-query dan diurutkan tabel arsip. Koleksi terpisah,
//                         bukan field di record mahasiswa: record itu ditulis utuh oleh klien
//                         dan diperiksa per field di firestore.rules (sama alasannya dengan
//                         dataSuratDiubah di verifikasiSurat.js).
//   statistik/lulus       jumlah pengajuan Lulus yang tidak ditutup, per program, per angkatan,
//                         dan per dosen × field peran × program, untuk Dashboard & Dosen.
// Trigger bisa terpanggil lebih dari sekali untuk satu tulisan, jadi angka statistik bisa
// melenceng; `node migrate-indeks-arsip.js --tulis` menghitung ulang semuanya.

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

const PROGRAM_SAH = ['TA', 'KP', 'CAP', 'MG', 'S2']; // = PROGRAM_KEYS di src/utils/helpers.js
const programOf = (m) => (PROGRAM_SAH.includes(m.program) ? m.program : 'TA');
const VERIF_SAH = ['baru', 'terverifikasi', 'perbaikan']; // = VERIFIKASI di helpers.js
const FIELD_DOSEN = ['pembimbing1', 'pembimbing2', 'penguji1', 'penguji2'];

// Sama dengan tanggalDibuat() di helpers.js.
function tanggalDibuat(m) {
  const log = m.aktivitas || [];
  if (log.length) return log[0].at || '';
  return (m.pendaftaran && m.pendaftaran.submittedAt) || m.tanggalMulai || '';
}

function indeksDari(m) {
  return {
    program: programOf(m),
    periode: m.periode || '',
    angkatan: m.angkatan == null ? '' : String(m.angkatan),
    bidang: m.bidang || '',
    tahap: m.tahap || '',
    // Tenggat yang dipantau (= tenggat() di src/utils/helpers.js): KP memakai jendela
    // program (batasProgram, kosong sebelum surat tugas), program lain batasAkhir.
    // Nama field tetap batasAkhir supaya kueri & indeks komposit tidak berubah.
    batasAkhir: (programOf(m) === 'KP' ? m.batasProgram : m.batasAkhir) || '',
    nim: String(m.nim || ''),
    nama: String(m.nama || '').trim().toLowerCase(),
    dibuatPada: tanggalDibuat(m),
    status: m.dibatalkan ? 'ditutup' : m.tahap === 'Lulus' ? 'lulus' : 'aktif',
    verif: VERIF_SAH.includes(m.verifikasi) ? m.verifikasi : 'baru',
    dosen: [...new Set(FIELD_DOSEN.map((f) => m[f]).filter(Boolean))],
  };
}

// Tambahkan sumbangan satu record Lulus (n = +1 / -1) ke objek hitungan bertingkat.
function tambahLulus(acc, m, n) {
  if (!m || m.dibatalkan || m.tahap !== 'Lulus') return;
  const p = programOf(m);
  const angkatan = m.angkatan == null || m.angkatan === '' ? '—' : String(m.angkatan);
  const naik = (obj, kunci) => { obj[kunci] = (obj[kunci] || 0) + n; };
  naik(acc.program, p);
  naik((acc.angkatan[angkatan] = acc.angkatan[angkatan] || {}), p);
  FIELD_DOSEN.forEach((f) => {
    if (!m[f]) return;
    const perDosen = (acc.dosen[m[f]] = acc.dosen[m[f]] || {});
    naik((perDosen[p] = perDosen[p] || {}), f);
  });
}

const kosong = () => ({ program: {}, angkatan: {}, dosen: {} });

// Selisih bertingkat -> objek untuk set({merge:true}) dengan FieldValue.increment; null bila nol semua.
function keIncrement(obj) {
  let ada = false;
  const jalan = (o) => {
    const hasil = {};
    Object.entries(o).forEach(([k, v]) => {
      if (typeof v === 'number') {
        if (v !== 0) { hasil[k] = admin.firestore.FieldValue.increment(v); ada = true; }
      } else {
        const anak = jalan(v);
        if (Object.keys(anak).length) hasil[k] = anak;
      }
    });
    return hasil;
  };
  const hasil = jalan(obj);
  return ada ? hasil : null;
}

exports.jagaIndeksArsip = functions.firestore.document('mahasiswa/{id}').onWrite(async (change, context) => {
  const db = admin.firestore();
  const sebelum = change.before.exists ? change.before.data() : null;
  const sesudah = change.after.exists ? change.after.data() : null;
  const tugas = [];

  const refIndeks = db.collection('indeksMahasiswa').doc(context.params.id);
  if (!sesudah) tugas.push(refIndeks.delete());
  else {
    const baru = indeksDari(sesudah);
    if (!sebelum || JSON.stringify(indeksDari(sebelum)) !== JSON.stringify(baru)) tugas.push(refIndeks.set(baru));
  }

  const selisih = kosong();
  tambahLulus(selisih, sebelum, -1);
  tambahLulus(selisih, sesudah, 1);
  const inc = keIncrement(selisih);
  if (inc) tugas.push(db.collection('statistik').doc('lulus').set({ ...inc, diperbarui: new Date().toISOString() }, { merge: true }));

  await Promise.all(tugas);
});

module.exports.indeksDari = indeksDari;
module.exports.tambahLulus = tambahLulus;
module.exports.kosong = kosong;
