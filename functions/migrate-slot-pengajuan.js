// ===================== functions/migrate-slot-pengajuan.js =====================
// Skrip SEKALI JALAN (aman diulang): isi koleksi slotPengajuan untuk dokumen
// 'mahasiswa' yang ID-nya bukan "{owner}_{program}" (data dari sebelum batas
// satu pengajuan per program, buatan admin, atau setelah ganti NIM), supaya
// firestore.rules juga menolak pengajuan kedua untuk pasangan (nim, program) itu.
// Dokumennya sendiri tidak diubah/di-rename.
//
// Juga melaporkan duplikat yang SUDAH ada (lebih dari satu dokumen untuk
// pasangan yang sama) — skrip tidak menghapus apa pun, admin yang memilih
// mana yang dipertahankan.
//
// Pakai (default hanya laporan, tanpa menulis):
//   cd functions
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node migrate-slot-pengajuan.js
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node migrate-slot-pengajuan.js --tulis

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const TULIS = process.argv.includes('--tulis');
const PROGRAM_SAH = ['TA', 'KP', 'CAP', 'MG', 'S2']; // = PROGRAM_KEYS di src/utils/helpers.js

// Sama dengan programOf() di helpers.js: program tak dikenal dianggap TA.
const programOf = (m) => (PROGRAM_SAH.includes(m.program) ? m.program : 'TA');

async function main() {
  const [mhsSnap, slotSnap] = await Promise.all([
    db.collection('mahasiswa').get(),
    db.collection('slotPengajuan').get(),
  ]);

  // Kelompokkan per pasangan (owner, program).
  const grup = new Map();
  let tanpaOwner = 0;
  mhsSnap.docs.forEach((d) => {
    const m = d.data();
    if (!m.owner) { tanpaOwner++; return; }
    if (m.dibatalkan) return; // pengajuan yang ditutup tidak memegang slot (arsip)
    const kunci = `${m.owner}_${programOf(m)}`;
    if (!grup.has(kunci)) grup.set(kunci, []);
    grup.get(kunci).push({ id: d.id, m });
  });

  // Penanda yang seharusnya ada: satu per pasangan yang dipegang dokumen ber-ID lain.
  const seharusnya = new Map();
  const duplikat = [];
  grup.forEach((docs, kunci) => {
    if (docs.length > 1) duplikat.push({ kunci, docs });
    const lain = docs.filter((x) => x.id !== kunci);
    if (lain.length) seharusnya.set(kunci, { mahasiswaId: lain[0].id, owner: lain[0].m.owner, program: programOf(lain[0].m) });
  });

  const ada = new Map(slotSnap.docs.map((d) => [d.id, d.data()]));
  const tulis = [];
  const hapus = [];
  seharusnya.forEach((val, id) => {
    const lama = ada.get(id);
    if (!lama || lama.mahasiswaId !== val.mahasiswaId || lama.owner !== val.owner) tulis.push([id, val]);
  });
  ada.forEach((_, id) => { if (!seharusnya.has(id)) hapus.push(id); });

  console.log(`Dokumen mahasiswa: ${mhsSnap.size} (${tanpaOwner} tanpa owner, dilewati)`);
  console.log(`Penanda slotPengajuan: ${seharusnya.size} seharusnya ada, ${tulis.length} perlu ditulis, ${hapus.length} kedaluwarsa`);

  if (duplikat.length) {
    console.log(`\n${duplikat.length} pasangan (NIM, program) punya lebih dari satu pengajuan — pilih salah satu dan hapus sisanya dari halaman admin:`);
    duplikat.forEach(({ kunci, docs }) => {
      console.log(`  ${kunci}`);
      docs.forEach(({ id, m }) => console.log(`    - ${id}  "${m.judul || '(tanpa judul)'}"  verifikasi=${m.verifikasi || 'baru'}  tahap=${m.tahap || '-'}`));
    });
  }

  if (!TULIS) {
    console.log('\nMode laporan saja. Jalankan ulang dengan --tulis untuk menyimpan perubahan.');
    return;
  }

  const ops = [
    ...tulis.map(([id, val]) => (b) => b.set(db.collection('slotPengajuan').doc(id), val)),
    ...hapus.map((id) => (b) => b.delete(db.collection('slotPengajuan').doc(id))),
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
  console.log(`\nSelesai: ${tulis.length} ditulis, ${hapus.length} dihapus.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
