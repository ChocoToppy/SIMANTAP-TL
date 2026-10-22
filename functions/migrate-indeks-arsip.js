// ===================== functions/migrate-indeks-arsip.js =====================
// Skrip SEKALI JALAN (aman diulang): isi indeksMahasiswa/{id} untuk semua dokumen
// mahasiswa dan hitung ulang statistik/lulus dari nol (lihat indeksArsip.js). Jalankan
// setelah trigger jagaIndeksArsip ter-deploy, dan ulangi kapan pun angka statistik
// diragukan. Indeks yatim (mahasiswanya sudah tidak ada) dihapus.
//
// Pakai (default hanya laporan, tanpa menulis):
//   cd functions
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node migrate-indeks-arsip.js
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node migrate-indeks-arsip.js --tulis

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const { indeksDari, tambahLulus, kosong } = require('./indeksArsip');

const TULIS = process.argv.includes('--tulis');
const CHUNK = 400; // batas batch Firestore 500 operasi

async function main() {
  const [mhsSnap, indeksSnap, statSnap] = await Promise.all([
    db.collection('mahasiswa').get(),
    db.collection('indeksMahasiswa').get(),
    db.collection('statistik').doc('lulus').get(),
  ]);

  const adaIndeks = new Map(indeksSnap.docs.map((d) => [d.id, JSON.stringify(d.data())]));
  const tulis = [];
  const stat = kosong();
  mhsSnap.docs.forEach((d) => {
    const m = d.data();
    const indeks = indeksDari(m);
    if (adaIndeks.get(d.id) !== JSON.stringify(indeks)) tulis.push([d.id, indeks]);
    tambahLulus(stat, m, 1);
  });
  const idMhs = new Set(mhsSnap.docs.map((d) => d.id));
  const yatim = indeksSnap.docs.map((d) => d.id).filter((id) => !idMhs.has(id));
  const statLama = statSnap.exists ? statSnap.data() : null;
  const statBeda = !statLama || ['program', 'angkatan', 'dosen'].some((k) => JSON.stringify(statLama[k] || {}) !== JSON.stringify(stat[k]));

  console.log(`Dokumen mahasiswa: ${mhsSnap.size}`);
  console.log(`Indeks perlu ditulis/diperbarui: ${tulis.length}`);
  console.log(`Indeks yatim dihapus: ${yatim.length}`);
  console.log(`Lulus per program: ${JSON.stringify(stat.program)}`);
  console.log(`statistik/lulus ${statBeda ? 'berbeda dari hitungan ulang' : 'sudah sesuai'}.`);
  if (!TULIS) { console.log('\nMode laporan. Tambahkan --tulis untuk menulis.'); return; }

  const ops = [
    ...tulis.map(([id, isi]) => (b) => b.set(db.collection('indeksMahasiswa').doc(id), isi)),
    ...yatim.map((id) => (b) => b.delete(db.collection('indeksMahasiswa').doc(id))),
  ];
  for (let i = 0; i < ops.length; i += CHUNK) {
    const b = db.batch();
    ops.slice(i, i + CHUNK).forEach((op) => op(b));
    await b.commit();
  }
  // set tanpa merge: menimpa hitungan lama, termasuk kunci yang sudah nol.
  await db.collection('statistik').doc('lulus').set({ ...stat, diperbarui: new Date().toISOString() });
  console.log('Selesai.');
}

main().catch((e) => { console.error(e); process.exit(1); });
