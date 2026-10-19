// ===================== seed.js =====================
// Isi awal config/global saat project Firebase masih kosong (lihat seedFirestore
// di App.jsx). Sengaja kosong: dosen ditambahkan lewat Pengaturan → Staf / tab
// Dosen, mahasiswa mendaftar sendiri, dan periode/pengumuman/panduan diatur admin.

// Periode pendaftaran yang dibuka admin (muncul di dropdown mahasiswa).
export const PERIODE_BUKA_AWAL = [];

// Periode "aktif" yang ditampilkan sebagai notifikasi di halaman login (mis. "Genap 2026").
// Terpisah dari daftar periode yang dibuka untuk pendaftaran.
export const PERIODE_AKTIF_AWAL = '';

// Daftar unduhan panduan (Panduan KP, Panduan TA, dst.) yang tampil di Portal
// mahasiswa — dikelola admin lewat "Kelola panduan", tautan ke Google Drive dsb.
export const PANDUAN_AWAL = [];

// Pengumuman akademik yang tampil di halaman login — dikelola admin lewat
// "Kelola pengumuman".
export const PENGUMUMAN_AWAL = [];
