// ===================== pilihan.js =====================
// Daftar pilihan dropdown yang bisa diubah admin dari Pengaturan → Tema & Bidang
// tanpa deploy ulang: Tema KP/Magang (KP_TEMA) dan Bidang TA/Capstone/S2 (BIDANG).
//
// Isi array di bawah = nilai BAWAAN. Override admin disimpan di
// config/global → konten.pilihan.{kpTema|bidang} sebagai daftar lengkap
// [{ kode, label, isActive }] (urutan array = urutan di dropdown). Entri bawaan
// yang belum ada di daftar tersimpan (mis. ditambah developer belakangan) tetap
// muncul, ditaruh di akhir.
//
// Sengaja arsip (isActive:false), bukan hapus: `bidang` di dokumen mahasiswa
// menyimpan KODE-nya, jadi kode yang hilang membuat label mahasiswa lama jadi
// kode mentah. Kode tidak bisa diubah setelah dibuat, hanya label-nya.
//
// setPilihan() dipanggil App.jsx tiap config berubah (sebelum anak-anaknya
// dirender), lalu semua pembaca cukup memanggil fungsi di sini — tidak perlu
// meneruskan daftar lewat props ke tiap form.

// Bidang TA — kode + label.
export const BIDANG = [
  { kode: 'U', label: 'Udara' },
  { kode: 'S', label: 'Sampah' },
  { kode: 'DL', label: 'Drainase Lingkungan' },
  { kode: 'AL', label: 'Air Limbah' },
  { kode: 'AB', label: 'Air Bersih' },
  { kode: 'K3L', label: 'K3L' },
  { kode: 'MIX', label: 'Mixed' },
];

// Tema khusus Kerja Praktik (sesuai Ketentuan Khusus KP).
export const KP_TEMA = [
  { kode: 'PBPAM', label: 'Perencanaan Bangunan Pengolahan Air Minum' },
  { kode: 'SPAM', label: 'Sistem Penyediaan Air Minum' },
  { kode: 'K3', label: 'Kesehatan dan Keselamatan Kerja' },
  { kode: 'B3', label: 'Pengelolaan Limbah Bahan Berbahaya dan Beracun (B3)' },
  { kode: 'Drainase', label: 'Drainase / Penyaluran Air Buangan' },
  { kode: 'PengolahanSampah', label: 'Pengolahan Sampah' },
  { kode: 'SML', label: 'Sistem Manajemen Lingkungan' },
  { kode: 'TeknologiBersih', label: 'Teknologi Bersih' },
  { kode: 'ManajemenSampah', label: 'Manajemen Sampah' },
  { kode: 'KualitasLingkungan', label: 'Pengelolaan Kualitas Lingkungan / Energi Terbarukan' },
  { kode: 'PemantauanUdara', label: 'Pemantauan Kualitas Udara' },
  { kode: 'PengolahanAirLimbah', label: 'Perancangan Bangunan Pengolahan Air Limbah' },
  { kode: 'ESG', label: 'Environmental, Social, and Governance (ESG)' },
];

let tersimpan = {};

export function setPilihan(konten) {
  tersimpan = (konten && konten.pilihan) || {};
}

function gabung(bawaan, daftar) {
  const dariAdmin = Array.isArray(daftar) ? daftar : [];
  const ada = new Set(dariAdmin.map((x) => x.kode));
  return [
    ...dariAdmin.map((x) => ({ kode: x.kode, label: x.label, isActive: x.isActive !== false })),
    ...bawaan.filter((b) => !ada.has(b.kode)).map((b) => ({ ...b, isActive: true })),
  ];
}

// Semua entri termasuk yang diarsipkan — untuk editor, filter, dan pencarian label.
export function semuaKpTema() { return gabung(KP_TEMA, tersimpan.kpTema); }
export function semuaBidang() { return gabung(BIDANG, tersimpan.bidang); }

// Untuk <select>: hanya yang aktif, ditambah nilai yang sedang tersimpan di
// mahasiswa itu walau sudah diarsipkan (supaya form edit tidak menimpanya diam-diam).
function untukPilihan(semua, saatIni) {
  return semua.filter((x) => x.isActive || x.kode === saatIni)
    .map((x) => (x.isActive ? x : { ...x, label: x.label + ' (nonaktif)' }));
}
export function kpTemaUntukPilihan(saatIni) { return untukPilihan(semuaKpTema(), saatIni); }
export function bidangUntukPilihan(saatIni) { return untukPilihan(semuaBidang(), saatIni); }

// Kode bawaan tiap kolam — dipakai gantiProgram (FormPendaftaran) untuk memilih
// nilai awal & mengenali kode milik daftar mana.
export function kodeKpTemaPertama() { return (semuaKpTema().find((x) => x.isActive) || {}).kode || ''; }
export function kodeBidangPertama() { return (semuaBidang().find((x) => x.isActive) || {}).kode || ''; }
export function adalahKodeKpTema(kode) { return semuaKpTema().some((x) => x.kode === kode); }

export function labelPilihan(kode) {
  const b = semuaBidang().find((x) => x.kode === kode) || semuaKpTema().find((x) => x.kode === kode);
  return b ? b.label : null;
}
