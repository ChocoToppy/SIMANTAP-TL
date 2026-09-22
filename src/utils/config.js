// ===================== config.js =====================
// Konfigurasi lingkup build (BUKAN runtime/database) — dipakai untuk deploy
// "produksi" (KP & Magang, ke simantaptlundip.com) dari kode & database yang
// SAMA dengan deploy "eksperimental" (semua program, ke simantap-tl.web.app).
//
// VITE_PROGRAM_SCOPE dibaca sekali saat `vite build` lewat import.meta.env
// (lihat .env.prod / .env.full) — bukan lewat Firestore/server, jadi
// tidak ada request tambahan dan tidak bisa diubah setelah build jadi.
// Ini HANYA membatasi program apa yang bisa DIPILIH mahasiswa saat mendaftar
// baru (lihat FormPendaftaran di Portal.jsx) — tidak menyembunyikan data
// program lain yang mungkin sudah ada dari sisi admin/dosen.
export const PROGRAM_SCOPE = import.meta.env.VITE_PROGRAM_SCOPE || 'full';

// 'prod' = KP & Magang (yang sudah selesai/siap produksi); tambahkan program
// lain ke filter ini begitu masing-masing juga dianggap siap.
export function programKeysTersedia(allKeys) {
  if (PROGRAM_SCOPE === 'prod') return allKeys.filter((k) => k === 'KP' || k === 'MG');
  return allKeys;
}
