import QRCode from 'qrcode';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';

// ===================== QR verifikasi surat =====================
// Surat bertanda tangan (config.verifikasi di getTemplateConfig) memuat QR ke
// halaman /verifikasi/{token}. Token & data yang tampil di halaman itu dibuat
// Cloud Function terbitkanVerifikasi (functions/verifikasiSurat.js) dari record
// yang tersimpan. Di template, QR ditandai gambar placeholder ber-alt text
// "qr-verifikasi"; gambarnya diganti di sini sebelum surat dikonversi ke PDF.

// Selalu domain produksi, juga saat dicetak dari build eksperimental atau localhost:
// QR di kertas harus tetap bisa dibuka.
const BASE_URL = 'https://simantaptlundip.com';
const ALT_QR = 'qr-verifikasi';
const MEDIA_QR = 'media/qr-verifikasi.png';

function galat(pesan) {
  const e = new Error(pesan);
  e.pesanPengguna = pesan;
  return e;
}

// Isi surat yang dicetak harus sama dengan yang tercatat di server (mis. admin
// mengubah judul tanpa menekan Simpan), kalau tidak halaman verifikasi tidak cocok
// dengan kertasnya.
function cocokDenganCatatan(cetak, s) {
  const p = s.periode || {};
  return cetak.nomor === s.nomor && cetak.nama === s.nama && cetak.nim === s.nim
    && (cetak.judul || '') === s.judul && (cetak.dari || '') === p.dari && (cetak.sampai || '') === p.sampai;
}

// Mengembalikan gambar QR (PNG, Uint8Array) untuk surat ini.
export async function siapkanQrVerifikasi({ jenis, mahasiswaId, cetak }) {
  let s;
  try {
    s = (await httpsCallable(functions, 'terbitkanVerifikasi')({ jenis, mahasiswaId })).data;
  } catch (e) {
    const dariServer = e && e.code && e.code !== 'functions/internal' && e.code !== 'functions/unavailable';
    throw galat(dariServer ? e.message : 'Gagal menyiapkan QR verifikasi. Periksa koneksi, lalu coba lagi.');
  }
  if (!cocokDenganCatatan(cetak, s)) {
    throw galat('Data di surat berbeda dengan data yang tersimpan. Simpan data mahasiswa dulu, lalu unduh lagi.');
  }
  const dataUrl = await QRCode.toDataURL(`${BASE_URL}/verifikasi/${s.token}`, { errorCorrectionLevel: 'M', margin: 1, width: 600 });
  const biner = atob(dataUrl.split(',')[1]);
  return Uint8Array.from(biner, (c) => c.charCodeAt(0));
}

// Mengarahkan setiap gambar ber-alt text "qr-verifikasi" ke PNG QR. Gambar placeholder
// yang sama boleh dipakai di beberapa tempat (mis. dua lembar Surat Tugas). Gagal
// keras bila tidak ada: placeholder di template adalah QR sungguhan ke beranda, jadi
// surat yang lolos tanpa diganti akan tampak sah padahal tidak bisa diverifikasi.
export function pasangQrVerifikasi(zip, png) {
  let terpasang = 0;
  const bagian = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  for (const nama of bagian) {
    const xml = zip.file(nama).asText();
    const ids = new Set();
    for (const gambar of xml.match(/<w:drawing>[\s\S]*?<\/w:drawing>/g) || []) {
      if (!gambar.includes(`descr="${ALT_QR}"`)) continue;
      const embed = gambar.match(/r:embed="([^"]+)"/);
      if (embed) ids.add(embed[1]);
    }
    if (!ids.size) continue;
    const relsNama = nama.replace(/^word\/(.+)$/, 'word/_rels/$1.rels');
    let rels = zip.file(relsNama).asText();
    for (const id of ids) {
      rels = rels.replace(new RegExp(`(<Relationship [^>]*Id="${id}"[^>]*Target=")[^"]+(")`), `$1${MEDIA_QR}$2`)
        .replace(new RegExp(`(<Relationship [^>]*Target=")[^"]+("[^>]*Id="${id}")`), `$1${MEDIA_QR}$2`);
    }
    zip.file(relsNama, rels);
    terpasang += ids.size;
  }
  if (!terpasang) throw galat('Template surat ini belum punya tempat QR verifikasi. Hubungi admin.');

  zip.file(`word/${MEDIA_QR}`, png);
  const ct = zip.file('[Content_Types].xml').asText();
  if (!/<Default [^>]*Extension="png"/i.test(ct)) {
    zip.file('[Content_Types].xml', ct.replace(/(<Types[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>'));
  }
}
