// ===================== functions/laporan-tema-bidang.js =====================
// Skrip LAPORAN SAJA (tidak menulis apa pun): mencari pengajuan yang `bidang`-nya
// berasal dari daftar yang salah untuk programnya.
//  - KP/Magang dengan kode di luar Tema KP (mis. 'U' = Udara): sebelum
//    2026-10-19 form pendaftaran selalu mulai dengan bidang 'U', jadi mahasiswa
//    yang tidak menyentuh dropdown tersimpan "Udara" walau layar menampilkan
//    tema KP pertama, dan {tema_kp} di surat tercetak "Udara".
//  - TA (sejak 2026-10-20 memakai daftar Tema yang sama dengan KP) dengan kode
//    Bidang lama (mis. 'AL'), dan Capstone/S2 dengan kode Tema.
// Perbaiki tiap pengajuan lewat modal edit admin: dropdown-nya kini
// menampilkan nilai yang salah sebagai "... (tidak valid, pilih ulang)".
//
// Pakai:
//   cd functions
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node laporan-tema-bidang.js

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// = KP_TEMA & BIDANG bawaan di src/utils/pilihan.js (ditambah override admin di config/global).
const KP_TEMA = ['PBPAM', 'SPAM', 'K3', 'B3', 'Drainase', 'PengolahanSampah', 'SML', 'TeknologiBersih',
  'ManajemenSampah', 'KualitasLingkungan', 'PemantauanUdara', 'PengolahanAirLimbah', 'ESG'];
const BIDANG = ['U', 'S', 'DL', 'AL', 'AB', 'K3L', 'MIX'];

async function main() {
  const [mhsSnap, cfg] = await Promise.all([
    db.collection('mahasiswa').get(),
    db.collection('config').doc('global').get(),
  ]);
  const pilihan = ((cfg.exists && cfg.data().konten) || {}).pilihan || {};
  const kpTema = new Set([...KP_TEMA, ...(pilihan.kpTema || []).map((x) => x.kode)]);
  const bidang = new Set([...BIDANG, ...(pilihan.bidang || []).map((x) => x.kode)]);

  const salah = [];
  mhsSnap.docs.forEach((d) => {
    const m = d.data();
    const program = m.program || 'TA';
    const gayaKP = program === 'KP' || program === 'MG' || program === 'TA'; // = pakaiTemaKP di src/utils/pilihan.js
    const sah = gayaKP ? kpTema.has(m.bidang) : bidang.has(m.bidang);
    if (!sah) salah.push({ id: d.id, m, program });
  });

  console.log(`Dokumen mahasiswa: ${mhsSnap.size}`);
  console.log(`Tema/bidang tidak cocok dengan programnya: ${salah.length}`);
  salah.forEach(({ id, m, program }) => {
    console.log(`  - ${id}  ${m.nama || '-'} (${m.nim || '-'})  ${program}  bidang=${JSON.stringify(m.bidang)}  tahap=${m.tahap || '-'}${m.dibatalkan ? '  [ditutup]' : ''}`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
