// ===================== verifikasiSurat.js =====================
// QR verifikasi pada surat bertanda tangan (saat ini hanya KP). Tiap surat yang
// dicetak memuat QR ke /verifikasi/{token}; halaman itu menampilkan data surat
// dan apakah nomornya masih berlaku.
//
// verifikasiSurat/{token}  satu dokumen per versi isi surat (mahasiswa, jenis surat,
//   nomor surat, dan data yang tercetak).
//   Token acak, bukan nomor surat: nomor urut berurutan, jadi bisa ditebak satu per
//   satu untuk mengumpulkan nama & NIM. Isinya salinan data saat surat terakhir
//   dicetak dengan isi itu, dihitung di sini dari record yang tersimpan (bukan dari klien), supaya
//   isi halaman tidak bisa dikarang pemanggil. Klien tidak membaca/menulis koleksi
//   ini sama sekali (lihat firestore.rules); hanya lewat dua fungsi di bawah.
//
// Status "berlaku" dibaca langsung saat QR dipindai: nomor di registri masih aktif,
// masih nomor milik record itu, dan pengajuannya tidak ditutup. Kertas versi lama tetap
// berlaku dan menampilkan isinya sendiri, ditambah catatan bila data tersimpan sudah
// berbeda dengan yang tercetak (beserta tanggal perubahannya, dataSuratDiubah).

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const fn = functions.region(require('./region'));
const crypto = require('crypto');

// Kunci = config.verifikasi.jenis di documentGenerator.js. Keperluan = teks di halaman.
const JENIS_SURAT = {
  'st-pembimbing-kp': { program: 'KP', keperluan: 'Surat Tugas Pembimbing Kerja Praktik', dosen: true },
  'penilaian-kp': { program: 'KP', keperluan: 'Berita Acara Kerja Praktik' },
  'perpanjangan-kp': { program: 'KP', keperluan: 'Perpanjangan Kerja Praktik', perpanjangan: true },
};
const NAMA_PROGRAM = { KP: 'Kerja Praktik' };

const tolak = (kode, pesan) => new functions.https.HttpsError(kode, pesan);

async function aktif(koleksi, id) {
  if (!id) return false;
  const snap = await admin.firestore().collection(koleksi).doc(String(id)).get();
  return snap.exists && snap.data().isActive === true;
}

// Sama dengan bolehUnduhDokumen (src/utils/helpers.js): mahasiswa hanya bisa
// mengunduh setelah pernah diverifikasi, tidak sedang "Perlu perbaikan", dan tanpa
// perubahan data yang belum diverifikasi ulang.
function mhsBolehUnduh(m) {
  const pernah = m.verifikasi === 'terverifikasi' || !!m.pernahTerverifikasi;
  const perubahan = m.perubahanData && Object.keys(m.perubahanData.item || {}).length;
  return pernah && m.verifikasi !== 'perbaikan' && !perubahan;
}

// Mengikuti siapa yang bisa mengunduh surat ini di aplikasi: admin; mahasiswa
// pemilik record; dosen yang ditugaskan, hanya untuk surat tugasnya.
async function bolehCetak(context, m, jenis) {
  const t = context.auth && context.auth.token;
  if (!t) return false;
  if (t.role === 'admin') return aktif('admin', context.auth.uid);
  if (t.role === 'student') return m.owner === t.nim && mhsBolehUnduh(m) && aktif('akun', t.nim);
  if (t.role === 'lecturer') {
    const ditugaskan = [m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].includes(t.kode);
    return !!JENIS_SURAT[jenis].dosen && !!t.kode && ditugaskan && aktif('dosen', t.kode);
  }
  return false;
}

// 'YYYY-MM-DD' + n bulan, tanggal dipotong ke akhir bulan (= tambahBulan di src/utils/nomorSurat.js).
function tambahBulan(iso, n) {
  const [t, b, h] = iso.split('-').map(Number);
  const akhir = new Date(Date.UTC(t, b - 1 + n + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(t, b - 1 + n, Math.min(h, akhir)));
  return d.toISOString().slice(0, 10);
}

// Periode yang tercetak di surat: surat tugas KP = jendela program 3 bulan sejak tanggal
// surat tugas (periodeSuratTugasKP di perpanjangan.js), surat lain = periode KP, atau
// periode perpanjangan yang terakhir disetujui (periodeSuratPerpanjangan).
function periodeSurat(m, jenis) {
  if (jenis === 'st-pembimbing-kp' && m.mulaiProgram) return { dari: m.mulaiProgram, sampai: tambahBulan(m.mulaiProgram, 3) };
  if (!JENIS_SURAT[jenis].perpanjangan) return { dari: m.tanggalMulai || '', sampai: m.batasAkhir || '' };
  const riwayat = (m.perpanjangan && m.perpanjangan.riwayat) || [];
  const akhir = riwayat[riwayat.length - 1];
  return akhir ? { dari: akhir.dari || '', sampai: akhir.sampai || '' } : null;
}

// Apakah data tersimpan sekarang berbeda dengan yang tercetak di kertas ini. Dilewati
// selama ada perubahan dari mahasiswa yang belum diverifikasi admin: nilai itu belum resmi.
function dataBerbeda(v, m) {
  if (!mhsBolehUnduh(m)) return false;
  if (['nama', 'nim', 'judul'].some((k) => (m[k] || '') !== (v[k] || ''))) return true;
  const p = periodeSurat(m, v.jenis);
  const lama = v.periode || {};
  return !!p && (p.dari !== lama.dari || p.sampai !== lama.sampai);
}

// Field mahasiswa yang ikut tercetak di surat ber-QR (periode perpanjangan dari riwayat;
// mulaiProgram = tanggal & jangka waktu surat tugas KP).
const FIELD_TERCETAK = ['nama', 'nim', 'judul', 'tanggalMulai', 'batasAkhir', 'mulaiProgram'];
const isiTercetak = (m) => JSON.stringify([
  ...FIELD_TERCETAK.map((k) => m[k] || ''),
  (m.perpanjangan && m.perpanjangan.riwayat) || [],
]);

// dataSuratDiubah/{mahasiswaId} = { diubah }: kapan data yang tercetak di surat terakhir
// berubah, untuk tanggal di halaman verifikasi. Dicatat lewat trigger supaya mencakup
// semua jalur tulis (admin, mahasiswa, ganti NIM) tanpa menambah field di record
// mahasiswa (yang ditulis utuh oleh klien dan diperiksa per field di firestore.rules).
exports.catatPerubahanDataSurat = functions.firestore.document('mahasiswa/{id}').onWrite(async (change, context) => {
  if (!change.before.exists || !change.after.exists) return;
  if (isiTercetak(change.before.data()) === isiTercetak(change.after.data())) return;
  await admin.firestore().collection('dataSuratDiubah').doc(context.params.id)
    .set({ diubah: new Date().toISOString() });
});

// Dipanggil tepat sebelum surat dibangun. Mengembalikan token (sama selama isi surat
// yang tercetak tidak berubah) dan data yang tercatat, supaya klien
// bisa memastikan isi surat sama dengan yang tampil di halaman verifikasi.
exports.terbitkanVerifikasi = fn.https.onCall(async (data, context) => {
  const jenis = String((data && data.jenis) || '');
  const mahasiswaId = String((data && data.mahasiswaId) || '');
  if (!JENIS_SURAT[jenis]) throw tolak('invalid-argument', 'Jenis surat tidak dikenal.');
  if (!mahasiswaId) throw tolak('not-found', 'Data mahasiswa belum tersimpan. Simpan dulu, lalu unduh lagi.');

  const db = admin.firestore();
  const mSnap = await db.collection('mahasiswa').doc(mahasiswaId).get();
  if (!mSnap.exists) throw tolak('not-found', 'Data mahasiswa belum tersimpan. Simpan dulu, lalu unduh lagi.');
  const m = mSnap.data();
  if (!(await bolehCetak(context, m, jenis))) throw tolak('permission-denied', 'Anda tidak bisa mencetak surat ini.');
  if (m.program !== JENIS_SURAT[jenis].program) throw tolak('failed-precondition', 'Surat ini bukan untuk program mahasiswa tersebut.');
  if (m.dibatalkan) throw tolak('failed-precondition', 'Pengajuan ini sudah ditutup.');

  const nomorSuratId = m.nomorSuratId || '';
  const regSnap = nomorSuratId ? await db.collection('nomorSurat').doc(nomorSuratId).get() : null;
  if (!regSnap || !regSnap.exists || regSnap.data().status !== 'aktif') {
    throw tolak('failed-precondition', 'Nomor surat belum tercatat. Isi nomor surat, simpan data mahasiswa, lalu unduh lagi.');
  }
  const periode = periodeSurat(m, jenis);
  if (!periode) throw tolak('failed-precondition', 'Perpanjangan belum disetujui dan disimpan. Simpan data mahasiswa dulu, lalu unduh lagi.');

  const salinan = {
    nomor: regSnap.data().nomor,
    nama: m.nama || '',
    nim: m.nim || '',
    program: NAMA_PROGRAM[m.program] || m.program,
    keperluan: JENIS_SURAT[jenis].keperluan,
    judul: m.judul || '',
    periode,
    terakhirDicetak: new Date().toISOString(),
  };

  // Satu token per versi isi: cetak ulang dengan isi yang sama memakai token lamanya
  // (hanya waktu cetak yang maju), isi yang berubah mendapat token baru, dan kertas
  // versi lama tetap menunjuk ke halaman yang cocok dengan isinya sendiri.
  const versi = await versiSurat(db, mahasiswaId, jenis, nomorSuratId);
  const sama = versi.find((d) => sidik(d.data()) === sidik(salinan));
  const ref = sama ? sama.ref : db.collection('verifikasiSurat').doc(crypto.randomBytes(15).toString('base64url'));
  await ref.set({
    mahasiswaId, jenis, nomorSuratId, ...salinan,
    ...(sama ? {} : { dibuat: new Date().toISOString() }),
  }, { merge: true });

  return { token: ref.id, ...salinan };
});

// Semua versi satu surat (mahasiswa + jenis + nomor). Hanya filter kesetaraan, jadi
// tidak perlu indeks komposit; jumlahnya kecil (satu per perubahan data tercetak).
async function versiSurat(db, mahasiswaId, jenis, nomorSuratId) {
  const snap = await db.collection('verifikasiSurat')
    .where('mahasiswaId', '==', mahasiswaId).where('jenis', '==', jenis).where('nomorSuratId', '==', nomorSuratId)
    .get();
  return snap.docs;
}

// Isi yang tercetak di surat, untuk membandingkan dua versi.
function sidik(v) {
  const p = v.periode || {};
  return JSON.stringify([v.nomor, v.nama, v.nim, v.program, v.keperluan, v.judul, p.dari, p.sampai]);
}

// Untuk halaman /verifikasi/{token} (tanpa login), dipanggil langsung lewat URL fungsi
// karena situs produksi di cPanel. Hanya field yang memang tercetak di surat; tanpa id
// internal atau kontak.
exports.verifikasiSuratPublik = fn.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  const token = String(req.query.t || '');
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) { res.status(404).json({ error: 'tidak-ditemukan' }); return; }
  try {
    const db = admin.firestore();
    const snap = await db.collection('verifikasiSurat').doc(token).get();
    if (!snap.exists) { res.status(404).json({ error: 'tidak-ditemukan' }); return; }
    const v = snap.data();
    const [reg, mhs, diubahSnap] = await Promise.all([
      db.collection('nomorSurat').doc(v.nomorSuratId).get(),
      db.collection('mahasiswa').doc(v.mahasiswaId).get(),
      db.collection('dataSuratDiubah').doc(v.mahasiswaId).get(),
    ]);
    const m = mhs.exists ? mhs.data() : null;
    const nomorAktif = reg.exists && reg.data().status === 'aktif'
      && !!m && m.nomorSuratId === v.nomorSuratId && !m.dibatalkan;
    // Kertas lama tetap sah (isinya benar saat dicetak); halaman hanya memberi tahu bila
    // data tersimpan sudah berbeda. Yang membuat surat tidak berlaku hanya nomor yang
    // diakhiri admin.
    const berubah = nomorAktif && dataBerbeda(v, m);
    // Tanggal hanya bila tercatat setelah kertas ini dicetak (perubahan sebelum trigger
    // ada tidak punya tanggal).
    const diubah = diubahSnap.exists ? diubahSnap.data().diubah : '';
    res.json({
      berlaku: nomorAktif,
      berubah,
      diubah: berubah && diubah > (v.terakhirDicetak || '') ? diubah : null,
      nomor: v.nomor, nama: v.nama, nim: v.nim, program: v.program, keperluan: v.keperluan,
      judul: v.judul, periode: v.periode, terakhirDicetak: v.terakhirDicetak,
    });
  } catch (e) {
    console.error('verifikasiSuratPublik:', e);
    res.status(500).json({ error: 'gagal' });
  }
});
