// ===================== functions/migrate-nomor-bulanan.js =====================
// Skrip SEKALI JALAN (aman diulang): registri nomor surat pindah dari urutan per
// tahun (ID "{tahun}-{urut}") ke urutan per bulan (ID "{tahun}-{bulan}-{urut}",
// idNomor di src/utils/nomorSurat.js). Untuk tiap dokumen nomorSurat ber-ID lama:
//   - salin ke ID baru (isi sama, field id diganti), lalu hapus dokumen lama,
//   - ganti nomorSuratId di dokumen mahasiswa dan verifikasiSurat yang menunjuknya.
// Nomor yang tercetak tidak berubah, jadi kertas lama tetap terverifikasi.
// Berhenti tanpa menulis apa pun bila ID baru sudah ada (bentrok).
//
// Pakai (default hanya laporan, tanpa menulis):
//   cd functions
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node migrate-nomor-bulanan.js
//   GOOGLE_APPLICATION_CREDENTIALS=simantap-tl-firebase-adminsdk.json node migrate-nomor-bulanan.js --tulis

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const TULIS = process.argv.includes('--tulis');
const ID_LAMA = /^\d{4}-\d+$/;
const idBaru = (r) => `${r.tahun}-${String(r.bulan).padStart(2, '0')}-${String(r.urut).padStart(3, '0')}`;

async function main() {
  const reg = await db.collection('nomorSurat').get();
  const ada = new Set(reg.docs.map((d) => d.id));
  const pindah = reg.docs.filter((d) => ID_LAMA.test(d.id)).map((d) => ({ lama: d.id, baru: idBaru(d.data()), data: d.data() }));

  const rusak = pindah.filter((p) => !p.data.tahun || !p.data.bulan || !p.data.urut);
  if (rusak.length) throw new Error(`Dokumen tanpa tahun/bulan/urut: ${rusak.map((p) => p.lama).join(', ')}`);
  const bentrok = pindah.filter((p) => ada.has(p.baru));
  if (bentrok.length) throw new Error(`ID baru sudah ada: ${bentrok.map((p) => `${p.lama} → ${p.baru}`).join(', ')}`);

  if (!pindah.length) { console.log('Tidak ada dokumen ber-ID lama. Selesai.'); return; }

  let batch = db.batch();
  let ops = 0;
  const tulis = async (fn) => { fn(batch); ops += 1; if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; } };

  for (const p of pindah) {
    const [mhs, verif] = await Promise.all([
      db.collection('mahasiswa').where('nomorSuratId', '==', p.lama).get(),
      db.collection('verifikasiSurat').where('nomorSuratId', '==', p.lama).get(),
    ]);
    console.log(`${p.lama} → ${p.baru}  (${p.data.nomor}, ${p.data.status}) · mahasiswa: ${mhs.size} · verifikasiSurat: ${verif.size}`);
    if (!TULIS) continue;
    await tulis((b) => b.set(db.collection('nomorSurat').doc(p.baru), { ...p.data, id: p.baru }));
    for (const d of mhs.docs) await tulis((b) => b.update(d.ref, { nomorSuratId: p.baru }));
    for (const d of verif.docs) await tulis((b) => b.update(d.ref, { nomorSuratId: p.baru }));
    await tulis((b) => b.delete(db.collection('nomorSurat').doc(p.lama)));
  }
  if (TULIS && ops) await batch.commit();
  console.log(TULIS ? `Selesai: ${pindah.length} nomor dipindah.` : `Laporan saja: ${pindah.length} nomor akan dipindah. Jalankan lagi dengan --tulis.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
